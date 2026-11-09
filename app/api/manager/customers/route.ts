import { NextResponse } from "next/server";
import { proxyCustomerWrite, readCustomerRequest, requireCustomerManager } from "../../../lib/manager-customer-api";

export async function POST(request: Request) {
  if (!(await requireCustomerManager())) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const body = await readCustomerRequest(request);
  if (!body) return NextResponse.json({ error: "Valid client information is required." }, { status: 400 });
  return proxyCustomerWrite("/manager-customers", "POST", body);
}
