import { NextResponse } from "next/server";
import { authorizePayrollManager, proxyTimecardRequest } from "../../../../lib/manager-payroll-api";

export async function DELETE(_request: Request, context: RouteContext<"/api/manager/payroll/[id]">) {
  if (!(await authorizePayrollManager())) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Timecard not found." }, { status: 404 });
  return proxyTimecardRequest("DELETE", id);
}

export async function PATCH(request: Request, context: RouteContext<"/api/manager/payroll/[id]">) {
  if (!(await authorizePayrollManager())) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  if (!request.headers.get("Content-Type")?.includes("application/json")) {
    return NextResponse.json({ error: "JSON is required." }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 64_000) return NextResponse.json({ error: "The timecard is too large." }, { status: 413 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Timecard not found." }, { status: 404 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Check the employee, week, rate, and house entries." }, { status: 400 });
  }
  return proxyTimecardRequest("PATCH", id, body);
}
