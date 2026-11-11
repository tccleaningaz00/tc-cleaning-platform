import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyManagerSession } from "../../../lib/manager-auth";
import { getArticlesWorkerUrl } from "../../../lib/articles";

async function authorized() {
  const token = (await cookies()).get("tc_manager_session")?.value;
  return Boolean(token && await verifyManagerSession(token));
}

async function workerRequest(method: "GET" | "POST", body?: unknown) {
  const secret = process.env.TC_CLEANING_API_SECRET;
  if (!secret) return NextResponse.json({ error: "The gallery service is not configured." }, { status: 503 });
  try {
    const response = await fetch(getArticlesWorkerUrl("/manager-gallery"), {
      method,
      headers: { Authorization: `Bearer ${secret}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
    });
    const result: unknown = await response.json().catch(() => null);
    if (!result || typeof result !== "object") return NextResponse.json({ error: "The gallery service returned an invalid response." }, { status: 502 });
    return NextResponse.json(result, { status: response.status });
  } catch {
    return NextResponse.json({ error: "The gallery service is temporarily unavailable." }, { status: 502 });
  }
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  return workerRequest("GET");
}

export async function POST(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  if (!request.headers.get("Content-Type")?.includes("application/json")) return NextResponse.json({ error: "JSON is required." }, { status: 415 });
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 1_400_000) return NextResponse.json({ error: "The compressed photo is too large. Choose a smaller image." }, { status: 413 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid photo details." }, { status: 400 });
  return workerRequest("POST", body);
}
