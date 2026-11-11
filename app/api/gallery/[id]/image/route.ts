import { getArticlesWorkerUrl } from "../../../../lib/articles";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  try {
    const response = await fetch(getArticlesWorkerUrl(`/gallery/${encodeURIComponent(id)}/image`), { cache: "force-cache" });
    if (!response.ok) return new Response(response.status === 404 ? "Not found" : "Image unavailable", { status: response.status });
    return new Response(response.body, { status: 200, headers: { "Content-Type": response.headers.get("Content-Type") || "image/jpeg", "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response("Image unavailable", { status: 502 });
  }
}
