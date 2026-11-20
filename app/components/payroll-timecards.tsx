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
  monday_start_time: string | null;
  monday_end_time: string | null;
  tuesday_start_time: string | null;
  tuesday_end_time: string | null;
  wednesday_start_time: string | null;
  wednesday_end_time: string | null;
  thursday_start_time: string | null;
  thursday_end_time: string | null;
  friday_start_time: string | null;
  friday_end_time: string | null;
  monday_shifts_json: string;
  tuesday_shifts_json: string;
  wednesday_shifts_json: string;
  thursday_shifts_json: string;
  friday_shifts_json: string;
  created_at: string;
};
type TimecardDraft = Omit<Timecard, "created_at"> & { created_at: string; updated_at: string };

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
const dayFields = ["monday_minutes", "tuesday_minutes", "wednesday_minutes", "thursday_minutes", "friday_minutes"] as const;
type DayName = (typeof dayNames)[number];
type HouseShift = { house: string; startTime: string; endTime: string };
type HouseShiftsByDay = Record<DayName, HouseShift[]>;
type LegacyMinutesByDay = Record<DayName, number>;
const blankShift = (): HouseShift => ({ house: "", startTime: "", endTime: "" });
const emptyHouseShifts = (): HouseShiftsByDay => ({ Monday: [blankShift()], Tuesday: [blankShift()], Wednesday: [blankShift()], Thursday: [blankShift()], Friday: [blankShift()] });
const emptyLegacyMinutes = (): LegacyMinutesByDay => ({ Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0 });
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
const durationFromTimes = (startTime: string, endTime: string) => {
  if (!startTime || !endTime) return 0;
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
};
const formatClockTime = (time: string | null | undefined) => {
  if (!time) return "—";
  const [hour, minute] = time.split(":").map(Number);
  return new Date(Date.UTC(2000, 0, 1, hour, minute)).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
};
const shiftMinutes = (shift: HouseShift) => shift.startTime && shift.endTime ? durationFromTimes(shift.startTime, shift.endTime) : 0;
const nonEmptyShifts = (shifts: HouseShift[]) => shifts.filter((shift) => shift.house.trim() || shift.startTime || shift.endTime);
const shiftJsonField = ["monday_shifts_json", "tuesday_shifts_json", "wednesday_shifts_json", "thursday_shifts_json", "friday_shifts_json"] as const;
const startField = ["monday_start_time", "tuesday_start_time", "wednesday_start_time", "thursday_start_time", "friday_start_time"] as const;
const endField = ["monday_end_time", "tuesday_end_time", "wednesday_end_time", "thursday_end_time", "friday_end_time"] as const;

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

function formatUpdatedAt(value: string) {
  const normalized = value.includes("T") ? value : value.replace(" ", "T") + "Z";
  const date = new Date(normalized);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function minutesFor(card: Timecard, day: DayName) {
  const index = dayNames.indexOf(day);
  return card[dayFields[index]];
}

function timesFor(card: Timecard, day: DayName) {
  const index = dayNames.indexOf(day);
  return { startTime: card[startField[index]] || "", endTime: card[endField[index]] || "" };
}

function shiftsFor(card: Timecard, day: DayName): HouseShift[] {
  const index = dayNames.indexOf(day);
  try {
    const saved = JSON.parse(card[shiftJsonField[index]]) as unknown;
    if (Array.isArray(saved)) {
      const shifts = saved.filter((shift): shift is HouseShift => typeof shift === "object" && shift !== null
        && typeof (shift as HouseShift).house === "string" && typeof (shift as HouseShift).startTime === "string" && typeof (shift as HouseShift).endTime === "string");
      if (shifts.length) return shifts.map((shift) => ({ ...shift }));
    }
  } catch { /* Older records use the single start/end columns below. */ }
  const times = timesFor(card, day);
  return times.startTime || times.endTime ? [{ house: "House", ...times }] : [];
}

function houseTotalsFor(card: Timecard) {
  const totals = new Map<string, { label: string; minutes: number }>();
  dayNames.forEach((day) => {
    const shifts = shiftsFor(card, day);
    const completed = shifts.filter((shift) => shift.startTime && shift.endTime && shift.house.trim());
    for (const shift of completed) {
      const key = shift.house.trim().toLocaleLowerCase();
      const current = totals.get(key) || { label: shift.house.trim(), minutes: 0 };
      current.minutes += shiftMinutes(shift);
      totals.set(key, current);
    }
    if (!completed.length && minutesFor(card, day) > 0) {
      const key = "__unassigned__";
      const current = totals.get(key) || { label: "House not specified", minutes: 0 };
      current.minutes += minutesFor(card, day);
      totals.set(key, current);
    }
  });
  return [...totals.values()].sort((left, right) => left.label.localeCompare(right.label));
}

function safePdfText(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, " ");
}

export default function PayrollTimecards() {
  const [employeeName, setEmployeeName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [weekStart, setWeekStart] = useState(currentMonday);
  const [shiftsByDay, setShiftsByDay] = useState<HouseShiftsByDay>(emptyHouseShifts);
  const [legacyMinutes, setLegacyMinutes] = useState<LegacyMinutesByDay>(emptyLegacyMinutes);
  const [cards, setCards] = useState<Timecard[]>([]);
  const [drafts, setDrafts] = useState<TimecardDraft[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [preview, setPreview] = useState<Timecard | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const draftMinutes = useMemo(() => dayNames.map((day) => {
    const completed = shiftsByDay[day].filter((shift) => shift.startTime && shift.endTime);
    if (!completed.length) return legacyMinutes[day];
    return completed.reduce((sum, shift) => sum + shiftMinutes(shift), 0);
  }), [shiftsByDay, legacyMinutes]);
  const draftTotalMinutes = draftMinutes.reduce((sum, minutes) => sum + minutes, 0);
  const draftRateCents = Math.round((Number(hourlyRate) || 0) * 100);
  const draftGrossCents = grossCents(draftRateCents, draftTotalMinutes);
  const isOverForty = draftTotalMinutes > 40 * 60;
  const draftHouseTotals = useMemo(() => {
    const totals = new Map<string, { label: string; minutes: number }>();
    dayNames.forEach((day) => {
      const complete = shiftsByDay[day].filter((shift) => shift.startTime && shift.endTime && shift.house.trim());
      complete.forEach((shift) => {
        const key = shift.house.trim().toLocaleLowerCase();
        const total = totals.get(key) || { label: shift.house.trim(), minutes: 0 };
        total.minutes += shiftMinutes(shift);
        totals.set(key, total);
      });
      if (!complete.length && legacyMinutes[day] > 0) {
        const total = totals.get("__unassigned__") || { label: "House not specified (older entry)", minutes: 0 };
        total.minutes += legacyMinutes[day];
        totals.set("__unassigned__", total);
      }
    });
    return [...totals.values()].sort((left, right) => left.label.localeCompare(right.label));
  }, [shiftsByDay, legacyMinutes]);

  const loadTimecards = useCallback(async () => {
    try {
      const response = await fetch("/api/manager/payroll", { cache: "no-store" });
      const data = await response.json() as { timecards?: Timecard[]; drafts?: TimecardDraft[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Saved timecards could not be loaded.");
      setCards(Array.isArray(data.timecards) ? data.timecards : []);
      setDrafts(Array.isArray(data.drafts) ? data.drafts : []);
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
    setShiftsByDay(emptyHouseShifts());
    setLegacyMinutes(emptyLegacyMinutes());
    setEditingDraftId(null);
    setError("");
    setNotice("");
  }

  function draftCard(): Timecard {
    const date = weekStart;
    const firstShift = (day: DayName) => nonEmptyShifts(shiftsByDay[day])[0] || blankShift();
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
      monday_start_time: firstShift("Monday").startTime || null,
      monday_end_time: firstShift("Monday").endTime || null,
      tuesday_start_time: firstShift("Tuesday").startTime || null,
      tuesday_end_time: firstShift("Tuesday").endTime || null,
      wednesday_start_time: firstShift("Wednesday").startTime || null,
      wednesday_end_time: firstShift("Wednesday").endTime || null,
      thursday_start_time: firstShift("Thursday").startTime || null,
      thursday_end_time: firstShift("Thursday").endTime || null,
      friday_start_time: firstShift("Friday").startTime || null,
      friday_end_time: firstShift("Friday").endTime || null,
      monday_shifts_json: JSON.stringify(nonEmptyShifts(shiftsByDay.Monday)),
      tuesday_shifts_json: JSON.stringify(nonEmptyShifts(shiftsByDay.Tuesday)),
      wednesday_shifts_json: JSON.stringify(nonEmptyShifts(shiftsByDay.Wednesday)),
      thursday_shifts_json: JSON.stringify(nonEmptyShifts(shiftsByDay.Thursday)),
      friday_shifts_json: JSON.stringify(nonEmptyShifts(shiftsByDay.Friday)),
      created_at: "",
    };
  }

  function updateHouseShift(day: DayName, index: number, changes: Partial<HouseShift>) {
    setShiftsByDay((current) => ({ ...current, [day]: current[day].map((shift, shiftIndex) => shiftIndex === index ? { ...shift, ...changes } : shift) }));
  }

  function addHouseShift(day: DayName) {
    setShiftsByDay((current) => current[day].length >= 10 ? current : ({ ...current, [day]: [...current[day], blankShift()] }));
  }

  function removeHouseShift(day: DayName, index: number) {
    setShiftsByDay((current) => {
      const remaining = current[day].filter((_, shiftIndex) => shiftIndex !== index);
      return { ...current, [day]: remaining.length ? remaining : [blankShift()] };
    });
  }

  function validateForm(requireHours = false) {
    if (!employeeName.trim() || employeeName.trim().length > 160) return "Enter an employee name (up to 160 characters).";
    if (!Number.isFinite(Number(hourlyRate)) || draftRateCents <= 0 || draftRateCents > 100_000) return "Enter an hourly rate greater than $0 and no more than $1,000.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return "Choose a valid week-start date.";
    const parsedDate = new Date(weekStart + "T12:00:00Z");
    if (Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== weekStart || parsedDate.getUTCDay() !== 1) return "The selected week must start on a Monday.";
    for (const day of dayNames) {
      const shifts = nonEmptyShifts(shiftsByDay[day]);
      if (shifts.length > 10) return day + " can have up to 10 house entries.";
      const intervals: Array<{ start: number; end: number }> = [];
      for (const shift of shifts) {
        const hasStart = Boolean(shift.startTime);
        const hasEnd = Boolean(shift.endTime);
        if (hasStart && hasEnd) {
          if (shift.endTime <= shift.startTime) return day + " ending time must be later than the starting time for each house.";
          if (!shift.house.trim() || shift.house.trim().length > 160) return "Add a house or client name for each completed shift.";
          const [startHour, startMinute] = shift.startTime.split(":").map(Number);
          const [endHour, endMinute] = shift.endTime.split(":").map(Number);
          intervals.push({ start: startHour * 60 + startMinute, end: endHour * 60 + endMinute });
        }
        if (requireHours && (hasStart !== hasEnd || ((hasStart || hasEnd || shift.house.trim()) && !(hasStart && hasEnd)))) return "Complete the house name and both clock times for each visit before finalizing.";
      }
      intervals.sort((left, right) => left.start - right.start);
      if (intervals.some((interval, index) => index > 0 && interval.start < intervals[index - 1].end)) return day + " has overlapping house visits; correct the times to avoid double-counting hours.";
      if (draftMinutes[dayNames.indexOf(day)] > 1440) return day + " cannot exceed 24 hours.";
    }
    if (requireHours && draftTotalMinutes <= 0) return "Enter at least some hours before finalizing this timecard.";
    return "";
  }

  function timecardPayload() {
    return {
      employeeName: employeeName.trim(),
      hourlyRateCents: draftRateCents,
      weekStartDate: weekStart,
      weekdayMinutes: draftMinutes,
      weekdayShifts: dayNames.map((day) => nonEmptyShifts(shiftsByDay[day]).map(({ house, startTime, endTime }) => ({ house, startTime, endTime }))),
    };
  }

  async function persistDraft() {
    const response = await fetch(editingDraftId ? "/api/manager/payroll/" + encodeURIComponent(editingDraftId) : "/api/manager/payroll", {
      method: editingDraftId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(timecardPayload()),
    });
    const data = await response.json() as { error?: string; draft?: TimecardDraft };
    if (!response.ok || !data.draft) throw new Error(data.error || "Timecard draft could not be saved.");
    setEditingDraftId(data.draft.id);
    return data.draft;
  }

  async function saveDraft() {
    const validationError = validateForm();
    if (validationError) { setError(validationError); setNotice(""); return; }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const draft = await persistDraft();
      await loadTimecards();
      setNotice("Draft saved for " + draft.employee_name + ". You can reopen it during the week and add more hours.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Timecard could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function finalizeAndDownload() {
    const validationError = validateForm(true);
    if (validationError) { setError(validationError); setNotice(""); return; }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const draft = await persistDraft();
      const response = await fetch("/api/manager/payroll/" + encodeURIComponent(draft.id) + "/finalize", { method: "POST" });
      const data = await response.json() as { error?: string; timecard?: Timecard };
      if (!response.ok || !data.timecard) throw new Error(data.error || "Timecard could not be finalized.");
      setCards((current) => [data.timecard as Timecard, ...current.filter((card) => card.id !== draft.id)]);
      setDrafts((current) => current.filter((card) => card.id !== draft.id));
      resetForm();
      setNotice("Timecard finalized. Your branded PDF is downloading.");
      await downloadPdf(data.timecard);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Timecard could not be finalized.");
    } finally {
      setBusy(false);
    }
  }

  function reopenDraft(draft: TimecardDraft) {
    setEmployeeName(draft.employee_name);
    setHourlyRate((draft.hourly_rate_cents / 100).toFixed(2));
    setWeekStart(draft.week_start_date);
    setShiftsByDay({
      Monday: shiftsFor(draft, "Monday").length ? shiftsFor(draft, "Monday") : [blankShift()],
      Tuesday: shiftsFor(draft, "Tuesday").length ? shiftsFor(draft, "Tuesday") : [blankShift()],
      Wednesday: shiftsFor(draft, "Wednesday").length ? shiftsFor(draft, "Wednesday") : [blankShift()],
      Thursday: shiftsFor(draft, "Thursday").length ? shiftsFor(draft, "Thursday") : [blankShift()],
      Friday: shiftsFor(draft, "Friday").length ? shiftsFor(draft, "Friday") : [blankShift()],
    });
    setLegacyMinutes({
      Monday: shiftsFor(draft, "Monday").length ? 0 : draft.monday_minutes,
      Tuesday: shiftsFor(draft, "Tuesday").length ? 0 : draft.tuesday_minutes,
      Wednesday: shiftsFor(draft, "Wednesday").length ? 0 : draft.wednesday_minutes,
      Thursday: shiftsFor(draft, "Thursday").length ? 0 : draft.thursday_minutes,
      Friday: shiftsFor(draft, "Friday").length ? 0 : draft.friday_minutes,
    });
    setEditingDraftId(draft.id);
    setError("");
    setNotice("Draft reopened. Add or update the house visits, then save your changes.");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      setDrafts((current) => current.filter((entry) => entry.id !== card.id));
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
      const color = (hex: string) => rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
      const pdfNavy = color(navy);
      const pdfGreen = color(brightGreen);
      const pdfInk = color(ink);
      const pdfMuted = color(muted);
      const pdfBorder = color(border);
      let logoImage: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
      try {
        const response = await fetch("/images/tc-cleaning-logo.png");
        if (response.ok) logoImage = await doc.embedPng(new Uint8Array(await response.arrayBuffer()));
      } catch { /* The text wordmark still identifies the company if the logo cannot load. */ }
      const addPage = (table: boolean, title = "WEEKLY TIMECARD") => {
        const page = doc.addPage([612, 792]);
        page.drawRectangle({ x: 0, y: 648, width: 612, height: 144, color: pdfNavy });
        page.drawRectangle({ x: 0, y: 644, width: 612, height: 4, color: pdfGreen });
        if (logoImage) {
          const scale = Math.min(128 / logoImage.width, 96 / logoImage.height);
          page.drawImage(logoImage, { x: 42, y: 686, width: logoImage.width * scale, height: logoImage.height * scale });
        } else {
          page.drawText("TC CLEANING", { x: 42, y: 730, size: 20, font: bold, color: rgb(1, 1, 1) });
          page.drawText("SERVICES AZ LLC", { x: 43, y: 711, size: 10, font: bold, color: pdfGreen });
        }
        page.drawText(title, { x: 338, y: 742, size: 15, font: bold, color: rgb(1, 1, 1) });
        page.drawText("TC CLEANING SERVICES AZ LLC", { x: 338, y: 720, size: 9, font: bold, color: pdfGreen });
        page.drawText("Week of " + safePdfText(dateLong(card.week_start_date)), { x: 338, y: 699, size: 9, font: regular, color: rgb(0.88, 0.91, 0.94) });
        page.drawText("EMPLOYEE", { x: 42, y: 600, size: 8, font: bold, color: pdfMuted });
        page.drawText(safePdfText(card.employee_name).slice(0, 36), { x: 42, y: 579, size: 16, font: bold, color: pdfInk });
        page.drawText("HOURLY RATE", { x: 360, y: 600, size: 8, font: bold, color: pdfMuted });
        page.drawText(currency(card.hourly_rate_cents), { x: 360, y: 579, size: 16, font: bold, color: pdfInk });
        if (table) {
          page.drawRectangle({ x: 42, y: 516, width: 528, height: 30, color: color("#edf2f5") });
          page.drawText("DAY", { x: 48, y: 527, size: 8, font: bold, color: pdfMuted });
          page.drawText("DATE", { x: 92, y: 527, size: 8, font: bold, color: pdfMuted });
          page.drawText("HOUSE / CLIENT", { x: 145, y: 527, size: 8, font: bold, color: pdfMuted });
          page.drawText("START", { x: 360, y: 527, size: 8, font: bold, color: pdfMuted });
          page.drawText("END", { x: 432, y: 527, size: 8, font: bold, color: pdfMuted });
          page.drawText("HRS", { x: 514, y: 527, size: 8, font: bold, color: pdfMuted });
        }
        page.drawLine({ start: { x: 42, y: 45 }, end: { x: 570, y: 45 }, thickness: 0.7, color: pdfBorder });
        page.drawText("TC Cleaning Services AZ LLC · (480) 310-8040 · tccleaningaz.com", { x: 42, y: 30, size: 8, font: regular, color: pdfMuted });
        return page;
      };
      const rows = dayNames.flatMap((day, dayIndex) => {
        const shifts = shiftsFor(card, day);
        if (shifts.length) return shifts.map((shift) => ({ day, dayIndex, shift, minutes: shift.startTime && shift.endTime ? shiftMinutes(shift) : 0 }));
        return [{ day, dayIndex, shift: { house: minutesFor(card, day) > 0 ? "House not specified" : "No visit", startTime: "", endTime: "" }, minutes: minutesFor(card, day) }];
      });
      let page = addPage(true);
      let y = 492;
      for (const row of rows) {
        if (y < 66) { page = addPage(true, "WEEKLY TIMECARD · CONTINUED"); y = 492; }
        page.drawText(row.day, { x: 48, y, size: 8, font: regular, color: pdfInk });
        page.drawText(dateForDay(card.week_start_date, row.dayIndex), { x: 92, y, size: 8, font: regular, color: pdfInk });
        page.drawText(safePdfText(row.shift.house || "House name needed").slice(0, 34), { x: 145, y, size: 8, font: regular, color: pdfInk });
        page.drawText(safePdfText(formatClockTime(row.shift.startTime)), { x: 360, y, size: 8, font: regular, color: pdfInk });
        page.drawText(safePdfText(formatClockTime(row.shift.endTime)), { x: 432, y, size: 8, font: regular, color: pdfInk });
        page.drawText(totalHours(row.minutes).toFixed(2), { x: 514, y, size: 8, font: regular, color: pdfInk });
        page.drawLine({ start: { x: 42, y: y - 7 }, end: { x: 570, y: y - 7 }, thickness: 0.5, color: pdfBorder });
        y -= 19;
      }
      const minutes = totalMinutes(card);
      const isOver = minutes > 40 * 60;
      let summaryPage = addPage(false, "HOURS BY HOUSE");
      let summaryY = 548;
      summaryPage.drawText("DAILY HOURS", { x: 54, y: summaryY, size: 10, font: bold, color: pdfGreen });
      summaryY -= 25;
      dayNames.forEach((day, index) => {
        summaryPage.drawText(day + " · " + dateForDay(card.week_start_date, index), { x: 54, y: summaryY, size: 10, font: regular, color: pdfInk });
        summaryPage.drawText(totalHours(minutesFor(card, day)).toFixed(2) + " hrs", { x: 465, y: summaryY, size: 10, font: bold, color: pdfInk });
        summaryY -= 18;
      });
      summaryY -= 10;
      summaryPage.drawText("HOURS BY HOUSE", { x: 54, y: summaryY, size: 10, font: bold, color: pdfGreen });
      summaryY -= 24;
      for (const house of houseTotalsFor(card)) {
        if (summaryY < 84) { summaryPage = addPage(false, "HOURS BY HOUSE · CONTINUED"); summaryY = 548; }
        summaryPage.drawText(safePdfText(house.label).slice(0, 55), { x: 54, y: summaryY, size: 10, font: regular, color: pdfInk });
        summaryPage.drawText(totalHours(house.minutes).toFixed(2) + " hrs", { x: 465, y: summaryY, size: 10, font: bold, color: pdfInk });
        summaryPage.drawLine({ start: { x: 54, y: summaryY - 6 }, end: { x: 558, y: summaryY - 6 }, thickness: 0.4, color: pdfBorder });
        summaryY -= 18;
      }
      if (summaryY < 110) { summaryPage = addPage(false, "WEEKLY PAY TOTALS"); summaryY = 548; }
      summaryPage.drawText("TOTAL HOURS", { x: 54, y: summaryY, size: 10, font: bold, color: pdfMuted });
      summaryPage.drawText(totalHours(minutes).toFixed(2), { x: 465, y: summaryY, size: 13, font: bold, color: pdfInk });
      summaryY -= 32;
      summaryPage.drawText("STRAIGHT-TIME GROSS ESTIMATE", { x: 54, y: summaryY, size: 10, font: bold, color: pdfMuted });
      summaryPage.drawText(currency(grossCents(card.hourly_rate_cents, minutes)), { x: 420, y: summaryY, size: 14, font: bold, color: pdfInk });
      if (isOver) {
        summaryY -= 28;
        summaryPage.drawRectangle({ x: 42, y: summaryY - 10, width: 528, height: 38, color: color("#fff4dc") });
        summaryPage.drawText("Over 40 hours entered. Review overtime before using this estimate for payroll.", { x: 54, y: summaryY + 4, size: 8, font: bold, color: color("#775715") });
      }
      summaryPage.drawText("Hours are elapsed time from start to end and include breaks. Unpaid breaks are not subtracted.", { x: 54, y: Math.max(66, summaryY - (isOver ? 40 : 22)), size: 8, font: regular, color: pdfMuted });
      summaryPage.drawText("Timecard only; excludes overtime premiums, bonuses, taxes, deductions, and withholding.", { x: 54, y: Math.max(52, summaryY - (isOver ? 54 : 36)), size: 8, font: regular, color: pdfMuted });
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
  const filteredDrafts = drafts.filter((card) => (card.employee_name + " " + card.week_start_date).toLowerCase().includes(filter.toLowerCase()));
  const draftForPreview = draftCard();

  return (
    <div style={{ marginTop: 28 }}>
      <section style={{ background: "white", border: "1px solid " + border, borderRadius: 12, padding: "clamp(18px, 4vw, 30px)", boxShadow: "0 3px 14px rgba(0,0,0,.04)" }}>
        <p style={{ margin: "0 0 5px", color: green, fontWeight: 700, letterSpacing: ".08em", fontSize: 12 }}>TC CLEANING SERVICES AZ LLC</p>
        <h2 style={{ margin: "0 0 8px", fontSize: 25 }}>{editingDraftId ? "Update this week's timecard" : "Start a weekly timecard"}</h2>
        <p style={{ marginTop: 0, color: muted, lineHeight: 1.55 }}>Add each house you clean each day, with its start and end time. The timecard calculates hours per visit, daily totals, and weekly hours by house. Save as the week progresses; finalize and download the branded PDF when complete.</p>
        {notice && <p role="status" style={{ padding: 12, borderRadius: 7, background: "#e8f5ec", color: "#176b40" }}>{notice}</p>}
        {error && <p role="alert" style={{ padding: 12, borderRadius: 7, background: "#fff0ef", color: "#8a3028" }}>{error}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 14 }}>
          <label style={labelStyle}>Employee name<input required maxLength={160} value={employeeName} onChange={(event) => setEmployeeName(event.target.value)} placeholder="Employee name" style={fieldStyle} /></label>
          <label style={labelStyle}>Hourly rate ($)<input required type="number" min="0.01" max="1000" step="0.01" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} placeholder="Enter this employee's rate" style={fieldStyle} /></label>
          <label style={labelStyle}>Week starts (Monday)<input required type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} style={fieldStyle} /></label>
        </div>
        <h3 style={{ margin: "24px 0 6px" }}>House visits by day</h3>
        <p style={{ margin: "0 0 12px", color: muted, fontSize: 13 }}>Add one row for each house. Enter the house or client name and that visit&apos;s start and end time.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
          {dayNames.map((day, index) => (
            <fieldset key={day} style={{ minWidth: 0, margin: 0, padding: 12, border: "1px solid " + border, borderRadius: 8 }}>
              <legend style={{ padding: "0 5px", color: ink, fontWeight: 700 }}>{day} · {dateForDay(weekStart, index) || "select a Monday"} · {totalHours(draftMinutes[index]).toFixed(2)} hrs</legend>
              <div style={{ display: "grid", gap: 12 }}>
                {shiftsByDay[day].map((shift, shiftIndex) => (
                  <div key={shiftIndex} style={{ padding: 10, border: "1px solid " + border, borderRadius: 7, background: "#fbfcfd" }}>
                    <label style={labelStyle}>House / client<input aria-label={day + " house " + (shiftIndex + 1)} maxLength={160} value={shift.house} onChange={(event) => updateHouseShift(day, shiftIndex, { house: event.target.value })} placeholder="e.g. Smith home" style={fieldStyle} /></label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 9 }}>
                      <label style={labelStyle}>Start<input aria-label={day + " house " + (shiftIndex + 1) + " start time"} type="time" value={shift.startTime} onChange={(event) => updateHouseShift(day, shiftIndex, { startTime: event.target.value })} style={fieldStyle} /></label>
                      <label style={labelStyle}>End<input aria-label={day + " house " + (shiftIndex + 1) + " ending time"} type="time" value={shift.endTime} onChange={(event) => updateHouseShift(day, shiftIndex, { endTime: event.target.value })} style={fieldStyle} /></label>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
                      <span style={{ fontSize: 13, color: muted }}>{shift.startTime && shift.endTime ? "Visit: " + totalHours(shiftMinutes(shift)).toFixed(2) + " hours" : "Enter start and end times"}</span>
                      <button type="button" aria-label={"Remove " + day + " house " + (shiftIndex + 1)} onClick={() => removeHouseShift(day, shiftIndex)} style={{ border: 0, background: "transparent", color: "#8a3028", fontWeight: 700, cursor: "pointer" }}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
              {legacyMinutes[day] > 0 && !shiftsByDay[day].some((shift) => shift.startTime && shift.endTime) && <p style={{ margin: "8px 0 0", color: muted, fontSize: 12 }}>Older entry: {totalHours(legacyMinutes[day]).toFixed(2)} hours (house was not recorded). It remains counted until you add a completed house visit.</p>}
              <button type="button" disabled={shiftsByDay[day].length >= 10} onClick={() => addHouseShift(day)} style={{ ...buttonStyle, width: "100%", marginTop: 10, padding: "9px 10px", background: "#eef2f4", color: ink }}>+ Add another house</button>
            </fieldset>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", alignItems: "center", gap: 14, marginTop: 20, padding: 16, border: "1px solid " + border, borderRadius: 9, background: "#f7f9fa" }}>
          <div><span style={{ display: "block", color: muted, fontSize: 13 }}>TOTAL HOURS</span><strong style={{ fontSize: 22 }}>{totalHours(draftTotalMinutes).toFixed(2)}</strong></div>
          <div><span style={{ display: "block", color: muted, fontSize: 13 }}>STRAIGHT-TIME GROSS ESTIMATE</span><strong style={{ fontSize: 22 }}>{currency(draftGrossCents)}</strong></div>
          {isOverForty && <p role="alert" style={{ margin: 0, padding: 10, borderRadius: 7, background: "#fff4dc", color: "#775715", gridColumn: "1 / -1" }}>More than 40 hours are entered. This straight-time estimate does not calculate overtime premiums; review the applicable payroll rules before paying.</p>}
          {draftHouseTotals.length > 0 && <div style={{ gridColumn: "1 / -1", paddingTop: 12, borderTop: "1px solid " + border }}><strong style={{ display: "block", marginBottom: 8 }}>Hours by house this week</strong><div style={{ display: "grid", gap: 5 }}>{draftHouseTotals.map((house) => <div key={house.label.toLocaleLowerCase()} style={{ display: "flex", justifyContent: "space-between", gap: 12, color: muted }}><span>{house.label}</span><strong style={{ color: ink }}>{totalHours(house.minutes).toFixed(2)} hrs</strong></div>)}</div></div>}
        </div>
        <p style={{ color: muted, fontSize: 13, lineHeight: 1.5 }}>Hours are calculated from start to end and include any break time; unpaid breaks are not subtracted. This creates a timecard and gross wage estimate only. It does not calculate bonuses, tax, deductions, withholding, or final payroll, and it does not automatically post an expense to Business Reports.</p>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          <button type="button" disabled={busy} onClick={() => { const validationError = validateForm(); if (validationError) { setError(validationError); setNotice(""); } else { setError(""); setNotice(""); setPreview(draftForPreview); } }} style={{ ...buttonStyle, background: "#244763", opacity: busy ? .6 : 1 }}>Preview timecard</button>
          <button type="button" disabled={busy} onClick={() => void saveDraft()} style={{ ...buttonStyle, opacity: busy ? .6 : 1 }}>{busy ? "Saving…" : editingDraftId ? "Save draft changes" : "Save weekly draft"}</button>
          <button type="button" disabled={busy} onClick={() => void finalizeAndDownload()} style={{ ...buttonStyle, background: "#244763", opacity: busy ? .6 : 1 }}>{busy ? "Finalizing…" : "Finalize & download PDF"}</button>
          <button type="button" disabled={busy} onClick={resetForm} style={{ ...buttonStyle, background: "#eef2f4", color: ink, opacity: busy ? .6 : 1 }}>Clear for next employee</button>
        </div>
      </section>

      <section style={{ marginTop: 26, background: "white", border: "1px solid " + border, borderRadius: 12, padding: "clamp(18px, 4vw, 30px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div><h2 style={{ margin: 0 }}>Timecards in progress</h2><p style={{ margin: "6px 0 0", color: muted }}>Reopen a draft to add house visits during the week. Drafts do not count as finalized payroll records.</p></div>
          <input aria-label="Search timecards" placeholder="Search employee or week" value={filter} onChange={(event) => setFilter(event.target.value)} style={{ ...fieldStyle, maxWidth: 280 }} />
        </div>
        {loading ? <p style={{ color: muted }}>Loading drafts…</p> : filteredDrafts.length === 0 ? <p style={{ color: muted }}>{filter ? "No drafts match that search." : "No timecards in progress. Start one above when the workweek begins."}</p> : (
          <div style={{ display: "grid", gap: 11, marginTop: 16 }}>
            {filteredDrafts.map((draft) => {
              const minutes = totalMinutes(draft);
              return (
                <article key={draft.id} style={{ border: "1px solid " + border, borderRadius: 9, padding: 15, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong>{draft.employee_name}</strong>
                    <p style={{ margin: "5px 0 0", color: muted }}>Week of {dateLong(draft.week_start_date)} · {totalHours(minutes).toFixed(2)} hours so far · Updated {formatUpdatedAt(draft.updated_at)}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => reopenDraft(draft)} style={{ ...buttonStyle, background: "#244763" }}>Open & add visits</button>
                    <button type="button" onClick={() => setPreview(draft)} style={{ ...buttonStyle, background: "#526878" }}>Preview</button>
                    <button type="button" disabled={busy} onClick={() => void deleteTimecard(draft)} style={{ ...buttonStyle, background: "#fff0ef", color: "#8a3028" }}>Delete</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ marginTop: 26, background: "white", border: "1px solid " + border, borderRadius: 12, padding: "clamp(18px, 4vw, 30px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div><h2 style={{ margin: 0 }}>Finalized timecards</h2><p style={{ margin: "6px 0 0", color: muted }}>Finalized records remain available for later preview, PDF download, or deletion.</p></div>
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
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)", gap: 7, padding: "8px 4px", color: muted, fontSize: 11, fontWeight: 700, borderBottom: "1px solid " + border }}>
                  <span>DAY · DATE</span><span style={{ textAlign: "right" }}>START – END · HOURS</span>
                </div>
                {dayNames.map((day, index) => {
                  const shifts = shiftsFor(preview, day);
                  return (
                    <div key={day} style={{ padding: "10px 4px", borderBottom: "1px solid " + border }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 5 }}><strong>{day} · {dateForDay(preview.week_start_date, index)}</strong><strong>{totalHours(minutesFor(preview, day)).toFixed(2)} hrs</strong></div>
                      {shifts.map((shift, shiftIndex) => (
                        <div key={shiftIndex} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, padding: "5px 0", color: muted, fontSize: 13 }}>
                          <span>{shift.house || "House name needed"}</span><span style={{ textAlign: "right" }}>{formatClockTime(shift.startTime)} – {formatClockTime(shift.endTime)} · {shift.startTime && shift.endTime ? totalHours(shiftMinutes(shift)).toFixed(2) + " hrs" : "incomplete"}</span>
                        </div>
                      ))}
                      {!shifts.length && minutesFor(preview, day) > 0 && <p style={{ margin: 0, color: muted, fontSize: 13 }}>House not specified · {totalHours(minutesFor(preview, day)).toFixed(2)} hrs from an older entry</p>}
                      {!shifts.length && minutesFor(preview, day) === 0 && <p style={{ margin: 0, color: muted, fontSize: 13 }}>No visits entered</p>}
                    </div>
                  );
                })}
              </div>
              <div style={{ maxWidth: 340, margin: "18px 0 0 auto" }}>
                <p style={{ display: "flex", justifyContent: "space-between", gap: 15, margin: "8px 0", color: muted }}>Total hours <strong style={{ color: ink }}>{totalHours(totalMinutes(preview)).toFixed(2)}</strong></p>
                <p style={{ display: "flex", justifyContent: "space-between", gap: 15, margin: "8px 0", paddingTop: 10, borderTop: "1px solid " + border, fontSize: 18 }}>Straight-time gross estimate <strong>{currency(grossCents(preview.hourly_rate_cents, totalMinutes(preview)))}</strong></p>
              </div>
              {houseTotalsFor(preview).length > 0 && <div style={{ marginTop: 18, padding: 14, borderRadius: 8, background: "#f7f9fa" }}><strong>Hours by house</strong>{houseTotalsFor(preview).map((house) => <p key={house.label.toLocaleLowerCase()} style={{ display: "flex", justifyContent: "space-between", gap: 12, margin: "7px 0 0", color: muted }}><span>{house.label}</span><strong style={{ color: ink }}>{totalHours(house.minutes).toFixed(2)} hrs</strong></p>)}</div>}
              {totalMinutes(preview) > 40 * 60 && <p role="alert" style={{ padding: 11, borderRadius: 7, background: "#fff4dc", color: "#775715" }}>Over 40 hours entered. Review applicable overtime before using this estimate for payroll.</p>}
              <p style={{ marginTop: 18, paddingTop: 13, borderTop: "1px solid " + border, color: muted, fontSize: 13, lineHeight: 1.5 }}>Timecard only. Hours are elapsed time between recorded start and end and include breaks. Estimate uses the entered hourly rate; it excludes overtime premiums, bonuses, taxes, deductions, and withholding. It is not a final paystub.</p>
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
