interface Env {
  DB: D1Database;
  API_SECRET: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method !== "POST" || url.pathname !== "/quote") {
      return json({ error: "Not found" }, 404);
    }

    const authorization = request.headers.get("Authorization");
    if (!env.API_SECRET || authorization !== `Bearer ${env.API_SECRET}`) {
      return json({ error: "Unauthorized" }, 401);
    }

    if (!request.headers.get("Content-Type")?.includes("application/json")) {
      return json({ error: "JSON required" }, 415);
    }

    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > 16000) {
      return json({ error: "Request too large" }, 413);
    }

    let data: any;
    try {
      data = await request.json();
    } catch {
      return json({ error: "Invalid request" }, 400);
    }

    const required = [
      data.firstName,
      data.lastName,
      data.phone,
      data.addressLine1,
      data.city,
      data.zip,
    ];

    if (
      required.some((value) => typeof value !== "string" || !value.trim()) ||
      !/^\d{5}$/.test(data.zip) ||
      !/^[a-zA-Z0-9 .'-]{1,60}$/.test(data.city) ||
      !/^[a-zA-Z0-9 .,'#/-]{3,120}$/.test(data.addressLine1) ||
      !/^[a-zA-Z0-9 .'-]{1,60}$/.test(data.firstName) ||
      !/^[a-zA-Z0-9 .'-]{1,60}$/.test(data.lastName)
    ) {
      return json({ error: "Please check the required customer and address fields." }, 400);
    }

    const phone = String(data.phone).replace(/[^\d+]/g, "");
    if (phone.replace(/\D/g, "").length < 10 || phone.length > 20) {
      return json({ error: "Please enter a valid phone number." }, 400);
    }

    const email = typeof data.email === "string" ? data.email.trim() : "";
    if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return json({ error: "Please enter a valid email address." }, 400);
    }

    const serviceTypes = ["standard", "recurring", "deep", "move"];
    const conditions = ["light", "average", "heavy"];
    const addOnIds = ["inside-fridge", "inside-oven", "interior-windows", "baseboards"];

    if (
      !serviceTypes.includes(data.service) ||
      !conditions.includes(data.condition) ||
      !Number.isInteger(data.bedrooms) || data.bedrooms < 1 || data.bedrooms > 6 ||
      !Number.isInteger(data.bathrooms) || data.bathrooms < 1 || data.bathrooms > 6 ||
      !Number.isInteger(data.squareFeet) || data.squareFeet < 100 || data.squareFeet > 20000 ||
      !Array.isArray(data.addons) ||
      data.addons.some((item: unknown) => !addOnIds.includes(String(item)))
    ) {
      return json({ error: "Please check the property and service selections." }, 400);
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
          customerId,
          data.firstName.trim(),
          data.lastName.trim(),
          phone,
          email || null
        ),

        env.DB.prepare(`
          INSERT INTO properties
            (id, customer_id, address_line1, address_line2, city, state, zip_code,
             bedrooms, bathrooms, square_feet)
          VALUES (?, ?, ?, ?, ?, 'AZ', ?, ?, ?, ?)
        `).bind(
          propertyId,
          customerId,
          data.addressLine1.trim(),
          typeof data.addressLine2 === "string" ? data.addressLine2.trim() || null : null,
          data.city.trim(),
          data.zip,
          data.bedrooms,
          data.bathrooms,
          data.squareFeet
        ),

        env.DB.prepare(`
          INSERT INTO estimates
            (id, customer_id, property_id, service_type, approval_status, estimate_notes)
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

      return json({
        success: true,
        estimateId,
        message: "Your quote request was received."
      }, 201);
    } catch {
      return json({ error: "We could not save your request. Please try again." }, 500);
    }
  },
};