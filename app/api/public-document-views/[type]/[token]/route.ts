import { NextResponse } from "next/server";
import { getArticlesWorkerUrl } from "../../../../lib/articles";

export async function POST(request: Request, context: { params: Promise<{ type: string; token: string }> }) {
  const { type, token } = await context.params;
  if ((type !== "invoice" && type !== "estimate") || !/^[A-Za-z0-9_-]{40,60}$/.test(token)) {
    return NextResponse.json({ error: "Document link is invalid or unavailable." }, { status: 404 });
  }
  if (!request.headers.get("Content-Type")?.includes("application/json")) return NextResponse.json({ error: "JSON required." }, { status: 415 });
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 512) return NextResponse.json({ error: "Invalid view details." }, { status: 400 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid view details." }, { status: 400 });
    const sessionId = (body as Record<string, unknown>).sessionId;
    if (typeof sessionId !== "string" || !/^[0-9a-f-]{36}$/i.test(sessionId)) return NextResponse.json({ error: "Invalid view details." }, { status: 400 });
    const response = await fetch(getArticlesWorkerUrl(`/public-document-views/${type}/${encodeURIComponent(token)}`), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }), cache: "no-store",
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ error: "Document activity is temporarily unavailable." }, { status: 502 });
  }
}
