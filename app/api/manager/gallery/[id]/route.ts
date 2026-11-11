import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyManagerSession } from "../../../../lib/manager-auth";
import { getArticlesWorkerUrl } from "../../../../lib/articles";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get("tc_manager_session")?.value;
  if (!token || !(await verifyManagerSession(token))) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  const secret = process.env.TC_CLEANING_API_SECRET;
  if (!secret) return NextResponse.json({ error: "The gallery service is not configured." }, { status: 503 });
  try {
    const response = await fetch(getArticlesWorkerUrl(`/manager-gallery/${encodeURIComponent(id)}`), { method: "DELETE", headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" });
    const result: unknown = await response.json().catch(() => null);
    if (!result || typeof result !== "object") return NextResponse.json({ error: "The gallery service returned an invalid response." }, { status: 502 });
    return NextResponse.json(result, { status: response.status });
  } catch {
    return NextResponse.json({ error: "The gallery service is temporarily unavailable." }, { status: 502 });
  }
}
