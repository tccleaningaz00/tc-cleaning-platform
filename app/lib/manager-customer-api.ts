import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getArticlesWorkerUrl } from "./articles";
import { verifyManagerSession } from "./manager-auth";

export async function requireCustomerManager() {
  const token = (await cookies()).get("tc_manager_session")?.value;
  return token ? verifyManagerSession(token) : null;
}

export async function proxyCustomerWrite(path: string, method: "POST" | "PATCH", body: unknown) {
  const secret = process.env.TC_CLEANING_API_SECRET;
  if (!secret) return NextResponse.json({ error: "The customer service is not configured." }, { status: 503 });
  try {
    const response = await fetch(getArticlesWorkerUrl(path), {
      method,
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const result: unknown = await response.json().catch(() => null);
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      return NextResponse.json({ error: "The customer service returned an invalid response." }, { status: 502 });
    }
    return NextResponse.json(result, { status: response.status });
  } catch {
    return NextResponse.json({ error: "The customer service is temporarily unavailable." }, { status: 502 });
  }
}

export async function readCustomerRequest(request: Request): Promise<Record<string, unknown> | null> {
  if (!request.headers.get("Content-Type")?.includes("application/json")) return null;
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 12000) return null;
  try {
    const value: unknown = await request.json();
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}
