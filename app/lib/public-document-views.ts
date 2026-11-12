export type PublicDocumentType = "invoice" | "estimate";

const sessionIds = new Map<string, string>();

export async function recordPublicDocumentView(type: PublicDocumentType, token: string) {
  const cacheKey = `${type}:${token}`;
  let sessionId = sessionIds.get(cacheKey);
  if (!sessionId) {
    const storageKey = `tc-document-view:${cacheKey}`;
    try {
      sessionId = sessionStorage.getItem(storageKey) || undefined;
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem(storageKey, sessionId);
      }
    } catch {
      sessionId = crypto.randomUUID();
    }
    sessionIds.set(cacheKey, sessionId);
  }

  try {
    await fetch(`/api/public-document-views/${type}/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
      cache: "no-store",
      keepalive: true,
    });
  } catch {
    // The document remains readable when activity tracking is unavailable.
  }
}
