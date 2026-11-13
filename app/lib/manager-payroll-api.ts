import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getArticlesWorkerUrl } from "./articles";
import { verifyManagerSession } from "./manager-auth";

export async function authorizePayrollManager() {
  const token = (await cookies()).get("tc_manager_session")?.value;
  return token ? verifyManagerSession(token) : null;
}

export async function proxyTimecardRequest(
  method: "GET" | "POST" | "DELETE",
  id?: string,
  body?: unknown,
) {
  const secret = process.env.TC_CLEANING_API_SECRET;
  if (!secret) return NextResponse.json({ error: "The timecard service is not configured." }, { status: 503 });
  const path = id ? "/manager-timecards/" + encodeURIComponent(id) : "/manager-timecards";
  try {
    const response = await fetch(getArticlesWorkerUrl(path), {
      method,
      headers: {
        Authorization: "Bearer " + secret,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
    });
    const data: unknown = await response.json().catch(() => null);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return NextResponse.json({ error: "The timecard service returned an invalid response." }, { status: 502 });
    }
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "The timecard service is temporarily unavailable." }, { status: 502 });
  }
}
