"use client";

import { useEffect, useMemo, useState } from "react";

type Client = { customer_id: string; first_name: string; last_name: string; email: string | null; phone: string | null; address_line1?: string | null; address_line2?: string | null; city?: string | null; state?: string | null; zip_code?: string | null };
type Quote = { quote_id: string; customer_id: string; property_id: string; service_type: string; estimate_notes: string; created_at: string; first_name: string; last_name: string; email: string | null; phone: string | null; address_line1: string; address_line2: string | null; city: string; state: string; zip_code: string | null; bedrooms: number | null; bathrooms: number | null; square_feet: number | null };
type Item = { description: string; quantity: string; unitPrice: string };
type Estimate = { id: string; estimate_number: string; client_name: string; client_email: string; service_type: string; status: string; total_cents: number; deposit_cents: number; valid_until: string; created_at: string };
const field: React.CSSProperties = { display: "block", width: "100%", boxSizing: "border-box", marginTop: 6, padding: "11px 12px", border: "1px solid #cbd5dc", borderRadius: 7, fontSize: 15, color: "#172b3d", background: "white" };
const label: React.CSSProperties = { display: "block", color: "#354858", fontWeight: 700, fontSize: 14 };
const btn: React.CSSProperties = { border: 0, borderRadius: 7, padding: "11px 16px", background: "#16834a", color: "white", fontWeight: 700, cursor: "pointer" };
const usd = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const venmoDefault = "https://venmo.com/code?user_id=3911407825323357177&created=1794261030";
const zelleDefault = "(480) 310-8040";

export default function EstimateManager({ clients }: { clients: Client[] }) {
  const [quotes, setQuotes] = useState<Quote[]>([]); const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [sourceQuoteId, setSourceQuoteId] = useState(""); const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState(""); const [address, setAddress] = useState("");
  const [service, setService] = useState(""); const [scope, setScope] = useState(""); const [validUntil, setValidUntil] = useState(""); const [depositPercent, setDepositPercent] = useState("");
  const [chase, setChase] = useState(""); const [venmo, setVenmo] = useState(venmoDefault); const [zelle, setZelle] = useState(zelleDefault);
  const [items, setItems] = useState<Item[]>([{ description: "", quantity: "1", unitPrice: "" }]);
  const [notice, setNotice] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [filter, setFilter] = useState("");
  const totalCents = useMemo(() => items.reduce((sum, i) => sum + Math.round(Number(i.unitPrice || 0) * 100 * Number(i.quantity || 0)), 0), [items]);
  const depositCents = Math.round(totalCents * Number(depositPercent || 0) / 100);

  async function load() {
    const response = await fetch("/api/manager/estimates", { cache: "no-store" }); const data = await response.json() as { incomingQuotes?: Quote[]; estimates?: Estimate[]; error?: string };
    if (!response.ok) throw new Error(data.error || "Could not load estimates.");
    setQuotes(data.incomingQuotes || []); setEstimates(data.estimates || []);
  }
  useEffect(() => {
    void fetch("/api/manager/estimates", { cache: "no-store" }).then(async (response) => {
      const data = await response.json() as { incomingQuotes?: Quote[]; estimates?: Estimate[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not load estimates.");
      setQuotes(data.incomingQuotes || []); setEstimates(data.estimates || []);
    }).catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load estimates."));
  }, []);

  function resetForm() {
    setSourceQuoteId(""); setCustomerId(""); setName(""); setEmail(""); setPhone(""); setAddress(""); setService(""); setScope(""); setValidUntil(""); setDepositPercent(""); setChase(""); setVenmo(venmoDefault); setZelle(zelleDefault); setItems([{ description: "", quantity: "1", unitPrice: "" }]);
  }
  function chooseQuote(id: string) {
    setSourceQuoteId(id);
    const q = quotes.find((entry) => entry.quote_id === id); if (!q) return;
    setCustomerId(q.customer_id);
    setName(`${q.first_name} ${q.last_name}`); setEmail(q.email || ""); setPhone(q.phone || ""); setAddress([q.address_line1, q.address_line2, [q.city, q.state, q.zip_code].filter(Boolean).join(" ")].filter(Boolean).join(", "));
    setService(q.service_type.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()));
    setScope([q.estimate_notes, q.bedrooms ? `${q.bedrooms} bedrooms` : "", q.bathrooms ? `${q.bathrooms} bathrooms` : "", q.square_feet ? `${q.square_feet.toLocaleString()} sq ft` : ""].filter(Boolean).join("\n"));
    setItems([{ description: `${q.service_type.replaceAll("_", " ")} cleaning`, quantity: "1", unitPrice: "" }]);
  }
  function chooseClient(id: string) {
    setCustomerId(id); setSourceQuoteId(""); const client = clients.find((c) => c.customer_id === id); if (!client) return;
    setName(`${client.first_name} ${client.last_name}`); setEmail(client.email || ""); setPhone(client.phone || "");
    setAddress([client.address_line1, client.address_line2, [client.city, client.state, client.zip_code].filter(Boolean).join(" ")].filter(Boolean).join(", "));
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/manager/estimates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceQuoteId, customerId, clientName: name, clientEmail: email, clientPhone: phone, propertyAddress: address, serviceType: service, scope, validUntil, depositPercent: Number(depositPercent), chasePaymentUrl: chase, venmoUrl: venmo, zelleRecipient: zelle, items: items.map((i) => ({ description: i.description, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })) }) });
      const data = await response.json() as { estimate?: Estimate; error?: string }; if (!response.ok) throw new Error(data.error || "Estimate draft could not be saved.");
      setNotice(`Draft ${data.estimate?.estimate_number || "estimate"} saved. Review the amount, deposit, and recipient before sending.`); resetForm(); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Estimate draft could not be saved."); }
    finally { setBusy(false); }
  }
  async function act(estimate: Estimate, action: "send" | "deposit-paid") {
    if (action === "send" && !window.confirm(`Send estimate ${estimate.estimate_number} to ${estimate.client_name} at ${estimate.client_email} from quotes@tccleaningaz.com?`)) return;
    if (action === "deposit-paid" && !window.confirm(`Confirm that the ${usd(estimate.deposit_cents)} deposit for ${estimate.estimate_number} has arrived in Chase, Venmo, or Zelle?`)) return;
    setBusy(true); setError(""); setNotice("");
    try { const response = await fetch(`/api/manager/estimates/${estimate.id}/${action}`, { method: "POST" }); const data = await response.json() as { error?: string }; if (!response.ok) throw new Error(data.error || "Estimate action failed."); setNotice(action === "send" ? `Estimate ${estimate.estimate_number} sent to ${estimate.client_email}.` : `Deposit recorded for ${estimate.estimate_number}.`); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Estimate action failed."); }
    finally { setBusy(false); }
  }
  const visible = estimates.filter((e) => `${e.estimate_number} ${e.client_name} ${e.client_email} ${e.status}`.toLowerCase().includes(filter.toLowerCase()));

  return <div style={{ marginTop: 28 }}>
    <section style={{ background: "white", border: "1px solid #e3e9ed", borderRadius: 12, padding: "clamp(18px, 4vw, 30px)", boxShadow: "0 3px 14px rgba(0,0,0,.04)" }}>
      <p style={{ margin: "0 0 5px", color: "#16834a", fontWeight: 700, letterSpacing: ".08em", fontSize: 12 }}>TC CLEANING SERVICES AZ LLC</p><h2 style={{ margin: "0 0 8px", fontSize: 25 }}>Create a cleaning estimate</h2>
      <p style={{ color: "#687786", lineHeight: 1.55, marginTop: 0 }}>Convert a website quote request or prepare an estimate for an existing or new client. The customer can review and approve online; payment is recorded after a manager confirms the deposit arrived.</p>
      {notice && <p role="status" style={{ padding: 12, borderRadius: 7, background: "#e8f5ec", color: "#176b40" }}>{notice}</p>}{error && <p role="alert" style={{ padding: 12, borderRadius: 7, background: "#fff0ef", color: "#8a3028" }}>{error}</p>}
      {quotes.length > 0 && <label style={{ ...label, maxWidth: 700, marginBottom: 18 }}>Website quote request to convert<select value={sourceQuoteId} onChange={(e) => chooseQuote(e.target.value)} style={field}><option value="">Select a new website request…</option>{quotes.map((q) => <option key={q.quote_id} value={q.quote_id}>{q.first_name} {q.last_name} · {q.created_at.slice(0, 10)} · {q.address_line1}, {q.city}{q.email ? ` · ${q.email}` : " · email needed"}</option>)}</select></label>}
      <form onSubmit={save}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "4px 0 16px" }}><label style={{ ...label, flex: "1 1 290px" }}>Existing active client<select value={customerId} onChange={(e) => chooseClient(e.target.value)} style={field}><option value="">New client / website request</option>{clients.map((c) => <option key={c.customer_id} value={c.customer_id}>{c.first_name} {c.last_name}{c.email ? ` · ${c.email}` : ""}</option>)}</select></label></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))", gap: 14 }}>
          <label style={label}>Client name<input required maxLength={160} value={name} onChange={(e) => setName(e.target.value)} style={field} /></label><label style={label}>Email address<input required type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} style={field} /></label><label style={label}>Phone<input value={phone} maxLength={50} onChange={(e) => setPhone(e.target.value)} style={field} /></label><label style={label}>Service<input required maxLength={120} placeholder="e.g. Deep cleaning" value={service} onChange={(e) => setService(e.target.value)} style={field} /></label>
          <label style={label}>Property address<textarea rows={2} maxLength={500} value={address} onChange={(e) => setAddress(e.target.value)} style={field} /></label><label style={label}>Estimate scope / notes<textarea rows={3} maxLength={4000} value={scope} onChange={(e) => setScope(e.target.value)} style={field} /></label>
        </div>
        <div style={{ marginTop: 22 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><h3 style={{ margin: 0 }}>Services and pricing</h3><button type="button" onClick={() => setItems([...items, { description: "", quantity: "1", unitPrice: "" }])} style={{ ...btn, background: "#e8f2eb", color: "#176b40" }}>+ Add line</button></div>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>{items.map((item, n) => <div key={n} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,150px),1fr))", gap: 9, alignItems: "end" }}><label style={label}>Description<input required maxLength={240} value={item.description} onChange={(e) => setItems(items.map((v, i) => i === n ? { ...v, description: e.target.value } : v))} style={field} /></label><label style={label}>Qty<input required type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => setItems(items.map((v, i) => i === n ? { ...v, quantity: e.target.value } : v))} style={field} /></label><label style={label}>Rate ($)<input required type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => setItems(items.map((v, i) => i === n ? { ...v, unitPrice: e.target.value } : v))} style={field} /></label><button type="button" disabled={items.length === 1} onClick={() => setItems(items.filter((_, i) => i !== n))} style={{ ...btn, background: "#f3f6f8", color: "#52616d", padding: "11px" }}>Remove</button></div>)}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 14, marginTop: 18 }}><label style={label}>Deposit (%)<input required type="number" min="0.01" max="100" step="0.01" value={depositPercent} onChange={(e) => setDepositPercent(e.target.value)} style={field} /><small style={{ color: "#687786", fontWeight: 400 }}>Set the deposit for this estimate. Preview: {usd(depositCents)}</small></label><label style={label}>Valid through<input required type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} style={field} /></label><div style={{ alignSelf: "start", padding: 16, background: "#f3f6f8", borderRadius: 8 }}>Estimate total <strong>{usd(totalCents)}</strong><br />Deposit due <strong>{usd(depositCents)}</strong></div></div>
        <label style={{ ...label, marginTop: 16 }}>Chase deposit payment link<input type="url" maxLength={2048} placeholder="Paste a Chase payment link for this deposit" value={chase} onChange={(e) => setChase(e.target.value)} style={field} /><small style={{ color: "#687786", fontWeight: 400 }}>If provided, the customer will see a Pay by card button after approving. Create the link for the deposit amount.</small></label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))", gap: 14, marginTop: 16 }}><label style={label}>Venmo link<input type="url" maxLength={2048} value={venmo} onChange={(e) => setVenmo(e.target.value)} style={field} /></label><label style={label}>Zelle recipient<input maxLength={80} value={zelle} onChange={(e) => setZelle(e.target.value)} style={field} /></label></div>
        <p style={{ color: "#687786", fontSize: 13 }}>The estimate email is branded and sent from quotes@tccleaningaz.com. After approval, customers see deposit payment instructions. Verify each payment in Chase, Venmo, or Zelle before recording it here.</p>
        <button type="submit" disabled={busy} style={{ ...btn, opacity: busy ? .6 : 1 }}>{busy ? "Saving…" : "Save estimate draft"}</button>
      </form>
    </section>
    <section style={{ marginTop: 28, background: "white", border: "1px solid #e3e9ed", borderRadius: 12, padding: "clamp(18px, 4vw, 30px)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div><h2 style={{ margin: 0 }}>Estimates</h2><p style={{ color: "#687786", marginBottom: 0 }}>Sending is a separate confirmed action. A customer approval does not book a cleaning appointment.</p></div><input aria-label="Search estimates" placeholder="Search estimates" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...field, maxWidth: 260 }} /></div>
      <div style={{ display: "grid", gap: 12, marginTop: 18 }}>{visible.length === 0 ? <p style={{ color: "#687786" }}>{filter ? "No matching estimates." : "No estimate drafts yet."}</p> : visible.map((estimate) => <article key={estimate.id} style={{ border: "1px solid #e3e9ed", borderRadius: 9, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}><div><strong>{estimate.estimate_number}</strong><span style={{ display: "inline-block", marginLeft: 10, padding: "3px 8px", borderRadius: 99, background: estimate.status === "approved" || estimate.status === "deposit_paid" ? "#e5f4e9" : "#e8f0fa", fontSize: 12, textTransform: "capitalize" }}>{estimate.status.replaceAll("_", " ")}</span><p style={{ margin: "7px 0 0", color: "#52616d" }}>{estimate.client_name} · {estimate.client_email}</p><p style={{ margin: "4px 0 0", color: "#687786", fontSize: 14 }}>{estimate.service_type} · Total {usd(estimate.total_cents)} · Deposit {usd(estimate.deposit_cents)} · Valid through {estimate.valid_until}</p></div>{estimate.status === "draft" && <button disabled={busy} onClick={() => void act(estimate, "send")} style={btn}>Review &amp; send</button>}{estimate.status === "approved" && <button disabled={busy} onClick={() => void act(estimate, "deposit-paid")} style={{ ...btn, background: "#244763" }}>Confirm deposit received</button>}{estimate.status === "deposit_paid" && <span style={{ color: "#176b40", fontSize: 14 }}>Deposit confirmed</span>}</article>)}</div>
    </section>
  </div>;
}
