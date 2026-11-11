import { NextResponse } from "next/server";
import { getArticlesWorkerUrl } from "../../lib/articles";

export async function POST(request: Request) {
  if (!request.headers.get("Content-Type")?.includes("application/json")) {
    return NextResponse.json({ success: false, error: "Please submit the quote form again." }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 16_000) {
    return NextResponse.json({ success: false, error: "The quote request is too large." }, { status: 413 });
  }

  const secret = process.env.TC_CLEANING_API_SECRET;
  if (!secret) {
    return NextResponse.json({ success: false, error: "Quote requests are temporarily unavailable. Please call (480) 310-8040." }, { status: 503 });
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ success: false, error: "We could not read your request. Please try again." }, { status: 400 });
  }
  if (new TextEncoder().encode(body).length > 16_000) {
    return NextResponse.json({ success: false, error: "The quote request is too large." }, { status: 413 });
  }
  try {
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ success: false, error: "Please check your quote request details." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ success: false, error: "Please check your quote request details." }, { status: 400 });
  }

  try {
    const response = await fetch(getArticlesWorkerUrl("/quote"), {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
    const result: unknown = await response.json().catch(() => null);
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      console.error("Quote Worker returned a non-JSON response.", { status: response.status });
      return NextResponse.json({ success: false, error: "We could not submit your request just now. Please try again or call (480) 310-8040." }, { status: 502 });
    }
    return NextResponse.json(result, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Quote Worker request failed.", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ success: false, error: "Quote requests are temporarily unavailable. Please try again or call (480) 310-8040." }, { status: 502 });
  }
}
