import { NextResponse } from "next/server";
import { authorizePayrollManager, proxyTimecardRequest } from "../../../lib/manager-payroll-api";

export async function GET() {
  if (!(await authorizePayrollManager())) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  return proxyTimecardRequest("GET");
}

export async function POST(request: Request) {
  if (!(await authorizePayrollManager())) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  if (!request.headers.get("Content-Type")?.includes("application/json")) {
    return NextResponse.json({ error: "JSON is required." }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 4000) return NextResponse.json({ error: "The timecard is too large." }, { status: 413 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Check the employee, week, rate, and hours." }, { status: 400 });
  }
  return proxyTimecardRequest("POST", undefined, body);
}
