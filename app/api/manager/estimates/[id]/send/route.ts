import { NextResponse } from "next/server";
import { proxyInvoiceRequest, requireInvoiceManager } from "../../../../../lib/manager-invoice-api";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireInvoiceManager())) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const { id } = await context.params;
  return proxyInvoiceRequest(`/manager-estimates/${encodeURIComponent(id)}/send`, "POST", {});
}
