
import { createInvoicePdf } from "./invoice-pdf";

interface Env {
  DB: D1Database;
  API_SECRET: string;
  RESEND_API_KEY: string;
  RESEND_INVOICE_API_KEY?: string;
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

interface InvoiceLineInput { description: string; quantity: number; unitPrice: number }
interface InvoiceInput {
  customerId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  billingAddress: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  paymentUrl: string;
  venmoUrl: string;
  zelleRecipient: string;
  taxPercent: number;
  items: InvoiceLineInput[];
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]!));

function parseInvoiceInput(value: unknown): InvoiceInput | null {
  if (!isRecord(value) || !Array.isArray(value.items) || value.items.length < 1 || value.items.length > 30) return null;
  const text = (key: string, max: number, required = false) => {
    const entry = value[key];
    if (typeof entry !== "string" || entry.trim().length > max || (required && !entry.trim())) return null;
    return entry.trim();
  };
  const customerId = text("customerId", 36) || "";
  const clientName = text("clientName", 160, true);
  const clientEmail = text("clientEmail", 254, true);
  const clientPhone = text("clientPhone", 50);
  const billingAddress = text("billingAddress", 500);
  const issueDate = text("issueDate", 10, true);
  const dueDate = text("dueDate", 10, true);
  const notes = text("notes", 2000);
  const rawPaymentUrl = value.paymentUrl;
  let paymentUrl = "";
  const validHttpsUrl = (raw: unknown, maxLength: number) => {
    if (raw === undefined || raw === "") return "";
    if (typeof raw !== "string" || raw.trim().length > maxLength) return null;
    try {
      const url = new URL(raw.trim());
      return url.protocol === "https:" && url.hostname && !url.username && !url.password ? url.toString() : null;
    } catch { return null; }
  };
  const parsedPaymentUrl = validHttpsUrl(rawPaymentUrl, 2048);
  const venmoUrl = validHttpsUrl(value.venmoUrl, 2048);
  if (parsedPaymentUrl === null || venmoUrl === null) return null;
  paymentUrl = parsedPaymentUrl;
  const rawZelleRecipient = value.zelleRecipient;
  if (rawZelleRecipient !== undefined && (typeof rawZelleRecipient !== "string" || rawZelleRecipient.trim().length > 80)) return null;
  const zelleRecipient = typeof rawZelleRecipient === "string" ? rawZelleRecipient.trim() : "";
  const taxPercent = value.taxPercent;
  if (clientName === null || clientEmail === null || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail) || clientPhone === null || billingAddress === null || issueDate === null || dueDate === null || notes === null || !/^\d{4}-\d{2}-\d{2}$/.test(issueDate) || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || typeof taxPercent !== "number" || !Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 20) return null;
  const items: InvoiceLineInput[] = [];
  for (const raw of value.items) {
    if (!isRecord(raw) || typeof raw.description !== "string" || !raw.description.trim() || raw.description.length > 240 || typeof raw.quantity !== "number" || !Number.isFinite(raw.quantity) || raw.quantity <= 0 || raw.quantity > 10000 || typeof raw.unitPrice !== "number" || !Number.isFinite(raw.unitPrice) || raw.unitPrice < 0 || raw.unitPrice > 1000000) return null;
    items.push({ description: raw.description.trim(), quantity: raw.quantity, unitPrice: raw.unitPrice });
  }
  return { customerId, clientName, clientEmail, clientPhone, billingAddress, issueDate, dueDate, notes, paymentUrl, venmoUrl, zelleRecipient, taxPercent, items };
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function getInvoiceLogo() {
  try {
    const response = await fetch("https://www.tccleaningaz.com/images/tc-cleaning-logo.png", { signal: AbortSignal.timeout(5000) });
    if (!response.ok || !response.headers.get("content-type")?.includes("image/png")) return undefined;
    const size = Number(response.headers.get("content-length") || 0);
    if (size > 512_000) return undefined;
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytes.length <= 512_000 ? bytes : undefined;
  } catch {
    return undefined;
  }
}

function invoiceEmailHtml(invoice: InvoiceRow, items: InvoiceItemRow[]) {
  const rows = items.map((item) => `<tr><td style="padding:12px;border-bottom:1px solid #e6ebef">${escapeHtml(item.description)}</td><td style="padding:12px;text-align:center;border-bottom:1px solid #e6ebef">${item.quantity}</td><td style="padding:12px;text-align:right;border-bottom:1px solid #e6ebef">${money(item.unit_price_cents)}</td><td style="padding:12px;text-align:right;border-bottom:1px solid #e6ebef">${money(item.line_total_cents)}</td></tr>`).join("");
  const address = invoice.billing_address ? `<br>${escapeHtml(invoice.billing_address).replace(/\n/g, "<br>")}` : "";
  const notes = invoice.notes ? `<p style="white-space:pre-line;color:#52616d">${escapeHtml(invoice.notes)}</p>` : "";
  const paymentButton = invoice.payment_url ? `<div style="margin:28px 0;text-align:center"><a href="${escapeHtml(invoice.payment_url)}" style="display:inline-block;padding:14px 24px;border-radius:8px;background:#18834a;color:#fff;text-decoration:none;font-weight:bold">Pay by card</a><p style="margin:10px 0 0;color:#687786;font-size:13px">Secure checkout provided by Chase.</p></div>` : "";
  const venmoButton = invoice.venmo_url ? `<div style="margin:16px 0;text-align:center"><a href="${escapeHtml(invoice.venmo_url)}" style="display:inline-block;padding:14px 24px;border-radius:8px;background:#008CFF;color:#fff;text-decoration:none;font-weight:bold">Pay with Venmo</a><p style="margin:10px 0 0;color:#687786;font-size:13px">Enter the invoice total of ${money(invoice.total_cents)} in Venmo.</p></div>` : "";
  const zelleInstructions = invoice.zelle_recipient ? `<div style="margin:16px 0;padding:18px;border:1px solid #dce3e8;border-radius:8px;background:#f8fafb;text-align:center"><strong style="color:#5b2c83">Pay with Zelle</strong><p style="margin:8px 0;color:#354858">In your banking app, choose Zelle and send <strong>${money(invoice.total_cents)}</strong> to:</p><p style="margin:0;font-size:19px;font-weight:bold;color:#172b3d">${escapeHtml(invoice.zelle_recipient)}</p><p style="margin:8px 0 0;color:#687786;font-size:13px">Please include invoice ${escapeHtml(invoice.invoice_number)} in the payment note.</p></div>` : "";
  return `<!doctype html><html><body style="margin:0;background:#f3f6f8;font-family:Arial,sans-serif;color:#172b3d"><div style="max-width:680px;margin:24px auto;background:#fff;border:1px solid #e3e9ed;border-radius:12px;overflow:hidden"><div style="padding:24px 28px;background:#101923;color:#fff"><img src="https://www.tccleaningaz.com/images/tc-cleaning-logo.png" alt="TC Cleaning Services" width="150" style="display:block;background:#fff;border-radius:6px;padding:6px"><p style="color:#8bd34a;font-weight:bold;margin:18px 0 4px">INVOICE ${escapeHtml(invoice.invoice_number)}</p><h1 style="margin:0;font-size:26px">${money(invoice.total_cents)}</h1></div><div style="padding:28px"><p>Hello ${escapeHtml(invoice.client_name)},</p><p>Please find your invoice details below. Payment is due by <strong>${escapeHtml(invoice.due_date)}</strong>.</p><p><strong>Bill to:</strong><br>${escapeHtml(invoice.client_name)}<br>${escapeHtml(invoice.client_email)}${address ? `<br>${address}` : ""}</p><table style="width:100%;border-collapse:collapse;margin-top:22px"><thead><tr style="text-align:left;background:#f3f6f8"><th style="padding:10px">Description</th><th style="padding:10px;text-align:center">Qty</th><th style="padding:10px;text-align:right">Rate</th><th style="padding:10px;text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table><div style="margin:18px 0 0 auto;max-width:260px"><p style="display:flex;justify-content:space-between">Subtotal <strong>${money(invoice.subtotal_cents)}</strong></p>${invoice.tax_cents ? `<p style="display:flex;justify-content:space-between">Tax <strong>${money(invoice.tax_cents)}</strong></p>` : ""}<p style="display:flex;justify-content:space-between;font-size:20px;border-top:1px solid #dce3e8;padding-top:12px">Total <strong>${money(invoice.total_cents)}</strong></p></div>${paymentButton}${venmoButton}${zelleInstructions}${notes}<p style="margin-top:28px;color:#52616d">Thank you for choosing TC Cleaning Services AZ LLC.</p></div><div style="padding:16px 28px;background:#f3f6f8;color:#687786;font-size:13px">TC Cleaning Services AZ LLC · (480) 310-8040 · tccleaningaz.com</div></div></body></html>`;
}

function invoiceReceiptHtml(invoice: InvoiceRow, items: InvoiceItemRow[], paidAt: string) {
  const rows = items.map((item) => `<tr><td style="padding:12px;border-bottom:1px solid #e6ebef">${escapeHtml(item.description)}</td><td style="padding:12px;text-align:center;border-bottom:1px solid #e6ebef">${item.quantity}</td><td style="padding:12px;text-align:right;border-bottom:1px solid #e6ebef">${money(item.line_total_cents)}</td></tr>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#f3f6f8;font-family:Arial,sans-serif;color:#172b3d"><div style="max-width:680px;margin:24px auto;background:#fff;border:1px solid #e3e9ed;border-radius:12px;overflow:hidden"><div style="padding:24px 28px;background:#101923;color:#fff"><img src="https://www.tccleaningaz.com/images/tc-cleaning-logo.png" alt="TC Cleaning Services" width="150" style="display:block;background:#fff;border-radius:6px;padding:6px"><p style="color:#8bd34a;font-weight:bold;margin:18px 0 4px">PAYMENT RECEIPT · ${escapeHtml(invoice.invoice_number)}</p><h1 style="margin:0;font-size:26px">${money(invoice.total_cents)} paid</h1></div><div style="padding:28px"><p>Hello ${escapeHtml(invoice.client_name)},</p><p>We received and recorded your payment for invoice <strong>${escapeHtml(invoice.invoice_number)}</strong>. This email is your receipt.</p><p><strong>Payment recorded:</strong> ${escapeHtml(paidAt)}<br><strong>Invoice:</strong> ${escapeHtml(invoice.invoice_number)}<br><strong>Amount paid:</strong> ${money(invoice.total_cents)}</p><table style="width:100%;border-collapse:collapse;margin-top:22px"><thead><tr style="text-align:left;background:#f3f6f8"><th style="padding:10px">Description</th><th style="padding:10px;text-align:center">Qty</th><th style="padding:10px;text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="2" style="padding:12px;text-align:right;font-weight:bold">Total paid</td><td style="padding:12px;text-align:right;font-weight:bold">${money(invoice.total_cents)}</td></tr></tfoot></table><p style="margin-top:28px;color:#52616d">Thank you for choosing TC Cleaning Services AZ LLC.</p></div><div style="padding:16px 28px;background:#f3f6f8;color:#687786;font-size:13px">TC Cleaning Services AZ LLC · (480) 310-8040 · tccleaningaz.com</div></div></body></html>`;
}

interface InvoiceRow {
  id: string; invoice_number: string; customer_id: string | null; client_name: string; client_email: string;
  client_phone: string; billing_address: string; issue_date: string; due_date: string; notes: string;
  payment_url?: string;
  venmo_url?: string; zelle_recipient?: string;
  status: string; subtotal_cents: number; tax_cents: number; total_cents: number; sent_at: string | null;
  receipt_status?: "not_sent" | "sending" | "sent" | "failed"; receipt_sent_at?: string | null;
  created_at: string; items?: InvoiceItemRow[];
}
interface InvoiceItemRow { id: string; description: string; quantity: number; unit_price_cents: number; line_total_cents: number }

interface ManagerEstimateInput {
  sourceQuoteId: string; customerId: string; clientName: string; clientEmail: string; clientPhone: string;
  propertyAddress: string; serviceType: string; scope: string; validUntil: string;
  depositPercent: number; chasePaymentUrl: string; venmoUrl: string; zelleRecipient: string;
  items: InvoiceLineInput[];
}
interface ManagerEstimateRow {
  id: string; estimate_number: string; source_quote_id: string | null; customer_id: string | null; property_id: string | null;
  client_name: string; client_email: string; client_phone: string; property_address: string; service_type: string;
  scope: string; total_cents: number; deposit_percent: number; deposit_cents: number; status: string;
  approval_token: string | null; chase_payment_url: string; venmo_url: string; zelle_recipient: string;
  valid_until: string; sent_at: string | null; approved_at: string | null; deposit_paid_at: string | null;
  created_at: string; items?: InvoiceItemRow[];
}

function parseManagerEstimateInput(value: unknown): ManagerEstimateInput | null {
  if (!isRecord(value) || !Array.isArray(value.items) || value.items.length < 1 || value.items.length > 30) return null;
  const text = (key: string, max: number, required = false) => {
    const raw = value[key];
    if (typeof raw !== "string" || raw.trim().length > max || (required && !raw.trim())) return null;
    return raw.trim();
  };
  const sourceQuoteId = text("sourceQuoteId", 36) || "";
  const customerId = text("customerId", 36) || "";
  const clientName = text("clientName", 160, true);
  const clientEmail = text("clientEmail", 254, true);
  const clientPhone = text("clientPhone", 50);
  const propertyAddress = text("propertyAddress", 500);
  const serviceType = text("serviceType", 120, true);
  const scope = text("scope", 4000);
  const validUntil = text("validUntil", 10, true);
  const depositPercent = value.depositPercent;
  const url = (key: string) => {
    const raw = value[key];
    if (raw === undefined || raw === "") return "";
    if (typeof raw !== "string" || raw.length > 2048) return null;
    try { const parsed = new URL(raw); return parsed.protocol === "https:" ? parsed.toString() : null; }
    catch { return null; }
  };
  const chasePaymentUrl = url("chasePaymentUrl");
  const venmoUrl = url("venmoUrl");
  const zelleRecipient = text("zelleRecipient", 80);
  if (clientName === null || clientEmail === null || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail) || clientPhone === null || propertyAddress === null || serviceType === null || scope === null || validUntil === null || !/^\d{4}-\d{2}-\d{2}$/.test(validUntil) || typeof depositPercent !== "number" || !Number.isFinite(depositPercent) || depositPercent <= 0 || depositPercent > 100 || chasePaymentUrl === null || venmoUrl === null || zelleRecipient === null) return null;
  const items: InvoiceLineInput[] = [];
  for (const raw of value.items) {
    if (!isRecord(raw) || typeof raw.description !== "string" || !raw.description.trim() || raw.description.length > 240 || typeof raw.quantity !== "number" || !Number.isFinite(raw.quantity) || raw.quantity <= 0 || raw.quantity > 10000 || typeof raw.unitPrice !== "number" || !Number.isFinite(raw.unitPrice) || raw.unitPrice < 0 || raw.unitPrice > 1000000) return null;
    items.push({ description: raw.description.trim(), quantity: raw.quantity, unitPrice: raw.unitPrice });
  }
  return { sourceQuoteId, customerId, clientName, clientEmail, clientPhone, propertyAddress, serviceType, scope, validUntil, depositPercent, chasePaymentUrl, venmoUrl, zelleRecipient, items };
}

function estimateEmailHtml(estimate: ManagerEstimateRow, items: InvoiceItemRow[], publicUrl: string) {
  const rows = items.map((item) => `<tr><td style="padding:12px;border-bottom:1px solid #e6ebef">${escapeHtml(item.description)}</td><td style="padding:12px;text-align:center;border-bottom:1px solid #e6ebef">${item.quantity}</td><td style="padding:12px;text-align:right;border-bottom:1px solid #e6ebef">${money(item.line_total_cents)}</td></tr>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#f3f6f8;font-family:Arial,sans-serif;color:#172b3d"><div style="max-width:680px;margin:24px auto;background:#fff;border:1px solid #e3e9ed;border-radius:12px;overflow:hidden"><div style="padding:24px 28px;background:#101923;color:#fff"><img src="https://www.tccleaningaz.com/images/tc-cleaning-logo.png" alt="TC Cleaning Services" width="150" style="display:block;background:#fff;border-radius:6px;padding:6px"><p style="color:#8bd34a;font-weight:bold;margin:18px 0 4px">CLEANING ESTIMATE ${escapeHtml(estimate.estimate_number)}</p><h1 style="margin:0;font-size:26px">${money(estimate.total_cents)}</h1></div><div style="padding:28px"><p>Hello ${escapeHtml(estimate.client_name)},</p><p>Here is your cleaning estimate from TC Cleaning Services. Please review the scope and line items below. This estimate is valid through <strong>${escapeHtml(estimate.valid_until)}</strong>.</p><p><strong>Service:</strong> ${escapeHtml(estimate.service_type)}<br><strong>Property:</strong> ${escapeHtml(estimate.property_address)}</p>${estimate.scope ? `<p style="white-space:pre-line">${escapeHtml(estimate.scope)}</p>` : ""}<table style="width:100%;border-collapse:collapse"><tbody>${rows}</tbody></table><p style="text-align:right;font-size:21px"><strong>Total: ${money(estimate.total_cents)}</strong></p><div style="margin:24px 0;padding:16px;background:#eef7f0;border-radius:8px"><strong>Deposit to begin: ${money(estimate.deposit_cents)} (${estimate.deposit_percent}%)</strong></div><p style="text-align:center;margin:28px 0"><a href="${escapeHtml(publicUrl)}" style="display:inline-block;padding:14px 24px;border-radius:8px;background:#18834a;color:#fff;text-decoration:none;font-weight:bold">Review and approve estimate</a></p><p style="color:#687786;font-size:13px">Payment options for the deposit are shown after you approve. Payments are confirmed by TC Cleaning Services.</p></div><div style="padding:16px 28px;background:#f3f6f8;color:#687786;font-size:13px">TC Cleaning Services AZ LLC · (480) 310-8040 · tccleaningaz.com</div></div></body></html>`;
}

function publicEstimatePayload(estimate: ManagerEstimateRow, items: InvoiceItemRow[]) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Phoenix" }).format(new Date());
  return {
    estimateNumber: estimate.estimate_number, clientName: estimate.client_name, propertyAddress: estimate.property_address,
    serviceType: estimate.service_type, scope: estimate.scope, totalCents: estimate.total_cents,
    depositPercent: estimate.deposit_percent, depositCents: estimate.deposit_cents,
    status: estimate.status === "sent" && estimate.valid_until < today ? "expired" : estimate.status,
    validUntil: estimate.valid_until, items: items.map((item) => ({ description: item.description, quantity: item.quantity, lineTotalCents: item.line_total_cents })),
    paymentOptions: estimate.status === "approved" || estimate.status === "deposit_paid" ? {
      chasePaymentUrl: estimate.chase_payment_url, venmoUrl: estimate.venmo_url,
      zelleRecipient: estimate.zelle_recipient,
    } : null,
  };
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
    const managerInvoiceSendMatch = path.match(/^\/manager-invoices\/([^/]+)\/send$/);
    const managerInvoicePaidMatch = path.match(/^\/manager-invoices\/([^/]+)\/paid$/);
    const managerInvoiceMatch = path.match(/^\/manager-invoices\/([^/]+)$/);
    const managerEstimateSendMatch = path.match(/^\/manager-estimates\/([^/]+)\/send$/);
    const managerEstimatePaidMatch = path.match(/^\/manager-estimates\/([^/]+)\/deposit-paid$/);
    const publicEstimateMatch = path.match(/^\/public-estimates\/([^/]+)(?:\/(approve))?$/);
    const publicArticleRoute = path === "/articles" || Boolean(publicArticleMatch);
    const managerArticleRoute = path === "/manager-articles" || Boolean(managerArticleMatch);
    const managerCustomerRoute = path === "/manager-customers" || Boolean(managerCustomerMatch);
    const managerInvoiceRoute = path === "/manager-invoices" || path === "/manager-invoice-sender-status" || Boolean(managerInvoiceMatch) || Boolean(managerInvoiceSendMatch) || Boolean(managerInvoicePaidMatch);
    const managerEstimateRoute = path === "/manager-estimates" || Boolean(managerEstimateSendMatch) || Boolean(managerEstimatePaidMatch);
    const publicEstimateRoute = Boolean(publicEstimateMatch);
    const existingRoute = ["/quote", "/calendar-token", "/calendar-events", "/customers"].includes(path);

    if (!publicArticleRoute && !publicEstimateRoute && !managerArticleRoute && !managerCustomerRoute && !managerInvoiceRoute && !managerEstimateRoute && !existingRoute) {
      return json({ error: "Not found" }, 404);
    }

    const authorization = request.headers.get("Authorization");

    if (
      !publicArticleRoute && !publicEstimateRoute &&
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

    if (publicEstimateMatch) {
      const token = publicEstimateMatch[1];
      if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return json({ error: "Estimate link is invalid or expired." }, 404);
      try {
        const estimate = await env.DB.prepare("SELECT * FROM manager_estimates WHERE approval_token = ?").bind(token).first<ManagerEstimateRow>();
        if (!estimate) return json({ error: "Estimate link is invalid or expired." }, 404);
        const items = await env.DB.prepare("SELECT id, description, quantity, unit_price_cents, line_total_cents FROM manager_estimate_items WHERE estimate_id = ? ORDER BY rowid").bind(estimate.id).all<InvoiceItemRow>();
        if (publicEstimateMatch[2] === "approve") {
          if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
          if (estimate.status !== "sent") return estimate.status === "approved" || estimate.status === "deposit_paid" ? json({ success: true, alreadyApproved: true, estimate: publicEstimatePayload(estimate, items.results || []) }) : json({ error: "This estimate is not available for approval." }, 409);
          if (estimate.valid_until < new Date().toISOString().slice(0, 10)) return json({ error: "This estimate has expired. Please contact TC Cleaning Services for an updated estimate." }, 410);
          const claimed = await env.DB.prepare("UPDATE manager_estimates SET status = 'approved', approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'sent'").bind(estimate.id).run();
          if (!claimed.meta.changes) return json({ error: "Estimate status changed. Reload this page." }, 409);
          const approved = { ...estimate, status: "approved" };
          return json({ success: true, estimate: publicEstimatePayload(approved, items.results || []) });
        }
        return json({ success: true, estimate: publicEstimatePayload(estimate, items.results || []) });
      } catch (error) {
        console.error("Public estimate request failed.", { errorName: error instanceof Error ? error.name : "UnknownError" });
        return json({ error: "This estimate is temporarily unavailable." }, 500);
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

    if (managerEstimateRoute) {
      if (path === "/manager-estimates" && request.method === "GET") {
        try {
          const estimates = await env.DB.prepare(`SELECT e.*, (SELECT COUNT(*) FROM manager_estimate_items i WHERE i.estimate_id = e.id) AS item_count FROM manager_estimates e ORDER BY e.created_at DESC LIMIT 200`).all<ManagerEstimateRow>();
          const quotes = await env.DB.prepare(`
            SELECT e.id AS quote_id, e.customer_id, e.property_id, e.service_type, e.estimate_notes, e.created_at,
              c.first_name, c.last_name, c.email, c.phone,
              p.address_line1, p.address_line2, p.city, p.state, p.zip_code, p.bedrooms, p.bathrooms, p.square_feet
            FROM estimates e JOIN customers c ON c.id = e.customer_id JOIN properties p ON p.id = e.property_id
            LEFT JOIN manager_estimates me ON me.source_quote_id = e.id
            WHERE e.approval_status = 'pending' AND me.id IS NULL
            ORDER BY e.created_at DESC LIMIT 200
          `).all<Record<string, unknown>>();
          return json({ success: true, estimates: estimates.results || [], incomingQuotes: quotes.results || [] });
        } catch (error) {
          console.error("Estimate manager list could not be loaded.", { errorName: error instanceof Error ? error.name : "UnknownError" });
          return json({ error: "Estimates and website quote requests are temporarily unavailable." }, 500);
        }
      }

      if (path === "/manager-estimates" && request.method === "POST") {
        if (!request.headers.get("Content-Type")?.includes("application/json")) return json({ error: "JSON required." }, 415);
        let input: ManagerEstimateInput | null;
        try { input = parseManagerEstimateInput(await request.json()); } catch { input = null; }
        if (!input) return json({ error: "Check the client, estimate, payment, and deposit details." }, 400);
        if (input.sourceQuoteId && !/^[0-9a-f-]{36}$/i.test(input.sourceQuoteId)) return json({ error: "Website request not found." }, 404);
        if (input.customerId && !/^[0-9a-f-]{36}$/i.test(input.customerId)) return json({ error: "Selected client is invalid." }, 400);
        if (input.sourceQuoteId && !input.customerId) return json({ error: "Select a valid customer for this website request." }, 400);
        if (input.validUntil < new Date().toISOString().slice(0, 10)) return json({ error: "The expiration date must be today or later." }, 400);
        const id = crypto.randomUUID();
        const estimateNumber = `TCE-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${id.slice(0, 6).toUpperCase()}`;
        const lineItems = input.items.map((item) => ({ ...item, unitPriceCents: Math.round(item.unitPrice * 100), lineTotalCents: Math.round(item.unitPrice * 100 * item.quantity) }));
        if (lineItems.some((item) => !Number.isSafeInteger(item.lineTotalCents))) return json({ error: "An estimate line amount is too large." }, 400);
        const total = lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0);
        const deposit = Math.round(total * input.depositPercent / 100);
        if (!Number.isSafeInteger(total) || !Number.isSafeInteger(deposit)) return json({ error: "Estimate total is too large." }, 400);
        try {
          if (input.sourceQuoteId) {
            const source = await env.DB.prepare("SELECT id, customer_id, property_id FROM estimates WHERE id = ? AND approval_status = 'pending'").bind(input.sourceQuoteId).first<{ id: string; customer_id: string; property_id: string }>();
            if (!source || source.customer_id !== input.customerId) return json({ error: "Website quote request not found or no longer pending." }, 404);
            const duplicate = await env.DB.prepare("SELECT estimate_number FROM manager_estimates WHERE source_quote_id = ?").bind(input.sourceQuoteId).first<{ estimate_number: string }>();
            if (duplicate) return json({ error: `This request has already been converted to ${duplicate.estimate_number}.` }, 409);
          }
          if (input.customerId) {
            const customer = await env.DB.prepare("SELECT id FROM customers WHERE id = ?").bind(input.customerId).first<{ id: string }>();
            if (!customer) return json({ error: "Selected client was not found." }, 404);
          }
          const sourceProperty = input.sourceQuoteId ? await env.DB.prepare("SELECT property_id FROM estimates WHERE id = ?").bind(input.sourceQuoteId).first<{ property_id: string }>() : null;
          await env.DB.batch([
            env.DB.prepare(`INSERT INTO manager_estimates (id, estimate_number, source_quote_id, customer_id, property_id, client_name, client_email, client_phone, property_address, service_type, scope, total_cents, deposit_percent, deposit_cents, chase_payment_url, venmo_url, zelle_recipient, valid_until) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .bind(id, estimateNumber, input.sourceQuoteId || null, input.customerId || null, sourceProperty?.property_id || null, input.clientName, input.clientEmail, input.clientPhone, input.propertyAddress, input.serviceType, input.scope, total, input.depositPercent, deposit, input.chasePaymentUrl, input.venmoUrl, input.zelleRecipient, input.validUntil),
            ...lineItems.map((item) => env.DB.prepare("INSERT INTO manager_estimate_items (id, estimate_id, description, quantity, unit_price_cents, line_total_cents) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), id, item.description, item.quantity, item.unitPriceCents, item.lineTotalCents)),
          ]);
          const estimate = await env.DB.prepare("SELECT * FROM manager_estimates WHERE id = ?").bind(id).first<ManagerEstimateRow>();
          return json({ success: true, estimate }, 201);
        } catch (error) {
          console.error("Estimate draft could not be saved.", { errorName: error instanceof Error ? error.name : "UnknownError" });
          return json({ error: "Estimate draft could not be saved." }, 500);
        }
      }

      if (managerEstimateSendMatch && request.method === "POST") {
        const id = managerEstimateSendMatch[1];
        if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Estimate not found." }, 404);
        if (!env.RESEND_INVOICE_API_KEY) return json({ error: "Estimate email is not configured. The saved draft is available." }, 503);
        try {
          const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
          const token = btoa(String.fromCharCode(...tokenBytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
          const claimed = await env.DB.prepare("UPDATE manager_estimates SET status = 'sending', approval_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'draft'").bind(token, id).run();
          if (!claimed.meta.changes) return json({ error: "Only a saved draft can be sent. Refresh the estimate list for its current status." }, 409);
          const estimate = await env.DB.prepare("SELECT * FROM manager_estimates WHERE id = ?").bind(id).first<ManagerEstimateRow>();
          const items = await env.DB.prepare("SELECT id, description, quantity, unit_price_cents, line_total_cents FROM manager_estimate_items WHERE estimate_id = ? ORDER BY rowid").bind(id).all<InvoiceItemRow>();
          if (!estimate) throw new Error("Estimate record missing after send claim.");
          const publicUrl = `https://www.tccleaningaz.com/estimate/${token}`;
          const emailResponse = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_INVOICE_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: "TC Cleaning Services <quotes@tccleaningaz.com>", to: [estimate.client_email], subject: `Cleaning estimate ${estimate.estimate_number} from TC Cleaning Services`, text: [`Hello ${estimate.client_name},`, "", `Your estimate ${estimate.estimate_number} totals ${money(estimate.total_cents)}.`, `Deposit to begin: ${money(estimate.deposit_cents)} (${estimate.deposit_percent}%).`, `Valid through ${estimate.valid_until}.`, "", `Review and approve your estimate: ${publicUrl}`, "", "Payment options are shown after approval.", "TC Cleaning Services AZ LLC · (480) 310-8040"].join("\n"), html: estimateEmailHtml(estimate, items.results || [], publicUrl) }) });
          if (!emailResponse.ok) {
            await env.DB.prepare("UPDATE manager_estimates SET status = 'draft', approval_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'sending'").bind(id).run();
            console.error("Estimate email provider rejected the message.", { providerStatus: emailResponse.status });
            return json({ error: emailResponse.status === 403 ? "The quotes sender is not authorized by the email provider. The estimate draft remains saved." : "The estimate email could not be accepted. Confirm quotes@tccleaningaz.com sender verification; the draft remains saved." }, 502);
          }
          await env.DB.prepare("UPDATE manager_estimates SET status = 'sent', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'sending'").bind(id).run();
          return json({ success: true });
        } catch (error) {
          await env.DB.prepare("UPDATE manager_estimates SET status = 'draft', approval_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'sending'").bind(id).run().catch(() => undefined);
          console.error("Estimate email could not be sent.", { errorName: error instanceof Error ? error.name : "UnknownError" });
          return json({ error: "The estimate email could not be sent. The saved draft is available to retry." }, 502);
        }
      }

      if (managerEstimatePaidMatch && request.method === "POST") {
        const id = managerEstimatePaidMatch[1];
        if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Estimate not found." }, 404);
        const result = await env.DB.prepare("UPDATE manager_estimates SET status = 'deposit_paid', deposit_paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'approved'").bind(id).run();
        if (!result.meta.changes) return json({ error: "Only an approved estimate can be marked as having its deposit paid. Confirm payment in Chase, Venmo, or Zelle first." }, 409);
        return json({ success: true });
      }
      return json({ error: "Method not allowed." }, 405);
    }

    if (managerInvoiceRoute) {
      if (request.method === "GET" && path === "/manager-invoice-sender-status") {
        const senderReady = Boolean(env.RESEND_INVOICE_API_KEY);
        return json({ senderReady, reason: senderReady ? "invoice_key_configured" : "invoice_key_missing" });
      }

      if (request.method === "GET" && path === "/manager-invoices") {
        try {
          const result = await env.DB.prepare(`
            SELECT i.*, COALESCE(SUM(ii.line_total_cents), 0) AS item_total_cents
            FROM invoices i LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
            GROUP BY i.id ORDER BY i.created_at DESC LIMIT 200
          `).all<InvoiceRow>();
          return json({ success: true, invoices: result.results || [] });
        } catch (error) {
          console.error("Invoice list could not be loaded.", { errorName: error instanceof Error ? error.name : "UnknownError" });
          return json({ error: "Invoices are temporarily unavailable." }, 500);
        }
      }

      if (request.method === "POST" && path === "/manager-invoices") {
        if (!request.headers.get("Content-Type")?.includes("application/json")) return json({ error: "JSON required." }, 415);
        let input: InvoiceInput | null;
        try { input = parseInvoiceInput(await request.json()); } catch { input = null; }
        if (!input) return json({ error: "Check the client details, dates, line items, and tax rate." }, 400);
        if (input.customerId && !/^[0-9a-f-]{36}$/i.test(input.customerId)) return json({ error: "Selected client is invalid." }, 400);
        const id = crypto.randomUUID();
        const invoiceNumber = `TC-${input.issueDate.replaceAll("-", "")}-${id.slice(0, 6).toUpperCase()}`;
        const itemRows = input.items.map((item) => ({
          ...item,
          unitPriceCents: Math.round(item.unitPrice * 100),
          lineTotalCents: Math.round(item.unitPrice * 100 * item.quantity),
        }));
        if (itemRows.some((item) => !Number.isSafeInteger(item.lineTotalCents))) return json({ error: "An invoice line amount is too large." }, 400);
        const subtotal = itemRows.reduce((sum, item) => sum + item.lineTotalCents, 0);
        const tax = Math.round(subtotal * input.taxPercent / 100);
        const total = subtotal + tax;
        if (!Number.isSafeInteger(total)) return json({ error: "Invoice total is too large." }, 400);
        try {
          if (input.customerId) {
            const customer = await env.DB.prepare("SELECT id FROM customers WHERE id = ? AND customer_status = 'active'").bind(input.customerId).first<{ id: string }>();
            if (!customer) return json({ error: "Selected client was not found." }, 404);
          }
          const statements = [env.DB.prepare(`
            INSERT INTO invoices (id, invoice_number, customer_id, client_name, client_email, client_phone, billing_address, issue_date, due_date, notes, subtotal_cents, tax_cents, total_cents, payment_url, venmo_url, zelle_recipient)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(id, invoiceNumber, input.customerId || null, input.clientName, input.clientEmail, input.clientPhone, input.billingAddress, input.issueDate, input.dueDate, input.notes, subtotal, tax, total, input.paymentUrl, input.venmoUrl, input.zelleRecipient),
          ...itemRows.map((item) => env.DB.prepare(`
            INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price_cents, line_total_cents)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(crypto.randomUUID(), id, item.description, item.quantity, item.unitPriceCents, item.lineTotalCents))];
          await env.DB.batch(statements);
          const invoice = await env.DB.prepare("SELECT * FROM invoices WHERE id = ?").bind(id).first<InvoiceRow>();
          return json({ success: true, invoice }, 201);
        } catch (error) {
          console.error("Invoice draft could not be saved.", { errorName: error instanceof Error ? error.name : "UnknownError" });
          return json({ error: "Invoice draft could not be saved." }, 500);
        }
      }

      if (request.method === "POST" && managerInvoiceSendMatch) {
        const id = managerInvoiceSendMatch[1];
        if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Invoice not found." }, 404);
        if (!env.RESEND_INVOICE_API_KEY) return json({ error: "Invoice sending is not configured yet. The draft is saved; configure the dedicated invoice email key to send from invoices@tccleaningaz.com." }, 503);
        try {
          const claimed = await env.DB.prepare("UPDATE invoices SET status = 'sending', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'draft'").bind(id).run();
          if (!claimed.meta.changes) return json({ error: "Only a saved draft can be sent. Refresh the invoice list to see its latest status." }, 409);
          const invoice = await env.DB.prepare("SELECT * FROM invoices WHERE id = ?").bind(id).first<InvoiceRow>();
          const items = await env.DB.prepare("SELECT id, description, quantity, unit_price_cents, line_total_cents FROM invoice_items WHERE invoice_id = ? ORDER BY rowid").bind(id).all<InvoiceItemRow>();
          if (!invoice) throw new Error("Invoice record missing after send claim.");
          const lines = (items.results || []).map((item) => `${item.description} | ${item.quantity} × ${money(item.unit_price_cents)} = ${money(item.line_total_cents)}`).join("\n");
          const textBody = [`TC CLEANING SERVICES AZ LLC`, `Invoice ${invoice.invoice_number}`, `Issued: ${invoice.issue_date}`, `Due: ${invoice.due_date}`, "", `Bill to: ${invoice.client_name}`, invoice.client_email, invoice.billing_address, "", lines, "", `Subtotal: ${money(invoice.subtotal_cents)}`, ...(invoice.tax_cents ? [`Tax: ${money(invoice.tax_cents)}`] : []), `Total due: ${money(invoice.total_cents)}`, ...(invoice.payment_url ? ["", "Pay by card via Chase:", invoice.payment_url] : []), ...(invoice.venmo_url ? ["", "Pay with Venmo:", invoice.venmo_url, `Enter ${money(invoice.total_cents)} and note invoice ${invoice.invoice_number}.`] : []), ...(invoice.zelle_recipient ? ["", "Pay with Zelle from your banking app:", invoice.zelle_recipient, `Send ${money(invoice.total_cents)} and note invoice ${invoice.invoice_number}.`] : []), invoice.notes ? `\n${invoice.notes}` : "", "", "Thank you for choosing TC Cleaning Services.", "(480) 310-8040 | tccleaningaz.com"].filter(Boolean).join("\n");
          let invoicePdf: Uint8Array;
          try {
            invoicePdf = await createInvoicePdf(invoice, items.results || [], await getInvoiceLogo());
          } catch (error) {
            await env.DB.prepare("UPDATE invoices SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'sending'").bind(id).run();
            console.error("Invoice PDF could not be generated; email was not sent.", { errorName: error instanceof Error ? error.name : "UnknownError" });
            return json({ error: "The branded invoice PDF could not be prepared, so the invoice was not sent. The saved draft is available to retry." }, 500);
          }
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${env.RESEND_INVOICE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "TC Cleaning Services <invoices@tccleaningaz.com>",
              to: [invoice.client_email],
              subject: `Invoice ${invoice.invoice_number} from TC Cleaning Services`,
              text: textBody,
              html: invoiceEmailHtml(invoice, items.results || []),
              attachments: [{ filename: `TC-Cleaning-Invoice-${invoice.invoice_number}.pdf`, content: bytesToBase64(invoicePdf), content_type: "application/pdf" }],
            }),
          });
          if (!emailResponse.ok) {
            const providerStatus = emailResponse.status;
            await env.DB.prepare("UPDATE invoices SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'sending'").bind(id).run();
            console.error("Invoice email provider rejected the message.", { providerStatus });
            return json({ error: providerStatus === 403 ? "The Resend key for invoice sending is not authorized for tccleaningaz.com. The draft is still saved." : providerStatus === 422 ? "Resend did not accept invoices@tccleaningaz.com. Check the sender verification and invoice details; the draft is still saved." : providerStatus === 401 ? "The invoice email key was rejected by Resend. The draft is still saved." : "The invoice email could not be sent. The draft is still saved." }, 502);
          }
          await env.DB.prepare("UPDATE invoices SET status = 'sent', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'sending'").bind(id).run();
          return json({ success: true });
        } catch (error) {
          await env.DB.prepare("UPDATE invoices SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'sending'").bind(id).run().catch(() => undefined);
          console.error("Invoice email could not be sent.", { errorName: error instanceof Error ? error.name : "UnknownError" });
          return json({ error: "The invoice email could not be sent. The saved draft is available to retry." }, 502);
        }
      }

      if (request.method === "POST" && managerInvoicePaidMatch) {
        const id = managerInvoicePaidMatch[1];
        if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Invoice not found." }, 404);
        if (!env.RESEND_INVOICE_API_KEY) return json({ error: "Invoice was not marked paid because receipt email is not configured." }, 503);
        try {
          const invoice = await env.DB.prepare("SELECT * FROM invoices WHERE id = ?").bind(id).first<InvoiceRow>();
          if (!invoice) return json({ error: "Invoice not found." }, 404);
          if (invoice.status !== "sent" && invoice.status !== "paid") return json({ error: "Only sent invoices can be marked paid." }, 409);
          if (invoice.status === "paid" && invoice.receipt_status === "sent") return json({ success: true, receiptSent: true, alreadyPaid: true });
          if (invoice.status === "paid" && invoice.receipt_status === "sending") return json({ error: "The receipt is already being sent. Refresh the invoice list shortly." }, 409);
          const claimed = await env.DB.prepare("UPDATE invoices SET status = 'paid', receipt_status = 'sending', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND ((status = 'sent') OR (status = 'paid' AND receipt_status IN ('not_sent', 'failed')))").bind(id).run();
          if (!claimed.meta.changes) return json({ error: "The payment or receipt state changed. Refresh the invoice list and try again." }, 409);
          const items = await env.DB.prepare("SELECT id, description, quantity, unit_price_cents, line_total_cents FROM invoice_items WHERE invoice_id = ? ORDER BY rowid").bind(id).all<InvoiceItemRow>();
          const paidAt = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "America/Phoenix" }).format(new Date());
          const textBody = [`TC CLEANING SERVICES AZ LLC`, `PAYMENT RECEIPT · ${invoice.invoice_number}`, "", `Hello ${invoice.client_name},`, `We received and recorded your payment for invoice ${invoice.invoice_number}.`, `Payment recorded: ${paidAt}`, `Amount paid: ${money(invoice.total_cents)}`, "", "Items:", ...(items.results || []).map((item) => `${item.description} × ${item.quantity} — ${money(item.line_total_cents)}`), "", `Total paid: ${money(invoice.total_cents)}`, "", "Thank you for choosing TC Cleaning Services AZ LLC.", "(480) 310-8040 | tccleaningaz.com"].join("\n");
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${env.RESEND_INVOICE_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `invoice-receipt-${invoice.id}` },
            body: JSON.stringify({
              from: "TC Cleaning Services <invoices@tccleaningaz.com>",
              to: [invoice.client_email],
              subject: `Payment receipt for invoice ${invoice.invoice_number}`,
              text: textBody,
              html: invoiceReceiptHtml(invoice, items.results || [], paidAt),
            }),
          });
          if (!emailResponse.ok) {
            await env.DB.prepare("UPDATE invoices SET receipt_status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND receipt_status = 'sending'").bind(id).run();
            console.error("Invoice receipt provider rejected the message.", { providerStatus: emailResponse.status });
            return json({ error: "Invoice marked paid, but the receipt email was not accepted. Use Send receipt to retry." }, 502);
          }
          await env.DB.prepare("UPDATE invoices SET receipt_status = 'sent', receipt_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND receipt_status = 'sending'").bind(id).run();
          return json({ success: true, receiptSent: true });
        } catch (error) {
          await env.DB.prepare("UPDATE invoices SET receipt_status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND receipt_status = 'sending'").bind(id).run().catch(() => undefined);
          console.error("Invoice receipt could not be sent.", { errorName: error instanceof Error ? error.name : "UnknownError" });
          return json({ error: "Invoice marked paid, but the receipt could not be sent. Use Send receipt to retry." }, 502);
        }
      }

      return json({ error: "Method not allowed." }, 405);
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
        `).bind(estimateId, customerId, propertyId, data.service, notes),
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
