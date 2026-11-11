"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Entry = {
  id: string; entry_type: "income" | "expense"; transaction_date: string; paid_date: string | null;
  amount_cents: number; category: string; counterparty: string; payment_method: string; description: string; created_at: string;
};
const incomeCategories = ["Cleaning income", "Other income"];
const expenseCategories = ["Cleaning supplies", "Equipment", "Vehicle and travel", "Insurance", "Software and services", "Marketing", "Office", "Contract labor", "Payroll", "Bank and card fees", "Taxes and licenses", "Repairs and maintenance", "Other expense"];
const methods = ["Chase", "Cash", "Check", "Zelle", "Venmo", "Credit card", "Other"];
const field = { width: "100%", boxSizing: "border-box" as const, padding: "11px 12px", border: "1px solid #cbd5dc", borderRadius: 7, font: "inherit", color: "#172b3d", background: "#fff" };
const label = { display: "grid", gap: 6, color: "#465766", fontSize: 14, fontWeight: 700 as const };
const button = { background: "#16834a", color: "white", border: 0, padding: "11px 16px", borderRadius: 7, fontWeight: 700 as const, cursor: "pointer" };
const usd = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
const localToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Phoenix", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const dateAtNoon = (value: string) => new Date(`${value}T12:00:00Z`);
const dateString = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
const moneyInputToCents = (value: string) => Math.round(Number(value) * 100);

export default function ManagerFinances() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [entryType, setEntryType] = useState<"income" | "expense">("income");
  const [date, setDate] = useState(localToday);
  const [paidDate, setPaidDate] = useState(localToday);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(incomeCategories[0]);
  const [counterparty, setCounterparty] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(methods[0]);
  const [description, setDescription] = useState("");
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [periodOffset, setPeriodOffset] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/manager/finances", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { entries?: Entry[]; error?: string };
        if (!response.ok) throw new Error(data.error || "Business records could not be loaded.");
        return data;
      })
      .then((data) => { if (active) { setEntries(Array.isArray(data.entries) ? data.entries : []); setError(""); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Business records could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const bounds = useMemo(() => {
    const now = dateAtNoon(localToday());
    if (period === "week") {
      const sunday = new Date(now); sunday.setUTCDate(now.getUTCDate() - now.getUTCDay() + periodOffset * 7);
      const saturday = new Date(sunday); saturday.setUTCDate(sunday.getUTCDate() + 6);
      const phoenix = { timeZone: "America/Phoenix" };
      return { start: dateString(sunday), end: dateString(saturday), title: `${sunday.toLocaleDateString("en-US", { ...phoenix, month: "short", day: "numeric" })} – ${saturday.toLocaleDateString("en-US", { ...phoenix, month: "short", day: "numeric", year: "numeric" })}` };
    }
    const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + periodOffset, 1, 12));
    const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + periodOffset + 1, 0, 12));
    return { start: dateString(first), end: dateString(last), title: first.toLocaleDateString("en-US", { timeZone: "America/Phoenix", month: "long", year: "numeric" }) };
  }, [period, periodOffset]);

  const chart = useMemo(() => {
    if (period === "week") {
      const start = dateAtNoon(bounds.start);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start); d.setUTCDate(start.getUTCDate() + i); const key = dateString(d);
        const day = entries.filter((entry) => entry.transaction_date === key);
        return { label: d.toLocaleDateString("en-US", { timeZone: "America/Phoenix", weekday: "short" }), income: day.filter((e) => e.entry_type === "income").reduce((s, e) => s + e.amount_cents, 0), expense: day.filter((e) => e.entry_type === "expense").reduce((s, e) => s + e.amount_cents, 0) };
      });
    }
    const start = dateAtNoon(bounds.start);
    return Array.from({ length: 6 }, (_, i) => {
      const first = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 5 + i, 1, 12));
      const key = `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, "0")}`;
      const month = entries.filter((entry) => entry.transaction_date.startsWith(key));
      return { label: first.toLocaleDateString("en-US", { timeZone: "America/Phoenix", month: "short" }), income: month.filter((e) => e.entry_type === "income").reduce((s, e) => s + e.amount_cents, 0), expense: month.filter((e) => e.entry_type === "expense").reduce((s, e) => s + e.amount_cents, 0) };
    });
  }, [entries, period, bounds]);

  const visible = entries.filter((entry) => entry.transaction_date >= bounds.start && entry.transaction_date <= bounds.end);
  const totals = visible.reduce((sum, entry) => { sum[entry.entry_type] += entry.amount_cents; return sum; }, { income: 0, expense: 0 });
  const max = Math.max(1, ...chart.flatMap((item) => [item.income, item.expense]));
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const payload = { entryType, transactionDate: date, paidDate: paidDate || null, amountCents: moneyInputToCents(amount), category, counterparty, paymentMethod, description };
      const response = await fetch(editingId ? `/api/manager/finances/${encodeURIComponent(editingId)}` : "/api/manager/finances", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as { entry?: Entry; error?: string };
      if (!response.ok || !data.entry) throw new Error(data.error || "This record could not be saved.");
      if (editingId) {
        setEntries((current) => current.map((entry) => entry.id === editingId ? data.entry! : entry));
        setEditingId(null);
        setNotice("Transaction updated. Business Reports now reflect the change.");
      } else {
        setEntries((current) => [data.entry!, ...current]);
        setAmount(""); setCounterparty(""); setDescription("");
        setNotice(`${entryType === "income" ? "Income" : "Expense"} saved and added to Business Reports.`);
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "This record could not be saved."); }
    finally { setSaving(false); }
  }

  function beginEdit(item: Entry) {
    setEditingId(item.id); setEntryType(item.entry_type); setDate(item.transaction_date); setPaidDate(item.paid_date || "");
    setAmount((item.amount_cents / 100).toFixed(2)); setCategory(item.category); setCounterparty(item.counterparty);
    setPaymentMethod(item.payment_method); setDescription(item.description); setError(""); setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeEntry(item: Entry) {
    const kind = item.entry_type === "income" ? "income" : "expense";
    if (!window.confirm(`Delete this ${kind} transaction for ${usd(item.amount_cents)} dated ${item.transaction_date}? This cannot be undone.`)) return;
    setDeletingId(item.id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/manager/finances/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "This transaction could not be deleted.");
      setEntries((current) => current.filter((entry) => entry.id !== item.id));
      if (editingId === item.id) setEditingId(null);
      setNotice("Transaction deleted. Business Reports now reflect the change.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "This transaction could not be deleted."); }
    finally { setDeletingId(null); }
  }

  return <div style={{ display: "grid", gap: 22, marginTop: 24 }}>
    <section style={{ background: "#101923", color: "white", borderRadius: 14, padding: "20px clamp(18px, 4vw, 30px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div><p style={{ color: "#8bd34a", fontWeight: 700, letterSpacing: ".08em", fontSize: 12, margin: "0 0 6px" }}>TC CLEANING SERVICES AZ LLC</p><h2 style={{ margin: 0 }}>Income, expenses &amp; reports</h2><p style={{ margin: "8px 0 0", color: "#d2dce4" }}>Every saved entry updates the weekly and monthly business reports.</p></div>
      <Image src="/images/tc-cleaning-logo.png" alt="TC Cleaning Services AZ LLC" width={1026} height={695} style={{ width: 106, height: "auto", background: "white", borderRadius: 8, padding: 5 }} />
    </section>

    <section style={{ background: "white", border: "1px solid #e3e9ed", borderRadius: 12, padding: "clamp(18px, 4vw, 28px)" }}>
      <h2 style={{ margin: "0 0 6px" }}>{editingId ? "Edit transaction" : "Record a transaction"}</h2><p style={{ marginTop: 0, color: "#687786" }}>{editingId ? "Update the saved details. Reports recalculate from the corrected transaction date and amount." : "Enter income earned or expenses incurred. Keep the transaction date and the payment date for clear reporting."}</p>
      {notice && <p role="status" style={{ padding: 12, borderRadius: 7, background: "#e8f5ec", color: "#176b40" }}>{notice}</p>}{error && <p role="alert" style={{ padding: 12, borderRadius: 7, background: "#fff0ef", color: "#8a3028" }}>{error}</p>}
      <form onSubmit={save}>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}><button type="button" onClick={() => { setEntryType("income"); setCategory(incomeCategories[0]); }} style={{ ...button, background: entryType === "income" ? "#16834a" : "#edf2f4", color: entryType === "income" ? "white" : "#354858" }}>Add income</button><button type="button" onClick={() => { setEntryType("expense"); setCategory(expenseCategories[0]); }} style={{ ...button, background: entryType === "expense" ? "#16834a" : "#edf2f4", color: entryType === "expense" ? "white" : "#354858" }}>Add expense</button></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,210px),1fr))", gap: 14 }}>
          <label style={label}>{entryType === "income" ? "Date job or income was earned" : "Date expense was incurred"}<input required type="date" value={date} onChange={(e) => setDate(e.target.value)} style={field} /></label>
          <label style={label}>Date paid or received (optional)<input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} style={field} /></label>
          <label style={label}>Amount ($)<input required type="number" min="0.01" max="1000000" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} style={field} /></label>
          <label style={label}>Category<select value={category} onChange={(e) => setCategory(e.target.value)} style={field}>{(entryType === "income" ? incomeCategories : expenseCategories).map((item) => <option key={item}>{item}</option>)}</select></label>
          <label style={label}>{entryType === "income" ? "Customer or source" : "Vendor or payee"}<input maxLength={160} value={counterparty} onChange={(e) => setCounterparty(e.target.value)} style={field} /></label>
          <label style={label}>Payment account or method<select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={field}>{methods.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label style={{ ...label, gridColumn: "1 / -1" }}>Business purpose or details<textarea required maxLength={1000} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} style={field} /></label>
        </div>
        <p style={{ color: "#687786", fontSize: 13 }}>For credit cards, record the purchase as the expense. A later card bill payment should not be entered as another expense.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button type="submit" disabled={saving} style={{ ...button, opacity: saving ? .7 : 1 }}>{saving ? "Saving…" : editingId ? "Save changes" : "Save transaction"}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setError(""); setNotice("Editing canceled."); }} style={{ ...button, background: "#edf2f4", color: "#354858" }}>Cancel edit</button>}</div>
      </form>
    </section>

    <section style={{ background: "white", border: "1px solid #e3e9ed", borderRadius: 12, padding: "clamp(18px, 4vw, 28px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><p style={{ color: "#16834a", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", margin: "0 0 5px" }}>BUSINESS REPORTS</p><h2 style={{ margin: 0 }}>{period === "week" ? "Weekly" : "Monthly"} activity</h2></div><div style={{ display: "flex", gap: 8 }}><button onClick={() => setPeriod("week")} style={{ ...button, background: period === "week" ? "#16834a" : "#edf2f4", color: period === "week" ? "white" : "#354858" }}>Weekly</button><button onClick={() => setPeriod("month")} style={{ ...button, background: period === "month" ? "#16834a" : "#edf2f4", color: period === "month" ? "white" : "#354858" }}>Monthly</button></div></div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}><button aria-label="Previous period" onClick={() => setPeriodOffset((v) => v - 1)} style={{ ...button, background: "#edf2f4", color: "#354858" }}>‹</button><strong>{period === "week" ? bounds.title : bounds.title}</strong><button aria-label="Next period" disabled={periodOffset >= 0} onClick={() => setPeriodOffset((v) => v + 1)} style={{ ...button, background: "#edf2f4", color: "#354858", opacity: periodOffset >= 0 ? .45 : 1 }}>›</button><button onClick={() => setPeriodOffset(0)} style={{ ...button, background: "#edf2f4", color: "#354858" }}>Current</button></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 20 }}><Summary label="Income earned" amount={totals.income} color="#16834a" /><Summary label="Expenses incurred" amount={totals.expense} color="#d36e4e" /><Summary label="Net activity" amount={totals.income - totals.expense} color="#172b3d" /></div>
      <Chart data={chart} max={max} />
      <p style={{ color: "#687786", fontSize: 13, marginBottom: 0 }}>Weekly reporting runs Sunday through Saturday in Arizona time. A new week starts Sunday; all prior entries and reports remain saved. Figures are grouped by the job/expense date (accrual view).</p>
    </section>

    <section style={{ background: "white", border: "1px solid #e3e9ed", borderRadius: 12, padding: "clamp(18px, 4vw, 28px)" }}>
      <h2 style={{ margin: "0 0 5px" }}>Saved records</h2><p style={{ color: "#687786", marginTop: 0 }}>Transactions for {bounds.title}; saved records are retained when the reporting week changes.</p>
      {loading ? <p>Loading saved records…</p> : visible.length === 0 ? <p style={{ color: "#687786" }}>No transactions have been recorded for this period.</p> : <div style={{ display: "grid", gap: 9 }}>{visible.map((item) => <article key={item.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, border: "1px solid #e3e9ed", borderRadius: 9, padding: 13 }}><div><strong>{item.description}</strong><div style={{ color: "#687786", fontSize: 14, marginTop: 4 }}>{item.transaction_date} · {item.category}{item.counterparty ? ` · ${item.counterparty}` : ""} · {item.payment_method}{item.paid_date ? ` · Paid ${item.paid_date}` : " · Payment date not entered"}</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}><button type="button" onClick={() => beginEdit(item)} style={{ ...button, padding: "7px 11px", fontSize: 13, background: "#edf2f4", color: "#354858" }}>Edit</button><button type="button" disabled={deletingId === item.id} onClick={() => void removeEntry(item)} style={{ ...button, padding: "7px 11px", fontSize: 13, background: "#fff0ef", color: "#8a3028", opacity: deletingId === item.id ? .6 : 1 }}>{deletingId === item.id ? "Deleting…" : "Delete"}</button></div></div><strong style={{ color: item.entry_type === "income" ? "#16834a" : "#a34732" }}>{item.entry_type === "income" ? "+" : "−"}{usd(item.amount_cents)}</strong></article>)}</div>}
    </section>
  </div>;
}

function Summary({ label: title, amount, color }: { label: string; amount: number; color: string }) {
  return <div style={{ border: "1px solid #e3e9ed", background: "#fbfcfd", borderRadius: 9, padding: 15 }}><span style={{ color: "#687786", fontSize: 13 }}>{title}</span><strong style={{ display: "block", color, fontSize: 24, marginTop: 4 }}>{usd(amount)}</strong></div>;
}

function Chart({ data, max }: { data: { label: string; income: number; expense: number }[]; max: number }) {
  return <div aria-label="Income and expense bar chart" role="img" style={{ display: "grid", gridTemplateColumns: `repeat(${data.length},minmax(0,1fr))`, gap: 8, minHeight: 220, alignItems: "end", padding: "14px 8px 0", borderBottom: "1px solid #dce3e8", background: "repeating-linear-gradient(to top, transparent 0, transparent 48px, #edf1f3 49px, transparent 50px)" }}>
    {data.map((item) => <div key={item.label} style={{ minWidth: 0, display: "grid", gridTemplateRows: "1fr auto", height: 220, textAlign: "center" }}><div style={{ display: "flex", justifyContent: "center", alignItems: "end", gap: 5, minHeight: 0 }}><div title={`Income ${usd(item.income)}`} style={{ width: "min(32%,32px)", minHeight: item.income ? 3 : 0, height: `${Math.max(item.income ? 2 : 0, item.income / max * 100)}%`, borderRadius: "5px 5px 0 0", background: "#16834a" }} /><div title={`Expenses ${usd(item.expense)}`} style={{ width: "min(32%,32px)", minHeight: item.expense ? 3 : 0, height: `${Math.max(item.expense ? 2 : 0, item.expense / max * 100)}%`, borderRadius: "5px 5px 0 0", background: "#d36e4e" }} /></div><span style={{ color: "#52616d", fontSize: 12, padding: "9px 0" }}>{item.label}</span></div>)}
  </div>;
}
