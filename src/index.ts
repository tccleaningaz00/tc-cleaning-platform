
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

type ArticleStatus = "draft" | "published";

interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  body: string;
  status: ArticleStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

interface ArticleInput {
  title: string;
  category: string;
  excerpt: string;
  body: string;
  status: ArticleStatus;
}

interface ClientInput {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  propertyType: string;
  frequencyCategory: string;
  serviceNotes: string;
  propertyId?: string;
}

function parseClientInput(value: unknown): ClientInput | null {
  if (!isRecord(value)) return null;
  const text = (key: string, fallback = "") => isText(value[key]) ? value[key].trim() : fallback;
  const integer = (key: string, min: number, max: number): number | null => {
    const input = value[key];
    if (input === "" || input === null || input === undefined) return null;
    const number = typeof input === "number" ? input : Number(input);
    return Number.isInteger(number) && number >= min && number <= max ? number : Number.NaN;
  };
  const decimal = (key: string, min: number, max: number): number | null => {
    const input = value[key];
    if (input === "" || input === null || input === undefined) return null;
    const number = typeof input === "number" ? input : Number(input);
    return Number.isFinite(number) && number >= min && number <= max ? number : Number.NaN;
  };

  const firstName = text("firstName");
  const lastName = text("lastName");
  const phone = text("phone");
  const email = text("email").toLowerCase();
  const addressLine1 = text("addressLine1");
  const addressLine2 = text("addressLine2");
  const city = text("city");
  const state = text("state", "AZ").toUpperCase();
  const zipCode = text("zipCode");
  const bedrooms = integer("bedrooms", 0, 20);
  const bathrooms = decimal("bathrooms", 0, 20);
  const squareFeet = integer("squareFeet", 1, 100000);
  const propertyType = text("propertyType");
  const frequencyCategory = text("frequencyCategory");
  const serviceNotes = text("serviceNotes");
  const propertyId = text("propertyId");

  if (
    !firstName || firstName.length > 80 || !lastName || lastName.length > 80 ||
    phone.length > 30 || (phone && (!/^[+\d().\-\s]+$/.test(phone) || phone.replace(/\D/g, "").length < 7)) || (!phone && !email) ||
    email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    !addressLine1 || addressLine1.length > 120 || addressLine2.length > 80 ||
    !city || city.length > 80 || !/^[A-Z]{2}$/.test(state) || !/^\d{5}(?:-\d{4})?$/.test(zipCode) ||
    Number.isNaN(bedrooms) || Number.isNaN(bathrooms) || Number.isNaN(squareFeet) ||
    propertyType.length > 60 || frequencyCategory.length > 80 || serviceNotes.length > 5000 ||
    (propertyId && !/^[0-9a-f-]{36}$/i.test(propertyId))
  ) return null;

  return {
    firstName, lastName, phone, email, addressLine1, addressLine2, city, state,
    zipCode, bedrooms, bathrooms, squareFeet, propertyType, frequencyCategory,
    serviceNotes, ...(propertyId ? { propertyId } : {}),
  };
}

function toArticle(row: ArticleRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    excerpt: row.excerpt,
    body: row.body,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function parseArticleInput(value: unknown): ArticleInput | null {
  if (!isRecord(value)) return null;

  const title = isText(value.title) ? value.title.trim() : "";
  const category = isText(value.category) ? value.category.trim() : "Cleaning Tips";
  const excerpt = isText(value.excerpt) ? value.excerpt.trim() : "";
  const body = isText(value.body) ? value.body.replace(/\r\n/g, "\n").trim() : "";
  const status = value.status;

  if (
    title.length > 160 ||
    category.length < 1 || category.length > 60 ||
    excerpt.length > 320 ||
    body.length > 40000 ||
    (status !== "draft" && status !== "published")
  ) return null;

  if (status === "published" && (!title || !excerpt || !body)) return null;

  return { title, category, excerpt, body, status };
}

function createArticleSlug(title: string, id: string) {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
  return `${base || "cleaning-advice"}-${id.slice(0, 8)}`;
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
    const path = url.pathname.replace(/\/$/, "") || "/";
    const publicArticleMatch = path.match(/^\/articles\/([^/]+)$/);
    const managerArticleMatch = path.match(/^\/manager-articles\/([^/]+)$/);
    const managerCustomerMatch = path.match(/^\/manager-customers\/([^/]+)$/);
    const publicArticleRoute = path === "/articles" || Boolean(publicArticleMatch);
    const managerArticleRoute = path === "/manager-articles" || Boolean(managerArticleMatch);
    const managerCustomerRoute = path === "/manager-customers" || Boolean(managerCustomerMatch);
    const existingRoute = ["/quote", "/calendar-token", "/calendar-events", "/customers"].includes(path);

    if (!publicArticleRoute && !managerArticleRoute && !managerCustomerRoute && !existingRoute) {
      return json({ error: "Not found" }, 404);
    }

    const authorization = request.headers.get("Authorization");

    if (
      !publicArticleRoute &&
      (!env.API_SECRET || authorization !== `Bearer ${env.API_SECRET}`)
    ) {
      return json({ error: "Unauthorized" }, 401);
    }

    if (path === "/articles") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      try {
        const result = await env.DB.prepare(`
          SELECT id, slug, title, category, excerpt, body, status,
                 created_at, updated_at, published_at
          FROM articles
          WHERE status = 'published'
          ORDER BY COALESCE(published_at, updated_at) DESC
          LIMIT 100
        `).all<ArticleRow>();
        return json({ success: true, articles: (result.results || []).map(toArticle) });
      } catch (error) {
        console.error("Public article list could not be loaded.", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
        return json({ error: "Articles are temporarily unavailable." }, 500);
      }
    }

    if (publicArticleMatch) {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      let slug = "";
      try {
        slug = decodeURIComponent(publicArticleMatch[1]);
      } catch {
        return json({ error: "Article not found." }, 404);
      }

      try {
        const row = await env.DB.prepare(`
          SELECT id, slug, title, category, excerpt, body, status,
                 created_at, updated_at, published_at
          FROM articles
          WHERE slug = ? AND status = 'published'
          LIMIT 1
        `).bind(slug).first<ArticleRow>();
        if (!row) return json({ error: "Article not found." }, 404);
        return json({ success: true, article: toArticle(row) });
      } catch (error) {
        console.error("Public article could not be loaded.", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
        return json({ error: "Article is temporarily unavailable." }, 500);
      }
    }

    if (path === "/manager-articles") {
      if (request.method === "GET") {
        try {
          const result = await env.DB.prepare(`
            SELECT id, slug, title, category, excerpt, body, status,
                   created_at, updated_at, published_at
            FROM articles
            ORDER BY updated_at DESC
            LIMIT 200
          `).all<ArticleRow>();
          return json({ success: true, articles: (result.results || []).map(toArticle) });
        } catch (error) {
          console.error("Manager article list could not be loaded.", {
            errorName: error instanceof Error ? error.name : "UnknownError",
          });
          return json({ error: "Articles could not be loaded." }, 500);
        }
      }

      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!request.headers.get("Content-Type")?.includes("application/json")) {
        return json({ error: "JSON required" }, 415);
      }

      let text: string;
      try {
        text = await request.text();
      } catch {
        return json({ error: "Could not read article." }, 400);
      }
      if (new TextEncoder().encode(text).length > 42000) {
        return json({ error: "Article is too large." }, 413);
      }

      let input: ArticleInput | null = null;
      try {
        input = parseArticleInput(JSON.parse(text));
      } catch {
        return json({ error: "Invalid article data." }, 400);
      }
      if (!input) return json({ error: "Please check the article fields." }, 400);

      const id = crypto.randomUUID();
      const slug = createArticleSlug(input.title, id);
      try {
        await env.DB.prepare(`
          INSERT INTO articles
            (id, slug, title, category, excerpt, body, status, published_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END)
        `).bind(
          id, slug, input.title || "Untitled draft", input.category,
          input.excerpt, input.body, input.status, input.status
        ).run();

        const row = await env.DB.prepare(`
          SELECT id, slug, title, category, excerpt, body, status,
                 created_at, updated_at, published_at
          FROM articles WHERE id = ?
        `).bind(id).first<ArticleRow>();
        if (!row) return json({ error: "Article could not be saved." }, 500);
        return json({ success: true, article: toArticle(row) }, 201);
      } catch (error) {
        console.error("Article creation failed.", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
        return json({ error: "Article could not be saved." }, 500);
      }
    }

    if (managerArticleMatch) {
      if (request.method !== "PATCH") return json({ error: "Method not allowed" }, 405);
      if (!request.headers.get("Content-Type")?.includes("application/json")) {
        return json({ error: "JSON required" }, 415);
      }

      let text: string;
      try {
        text = await request.text();
      } catch {
        return json({ error: "Could not read article." }, 400);
      }
      if (new TextEncoder().encode(text).length > 42000) {
        return json({ error: "Article is too large." }, 413);
      }

      let input: ArticleInput | null = null;
      try {
        input = parseArticleInput(JSON.parse(text));
      } catch {
        return json({ error: "Invalid article data." }, 400);
      }
      if (!input) return json({ error: "Please check the article fields." }, 400);

      let id = "";
      try {
        id = decodeURIComponent(managerArticleMatch[1]);
      } catch {
        return json({ error: "Article not found." }, 404);
      }

      try {
        const result = await env.DB.prepare(`
          UPDATE articles
          SET title = ?, category = ?, excerpt = ?, body = ?, status = ?,
              updated_at = CURRENT_TIMESTAMP,
              published_at = CASE
                WHEN ? = 'published' AND status != 'published' THEN CURRENT_TIMESTAMP
                ELSE published_at
              END
          WHERE id = ?
        `).bind(
          input.title || "Untitled draft", input.category, input.excerpt,
          input.body, input.status, input.status, id
        ).run();
        if (!result.meta.changes) return json({ error: "Article not found." }, 404);

        const row = await env.DB.prepare(`
          SELECT id, slug, title, category, excerpt, body, status,
                 created_at, updated_at, published_at
          FROM articles WHERE id = ?
        `).bind(id).first<ArticleRow>();
        if (!row) return json({ error: "Article could not be loaded." }, 500);
        return json({ success: true, article: toArticle(row) });
      } catch (error) {
        console.error("Article update failed.", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
        return json({ error: "Article could not be updated." }, 500);
      }
    }

    if (managerCustomerRoute) {
      if (path !== "/manager-customers" && !managerCustomerMatch) return json({ error: "Not found" }, 404);
      if (request.method !== "POST" && request.method !== "PATCH") return json({ error: "Method not allowed" }, 405);
      if (request.method === "POST" && path !== "/manager-customers") return json({ error: "Method not allowed" }, 405);
      if (request.method === "PATCH" && !managerCustomerMatch) return json({ error: "Method not allowed" }, 405);
      if (request.method === "PATCH" && !/^[0-9a-f-]{36}$/i.test(managerCustomerMatch![1])) return json({ error: "Client not found." }, 404);
      if (!request.headers.get("Content-Type")?.includes("application/json")) return json({ error: "JSON required" }, 415);

      let text: string;
      try { text = await request.text(); }
      catch { return json({ error: "Could not read client information." }, 400); }
      if (new TextEncoder().encode(text).length > 12000) return json({ error: "Client information is too large." }, 413);

      let input: ClientInput | null;
      try { input = parseClientInput(JSON.parse(text)); }
      catch { return json({ error: "Invalid client information." }, 400); }
      if (!input) return json({ error: "Please check the client and property information." }, 400);

      const customerId = request.method === "POST" ? crypto.randomUUID() : managerCustomerMatch![1];
      const propertyId = input.propertyId || crypto.randomUUID();
      try {
        if (request.method === "POST") {
          await env.DB.batch([
            env.DB.prepare(`
              INSERT INTO customers
                (id, first_name, last_name, phone, email, preferred_contact, customer_status)
              VALUES (?, ?, ?, ?, ?, ?, 'active')
            `).bind(customerId, input.firstName, input.lastName, input.phone || null, input.email || null, input.email && !input.phone ? "email" : "phone"),
            env.DB.prepare(`
              INSERT INTO properties
                (id, customer_id, address_line1, address_line2, city, state, zip_code,
                 bedrooms, bathrooms, square_feet, property_type)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(propertyId, customerId, input.addressLine1, input.addressLine2 || null, input.city, input.state, input.zipCode, input.bedrooms, input.bathrooms, input.squareFeet, input.propertyType || null),
            env.DB.prepare(`
              INSERT INTO client_management_details
                (customer_id, display_name, frequency_category, service_notes)
              VALUES (?, ?, ?, ?)
            `).bind(customerId, `${input.firstName} ${input.lastName}`, input.frequencyCategory || null, input.serviceNotes),
          ]);
          return json({ success: true, customerId }, 201);
        }

        const existingCustomer = await env.DB.prepare("SELECT id FROM customers WHERE id = ?").bind(customerId).first<{ id: string }>();
        if (!existingCustomer) return json({ error: "Client not found." }, 404);
        if (input.propertyId) {
          const existingProperty = await env.DB.prepare("SELECT id FROM properties WHERE id = ? AND customer_id = ?").bind(input.propertyId, customerId).first<{ id: string }>();
          if (!existingProperty) return json({ error: "Property not found." }, 404);
        }

        const result = await env.DB.batch([
          env.DB.prepare(`
            UPDATE customers
            SET first_name = ?, last_name = ?, phone = ?, email = ?, preferred_contact = ?, customer_status = 'active'
            WHERE id = ?
          `).bind(input.firstName, input.lastName, input.phone || null, input.email || null, input.email && !input.phone ? "email" : "phone", customerId),
          input.propertyId
            ? env.DB.prepare(`
                UPDATE properties
                SET address_line1 = ?, address_line2 = ?, city = ?, state = ?, zip_code = ?,
                    bedrooms = ?, bathrooms = ?, square_feet = ?, property_type = ?
                WHERE id = ? AND customer_id = ?
              `).bind(input.addressLine1, input.addressLine2 || null, input.city, input.state, input.zipCode, input.bedrooms, input.bathrooms, input.squareFeet, input.propertyType || null, propertyId, customerId)
            : env.DB.prepare(`
                INSERT INTO properties
                  (id, customer_id, address_line1, address_line2, city, state, zip_code,
                   bedrooms, bathrooms, square_feet, property_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(propertyId, customerId, input.addressLine1, input.addressLine2 || null, input.city, input.state, input.zipCode, input.bedrooms, input.bathrooms, input.squareFeet, input.propertyType || null),
          env.DB.prepare(`
            INSERT INTO client_management_details (customer_id, display_name, frequency_category, service_notes)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(customer_id) DO UPDATE SET
              display_name = excluded.display_name,
              frequency_category = excluded.frequency_category,
              service_notes = excluded.service_notes,
              updated_at = CURRENT_TIMESTAMP
          `).bind(customerId, `${input.firstName} ${input.lastName}`, input.frequencyCategory || null, input.serviceNotes),
        ]);
        if (!result[0].meta.changes) return json({ error: "Client not found." }, 404);
        return json({ success: true, customerId });
      } catch (error) {
        console.error("Client information could not be saved.", { errorName: error instanceof Error ? error.name : "UnknownError" });
        return json({ error: "Client information could not be saved." }, 500);
      }
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
            COALESCE(md.display_name, cp.roster_name, c.first_name || ' ' || c.last_name) AS roster_name,
            cp.alias_names,
            COALESCE(md.frequency_category, cp.frequency_category) AS frequency_category,
            COALESCE(cp.property_source_text, p.address_line1, '') AS property_source_text,
            COALESCE(md.service_notes, cp.service_notes, '') AS service_notes,
            COALESCE(cp.november_schedule_reference, '') AS november_schedule_reference,
            COALESCE(cp.payment_cross_reference, '') AS payment_cross_reference,
            cp.review_flags,
            COALESCE(cp.source_report_month, '') AS source_report_month
          FROM customers c
          LEFT JOIN client_profiles cp ON cp.customer_id = c.id
          LEFT JOIN client_management_details md ON md.customer_id = c.id
          LEFT JOIN properties p ON p.customer_id = c.id
          WHERE c.customer_status = 'active'
          ORDER BY COALESCE(md.display_name, cp.roster_name, c.first_name || ' ' || c.last_name) COLLATE NOCASE
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
