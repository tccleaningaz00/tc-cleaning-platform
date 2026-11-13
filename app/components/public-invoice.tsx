"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { recordPublicDocumentView } from "../lib/public-document-views";

type InvoiceItem = { id: string; description: string; quantity: number; unit_price_cents: number; line_total_cents: number };
type PublicInvoiceData = {
  invoiceNumber: string; clientName: string; billingAddress: string; issueDate: string; dueDate: string;
  notes: string; status: "sent" | "paid"; subtotalCents: number; taxCents: number; depositPaidCents: number; totalCents: number;
  paymentUrl: string; venmoUrl: string; zelleRecipient: string; items: InvoiceItem[];
};
const usd = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export default function PublicInvoice({ token }: { token: string }) {
  const [invoice, setInvoice] = useState<PublicInvoiceData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch(`/api/public-invoices/${encodeURIComponent(token)}`, { cache: "no-store" }).then(async (response) => {
      const data = await response.json() as { invoice?: PublicInvoiceData; error?: string };
      if (!response.ok || !data.invoice) throw new Error(data.error || "Invoice could not be loaded.");
      if (!active) return;
      setInvoice(data.invoice);
      void recordPublicDocumentView("invoice", token);
    }).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : "Invoice could not be loaded.");
    });
    return () => { active = false; };
  }, [token]);

  return <main style={{ minHeight: "100vh", background: "#f3f6f8", color: "#172b3d", fontFamily: "Arial,sans-serif", padding: "28px 16px" }}><article style={{ maxWidth: 720, margin: "0 auto", borderRadius: 14, overflow: "hidden", background: "white", border: "1px solid #e3e9ed", boxShadow: "0 4px 18px #172b3d10" }}>
    <header style={{ padding: 24, background: "#101923", color: "white" }}><Image src="/images/tc-cleaning-logo.png" alt="TC Cleaning Services" width={150} height={70} style={{ width: 150, height: "auto", background: "white", borderRadius: 6, padding: 5 }} /><p style={{ margin: "20px 0 4px", color: "#8bd34a", fontWeight: 700 }}>TC CLEANING SERVICES AZ LLC</p><h1 style={{ margin: 0, fontSize: 27 }}>Your invoice</h1></header>
    <div style={{ padding: "clamp(20px,5vw,34px)" }}>{error && <p role="alert" style={{ padding: 12, background: "#fff0ef", color: "#8a3028", borderRadius: 7 }}>{error}</p>}{!invoice && !error && <p>Loading invoice…</p>}{invoice && <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}><div><p style={{ color: "#687786", margin: "0 0 6px" }}>Invoice {invoice.invoiceNumber} · Balance due</p><h2 style={{ margin: 0, fontSize: 23 }}>{usd(invoice.totalCents)}</h2></div><span style={{ padding: "6px 12px", borderRadius: 99, background: invoice.status === "paid" ? "#e5f4e9" : "#e8f0fa", color: invoice.status === "paid" ? "#176b40" : "#244763", fontWeight: 700, textTransform: "capitalize" }}>{invoice.status}</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 16, marginTop: 22, padding: 16, borderRadius: 8, background: "#f6f8f9" }}><div><strong>Bill to</strong><p style={{ margin: "5px 0", whiteSpace: "pre-line", color: "#52616d" }}>{invoice.clientName}{invoice.billingAddress ? `\n${invoice.billingAddress}` : ""}</p></div><div><strong>Invoice dates</strong><p style={{ margin: "5px 0", color: "#52616d" }}>Issued {invoice.issueDate}<br />Due {invoice.dueDate}</p></div></div>
      <h3 style={{ margin: "24px 0 10px" }}>Services and charges</h3><div style={{ borderTop: "1px solid #e3e9ed" }}>{invoice.items.map((item) => <div key={item.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, padding: "13px 0", borderBottom: "1px solid #e3e9ed" }}><span>{item.description} × {item.quantity}</span><strong>{usd(item.line_total_cents)}</strong></div>)}</div>
      <div style={{ maxWidth: 340, margin: "16px 0 0 auto" }}><p style={{ display: "flex", justifyContent: "space-between", margin: "7px 0", color: "#52616d" }}>Subtotal <strong style={{ color: "#172b3d" }}>{usd(invoice.subtotalCents)}</strong></p>{invoice.taxCents > 0 && <p style={{ display: "flex", justifyContent: "space-between", margin: "7px 0", color: "#52616d" }}>Tax <strong style={{ color: "#172b3d" }}>{usd(invoice.taxCents)}</strong></p>}{invoice.depositPaidCents > 0 && <p style={{ display: "flex", justifyContent: "space-between", margin: "7px 0", color: "#52616d" }}>Deposit paid <strong style={{ color: "#172b3d" }}>−{usd(invoice.depositPaidCents)}</strong></p>}<p style={{ display: "flex", justifyContent: "space-between", margin: "10px 0 0", paddingTop: 10, borderTop: "1px solid #d7e0e6", fontSize: 20 }}>Balance due <strong>{usd(invoice.totalCents)}</strong></p></div>
      {invoice.notes && <p style={{ marginTop: 22, whiteSpace: "pre-line", color: "#52616d" }}>{invoice.notes}</p>}
      {invoice.status === "sent" && <section style={{ marginTop: 24, padding: 18, borderRadius: 9, background: "#f3f6f8" }}><h3 style={{ margin: "0 0 8px" }}>Payment options</h3><p style={{ margin: "0 0 14px", color: "#52616d" }}>Please include invoice {invoice.invoiceNumber} with your payment. Payments are marked received after TC Cleaning Services verifies them.</p>{invoice.paymentUrl && <a href={invoice.paymentUrl} target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center", padding: 13, margin: "10px 0", borderRadius: 8, background: "#16834a", color: "white", fontWeight: 700, textDecoration: "none" }}>Pay by card</a>}{invoice.venmoUrl && <a href={invoice.venmoUrl} target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center", padding: 13, margin: "10px 0", borderRadius: 8, background: "#008cff", color: "white", fontWeight: 700, textDecoration: "none" }}>Pay with Venmo</a>}{invoice.zelleRecipient && <div style={{ padding: 14, marginTop: 10, border: "1px solid #dce3e8", borderRadius: 8 }}><strong>Pay with Zelle</strong><p style={{ margin: "7px 0" }}>Send {usd(invoice.totalCents)} to {invoice.zelleRecipient} and include invoice {invoice.invoiceNumber} in the note.</p></div>}</section>}
      {invoice.status === "paid" && <p role="status" style={{ marginTop: 22, padding: 14, borderRadius: 8, background: "#e8f5ec", color: "#176b40", fontWeight: 700 }}>This invoice has been marked paid. Thank you!</p>}
    </>}</div><footer style={{ borderTop: "1px solid #e3e9ed", padding: 18, color: "#687786", fontSize: 14 }}>TC Cleaning Services AZ LLC · (480) 310-8040 · tccleaningaz.com</footer>
  </article></main>;
}
