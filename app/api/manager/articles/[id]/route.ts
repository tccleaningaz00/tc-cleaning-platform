import { NextResponse } from "next/server";
import {
  getArticleManager,
  proxyManagerArticles,
  readArticleRequest,
} from "../../../../lib/manager-article-api";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getArticleManager())) {
    return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }
  const body = await readArticleRequest(request);
  if (!body) {
    return NextResponse.json({ error: "A valid article request is required." }, { status: 400 });
  }
  return proxyManagerArticles(`/manager-articles/${encodeURIComponent(id)}`, "PATCH", body);
}
