"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

type Timecard = {
  id: string;
  employee_name: string;
  hourly_rate_cents: number;
  week_start_date: string;
  monday_minutes: number;
  tuesday_minutes: number;
  wednesday_minutes: number;
  thursday_minutes: number;
  friday_minutes: number;
  created_at: string;
};

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
const dayFields = ["monday_minutes", "tuesday_minutes", "wednesday_minutes", "thursday_minutes", "friday_minutes"] as const;
type DayName = (typeof dayNames)[number];
type HoursByDay = Record<DayName, string>;
const emptyHours = (): HoursByDay => ({ Monday: "", Tuesday: "", Wednesday: "", Thursday: "", Friday: "" });
const navy = "#101923";
const green = "#16834a";
const brightGreen = "#8bd34a";
const ink = "#172b3d";
const muted = "#687786";
const border = "#e3e9ed";
const fieldStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "11px 12px", border: "1px solid #cbd5dc", borderRadius: 7, font: "inherit", color: ink, background: "white" };
const labelStyle: React.CSSProperties = { display: "grid", gap: 6, color: "#465766", fontSize: 14, fontWeight: 700 };
const buttonStyle: React.CSSProperties = { border: 0, borderRadius: 7, padding: "11px 15px", background: green, color: "white", font: "inherit", fontWeight: 700, cursor: "pointer" };
const currency = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const totalMinutes = (card: Pick<Timecard, typeof dayFields[number]>) => dayFields.reduce((sum, field) => sum + card[field], 0);
const totalHours = (minutes: number) => minutes / 60;
const grossCents = (rateCents: number, minutes: number) => Math.round(rateCents * minutes / 60);

function currentMonday() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function dateForDay(start: string, index: number) {
  const date = new Date(start + "T12:00:00Z");
  if (Number.isNaN(date.valueOf())) return "";
  date.setUTCDate(date.getUTCDate() + index);
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
}

function dateLong(start: string) {
  const date = new Date(start + "T12:00:00Z");
  return Number.isNaN(date.valueOf()) ? start : date.toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
}

function minutesFor(card: Timecard, day: DayName) {
  const index = dayNames.indexOf(day);
  return card[dayFields[index]];
}

function safePdfText(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, " ");
}

export default function PayrollTimecards() {
  const [employeeName, setEmployeeName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [weekStart, setWeekStart] = useState(currentMonday);
  const [hours, setHours] = useState<HoursByDay>(emptyHours);
  const [cards, setCards] = useState<Timecard[]>([]);
  const [filter, setFilter] = useState("");
  const [preview, setPreview] = useState<Timecard | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const draftMinutes = useMemo(() => dayNames.map((day) => Math.max(0, Math.min(1440, Math.round((Number(hours[day]) || 0) * 60)))), [hours]);
  const draftTotalMinutes = draftMinutes.reduce((sum, minutes) => sum + minutes, 0);
  const draftRateCents = Math.round((Number(hourlyRate) || 0) * 100);
  const draftGrossCents = grossCents(draftRateCents, draftTotalMinutes);
  const isOverForty = draftTotalMinutes > 40 * 60;

  const loadTimecards = useCallback(async () => {
    try {
      const response = await fetch("/api/manager/payroll", { cache: "no-store" });
      const data = await response.json() as { timecards?: Timecard[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Saved timecards could not be loaded.");
      setCards(Array.isArray(data.timecards) ? data.timecards : []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Saved timecards could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadTimecards(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTimecards]);

  function resetForm() {
    setEmployeeName("");
    setHourlyRate("");
    setWeekStart(currentMonday());
    setHours(emptyHours());
    setError("");
    setNotice("");
  }

  function draftCard(): Timecard {
    const date = weekStart;
    return {
      id: "preview",
      employee_name: employeeName.trim(),
      hourly_rate_cents: draftRateCents,
      week_start_date: date,
      monday_minutes: draftMinutes[0],
      tuesday_minutes: draftMinutes[1],
      wednesday_minutes: draftMinutes[2],
      thursday_minutes: draftMinutes[3],
      friday_minutes: draftMinutes[4],
      created_at: "",
    };
  }

  function validateForm() {
    if (!employeeName.trim() || employeeName.trim().length > 160) return "Enter an employee name (up to 160 characters).";
    if (!Number.isFinite(Number(hourlyRate)) || draftRateCents <= 0 || draftRateCents > 100_000) return "Enter an hourly rate greater than $0 and no more than $1,000.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return "Choose a valid week-start date.";
    const parsedDate = new Date(weekStart + "T12:00:00Z");
    if (Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== weekStart || parsedDate.getUTCDay() !== 1) return "The selected week must start on a Monday.";
    for (const day of dayNames) {
      const value = hours[day].trim() ? Number(hours[day]) : 0;
      if (!Number.isFinite(value) || value < 0 || value > 24) return day + " hours must be between 0 and 24.";
    }
    if (draftTotalMinutes <= 0) return "Enter at least one hour before saving the timecard.";
    return "";
  }

  async function saveTimecard() {
    const validationError = validateForm();
    if (validationError) { setError(validationError); setNotice(""); return; }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/manager/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeName: employeeName.trim(),
          hourlyRateCents: draftRateCents,
          weekStartDate: weekStart,
          weekdayMinutes: draftMinutes,
        }),
      });
      const data = await response.json() as { error?: string; timecard?: Timecard };
      if (!response.ok || !data.timecard) throw new Error(data.error || "Timecard could not be saved.");
      await loadTimecards();
      resetForm();
      setNotice("Timecard saved. It is available in Saved timecards to preview or download.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Timecard could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteTimecard(card: Timecard) {
    if (!window.confirm("Delete the saved timecard for " + card.employee_name + " for the week of " + dateLong(card.week_start_date) + "? This cannot be undone.")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/manager/payroll/" + encodeURIComponent(card.id), { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Timecard could not be deleted.");
      setCards((current) => current.filter((entry) => entry.id !== card.id));
      if (preview?.id === card.id) setPreview(null);
      setNotice("Saved timecard deleted.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Timecard could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf(card: Timecard) {
    setError("");
    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const doc = await PDFDocument.create();
      doc.setTitle("Weekly timecard - " + card.employee_name);
      doc.setAuthor("TC Cleaning Services AZ LLC");
      doc.setSubject("Weekly employee timecard");
      const regular = await doc.embedFont(StandardFonts.Helvetica);
      const bold = await doc.embedFont(StandardFonts.HelveticaBold);
      const page = doc.addPage([612, 792]);
      const color = (hex: string) => rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
      const pdfNavy = color(navy);
      const pdfGreen = color(brightGreen);
      const pdfInk = color(ink);
      const pdfMuted = color(muted);
      const pdfBorder = color(border);
      page.drawRectangle({ x: 0, y: 648, width: 612, height: 144, color: pdfNavy });
      page.drawRectangle({ x: 0, y: 644, width: 612, height: 4, color: pdfGreen });
      let logoDrawn = false;
      try {
        const response = await fetch("/images/tc-cleaning-logo.png");
        if (response.ok) {
          const logoBytes = new Uint8Array(await response.arrayBuffer());
          const logo = await doc.embedPng(logoBytes);
          const scale = Math.min(128 / logo.width, 96 / logo.height);
          page.drawImage(logo, { x: 42, y: 686, width: logo.width * scale, height: logo.height * scale });
          logoDrawn = true;
        }
      } catch { /* The text wordmark still identifies the company if the logo cannot load. */ }
      if (!logoDrawn) {
        page.drawText("TC CLEANING", { x: 42, y: 730, size: 20, font: bold, color: rgb(1, 1, 1) });
        page.drawText("SERVICES AZ LLC", { x: 43, y: 711, size: 10, font: bold, color: pdfGreen });
      }
      page.drawText("WEEKLY TIMECARD", { x: 338, y: 742, size: 18, font: bold, color: rgb(1, 1, 1) });
      page.drawText("TC CLEANING SERVICES AZ LLC", { x: 338, y: 720, size: 9, font: bold, color: pdfGreen });
      page.drawText("Week of " + safePdfText(dateLong(card.week_start_date)), { x: 338, y: 699, size: 9, font: regular, color: rgb(0.88, 0.91, 0.94) });
      page.drawText("EMPLOYEE", { x: 42, y: 600, size: 8, font: bold, color: pdfMuted });
      page.drawText(safePdfText(card.employee_name), { x: 42, y: 579, size: 16, font: bold, color: pdfInk });
      page.drawText("HOURLY RATE", { x: 360, y: 600, size: 8, font: bold, color: pdfMuted });
      page.drawText(currency(card.hourly_rate_cents), { x: 360, y: 579, size: 16, font: bold, color: pdfInk });
      page.drawRectangle({ x: 42, y: 516, width: 528, height: 30, color: color("#edf2f5") });
      page.drawText("DAY", { x: 54, y: 527, size: 9, font: bold, color: pdfMuted });
      page.drawText("DATE", { x: 220, y: 527, size: 9, font: bold, color: pdfMuted });
      page.drawText("HOURS", { x: 455, y: 527, size: 9, font: bold, color: pdfMuted });
      let y = 492;
      dayNames.forEach((day, index) => {
        page.drawText(day, { x: 54, y, size: 11, font: regular, color: pdfInk });
        page.drawText(dateForDay(card.week_start_date, index), { x: 220, y, size: 11, font: regular, color: pdfInk });
        page.drawText((minutesFor(card, day) / 60).toFixed(2), { x: 455, y, size: 11, font: regular, color: pdfInk });
        page.drawLine({ start: { x: 42, y: y - 10 }, end: { x: 570, y: y - 10 }, thickness: 0.7, color: pdfBorder });
        y -= 44;
      });
      const minutes = totalMinutes(card);
      const isOver = minutes > 40 * 60;
      page.drawText("TOTAL HOURS", { x: 54, y: 252, size: 9, font: bold, color: pdfMuted });
      page.drawText(totalHours(minutes).toFixed(2), { x: 455, y: 252, size: 13, font: bold, color: pdfInk });
      page.drawText("STRAIGHT-TIME GROSS ESTIMATE", { x: 54, y: 218, size: 9, font: bold, color: pdfMuted });
      page.drawText(currency(grossCents(card.hourly_rate_cents, minutes)), { x: 400, y: 216, size: 15, font: bold, color: pdfInk });
      if (isOver) {
        page.drawRectangle({ x: 42, y: 158, width: 528, height: 38, color: color("#fff4dc") });
        page.drawText("Over 40 hours entered. Review overtime before using this estimate for payroll.", { x: 54, y: 173, size: 8, font: bold, color: color("#775715") });
      }
      page.drawLine({ start: { x: 42, y: 90 }, end: { x: 570, y: 90 }, thickness: 0.7, color: pdfBorder });
      page.drawText("Timecard only. Gross estimate uses the entered hourly rate and recorded hours.", { x: 42, y: 73, size: 8, font: regular, color: pdfMuted });
      page.drawText("Excludes overtime premiums, bonuses, taxes, deductions, and withholding; verify payroll separately.", { x: 42, y: 59, size: 8, font: regular, color: pdfMuted });
      page.drawText("TC Cleaning Services AZ LLC  |  (480) 310-8040  |  tccleaningaz.com", { x: 42, y: 34, size: 8, font: regular, color: pdfMuted });
      const bytes = await doc.save();
      const pdfBuffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(pdfBuffer).set(bytes);
      const blob = new Blob([pdfBuffer], { type: "application/pdf" });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = card.employee_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "employee";
      link.href = objectUrl;
      link.download = "TC-Timecard-" + safeName + "-" + card.week_start_date + ".pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The PDF could not be generated.");
    }
  }

  const filteredCards = cards.filter((card) => (card.employee_name + " " + card.week_start_date).toLowerCase().includes(filter.toLowerCase()));
  const draftForPreview = draftCard();

  return (
    <div style={{ marginTop: 28 }}>
      <section style={{ background: "white", border: "1px solid " + border, borderRadius: 12, padding: "clamp(18px, 4vw, 30px)", boxShadow: "0 3px 14px rgba(0,0,0,.04)" }}>
        <p style={{ margin: "0 0 5px", color: green, fontWeight: 700, letterSpacing: ".08em", fontSize: 12 }}>TC CLEANING SERVICES AZ LLC</p>
        <h2 style={{ margin: "0 0 8px", fontSize: 25 }}>Create a weekly timecard</h2>
        <p style={{ marginTop: 0, color: muted, lineHeight: 1.55 }}>Enter one employee and one Monday–Friday workweek. Save it for the history, preview it any time, or download a branded PDF.</p>
        {notice && <p role="status" style={{ padding: 12, borderRadius: 7, background: "#e8f5ec", color: "#176b40" }}>{notice}</p>}
        {error && <p role="alert" style={{ padding: 12, borderRadius: 7, background: "#fff0ef", color: "#8a3028" }}>{error}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 14 }}>
          <label style={labelStyle}>Employee name<input required maxLength={160} value={employeeName} onChange={(event) => setEmployeeName(event.target.value)} placeholder="Employee name" style={fieldStyle} /></label>
          <label style={labelStyle}>Hourly rate ($)<input required type="number" min="0.01" max="1000" step="0.01" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} placeholder="Enter this employee's rate" style={fieldStyle} /></label>
          <label style={labelStyle}>Week starts (Monday)<input required type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} style={fieldStyle} /></label>
        </div>
        <h3 style={{ margin: "24px 0 12px" }}>Hours by day</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 145px), 1fr))", gap: 12 }}>
          {dayNames.map((day, index) => (
            <label key={day} style={labelStyle}>
              {day} <span style={{ color: muted, fontWeight: 400 }}>({dateForDay(weekStart, index) || "select a Monday"})</span>
              <input type="number" min="0" max="24" step="0.25" inputMode="decimal" value={hours[day]} onChange={(event) => setHours((current) => ({ ...current, [day]: event.target.value }))} placeholder="0.00" style={fieldStyle} />
            </label>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", alignItems: "center", gap: 14, marginTop: 20, padding: 16, border: "1px solid " + border, borderRadius: 9, background: "#f7f9fa" }}>
          <div><span style={{ display: "block", color: muted, fontSize: 13 }}>TOTAL HOURS</span><strong style={{ fontSize: 22 }}>{totalHours(draftTotalMinutes).toFixed(2)}</strong></div>
          <div><span style={{ display: "block", color: muted, fontSize: 13 }}>STRAIGHT-TIME GROSS ESTIMATE</span><strong style={{ fontSize: 22 }}>{currency(draftGrossCents)}</strong></div>
          {isOverForty && <p role="alert" style={{ margin: 0, padding: 10, borderRadius: 7, background: "#fff4dc", color: "#775715", gridColumn: "1 / -1" }}>More than 40 hours are entered. This straight-time estimate does not calculate overtime premiums; review the applicable payroll rules before paying.</p>}
        </div>
        <p style={{ color: muted, fontSize: 13, lineHeight: 1.5 }}>This creates a timecard and gross wage estimate only. It does not calculate bonuses, tax, deductions, withholding, or final payroll, and it does not automatically post an expense to Business Reports.</p>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          <button type="button" disabled={busy} onClick={() => { const validationError = validateForm(); if (validationError) { setError(validationError); setNotice(""); } else { setError(""); setNotice(""); setPreview(draftForPreview); } }} style={{ ...buttonStyle, background: "#244763", opacity: busy ? .6 : 1 }}>Preview timecard</button>
          <button type="button" disabled={busy} onClick={() => void saveTimecard()} style={{ ...buttonStyle, opacity: busy ? .6 : 1 }}>{busy ? "Saving…" : "Save timecard"}</button>
          <button type="button" disabled={busy} onClick={resetForm} style={{ ...buttonStyle, background: "#eef2f4", color: ink, opacity: busy ? .6 : 1 }}>Clear for next employee</button>
        </div>
      </section>

      <section style={{ marginTop: 26, background: "white", border: "1px solid " + border, borderRadius: 12, padding: "clamp(18px, 4vw, 30px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div><h2 style={{ margin: 0 }}>Saved timecards</h2><p style={{ margin: "6px 0 0", color: muted }}>Saved records remain available for later preview, PDF download, or deletion.</p></div>
          <input aria-label="Search saved timecards" placeholder="Search employee or week" value={filter} onChange={(event) => setFilter(event.target.value)} style={{ ...fieldStyle, maxWidth: 280 }} />
        </div>
        {loading ? <p style={{ color: muted }}>Loading saved timecards…</p> : filteredCards.length === 0 ? <p style={{ color: muted }}>{filter ? "No saved timecards match that search." : "No saved timecards yet."}</p> : (
          <div style={{ display: "grid", gap: 11, marginTop: 16 }}>
            {filteredCards.map((card) => {
              const minutes = totalMinutes(card);
              return (
                <article key={card.id} style={{ border: "1px solid " + border, borderRadius: 9, padding: 15, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong>{card.employee_name}</strong>
                    <p style={{ margin: "5px 0 0", color: muted }}>Week of {dateLong(card.week_start_date)} · {totalHours(minutes).toFixed(2)} hours · {currency(grossCents(card.hourly_rate_cents, minutes))} straight-time estimate</p>
                    {minutes > 40 * 60 && <p style={{ margin: "5px 0 0", color: "#775715", fontSize: 13 }}>Over 40 hours — review overtime before payroll.</p>}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => setPreview(card)} style={{ ...buttonStyle, background: "#244763" }}>Preview</button>
                    <button type="button" disabled={busy} onClick={() => void downloadPdf(card)} style={buttonStyle}>Download PDF</button>
                    <button type="button" disabled={busy} onClick={() => void deleteTimecard(card)} style={{ ...buttonStyle, background: "#fff0ef", color: "#8a3028" }}>Delete</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {preview && (
        <div onClick={(event) => { if (event.target === event.currentTarget) setPreview(null); }} style={{ position: "fixed", inset: 0, zIndex: 1000, overflowY: "auto", padding: "20px 12px", background: "rgba(10,20,30,.62)" }}>
          <section role="dialog" aria-modal="true" aria-labelledby="timecard-preview-title" style={{ maxWidth: 720, margin: "20px auto", overflow: "hidden", borderRadius: 12, background: "white", boxShadow: "0 16px 50px rgba(0,0,0,.25)" }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "18px 22px", background: navy, borderBottom: "4px solid " + brightGreen, color: "white" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Image src="/images/tc-cleaning-logo.png" alt="TC Cleaning logo" width={86} height={58} style={{ width: 86, height: 58, objectFit: "contain", background: "white", borderRadius: 5 }} />
                <div><p style={{ margin: 0, color: brightGreen, fontSize: 11, fontWeight: 700, letterSpacing: ".08em" }}>TC CLEANING SERVICES AZ LLC</p><h2 id="timecard-preview-title" style={{ margin: "5px 0 0" }}>Weekly timecard</h2></div>
              </div>
              <button type="button" onClick={() => setPreview(null)} aria-label="Close preview" style={{ border: "1px solid rgba(255,255,255,.5)", borderRadius: 7, padding: "8px 12px", background: "transparent", color: "white", fontWeight: 700, cursor: "pointer" }}>Close</button>
            </header>
            <div style={{ padding: "clamp(18px,4vw,28px)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 15, paddingBottom: 18, borderBottom: "1px solid " + border }}>
                <div><span style={{ display: "block", color: muted, fontSize: 12, fontWeight: 700 }}>EMPLOYEE</span><strong style={{ fontSize: 18 }}>{preview.employee_name}</strong></div>
                <div><span style={{ display: "block", color: muted, fontSize: 12, fontWeight: 700 }}>WEEK OF</span><strong style={{ fontSize: 18 }}>{dateLong(preview.week_start_date)}</strong></div>
                <div><span style={{ display: "block", color: muted, fontSize: 12, fontWeight: 700 }}>HOURLY RATE</span><strong style={{ fontSize: 18 }}>{currency(preview.hourly_rate_cents)}</strong></div>
              </div>
              <div style={{ marginTop: 18 }}>
                {dayNames.map((day, index) => (
                  <div key={day} style={{ display: "grid", gridTemplateColumns: "minmax(105px,1fr) minmax(90px,1fr) minmax(75px,.7fr)", gap: 8, padding: "12px 4px", borderBottom: "1px solid " + border }}>
                    <strong>{day}</strong><span style={{ color: muted }}>{dateForDay(preview.week_start_date, index)}</span><span style={{ textAlign: "right" }}>{(minutesFor(preview, day) / 60).toFixed(2)} hrs</span>
                  </div>
                ))}
              </div>
              <div style={{ maxWidth: 340, margin: "18px 0 0 auto" }}>
                <p style={{ display: "flex", justifyContent: "space-between", gap: 15, margin: "8px 0", color: muted }}>Total hours <strong style={{ color: ink }}>{totalHours(totalMinutes(preview)).toFixed(2)}</strong></p>
                <p style={{ display: "flex", justifyContent: "space-between", gap: 15, margin: "8px 0", paddingTop: 10, borderTop: "1px solid " + border, fontSize: 18 }}>Straight-time gross estimate <strong>{currency(grossCents(preview.hourly_rate_cents, totalMinutes(preview)))}</strong></p>
              </div>
              {totalMinutes(preview) > 40 * 60 && <p role="alert" style={{ padding: 11, borderRadius: 7, background: "#fff4dc", color: "#775715" }}>Over 40 hours entered. Review applicable overtime before using this estimate for payroll.</p>}
              <p style={{ marginTop: 18, paddingTop: 13, borderTop: "1px solid " + border, color: muted, fontSize: 13, lineHeight: 1.5 }}>Timecard only. Estimate uses the entered hourly rate and recorded hours; it excludes overtime premiums, bonuses, taxes, deductions, and withholding. It is not a final paystub.</p>
              <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                <button type="button" onClick={() => void downloadPdf(preview)} style={buttonStyle}>Download branded PDF</button>
                <button type="button" onClick={() => setPreview(null)} style={{ ...buttonStyle, background: "#eef2f4", color: ink }}>Close preview</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
