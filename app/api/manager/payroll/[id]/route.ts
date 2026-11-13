import { NextResponse } from "next/server";
import { authorizePayrollManager, proxyTimecardRequest } from "../../../../lib/manager-payroll-api";

export async function DELETE(_request: Request, context: RouteContext<"/api/manager/payroll/[id]">) {
  if (!(await authorizePayrollManager())) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Timecard not found." }, { status: 404 });
  return proxyTimecardRequest("DELETE", id);
}
