import { NextResponse } from "next/server";
import { proxyInvoiceRequest, requireInvoiceManager } from "../../../../../lib/manager-invoice-api";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireInvoiceManager())) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  return proxyInvoiceRequest(`/manager-invoices/${encodeURIComponent(id)}/paid`, "POST", {});
}
