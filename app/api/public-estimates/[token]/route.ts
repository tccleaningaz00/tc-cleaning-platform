import { NextResponse } from "next/server";
import { getArticlesWorkerUrl } from "../../../lib/articles";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return NextResponse.json({ error: "Estimate link is invalid or expired." }, { status: 404 });
  try {
    const response = await fetch(getArticlesWorkerUrl(`/public-estimates/${encodeURIComponent(token)}`), { cache: "no-store" });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch { return NextResponse.json({ error: "Estimate service is temporarily unavailable." }, { status: 502 }); }
}
