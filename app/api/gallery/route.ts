import { NextResponse } from "next/server";
import { getArticlesWorkerUrl } from "../../lib/articles";

export async function GET() {
  try {
    const response = await fetch(getArticlesWorkerUrl("/gallery"), { cache: "no-store" });
    const result: unknown = await response.json().catch(() => null);
    if (!result || typeof result !== "object") return NextResponse.json({ error: "Gallery data is temporarily unavailable." }, { status: 502 });
    return NextResponse.json(result, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Gallery data is temporarily unavailable." }, { status: 502 });
  }
}
