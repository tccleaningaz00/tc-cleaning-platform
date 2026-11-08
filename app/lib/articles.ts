export type ArticleStatus = "draft" | "published";

export type Article = {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  body: string;
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export function getArticlesWorkerUrl(path: string): URL {
  const configuredUrl = process.env.TC_CLEANING_API_URL;
  if (!configuredUrl) throw new Error("Article service is unavailable.");

  const endpoint = new URL(configuredUrl);
  endpoint.pathname = endpoint.pathname.replace(/\/quote\/?$/, "");
  endpoint.pathname = `${endpoint.pathname.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  endpoint.search = "";
  return endpoint;
}

async function workerJson<T>(path: string, authenticated = false): Promise<T> {
  const headers = new Headers();
  if (authenticated) {
    const secret = process.env.TC_CLEANING_API_SECRET;
    if (!secret) throw new Error("Article manager service is unavailable.");
    headers.set("Authorization", `Bearer ${secret}`);
  }

  const response = await fetch(getArticlesWorkerUrl(path), {
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 404 && !authenticated) {
      throw Object.assign(new Error("Article not found."), { status: 404 });
    }
    throw new Error("Articles could not be loaded.");
  }
  return response.json() as Promise<T>;
}

export async function getPublishedArticles(): Promise<Article[]> {
  const data = await workerJson<{ articles?: Article[] }>("/articles");
  return Array.isArray(data.articles) ? data.articles : [];
}

export async function getPublishedArticle(slug: string): Promise<Article | null> {
  try {
    const data = await workerJson<{ article?: Article }>(
      `/articles/${encodeURIComponent(slug)}`
    );
    return data.article || null;
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getManagerArticles(): Promise<Article[]> {
  const data = await workerJson<{ articles?: Article[] }>(
    "/manager-articles",
    true
  );
  return Array.isArray(data.articles) ? data.articles : [];
}
