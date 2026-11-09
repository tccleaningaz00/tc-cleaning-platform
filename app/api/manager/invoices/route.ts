import { NextResponse } from "next/server";
import { proxyInvoiceRequest, readInvoiceRequest, requireInvoiceManager } from "../../../lib/manager-invoice-api";

export async function GET() {
  if (!(await requireInvoiceManager())) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  return proxyInvoiceRequest("/manager-invoices", "GET");
}

export async function POST(request: Request) {
  if (!(await requireInvoiceManager())) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const body = await readInvoiceRequest(request);
  if (!body) return NextResponse.json({ error: "A valid invoice is required." }, { status: 400 });
  return proxyInvoiceRequest("/manager-invoices", "POST", body);
}
