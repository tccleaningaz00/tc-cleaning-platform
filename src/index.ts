
interface Env {
  DB: D1Database;
  API_SECRET: string;
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

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method !== "POST" || url.pathname !== "/quote") {
      return json({ error: "Not found" }, 404);
    }

    const authorization = request.headers.get("Authorization");

    if (
      !env.API_SECRET ||
      authorization !== `Bearer ${env.API_SECRET}`
    ) {
      return json({ error: "Unauthorized" }, 401);
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
      data.firstName,
      data.lastName,
      data.phone,
      data.addressLine1,
      data.city,
      data.zip,
    ];

    if (
      requiredFields.some(
        (value) => !isText(value) || !value.trim()
      ) ||
      !/^[a-zA-Z0-9 .'-]{1,60}$/.test(data.firstName) ||
      !/^[a-zA-Z0-9 .'-]{1,60}$/.test(data.lastName) ||
      !/^[a-zA-Z0-9 .,'#/-]{3,120}$/.test(data.addressLine1) ||
      !/^[a-zA-Z0-9 .'-]{1,60}$/.test(data.city) ||
      !/^\d{5}$/.test(data.zip)
    ) {
      return json(
        { error: "Please check the required customer and address fields." },
        400
      );
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
      (email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    ) {
      return json({ error: "Please enter a valid email address." }, 400);
    }

    const serviceTypes = ["standard", "recurring", "deep", "move"];
    const conditions = ["light", "average", "heavy"];
    const addOnIds = [
      "inside-fridge",
      "inside-oven",
      "interior-windows",
      "baseboards",
    ];

    if (
      !serviceTypes.includes(data.service) ||
      !conditions.includes(data.condition) ||
      !Number.isInteger(data.bedrooms) ||
      data.bedrooms < 1 ||
      data.bedrooms > 6 ||
      !Number.isInteger(data.bathrooms) ||
      data.bathrooms < 1 ||
      data.bathrooms > 6 ||
      !Number.isInteger(data.squareFeet) ||
      data.squareFeet < 100 ||
      data.squareFeet > 20000 ||
      !Array.isArray(data.addons) ||
      data.addons.length > addOnIds.length ||
      data.addons.some(
        (item) => !isText(item) || !addOnIds.includes(item)
      )
    ) {
      return json(
        { error: "Please check the property and service selections." },
        400
      );
    }

    if (
      isText(data.addressLine2) &&
      data.addressLine2.length > 60
    ) {
      return json({ error: "Apartment or unit information is too long." }, 400);
    }

    const customerId = crypto.randomUUID();
    const propertyId = crypto.randomUUID();
    const estimateId = crypto.randomUUID();

    const notes = [
      `Property condition: ${data.condition}`,
      `Additional services: ${
        data.addons.length ? data.addons.join(", ") : "None"
      }`,
      "Submitted through the website. Final estimate requires manager review.",
    ].join("\n");

    try {
      const statements = [
        env.DB.prepare(`
          INSERT INTO customers
            (id, first_name, last_name, phone, email,
             preferred_contact, customer_status)
          VALUES (?, ?, ?, ?, ?, 'phone', 'prospect')
        `).bind(
          customerId,
          data.firstName.trim(),
          data.lastName.trim(),
          phone,
          email || null
        ),

        env.DB.prepare(`
          INSERT INTO properties
            (id, customer_id, address_line1, address_line2,
             city, state, zip_code, bedrooms, bathrooms, square_feet)
          VALUES (?, ?, ?, ?, ?, 'AZ', ?, ?, ?, ?)
        `).bind(
          propertyId,
          customerId,
          data.addressLine1.trim(),
          isText(data.addressLine2)
            ? data.addressLine2.trim() || null
            : null,
          data.city.trim(),
          data.zip,
          data.bedrooms,
          data.bathrooms,
          data.squareFeet
        ),

        env.DB.prepare(`
          INSERT INTO estimates
            (id, customer_id, property_id, service_type,
             approval_status, estimate_notes)
          VALUES (?, ?, ?, ?, 'pending', ?)
        `).bind(
          estimateId,
          customerId,
          propertyId,
          data.service,
          notes
        ),
      ];

      await env.DB.batch(statements);

      return json(
        {
          success: true,
          estimateId,
          message: "Your quote request was received.",
        },
        201
      );
    } catch {
      return json(
        { error: "We could not save your request. Please try again." },
        500
      );
    }
  },
};

export default worker;
