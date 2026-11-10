import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyManagerSession } from "../../../lib/manager-auth";
import { getArticlesWorkerUrl } from "../../../lib/articles";

async function authorize() {
  const token = (await cookies()).get("tc_manager_session")?.value;
  return token ? verifyManagerSession(token) : null;
}

async function workerRequest(method: "GET" | "POST", body?: unknown) {
  const secret = process.env.TC_CLEANING_API_SECRET;
  if (!secret) return NextResponse.json({ error: "Business records are not configured." }, { status: 503 });
  try {
    const response = await fetch(getArticlesWorkerUrl("/manager-ledger"), {
      method,
      headers: { Authorization: `Bearer ${secret}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });
    const data: unknown = await response.json().catch(() => null);
    if (!data || typeof data !== "object") return NextResponse.json({ error: "Business records returned an invalid response." }, { status: 502 });
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Business records are temporarily unavailable." }, { status: 502 });
  }
}

export async function GET() {
  if (!(await authorize())) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  return workerRequest("GET");
}

export async function POST(request: Request) {
  if (!(await authorize())) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  if (!request.headers.get("Content-Type")?.includes("application/json")) return NextResponse.json({ error: "JSON is required." }, { status: 415 });
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 8000) return NextResponse.json({ error: "The entry is too large." }, { status: 413 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Check the transaction details and try again." }, { status: 400 });
  return workerRequest("POST", body);
}
