import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getArticlesWorkerUrl } from "./articles";
import { verifyManagerSession } from "./manager-auth";

export async function requireInvoiceManager() {
  const token = (await cookies()).get("tc_manager_session")?.value;
  return token ? verifyManagerSession(token) : null;
}

export async function proxyInvoiceRequest(path: string, method: "GET" | "POST", body?: unknown) {
  const secret = process.env.TC_CLEANING_API_SECRET;
  if (!secret) return NextResponse.json({ error: "The invoice service is not configured." }, { status: 503 });
  try {
    const response = await fetch(getArticlesWorkerUrl(path), {
      method,
      headers: { Authorization: `Bearer ${secret}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
    });
    const result: unknown = await response.json().catch(() => null);
    if (!result || typeof result !== "object" || Array.isArray(result)) return NextResponse.json({ error: "The invoice service returned an invalid response." }, { status: 502 });
    return NextResponse.json(result, { status: response.status });
  } catch {
    return NextResponse.json({ error: "The invoice service is temporarily unavailable." }, { status: 502 });
  }
}

export async function readInvoiceRequest(request: Request) {
  if (!request.headers.get("Content-Type")?.includes("application/json")) return null;
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 24000) return null;
  try {
    const body: unknown = await request.json();
    return typeof body === "object" && body !== null && !Array.isArray(body) ? body : null;
  } catch { return null; }
}
