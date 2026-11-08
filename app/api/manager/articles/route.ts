import { NextResponse } from "next/server";
import {
  getArticleManager,
  proxyManagerArticles,
  readArticleRequest,
} from "../../../lib/manager-article-api";

export async function GET() {
  if (!(await getArticleManager())) {
    return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  }
  return proxyManagerArticles("/manager-articles", "GET");
}

export async function POST(request: Request) {
  if (!(await getArticleManager())) {
    return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  }
  const body = await readArticleRequest(request);
  if (!body) {
    return NextResponse.json({ error: "A valid article request is required." }, { status: 400 });
  }
  return proxyManagerArticles("/manager-articles", "POST", body);
}
