import { NextResponse } from "next/server";
import { proxyInvoiceRequest, requireInvoiceManager } from "../../../../lib/manager-invoice-api";

export async function GET() {
  if (!(await requireInvoiceManager())) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  return proxyInvoiceRequest("/manager-invoice-sender-status", "GET");
}
