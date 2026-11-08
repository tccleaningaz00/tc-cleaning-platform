"use client";

import { useState } from "react";
import type { Article } from "../lib/articles";
import styles from "./manager-articles-editor.module.css";

type Draft = Pick<Article, "title" | "category" | "excerpt" | "body" | "status">;
const emptyDraft: Draft = { title: "", category: "Cleaning Tips", excerpt: "", body: "", status: "draft" };

export default function ManagerArticlesEditor({ initialArticles }: { initialArticles: Article[] }) {
  const [articles, setArticles] = useState(initialArticles);
  const [selected, setSelected] = useState<Article | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function start(article?: Article) {
    setSelected(article ?? null);
    setDraft(article ? { title: article.title, category: article.category, excerpt: article.excerpt, body: article.body, status: article.status } : emptyDraft);
    setMessage("");
  }

  async function save(status: "draft" | "published") {
    if (!draft.title.trim()) { setMessage("Add a title before saving."); return; }
    if (status === "published" && (!draft.excerpt.trim() || !draft.body.trim())) { setMessage("Add a short summary and article text before publishing."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(selected ? `/api/manager/articles/${selected.id}` : "/api/manager/articles", {
        method: selected ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, status }),
      });
      const result = await response.json() as { article?: Article; error?: string };
      if (!response.ok || !result.article) throw new Error(result.error || "The article could not be saved.");
      const article = result.article as Article;
      setArticles((current) => [article, ...current.filter((item) => item.id !== article.id)]);
      setSelected(article); setDraft({ title: article.title, category: article.category, excerpt: article.excerpt, body: article.body, status: article.status });
      setMessage(status === "published" ? "Article published and visible on the public site." : "Draft saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The article could not be saved."); }
    finally { setBusy(false); }
  }

  return <div className={styles.layout}>
    <aside className={styles.list}>
      <div className={styles.listHeader}><h2>Your articles</h2><button type="button" onClick={() => start()}>New article</button></div>
      {articles.length === 0 ? <p className={styles.muted}>Your drafts and published articles will appear here.</p> : articles.map((article) => <button type="button" key={article.id} className={`${styles.articleRow} ${selected?.id === article.id ? styles.selected : ""}`} onClick={() => start(article)}><strong>{article.title || "Untitled draft"}</strong><span>{article.status === "published" ? "Published" : "Draft"} · {article.category}</span></button>)}
    </aside>
    <section className={styles.editor}>
      <h2>{selected ? "Edit article" : "Write an article"}</h2>
      <p className={styles.muted}>Share practical, trustworthy advice with East Valley homeowners. Drafts stay private until published.</p>
      <label>Title<input value={draft.title} maxLength={160} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="A useful, clear headline" /></label>
      <label>Category<input value={draft.category} maxLength={60} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Cleaning Tips" /></label>
      <label>Short summary<textarea value={draft.excerpt} maxLength={320} rows={3} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} placeholder="A brief preview shown on the articles page" /></label>
      <label>Article<textarea className={styles.body} value={draft.body} maxLength={40000} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="Write your article here. Leave a blank line between paragraphs." /></label>
      {message && <p role="status" className={styles.message}>{message}</p>}
      <div className={styles.actions}><button type="button" disabled={busy} onClick={() => save("draft")}>Save draft</button><button type="button" disabled={busy} onClick={() => save("published")}>{selected?.status === "published" ? "Update published article" : "Publish article"}</button>{selected?.status === "published" && <button type="button" className={styles.secondary} disabled={busy} onClick={() => save("draft")}>Unpublish</button>}</div>
    </section>
  </div>;
}
