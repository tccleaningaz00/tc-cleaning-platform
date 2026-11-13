"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Client = {
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
};
type Line = { description: string; quantity: string; unitPrice: string };
type InvoiceItem = { id: string; description: string; quantity: number; unit_price_cents: number; line_total_cents: number };
type Invoice = {
  id: string; invoice_number: string; client_name: string; client_email: string;
  client_phone?: string; billing_address?: string; issue_date: string; due_date: string; notes?: string;
  status: "draft" | "sending" | "sent" | "paid" | "void";
  payment_url?: string; venmo_url?: string; zelle_recipient?: string;
  receipt_status?: "not_sent" | "sending" | "sent" | "failed";
  sent_at?: string | null; receipt_sent_at?: string | null;
  view_count?: number; first_viewed_at?: string | null; last_viewed_at?: string | null;
  email_tracking_count?: number; email_open_count?: number; email_first_opened_at?: string | null; email_last_opened_at?: string | null;
  has_view_link?: number | boolean;
  subtotal_cents: number; tax_cents: number; deposit_paid_cents: number; total_cents: number; created_at: string; items?: InvoiceItem[];
};

const fieldStyle = { width: "100%", boxSizing: "border-box" as const, padding: "11px 12px", border: "1px solid #cbd5dc", borderRadius: "7px", font: "inherit", color: "#172b3d", background: "#fff" };
const labelStyle = { display: "grid", gap: "6px", color: "#465766", fontSize: "14px", fontWeight: 700 as const };
const buttonStyle = { background: "#16834a", color: "white", border: 0, padding: "11px 16px", borderRadius: "7px", fontWeight: 700 as const, cursor: "pointer" };
const usd = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const phoenixDate = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Phoenix", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const arizonaDateTime = (value?: string | null) => value ? new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", dateStyle: "medium", timeStyle: "short" }).format(new Date(`${value.replace(" ", "T")}Z`)) : "";

function invoiceEmailActivity(invoice: Invoice) {
  if (invoice.email_open_count) return `Email open signals: ${invoice.email_open_count}${invoice.email_first_opened_at ? ` · First ${arizonaDateTime(invoice.email_first_opened_at)}` : ""}${invoice.email_last_opened_at && invoice.email_last_opened_at !== invoice.email_first_opened_at ? ` · Latest ${arizonaDateTime(invoice.email_last_opened_at)}` : ""}`;
  if (invoice.email_tracking_count) return "No email open has been reported yet";
  if (invoice.status === "sent" || invoice.status === "paid") return "Email open reports start with sends after tracking is configured";
  return "";
}
const defaultVenmoUrl = "https://venmo.com/code?user_id=3911407825323357177&created=1794261030";
const defaultZelleRecipient = "(480) 310-8040";

export default function InvoiceManager({ clients }: { clients: Client[] }) {
  const [existing, setExisting] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [issueDate, setIssueDate] = useState(() => phoenixDate(new Date()));
  const [dueDate, setDueDate] = useState(() => phoenixDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)));
  const [notes, setNotes] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [venmoUrl, setVenmoUrl] = useState(defaultVenmoUrl);
  const [zelleRecipient, setZelleRecipient] = useState(defaultZelleRecipient);
  const [taxPercent, setTaxPercent] = useState("0");
  const [depositPaid, setDepositPaid] = useState("");
  const [lines, setLines] = useState<Line[]>([{ description: "", quantity: "1", unitPrice: "" }]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewInvoice, setReviewInvoice] = useState<Invoice | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [senderStatus, setSenderStatus] = useState<"checking" | "ready" | "not-ready" | "unknown">("checking");

  useEffect(() => {
    void loadInvoices();
    void fetch("/api/manager/invoices/sender-status", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ senderReady?: boolean | null }> : null)
      .then((data) => setSenderStatus(data?.senderReady === true ? "ready" : data?.senderReady === false ? "not-ready" : "unknown"))
      .catch(() => setSenderStatus("unknown"));
  }, []);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + Math.round((Number(line.unitPrice) || 0) * 100 * (Number(line.quantity) || 0)), 0);
    const tax = Math.round(subtotal * (Number(taxPercent) || 0) / 100);
    const grossTotal = subtotal + tax;
    const depositPaidCents = Math.round((Number(depositPaid) || 0) * 100);
    return { subtotal, tax, grossTotal, depositPaid: depositPaidCents, total: Math.max(0, grossTotal - depositPaidCents) };
  }, [lines, taxPercent, depositPaid]);

  async function loadInvoices() {
    try {
      const response = await fetch("/api/manager/invoices", { cache: "no-store" });
      const data = await response.json() as { invoices?: Invoice[]; error?: string };
      if (response.ok) setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
    } catch { /* The draft form remains available if invoice history is temporarily unavailable. */ }
  }

  function chooseClient(id: string) {
    setSelectedId(id);
    const client = clients.find((item) => item.customer_id === id);
    if (!client) return;
    setClientName(`${client.first_name} ${client.last_name}`.trim());
    setClientEmail(client.email || "");
    setClientPhone(client.phone || "");
    setBillingAddress([client.address_line1, client.address_line2, [client.city, client.state, client.zip_code].filter(Boolean).join(" ")].filter(Boolean).join("\n"));
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/manager/invoices", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: existing ? selectedId : "", clientName, clientEmail, clientPhone, billingAddress, issueDate, dueDate, notes, paymentUrl, venmoUrl, zelleRecipient, taxPercent: Number(taxPercent), depositPaid: Number(depositPaid || 0), items: lines.map((line) => ({ description: line.description, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice) })) }),
      });
      const data = await response.json() as { invoice?: { invoice_number?: string }; error?: string };
      if (!response.ok) throw new Error(data.error || "The invoice draft could not be saved.");
      setNotice(`Draft ${data.invoice?.invoice_number || "invoice"} saved. Review the recipient and details before sending.`);
      setClientName(""); setClientEmail(""); setClientPhone(""); setBillingAddress(""); setSelectedId(""); setExisting(false); setNotes(""); setPaymentUrl(""); setVenmoUrl(defaultVenmoUrl); setZelleRecipient(defaultZelleRecipient); setTaxPercent("0"); setDepositPaid(""); setLines([{ description: "", quantity: "1", unitPrice: "" }]);
      await loadInvoices();
    } catch (err) { setError(err instanceof Error ? err.message : "The invoice draft could not be saved."); }
    finally { setBusy(false); }
  }

  async function actOnInvoice(invoice: Invoice, action: "send" | "paid") {
    if (action === "send" && !window.confirm(`Send invoice ${invoice.invoice_number} to ${invoice.client_name} at ${invoice.client_email}? It will come from invoices@tccleaningaz.com.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/manager/invoices/${invoice.id}/${action}`, { method: "POST" });
      const data = await response.json() as { error?: string; receiptSent?: boolean };
      if (!response.ok) throw new Error(data.error || "That invoice action could not be completed.");
      setNotice(action === "send" ? `Invoice ${invoice.invoice_number} was sent to ${invoice.client_email}.` : data.receiptSent ? `Invoice ${invoice.invoice_number} marked paid. A branded receipt was emailed to ${invoice.client_email}.` : `Invoice ${invoice.invoice_number} marked paid.`);
      await loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That invoice action could not be completed.");
      if (action === "paid") await loadInvoices();
    }
    finally { setBusy(false); }
  }

  async function reviewInvoiceDetails(invoice: Invoice) {
    setReviewBusy(true); setReviewError("");
    try {
      const response = await fetch(`/api/manager/invoices/${invoice.id}`, { cache: "no-store" });
      const data = await response.json() as { invoice?: Invoice; error?: string };
      if (!response.ok || !data.invoice) throw new Error(data.error || "Invoice details could not be loaded.");
      setReviewInvoice(data.invoice);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Invoice details could not be loaded.");
    } finally { setReviewBusy(false); }
  }

  const visible = invoices.filter((invoice) =>
    (statusFilter === "all" || invoice.status === statusFilter) &&
    `${invoice.invoice_number} ${invoice.client_name} ${invoice.client_email} ${invoice.status}`.toLowerCase().includes(filter.toLowerCase())
  );

  return <div style={{ marginTop: 28 }}>
    <section style={{ background: "white", border: "1px solid #e3e9ed", borderRadius: 12, padding: "clamp(18px, 4vw, 30px)", boxShadow: "0 3px 14px rgba(0,0,0,.04)" }}>
      <p style={{ margin: "0 0 5px", color: "#16834a", fontWeight: 700, letterSpacing: ".08em", fontSize: 12 }}>TC CLEANING SERVICES AZ LLC</p>
      <h2 style={{ margin: "0 0 8px", fontSize: 25 }}>Create an invoice</h2>
      <p style={{ color: "#687786", lineHeight: 1.55, marginTop: 0 }}>Prepare a branded invoice for an existing client or a new customer. Save it as a draft, review the recipient and totals, then send it by email.</p>
      {notice && <p role="status" style={{ padding: 12, borderRadius: 7, background: "#e8f5ec", color: "#176b40" }}>{notice}</p>}
      {error && <p role="alert" style={{ padding: 12, borderRadius: 7, background: "#fff0ef", color: "#8a3028" }}>{error}</p>}
      <form onSubmit={saveDraft}>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", margin: "18px 0" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#354858" }}><input type="radio" checked={!existing} onChange={() => { setExisting(false); setSelectedId(""); }} /> New client</label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#354858" }}><input type="radio" checked={existing} onChange={() => setExisting(true)} /> Existing client</label>
        </div>
        {existing && <label style={{ ...labelStyle, maxWidth: 520, marginBottom: 16 }}>Choose a client<select required value={selectedId} onChange={(event) => chooseClient(event.target.value)} style={fieldStyle}><option value="">Select a client</option>{clients.map((client) => <option key={client.customer_id} value={client.customer_id}>{client.first_name} {client.last_name}{client.email ? ` · ${client.email}` : ""}</option>)}</select></label>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))", gap: 14 }}>
          <label style={labelStyle}>Client name<input required maxLength={160} value={clientName} onChange={(e) => setClientName(e.target.value)} style={fieldStyle} /></label>
          <label style={labelStyle}>Email address<input required type="email" maxLength={254} value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} style={fieldStyle} /></label>
          <label style={labelStyle}>Phone (optional)<input maxLength={50} value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} style={fieldStyle} /></label>
          <label style={labelStyle}>Billing address<textarea rows={2} maxLength={500} value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} style={fieldStyle} /></label>
          <label style={labelStyle}>Invoice date<input required type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} style={fieldStyle} /></label>
          <label style={labelStyle}>Due date<input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={fieldStyle} /></label>
        </div>
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><h3 style={{ margin: 0 }}>Services and charges</h3><button type="button" onClick={() => setLines([...lines, { description: "", quantity: "1", unitPrice: "" }])} style={{ ...buttonStyle, background: "#e8f2eb", color: "#176b40" }}>+ Add line</button></div>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>{lines.map((line, index) => <div key={index} style={{ display: "grid", gridTemplateColumns: "minmax(160px, 1fr) 95px 135px auto", gap: 9, alignItems: "end" }}>
            <label style={labelStyle}>Description<input required maxLength={240} placeholder="e.g. Recurring home cleaning" value={line.description} onChange={(e) => setLines(lines.map((entry, i) => i === index ? { ...entry, description: e.target.value } : entry))} style={fieldStyle} /></label>
            <label style={labelStyle}>Qty<input required type="number" min="0.01" step="0.01" value={line.quantity} onChange={(e) => setLines(lines.map((entry, i) => i === index ? { ...entry, quantity: e.target.value } : entry))} style={fieldStyle} /></label>
            <label style={labelStyle}>Rate ($)<input required type="number" min="0" step="0.01" value={line.unitPrice} onChange={(e) => setLines(lines.map((entry, i) => i === index ? { ...entry, unitPrice: e.target.value } : entry))} style={fieldStyle} /></label>
            <button type="button" aria-label={`Remove line ${index + 1}`} disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, i) => i !== index))} style={{ ...buttonStyle, background: "#f3f6f8", color: "#52616d", padding: "11px 12px", marginBottom: 1 }}>Remove</button>
          </div>)}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))", gap: 14, marginTop: 18 }}>
          <label style={labelStyle}>Tax (%)<input type="number" min="0" max="20" step="0.01" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} style={fieldStyle} /></label>
          <label style={labelStyle}>Deposit already paid ($)<input type="number" min="0" max={(totals.grossTotal / 100).toFixed(2)} step="0.01" value={depositPaid} onChange={(e) => setDepositPaid(e.target.value)} style={fieldStyle} /><span style={{ color: "#687786", fontSize: 13, fontWeight: 400 }}>Enter a deposit the client has already paid. It appears as a credit and reduces the balance due.</span></label>
          <label style={labelStyle}>Notes for the client (optional)<textarea rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} style={fieldStyle} /></label>
          <div style={{ borderRadius: 9, background: "#f3f6f8", padding: 16, alignSelf: "start", color: "#354858" }}><p style={{ margin: "0 0 8px", display: "flex", justifyContent: "space-between", gap: 24 }}>Subtotal <strong>{usd(totals.subtotal)}</strong></p><p style={{ margin: "0 0 8px", display: "flex", justifyContent: "space-between", gap: 24 }}>Tax <strong>{usd(totals.tax)}</strong></p>{totals.depositPaid > 0 && <p style={{ margin: "0 0 8px", display: "flex", justifyContent: "space-between", gap: 24 }}>Deposit paid <strong>−{usd(totals.depositPaid)}</strong></p>}<p style={{ margin: 0, paddingTop: 10, borderTop: "1px solid #d7e0e6", display: "flex", justifyContent: "space-between", gap: 24, fontSize: 19 }}>Balance due <strong>{usd(totals.total)}</strong></p></div>
        </div>
        <label style={{ ...labelStyle, marginTop: 16 }}>Chase payment link (optional)<input type="url" maxLength={2048} placeholder="Paste the Chase QuickAccept payment link" value={paymentUrl} onChange={(event) => setPaymentUrl(event.target.value)} style={fieldStyle} /><span style={{ color: "#687786", fontSize: 13, fontWeight: 400 }}>Create the link in Chase for this invoice total. If added, the customer’s invoice email will include a secure “Pay by card” button.</span></label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))", gap: 14, marginTop: 16 }}>
          <label style={labelStyle}>Venmo link<input type="url" required maxLength={2048} value={venmoUrl} onChange={(event) => setVenmoUrl(event.target.value)} style={fieldStyle} /><span style={{ color: "#687786", fontSize: 13, fontWeight: 400 }}>Customers enter the invoice total in Venmo.</span></label>
          <label style={labelStyle}>Zelle business recipient<input required maxLength={80} value={zelleRecipient} onChange={(event) => setZelleRecipient(event.target.value)} style={fieldStyle} /><span style={{ color: "#687786", fontSize: 13, fontWeight: 400 }}>Customers send the invoice total from their bank’s Zelle feature and include the invoice number.</span></label>
        </div>
        <p style={{ color: "#687786", fontSize: 13 }}>The invoice is branded with the TC Cleaning logo and will be sent from invoices@tccleaningaz.com.</p>
        {senderStatus === "ready" && <p role="status" style={{ padding: 10, borderRadius: 7, background: "#e8f5ec", color: "#176b40", fontSize: 14 }}>The dedicated invoice email key is configured. Resend will check the sender when an invoice is sent.</p>}
        {senderStatus === "not-ready" && <p role="alert" style={{ padding: 10, borderRadius: 7, background: "#fff4dc", color: "#775715", fontSize: 14 }}>A dedicated Resend sending key for tccleaningaz.com is not configured yet. You can save invoice drafts; sending will be available once that key is added to the invoice service.</p>}
        {senderStatus === "unknown" && <p style={{ color: "#775715", fontSize: 14 }}>Sender verification status is unavailable. You may save a draft; if you try sending, the email provider will confirm whether this sender is authorized.</p>}
        <button disabled={busy} type="submit" style={{ ...buttonStyle, opacity: busy ? .65 : 1 }}>{busy ? "Saving…" : "Save invoice draft"}</button>
      </form>
    </section>

    <section style={{ marginTop: 28, background: "white", border: "1px solid #e3e9ed", borderRadius: 12, padding: "clamp(18px, 4vw, 30px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div><h2 style={{ margin: 0 }}>Invoice history</h2><p style={{ color: "#687786", marginBottom: 0 }}>Saved drafts, sent invoices, and paid invoices stay here. Open any invoice to review its original details.</p></div><div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}><button type="button" onClick={() => void loadInvoices()} style={{ ...buttonStyle, background: "#244763" }}>Refresh activity</button><select aria-label="Filter invoices by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...fieldStyle, width: "auto", minWidth: 140 }}><option value="all">All statuses</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="void">Void</option></select><input aria-label="Search invoices" placeholder="Search invoices" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...fieldStyle, maxWidth: 260 }} /></div></div>
      <div style={{ display: "grid", gap: 12, marginTop: 18 }}>{visible.length === 0 ? <p style={{ color: "#687786" }}>{filter ? "No matching invoices." : "No invoices yet. Saved drafts will appear here."}</p> : visible.map((invoice) => <article key={invoice.id} style={{ border: "1px solid #e3e9ed", borderRadius: 9, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div><strong>{invoice.invoice_number}</strong><span style={{ display: "inline-block", marginLeft: 10, padding: "3px 8px", borderRadius: 99, background: invoice.status === "paid" ? "#e5f4e9" : invoice.status === "sent" ? "#e8f0fa" : "#fff4dc", color: "#354858", fontSize: 12, textTransform: "capitalize" }}>{invoice.status}</span><p style={{ margin: "7px 0 0", color: "#52616d" }}>{invoice.client_name} · {invoice.client_email}</p><p style={{ margin: "4px 0 0", color: "#687786", fontSize: 14 }}>Due {invoice.due_date} · {usd(invoice.total_cents)}</p>{invoice.view_count ? <p style={{ margin: "7px 0 0", color: "#176b40", fontSize: 14 }}>Online view recorded in {invoice.view_count} {invoice.view_count === 1 ? "browser session" : "browser sessions"}{invoice.first_viewed_at ? ` · First ${arizonaDateTime(invoice.first_viewed_at)}` : ""}{invoice.last_viewed_at && invoice.last_viewed_at !== invoice.first_viewed_at ? ` · Latest ${arizonaDateTime(invoice.last_viewed_at)}` : ""}</p> : invoice.has_view_link ? <p style={{ margin: "7px 0 0", color: "#687786", fontSize: 14 }}>No online view recorded yet</p> : invoice.status === "sent" || invoice.status === "paid" ? <p style={{ margin: "7px 0 0", color: "#687786", fontSize: 14 }}>Online view tracking applies to invoices sent after this update</p> : null}{invoiceEmailActivity(invoice) && <p style={{ margin: "7px 0 0", color: "#244763", fontSize: 14 }}>{invoiceEmailActivity(invoice)}</p>}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><button disabled={reviewBusy} onClick={() => void reviewInvoiceDetails(invoice)} style={{ ...buttonStyle, background: "#244763", opacity: reviewBusy ? .65 : 1 }}>View invoice</button>{invoice.status === "draft" && <button disabled={busy || senderStatus === "checking" || senderStatus === "not-ready"} onClick={() => void actOnInvoice(invoice, "send")} style={{ ...buttonStyle, opacity: busy || senderStatus === "checking" || senderStatus === "not-ready" ? .55 : 1 }} title={senderStatus === "ready" || senderStatus === "unknown" ? "Confirm the recipient before sending" : "Verify invoices@tccleaningaz.com with the outbound email provider first"}>Review &amp; send</button>}{invoice.status === "sent" && <button disabled={busy} onClick={() => void actOnInvoice(invoice, "paid")} style={{ ...buttonStyle, background: "#244763" }}>Mark paid &amp; send receipt</button>}{invoice.status === "paid" && invoice.receipt_status !== "sent" && <button disabled={busy || invoice.receipt_status === "sending"} onClick={() => void actOnInvoice(invoice, "paid")} style={{ ...buttonStyle, background: "#244763", opacity: busy || invoice.receipt_status === "sending" ? .55 : 1 }}>{invoice.receipt_status === "sending" ? "Sending receipt…" : invoice.receipt_status === "failed" ? "Retry receipt" : "Send receipt"}</button>}{invoice.status === "paid" && invoice.receipt_status === "sent" && <span style={{ color: "#176b40", fontSize: 14 }}>Receipt emailed</span>}</div>
      </article>)}</div>
    </section>
    {reviewError && <p role="alert" style={{ marginTop: 14, padding: 12, borderRadius: 7, background: "#fff0ef", color: "#8a3028" }}>{reviewError}</p>}
    {reviewInvoice && <div style={{ position: "fixed", inset: 0, zIndex: 1000, overflowY: "auto", padding: "20px 12px", background: "rgba(10,20,30,.62)" }}>
      <section role="dialog" aria-modal="true" aria-labelledby="invoice-review-title" style={{ maxWidth: 760, margin: "20px auto", overflow: "hidden", borderRadius: 12, background: "white", boxShadow: "0 16px 50px rgba(0,0,0,.25)" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "20px 24px", background: "#101923", color: "white", borderBottom: "4px solid #8bd34a" }}><div><p style={{ margin: "0 0 6px", color: "#8bd34a", fontWeight: 700, letterSpacing: ".08em", fontSize: 12 }}>TC CLEANING SERVICES AZ LLC</p><h2 id="invoice-review-title" style={{ margin: 0 }}>Invoice {reviewInvoice.invoice_number}</h2><span style={{ display: "inline-block", marginTop: 8, padding: "3px 9px", borderRadius: 99, background: "rgba(255,255,255,.14)", fontSize: 12, textTransform: "capitalize" }}>{reviewInvoice.status}</span></div><button onClick={() => setReviewInvoice(null)} aria-label="Close invoice details" style={{ border: "1px solid rgba(255,255,255,.45)", borderRadius: 7, padding: "8px 12px", background: "transparent", color: "white", fontWeight: 700, cursor: "pointer" }}>Close</button></header>
        <div style={{ padding: "clamp(18px,4vw,28px)", color: "#172b3d" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 18, paddingBottom: 20, borderBottom: "1px solid #e3e9ed" }}><div><strong>Bill to</strong><p style={{ margin: "6px 0 2px" }}>{reviewInvoice.client_name}</p><p style={{ margin: "2px 0", color: "#52616d" }}>{reviewInvoice.client_email}</p>{reviewInvoice.client_phone && <p style={{ margin: "2px 0", color: "#52616d" }}>{reviewInvoice.client_phone}</p>}{reviewInvoice.billing_address && <p style={{ margin: "8px 0 0", color: "#52616d", whiteSpace: "pre-line" }}>{reviewInvoice.billing_address}</p>}</div><div><strong>Invoice dates</strong><p style={{ margin: "6px 0 2px", color: "#52616d" }}>Issued: {reviewInvoice.issue_date}</p><p style={{ margin: "2px 0", color: "#52616d" }}>Due: {reviewInvoice.due_date}</p>{reviewInvoice.sent_at && <p style={{ margin: "8px 0 0", color: "#52616d" }}>Sent: {new Date(reviewInvoice.sent_at).toLocaleString("en-US", { timeZone: "America/Phoenix" })} (Arizona time)</p>}{reviewInvoice.receipt_sent_at && <p style={{ margin: "4px 0 0", color: "#52616d" }}>Receipt sent: {new Date(reviewInvoice.receipt_sent_at).toLocaleString("en-US", { timeZone: "America/Phoenix" })} (Arizona time)</p>}</div></div>
          <h3 style={{ margin: "22px 0 10px" }}>Services and charges</h3><div style={{ borderTop: "1px solid #e3e9ed" }}>{(reviewInvoice.items || []).map((item) => <div key={item.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 54px 100px 100px", gap: 10, padding: "12px 0", borderBottom: "1px solid #e3e9ed", alignItems: "start" }}><span>{item.description}</span><span style={{ textAlign: "right" }}>{item.quantity}</span><span style={{ textAlign: "right" }}>{usd(item.unit_price_cents)}</span><strong style={{ textAlign: "right" }}>{usd(item.line_total_cents)}</strong></div>)}</div>
          <div style={{ maxWidth: 340, margin: "16px 0 0 auto" }}><p style={{ display: "flex", justifyContent: "space-between", margin: "7px 0", color: "#52616d" }}>Subtotal <strong style={{ color: "#172b3d" }}>{usd(reviewInvoice.subtotal_cents)}</strong></p>{reviewInvoice.tax_cents > 0 && <p style={{ display: "flex", justifyContent: "space-between", margin: "7px 0", color: "#52616d" }}>Tax <strong style={{ color: "#172b3d" }}>{usd(reviewInvoice.tax_cents)}</strong></p>}{reviewInvoice.deposit_paid_cents > 0 && <p style={{ display: "flex", justifyContent: "space-between", margin: "7px 0", color: "#52616d" }}>Deposit paid <strong style={{ color: "#172b3d" }}>−{usd(reviewInvoice.deposit_paid_cents)}</strong></p>}<p style={{ display: "flex", justifyContent: "space-between", margin: "10px 0 0", paddingTop: 10, borderTop: "1px solid #d7e0e6", fontSize: 20 }}>Balance due <strong>{usd(reviewInvoice.total_cents)}</strong></p></div>
          {(reviewInvoice.payment_url || reviewInvoice.venmo_url || reviewInvoice.zelle_recipient) && <div style={{ marginTop: 22, padding: 16, background: "#f3f6f8", border: "1px solid #e3e9ed", borderRadius: 8 }}><h3 style={{ margin: "0 0 10px" }}>Payment options saved with this invoice</h3>{reviewInvoice.payment_url && <p style={{ overflowWrap: "anywhere", margin: "7px 0" }}><strong>Chase card link: </strong><a href={reviewInvoice.payment_url} target="_blank" rel="noreferrer">{reviewInvoice.payment_url}</a></p>}{reviewInvoice.venmo_url && <p style={{ overflowWrap: "anywhere", margin: "7px 0" }}><strong>Venmo: </strong><a href={reviewInvoice.venmo_url} target="_blank" rel="noreferrer">{reviewInvoice.venmo_url}</a></p>}{reviewInvoice.zelle_recipient && <p style={{ margin: "7px 0" }}><strong>Zelle: </strong>{reviewInvoice.zelle_recipient}</p>}</div>}
          {reviewInvoice.notes && <div style={{ marginTop: 18 }}><strong>Notes</strong><p style={{ whiteSpace: "pre-line", color: "#52616d" }}>{reviewInvoice.notes}</p></div>}
          <p style={{ margin: "24px 0 0", paddingTop: 14, borderTop: "1px solid #e3e9ed", color: "#687786", fontSize: 13 }}>TC Cleaning Services AZ LLC · (480) 310-8040 · tccleaningaz.com</p>
        </div>
      </section>
    </div>}
  </div>;
}
