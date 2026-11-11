import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";

export type FinancialReportEntry = {
  entry_type: "income" | "expense";
  transaction_date: string;
  paid_date: string | null;
  amount_cents: number;
  category: string;
  counterparty: string;
  payment_method: string;
  description: string;
};

const navy = rgb(16 / 255, 25 / 255, 35 / 255);
const green = rgb(139 / 255, 211 / 255, 74 / 255);
const brandGreen = rgb(22 / 255, 131 / 255, 74 / 255);
const ink = rgb(23 / 255, 43 / 255, 61 / 255);
const muted = rgb(82 / 255, 97 / 255, 109 / 255);
const border = rgb(222 / 255, 229 / 255, 234 / 255);
const pale = rgb(243 / 255, 246 / 255, 248 / 255);
const letter: [number, number] = [612, 792];
const currency = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

function cleanText(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[\u2010-\u2015\u2212]/g, "-").replace(/[^\x20-\x7E]/g, " ");
}

function wrap(value: string, font: PDFFont, size: number, maxWidth: number) {
  const result: string[] = [];
  let line = "";
  for (const word of cleanText(value || "-").split(/\s+/)) {
    let part = "";
    for (const char of word) {
      if (part && font.widthOfTextAtSize(part + char, size) > maxWidth) {
        const candidate = line ? `${line} ${part}` : part;
        if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) { result.push(line); line = part; }
        else line = candidate;
        part = char;
      } else part += char;
    }
    if (!part) continue;
    const candidate = line ? `${line} ${part}` : part;
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) { result.push(line); line = part; }
    else line = candidate;
  }
  if (line) result.push(line);
  return result.length ? result : [""];
}

function prettyDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
}

export async function createFinancialReportPdf(
  entries: FinancialReportEntry[],
  reportTitle: string,
  startDate: string,
  endDate: string,
  generatedAt: string,
  logoBytes?: Uint8Array,
) {
  const doc = await PDFDocument.create();
  doc.setTitle(`${reportTitle} - TC Cleaning Services AZ LLC`);
  doc.setAuthor("TC Cleaning Services AZ LLC");
  doc.setSubject(`Business financial activity from ${startDate} through ${endDate}`);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let logo: PDFImage | undefined;
  if (logoBytes) { try { logo = await doc.embedPng(logoBytes); } catch { /* The text wordmark still brands the report. */ } }

  const sorted = [...entries].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date) || a.description.localeCompare(b.description));
  const income = sorted.filter((entry) => entry.entry_type === "income").reduce((sum, entry) => sum + entry.amount_cents, 0);
  const expenses = sorted.filter((entry) => entry.entry_type === "expense").reduce((sum, entry) => sum + entry.amount_cents, 0);
  const net = income - expenses;
  const pages = [] as ReturnType<typeof doc.addPage>[];
  let page = doc.addPage(letter);
  pages.push(page);
  let y = 0;

  const drawFooter = (target: typeof page, index: number, total: number) => {
    target.drawLine({ start: { x: 42, y: 39 }, end: { x: 570, y: 39 }, thickness: 0.7, color: border });
    target.drawText(`TC Cleaning Services AZ LLC  |  (480) 310-8040  |  tccleaningaz.com  |  Confidential`, { x: 42, y: 23, size: 7.5, font: regular, color: muted });
    target.drawText(`Page ${index + 1} of ${total}`, { x: 526, y: 23, size: 7.5, font: regular, color: muted });
  };

  const drawBrandHeader = (continued: boolean) => {
    page.drawRectangle({ x: 0, y: 656, width: 612, height: 136, color: navy });
    page.drawRectangle({ x: 0, y: 652, width: 612, height: 4, color: green });
    if (!continued && logo) {
      const scale = Math.min(118 / logo.width, 92 / logo.height);
      page.drawImage(logo, { x: 42, y: 680, width: logo.width * scale, height: logo.height * scale });
    } else {
      page.drawText("TC CLEANING", { x: 42, y: 742, size: 20, font: bold, color: rgb(1, 1, 1) });
      page.drawText("SERVICES AZ LLC", { x: 43, y: 722, size: 10, font: bold, color: green });
    }
    page.drawText(continued ? "FINANCIAL REPORT - CONTINUED" : "BUSINESS FINANCIAL REPORT", { x: 206, y: 742, size: 15, font: bold, color: rgb(1, 1, 1) });
    page.drawText(cleanText(reportTitle.toUpperCase()), { x: 207, y: 717, size: 11, font: bold, color: green });
    page.drawText(`${prettyDate(startDate)} to ${prettyDate(endDate)}`, { x: 207, y: 695, size: 9, font: regular, color: rgb(0.88, 0.91, 0.94) });
    if (!continued) page.drawText(`Generated ${cleanText(generatedAt)}  |  ${sorted.length} transaction${sorted.length === 1 ? "" : "s"}`, { x: 207, y: 677, size: 8, font: regular, color: rgb(0.78, 0.83, 0.87) });
  };

  const columns = [
    { title: "DATE", width: 66 },
    { title: "TYPE / CATEGORY", width: 88 },
    { title: "DESCRIPTION", width: 136 },
    { title: "CUSTOMER / PAYEE", width: 98 },
    { title: "METHOD", width: 67 },
    { title: "AMOUNT", width: 73 },
  ];
  const tableLeft = 42;
  const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
  const drawTableHeader = () => {
    page.drawRectangle({ x: tableLeft, y: y - 20, width: tableWidth, height: 24, color: pale });
    let x = tableLeft + 6;
    for (const col of columns) {
      page.drawText(col.title, { x, y: y - 11, size: 7, font: bold, color: muted });
      x += col.width;
    }
    y -= 29;
  };
  const newPage = () => {
    page = doc.addPage(letter);
    pages.push(page);
    drawBrandHeader(true);
    y = 627;
    drawTableHeader();
  };

  drawBrandHeader(false);
  const summaryY = 568;
  const cards = [
    { label: "INCOME", amount: income, color: brandGreen },
    { label: "EXPENSES", amount: expenses, color: rgb(211 / 255, 110 / 255, 78 / 255) },
    { label: "NET ACTIVITY", amount: net, color: ink },
  ];
  cards.forEach((card, i) => {
    const x = 42 + i * 178;
    page.drawRectangle({ x, y: summaryY, width: 166, height: 62, color: pale, borderColor: border, borderWidth: 0.7 });
    page.drawText(card.label, { x: x + 12, y: summaryY + 41, size: 8, font: bold, color: muted });
    page.drawText(currency(card.amount), { x: x + 12, y: summaryY + 16, size: 17, font: bold, color: card.color });
  });
  page.drawText("ACCRUAL VIEW  |  Transactions are grouped by date earned or incurred.", { x: 42, y: 548, size: 8, font: regular, color: muted });
  y = 520;
  drawTableHeader();

  const rowFontSize = 7.5;
  for (const entry of sorted) {
    const values = [
      prettyDate(entry.transaction_date),
      `${entry.entry_type === "income" ? "Income" : "Expense"} / ${entry.category}`,
      entry.description,
      entry.counterparty || "-",
      entry.payment_method,
      currency(entry.amount_cents),
    ];
    const lines = values.map((value, i) => wrap(value, regular, rowFontSize, columns[i].width - 10));
    const rowHeight = Math.max(25, Math.max(...lines.map((cell) => cell.length)) * 9.5 + 10);
    if (y - rowHeight < 58) newPage();
    let x = tableLeft + 6;
    lines.forEach((cellLines, i) => {
      const rightAlign = i === 5;
      const colWidth = columns[i].width - 10;
      cellLines.forEach((line, lineIndex) => {
        const text = cleanText(line);
        const textWidth = regular.widthOfTextAtSize(text, rowFontSize);
        const drawX = rightAlign ? x + colWidth - textWidth : x;
        page.drawText(text, { x: drawX, y: y - 11 - lineIndex * 9.5, size: rowFontSize, font: i === 5 ? bold : regular, color: i === 5 ? (entry.entry_type === "income" ? brandGreen : ink) : ink });
      });
      x += columns[i].width;
    });
    page.drawLine({ start: { x: tableLeft, y: y - rowHeight + 2 }, end: { x: tableLeft + tableWidth, y: y - rowHeight + 2 }, thickness: 0.5, color: border });
    y -= rowHeight;
  }

  if (!sorted.length) {
    page.drawText("No transactions were recorded in this period.", { x: 48, y: y - 5, size: 10, font: regular, color: muted });
  }
  pages.forEach((pdfPage, index) => drawFooter(pdfPage, index, pages.length));
  return doc.save();
}
