import { NextResponse } from "next/server";
import { proxyCustomerWrite, readCustomerRequest, requireCustomerManager } from "../../../../lib/manager-customer-api";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCustomerManager())) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  const body = await readCustomerRequest(request);
  if (!body) return NextResponse.json({ error: "Valid client information is required." }, { status: 400 });
  return proxyCustomerWrite(`/manager-customers/${encodeURIComponent(id)}`, "PATCH", body);
}
