import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";

type InvoicePdfData = {
  invoice_number: string; client_name: string; client_email: string; client_phone?: string;
  billing_address: string; issue_date: string; due_date: string; notes: string;
  subtotal_cents: number; tax_cents: number; deposit_paid_cents: number; total_cents: number;
  payment_url?: string; venmo_url?: string; zelle_recipient?: string;
};
type InvoicePdfItem = { description: string; quantity: number; unit_price_cents: number; line_total_cents: number };

const navy = rgb(16 / 255, 25 / 255, 35 / 255);
const green = rgb(139 / 255, 211 / 255, 74 / 255);
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
  const lines: string[] = [];
  for (const paragraph of cleanText(value).split(/\r?\n/)) {
    if (!paragraph) { lines.push(""); continue; }
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const parts: string[] = [];
      let split = "";
      for (const character of word) {
        if (split && font.widthOfTextAtSize(split + character, size) > maxWidth) { parts.push(split); split = character; }
        else split += character;
      }
      if (split) parts.push(split);
      for (const part of parts) {
        const candidate = line ? `${line} ${part}` : part;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) line = candidate;
        else { lines.push(line); line = part; }
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export async function createInvoicePdf(invoice: InvoicePdfData, items: InvoicePdfItem[], logoPng?: Uint8Array) {
  const doc = await PDFDocument.create();
  doc.setTitle(`Invoice ${invoice.invoice_number} - TC Cleaning Services`);
  doc.setAuthor("TC Cleaning Services AZ LLC");
  doc.setSubject(`Invoice for ${invoice.client_name}`);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let logo: PDFImage | undefined;
  if (logoPng) { try { logo = await doc.embedPng(logoPng); } catch { /* Keep the PDF branded with the text wordmark if the logo cannot be embedded. */ } }
  const pages = [];
  let page = doc.addPage(letter);
  pages.push(page);
  let y = 0;
  const drawHeader = (first: boolean) => {
    page.drawRectangle({ x: 0, y: 650, width: 612, height: 142, color: navy });
    page.drawRectangle({ x: 0, y: 646, width: 612, height: 4, color: green });
    if (first && logo) {
      const scale = Math.min(130 / logo.width, 92 / logo.height);
      page.drawImage(logo, { x: 42, y: 698, width: logo.width * scale, height: logo.height * scale });
    } else {
      page.drawText("TC CLEANING", { x: 42, y: 738, size: 20, font: bold, color: rgb(1, 1, 1) });
      page.drawText("SERVICES AZ LLC", { x: 43, y: 718, size: 10, font: bold, color: green });
    }
    page.drawText(first ? "INVOICE" : "INVOICE - CONTINUED", { x: 370, y: 742, size: 19, font: bold, color: rgb(1, 1, 1) });
    page.drawText(cleanText(invoice.invoice_number), { x: 370, y: 720, size: 10, font: regular, color: green });
  if (first) {
    page.drawText("BALANCE DUE", { x: 370, y: 700, size: 8, font: bold, color: green });
    page.drawText(currency(invoice.total_cents), { x: 370, y: 678, size: 25, font: bold, color: rgb(1, 1, 1) });
  }
  };
  const drawWrapped = (text: string, x: number, startY: number, maxWidth: number, size = 10, font = regular, color = ink, lineHeight = 14) => {
    const lines = wrap(text, font, size, maxWidth);
    lines.forEach((line, i) => page.drawText(line, { x, y: startY - i * lineHeight, size, font, color }));
    return startY - lines.length * lineHeight;
  };
  const addPage = () => {
    page = doc.addPage(letter); pages.push(page); drawHeader(false); y = 610;
    page.drawRectangle({ x: 40, y: y - 19, width: 532, height: 24, color: pale });
    page.drawText("DESCRIPTION", { x: 48, y: y - 11, size: 8, font: bold, color: muted });
    page.drawText("QTY", { x: 382, y: y - 11, size: 8, font: bold, color: muted });
    page.drawText("RATE", { x: 432, y: y - 11, size: 8, font: bold, color: muted });
    page.drawText("AMOUNT", { x: 500, y: y - 11, size: 8, font: bold, color: muted });
    y -= 32;
  };

  drawHeader(true);
  page.drawText("BILL TO", { x: 42, y: 618, size: 8, font: bold, color: muted });
  let customerY = drawWrapped(invoice.client_name, 42, 598, 280, 12, bold, ink, 15);
  customerY = drawWrapped(invoice.client_email, 42, customerY - 2, 280, 10, regular, muted, 13);
  if (invoice.client_phone) customerY = drawWrapped(invoice.client_phone, 42, customerY - 2, 280, 10, regular, muted, 13);
  if (invoice.billing_address) drawWrapped(invoice.billing_address, 42, customerY - 2, 290, 10, regular, muted, 13);
  page.drawText("ISSUED", { x: 390, y: 618, size: 8, font: bold, color: muted });
  page.drawText(cleanText(invoice.issue_date), { x: 390, y: 600, size: 10, font: regular, color: ink });
  page.drawText("DUE DATE", { x: 470, y: 618, size: 8, font: bold, color: muted });
  page.drawText(cleanText(invoice.due_date), { x: 470, y: 600, size: 10, font: regular, color: ink });

  y = Math.min(540, customerY - 28);
  page.drawRectangle({ x: 40, y: y - 19, width: 532, height: 24, color: pale });
  page.drawText("DESCRIPTION", { x: 48, y: y - 11, size: 8, font: bold, color: muted });
  page.drawText("QTY", { x: 382, y: y - 11, size: 8, font: bold, color: muted });
  page.drawText("RATE", { x: 432, y: y - 11, size: 8, font: bold, color: muted });
  page.drawText("AMOUNT", { x: 500, y: y - 11, size: 8, font: bold, color: muted });
  y -= 34;
  for (const item of items) {
    const lines = wrap(item.description, regular, 9, 320);
    const rowHeight = Math.max(28, lines.length * 12 + 12);
    if (y - rowHeight < 95) addPage();
    lines.forEach((line, i) => page.drawText(line, { x: 48, y: y - 11 - i * 12, size: 9, font: regular, color: ink }));
    page.drawText(String(item.quantity), { x: 382, y: y - 11, size: 9, font: regular, color: ink });
    page.drawText(currency(item.unit_price_cents), { x: 432, y: y - 11, size: 9, font: regular, color: ink });
    page.drawText(currency(item.line_total_cents), { x: 500, y: y - 11, size: 9, font: bold, color: ink });
    page.drawLine({ start: { x: 42, y: y - rowHeight + 3 }, end: { x: 570, y: y - rowHeight + 3 }, thickness: 0.6, color: border });
    y -= rowHeight;
  }

  if (y < 220) addPage();
  const totalsX = 365;
  y -= 8;
  page.drawText("Subtotal", { x: totalsX, y, size: 10, font: regular, color: muted });
  page.drawText(currency(invoice.subtotal_cents), { x: 500, y, size: 10, font: regular, color: ink }); y -= 19;
  if (invoice.tax_cents) { page.drawText("Tax", { x: totalsX, y, size: 10, font: regular, color: muted }); page.drawText(currency(invoice.tax_cents), { x: 500, y, size: 10, font: regular, color: ink }); y -= 19; }
  if (invoice.deposit_paid_cents) { page.drawText("Deposit paid", { x: totalsX, y, size: 10, font: regular, color: muted }); page.drawText(`-${currency(invoice.deposit_paid_cents)}`, { x: 500, y, size: 10, font: regular, color: ink }); y -= 19; }
  page.drawLine({ start: { x: totalsX, y: y + 8 }, end: { x: 570, y: y + 8 }, thickness: 1, color: border });
  page.drawText("BALANCE DUE", { x: totalsX, y: y - 12, size: 12, font: bold, color: ink });
  page.drawText(currency(invoice.total_cents), { x: 500, y: y - 12, size: 12, font: bold, color: ink }); y -= 38;

  const paymentLines = [
    ...(invoice.payment_url ? ["CARD PAYMENT (CHASE)", invoice.payment_url] : []),
    ...(invoice.venmo_url ? ["VENMO", invoice.venmo_url, `Pay ${currency(invoice.total_cents)} and note invoice ${invoice.invoice_number}.`] : []),
    ...(invoice.zelle_recipient ? ["ZELLE", `Send ${currency(invoice.total_cents)} to ${invoice.zelle_recipient}. Include invoice ${invoice.invoice_number} in the note.`] : []),
  ];
  if (paymentLines.length || invoice.notes) {
    if (y < 110) addPage();
    const sectionHeight = 28 + paymentLines.reduce((sum, line) => sum + wrap(line, regular, 8, 490).length * 11 + 3, 0) + (invoice.notes ? wrap(invoice.notes, regular, 8, 490).length * 11 + 14 : 0);
    if (y - sectionHeight < 65) addPage();
    page.drawRectangle({ x: 42, y: y - sectionHeight + 8, width: 528, height: sectionHeight, color: pale, borderColor: border, borderWidth: 0.7 });
    let payY = y - 10;
    for (let i = 0; i < paymentLines.length; i++) {
      const line = paymentLines[i];
      const heading = ["CARD PAYMENT (CHASE)", "VENMO", "ZELLE"].includes(line);
      payY = drawWrapped(line, 54, payY, 490, heading ? 8 : 8, heading ? bold : regular, heading ? ink : muted, 11) - (heading ? 1 : 3);
    }
    if (invoice.notes) { drawWrapped("NOTES", 54, payY - 1, 490, 8, bold, ink, 11); drawWrapped(invoice.notes, 54, payY - 15, 490, 8, regular, muted, 11); }
  }

  pages.forEach((pdfPage, index) => {
    pdfPage.drawLine({ start: { x: 42, y: 38 }, end: { x: 570, y: 38 }, thickness: 0.7, color: border });
    pdfPage.drawText("TC Cleaning Services AZ LLC  |  (480) 310-8040  |  tccleaningaz.com", { x: 42, y: 22, size: 8, font: regular, color: muted });
    pdfPage.drawText(`Page ${index + 1} of ${pages.length}`, { x: 510, y: 22, size: 8, font: regular, color: muted });
  });
  return doc.save();
}
