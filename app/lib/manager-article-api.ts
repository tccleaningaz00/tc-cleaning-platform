import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getArticlesWorkerUrl } from "./articles";
import { verifyManagerSession } from "./manager-auth";

export async function getArticleManager() {
  const token = (await cookies()).get("tc_manager_session")?.value;
  if (!token) return null;
  const manager = await verifyManagerSession(token);
  return manager?.role === "owner_admin" ? manager : null;
}

export async function proxyManagerArticles(
  path: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown
) {
  const secret = process.env.TC_CLEANING_API_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "The article service is not configured." },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(getArticlesWorkerUrl(path), {
      method,
      headers: {
        Authorization: `Bearer ${secret}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
    });
    const result: unknown = await response.json().catch(() => null);
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      return NextResponse.json(
        { error: "The article service returned an invalid response." },
        { status: 502 }
      );
    }
    return NextResponse.json(result, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "The article service is temporarily unavailable." },
      { status: 502 }
    );
  }
}

export async function readArticleRequest(request: Request): Promise<unknown | null> {
  if (!request.headers.get("Content-Type")?.includes("application/json")) return null;
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 42000) return null;
  try {
    const body: unknown = await request.json();
    return typeof body === "object" && body !== null && !Array.isArray(body)
      ? body
      : null;
  } catch {
    return null;
  }
}
