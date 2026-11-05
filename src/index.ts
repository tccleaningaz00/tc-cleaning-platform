
interface Env {
  DB: D1Database;
  API_SECRET: string;
  RESEND_API_KEY: string;
  GOOGLE_TOKEN_SECRET: string;
  GOOGLE_TOKEN_ENCRYPTION_KEY?: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

function getGoogleEncryptionKey(env: Env) {
  // Keep the deployed GOOGLE_TOKEN_SECRET binding working while accepting the
  // more explicit name for future deployments.
  return env.GOOGLE_TOKEN_ENCRYPTION_KEY || env.GOOGLE_TOKEN_SECRET;
}

interface QuotePayload {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  zip: string;
  service: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  condition: string;
  addons: string[];
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === "string";
}

async function encryptToken(token: string, env: Env) {
  const keyBytes = Uint8Array.from(
    atob(getGoogleEncryptionKey(env)),
    (c) => c.charCodeAt(0)
  );

  if (keyBytes.length !== 32) {
    throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(token)
  );

  return {
    encryptedToken: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

async function decryptToken(
  encryptedToken: string,
  ivBase64: string,
  env: Env
) {
  const keyBytes = Uint8Array.from(
    atob(getGoogleEncryptionKey(env)),
    (c) => c.charCodeAt(0)
  );

  if (keyBytes.length !== 32) {
    throw new Error("Invalid calendar encryption key.");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0)),
    },
    key,
    Uint8Array.from(atob(encryptedToken), (c) => c.charCodeAt(0))
  );

  return new TextDecoder().decode(decrypted);
}

async function sendQuoteNotification(
  data: QuotePayload,
  estimateId: string,
  env: Env
): Promise<void> {
  const customerName = `${data.firstName.trim()} ${data.lastName.trim()}`;

  const address = [
    data.addressLine1,
    data.addressLine2,
    `${data.city}, AZ ${data.zip}`,
  ].filter(Boolean).join(", ");

  const emailText = [
    "NEW WEBSITE QUOTE REQUEST",
    "",
    `Estimate ID: ${estimateId}`,
    `Customer: ${customerName}`,
    `Phone: ${data.phone}`,
    `Email: ${data.email || "Not provided"}`,
    `Property: ${address}`,
    "",
    `Service: ${data.service}`,
    `Bedrooms: ${data.bedrooms}`,
    `Bathrooms: ${data.bathrooms}`,
    `Square feet: ${data.squareFeet}`,
    `Condition: ${data.condition}`,
    `Add-ons: ${data.addons.length ? data.addons.join(", ") : "None"}`,
    "",
    "Status: Pending manager review",
    "",
    "This request has been saved in the TC Cleaning database.",
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "TC Cleaning Services <quotes@notifications.tccleaningaz.com>",
      to: ["quotes@tccleaningaz.com"],
      subject: `New Quote Request - ${customerName}`,
      text: emailText,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend notification failed: ${await response.text()}`);
  }
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (
      !["/quote", "/calendar-token", "/calendar-events", "/customers"].includes(path)
    ) {
      return json({ error: "Not found" }, 404);
    }

    const authorization = request.headers.get("Authorization");

    if (!env.API_SECRET || authorization !== `Bearer ${env.API_SECRET}`) {
      return json({ error: "Unauthorized" }, 401);
    }

    if (path === "/customers") {
      if (request.method !== "GET") {
        return json({ error: "Method not allowed" }, 405);
      }

      try {
        const result = await env.DB.prepare(`
          SELECT
            c.id AS customer_id,
            c.first_name,
            c.last_name,
            c.phone,
            c.email,
            c.customer_status,
            p.id AS property_id,
            p.address_line1,
            p.address_line2,
            p.city,
            p.state,
            p.zip_code,
            p.bedrooms,
            p.bathrooms,
            p.square_feet,
            p.property_type,
            cp.roster_name,
            cp.alias_names,
            cp.frequency_category,
            cp.property_source_text,
            cp.service_notes,
            cp.november_schedule_reference,
            cp.payment_cross_reference,
            cp.review_flags,
            cp.source_report_month
          FROM customers c
          JOIN client_profiles cp ON cp.customer_id = c.id
          LEFT JOIN properties p ON p.customer_id = c.id
          WHERE c.customer_status = 'active'
          ORDER BY cp.roster_name COLLATE NOCASE
        `).all<Record<string, unknown>>();

        const batch = await env.DB.prepare(`
          SELECT id, source_file, report_month, client_count, report_metadata_json
          FROM client_roster_import_batches
          ORDER BY imported_at DESC
          LIMIT 1
        `).first<Record<string, unknown>>();

        return json({
          success: true,
          customers: result.results || [],
          importBatch: batch || null,
        });
      } catch (error) {
        console.error("Customer directory retrieval failed.", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
        return json({ error: "Unable to load the customer directory." }, 500);
      }
    }

    // Store the Google refresh token encrypted in D1.
    if (path === "/calendar-token") {
      if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
      }

      try {
        const body: unknown = await request.json();

        if (!isRecord(body) || !isText(body.refreshToken) || !body.refreshToken) {
          return json({ error: "A refresh token is required." }, 400);
        }

        const encrypted = await encryptToken(body.refreshToken, env);

        await env.DB.prepare(`
          INSERT INTO google_calendar_tokens (id, encrypted_token, iv, updated_at)
          VALUES (1, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            encrypted_token = excluded.encrypted_token,
            iv = excluded.iv,
            updated_at = CURRENT_TIMESTAMP
        `).bind(encrypted.encryptedToken, encrypted.iv).run();

        return json({ success: true, message: "Calendar token securely stored." });
      } catch (error) {
        console.error("Calendar token storage failed:", error);
        return json({ error: "Could not securely store calendar token." }, 500);
      }
    }

    // Retrieve real events from Google Calendar.
    if (path === "/calendar-events") {
      if (request.method !== "GET") {
        return json({ error: "Method not allowed" }, 405);
      }

      try {
        const saved = await env.DB.prepare(`
          SELECT encrypted_token, iv
          FROM google_calendar_tokens
          WHERE id = 1
        `).first<{ encrypted_token: string; iv: string }>();

        if (!saved) {
          return json({ error: "Google Calendar is not connected." }, 404);
        }

        const refreshToken = await decryptToken(
          saved.encrypted_token,
          saved.iv,
          env
        );

        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,  
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        });

        if (!tokenResponse.ok) {
          console.error("Google token refresh failed:", await tokenResponse.text());
          return json({ error: "Google authorization needs to be reconnected." }, 502);
        }

        const tokenData = await tokenResponse.json() as {
          access_token?: string;
        };

        if (!tokenData.access_token) {
          return json({ error: "Google did not return an access token." }, 502);
        }

        const now = new Date();
        const start = new Date(now);
        start.setMonth(start.getMonth() - 1);

        const end = new Date(now);
        end.setMonth(end.getMonth() + 3);

        const googleHeaders = {
          Authorization: `Bearer ${tokenData.access_token}`,
        };
        const calendars: Array<{ id: string; summary?: string }> = [];
        let calendarPageToken: string | undefined;

        do {
          const calendarListUrl = new URL(
            "https://www.googleapis.com/calendar/v3/users/me/calendarList"
          );
          calendarListUrl.searchParams.set("maxResults", "250");
          if (calendarPageToken) {
            calendarListUrl.searchParams.set("pageToken", calendarPageToken);
          }

          const calendarListResponse = await fetch(calendarListUrl, {
            headers: googleHeaders,
          });
          if (!calendarListResponse.ok) {
            console.error("Google Calendar list request failed.", {
              status: calendarListResponse.status,
            });
            return json({ error: "Unable to list Google Calendars." }, 502);
          }

          const calendarList = await calendarListResponse.json() as {
            items?: Array<{ id?: string; summary?: string }>;
            nextPageToken?: string;
          };
          calendars.push(
            ...(calendarList.items || []).filter(
              (calendar): calendar is { id: string; summary?: string } =>
                typeof calendar.id === "string" && calendar.id.length > 0
            )
          );
          calendarPageToken = calendarList.nextPageToken;
        } while (calendarPageToken);

        const events: Array<Record<string, unknown>> = [];
        for (const calendar of calendars) {
          let eventPageToken: string | undefined;
          do {
            const calendarUrl = new URL(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`
            );
            calendarUrl.searchParams.set("timeMin", start.toISOString());
            calendarUrl.searchParams.set("timeMax", end.toISOString());
            calendarUrl.searchParams.set("singleEvents", "true");
            calendarUrl.searchParams.set("orderBy", "startTime");
            calendarUrl.searchParams.set("maxResults", "250");
            if (eventPageToken) {
              calendarUrl.searchParams.set("pageToken", eventPageToken);
            }

            const eventsResponse = await fetch(calendarUrl, {
              headers: googleHeaders,
            });
            if (!eventsResponse.ok) {
              console.error("Google Calendar events request failed.", {
                status: eventsResponse.status,
                calendarId: calendar.id === "primary" ? "primary" : "other",
              });
              return json({ error: "Unable to retrieve Google Calendar events." }, 502);
            }

            const calendarEvents = await eventsResponse.json() as {
              items?: Array<Record<string, unknown>>;
              nextPageToken?: string;
            };
            events.push(
              ...(calendarEvents.items || []).map((event) => ({
                ...event,
                calendarName: calendar.summary || "Google Calendar",
              }))
            );
            eventPageToken = calendarEvents.nextPageToken;
          } while (eventPageToken);
        }

        events.sort((left, right) => {
          const leftStart = left.start as { dateTime?: string; date?: string } | undefined;
          const rightStart = right.start as { dateTime?: string; date?: string } | undefined;
          const leftTime = new Date(leftStart?.dateTime || leftStart?.date || "").getTime();
          const rightTime = new Date(rightStart?.dateTime || rightStart?.date || "").getTime();
          return leftTime - rightTime;
        });

        return json({ success: true, events: { items: events } });
      } catch (error) {
        console.error("Calendar events error:", error);
        return json({ error: "Unable to load calendar events." }, 500);
      }
    }

    // Existing website quote submission.
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    if (!request.headers.get("Content-Type")?.includes("application/json")) {
      return json({ error: "JSON required" }, 415);
    }

    let body: string;

    try {
      body = await request.text();
    } catch {
      return json({ error: "Could not read request" }, 400);
    }

    if (new TextEncoder().encode(body).length > 16000) {
      return json({ error: "Request too large" }, 413);
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(body);
    } catch {
      return json({ error: "Invalid JSON request" }, 400);
    }

    if (!isRecord(parsed)) {
      return json({ error: "Invalid request data" }, 400);
    }

    const data = parsed as unknown as QuotePayload;

    const requiredFields = [
      data.firstName, data.lastName, data.phone,
      data.addressLine1, data.city, data.zip,
    ];

    if (
      requiredFields.some((value) => !isText(value) || !value.trim()) ||
      !/^[a-zA-Z0-9 .'-]{1,60}$/.test(data.firstName) ||
      !/^[a-zA-Z0-9 .'-]{1,60}$/.test(data.lastName) ||
      !/^[a-zA-Z0-9 .,'#/-]{3,120}$/.test(data.addressLine1) ||
      !/^[a-zA-Z0-9 .'-]{1,60}$/.test(data.city) ||
      !/^\d{5}$/.test(data.zip)
    ) {
      return json({ error: "Please check the required customer and address fields." }, 400);
    }

    const phone = data.phone.replace(/[^\d+]/g, "");

    if (
      phone.replace(/\D/g, "").length < 10 ||
      phone.replace(/\D/g, "").length > 15
    ) {
      return json({ error: "Please enter a valid phone number." }, 400);
    }

    const email = isText(data.email) ? data.email.trim() : "";

    if (
      email &&
      (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    ) {
      return json({ error: "Please enter a valid email address." }, 400);
    }

    const serviceTypes = ["standard", "recurring", "deep", "move"];
    const conditions = ["light", "average", "heavy"];
    const addOnIds = [
      "inside-fridge", "inside-oven", "interior-windows", "baseboards",
    ];

    if (
      !serviceTypes.includes(data.service) ||
      !conditions.includes(data.condition) ||
      !Number.isInteger(data.bedrooms) || data.bedrooms < 1 || data.bedrooms > 6 ||
      !Number.isInteger(data.bathrooms) || data.bathrooms < 1 || data.bathrooms > 6 ||
      !Number.isInteger(data.squareFeet) || data.squareFeet < 100 || data.squareFeet > 20000 ||
      !Array.isArray(data.addons) || data.addons.length > addOnIds.length ||
      data.addons.some((item) => !isText(item) || !addOnIds.includes(item))
    ) {
      return json({ error: "Please check the property and service selections." }, 400);
    }

    if (isText(data.addressLine2) && data.addressLine2.length > 60) {
      return json({ error: "Apartment or unit information is too long." }, 400);
    }

    const customerId = crypto.randomUUID();
    const propertyId = crypto.randomUUID();
    const estimateId = crypto.randomUUID();

    const notes = [
      `Property condition: ${data.condition}`,
      `Additional services: ${data.addons.length ? data.addons.join(", ") : "None"}`,
      "Submitted through the website. Final estimate requires manager review.",
    ].join("\n");

    try {
      const statements = [
        env.DB.prepare(`
          INSERT INTO customers
            (id, first_name, last_name, phone, email, preferred_contact, customer_status)
          VALUES (?, ?, ?, ?, ?, 'phone', 'prospect')
        `).bind(
          customerId, data.firstName.trim(), data.lastName.trim(),
          phone, email || null
        ),
        env.DB.prepare(`
          INSERT INTO properties
            (id, customer_id, address_line1, address_line2, city, state,
             zip_code, bedrooms, bathrooms, square_feet)
          VALUES (?, ?, ?, ?, ?, 'AZ', ?, ?, ?, ?)
        `).bind(
          propertyId, customerId, data.addressLine1.trim(),
          isText(data.addressLine2) ? data.addressLine2.trim() || null : null,
          data.city.trim(), data.zip, data.bedrooms, data.bathrooms, data.squareFeet
        ),
        env.DB.prepare(`
          INSERT INTO estimates
            (id, customer_id, property_id, service_type, approval_status, estimate_notes)
          VALUES (?, ?, ?, ?, 'pending', ?)
        `).bind(customerId, customerId, propertyId, data.service, notes),
      ];

      await env.DB.batch(statements);

      let notificationSent = false;

      try {
        await sendQuoteNotification(data, estimateId, env);
        notificationSent = true;
      } catch (error) {
        console.error("Quote notification error:", error);
      }

      return json({
        success: true,
        estimateId,
        notificationSent,
        message: "Your quote request was received.",
      }, 201);
    } catch (error) {
      console.error("Quote save failed:", error);
      return json({ error: "We could not save your request. Please try again." }, 500);
    }
  },
};

export default worker;
