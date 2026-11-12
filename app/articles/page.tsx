import Link from "next/link";
import Image from "next/image";
import { getPublishedArticles, type Article } from "../lib/articles";

export const metadata = {
  title: "Cleaning Tips & Advice | TC Cleaning Services AZ LLC",
  description:
    "Practical home cleaning recommendations from TC Cleaning Services AZ LLC, serving Mesa and Arizona's East Valley.",
  alternates: { canonical: "/articles" },
  openGraph: {
    title: "Cleaning Tips & Advice | TC Cleaning Services AZ LLC",
    description:
      "Practical home cleaning recommendations from TC Cleaning Services AZ LLC, serving Mesa and Arizona's East Valley.",
    url: "/articles",
  },
};
export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  let articles: Article[] = [];
  let unavailable = false;
  try { articles = await getPublishedArticles(); } catch { unavailable = true; }
  return <main className="articles-page">
    <header className="articles-header"><Link href="/" aria-label="TC Cleaning home"><Image src="/images/tc-cleaning-logo.png" alt="TC Cleaning Services AZ LLC" width={260} height={110} /></Link><Link className="articles-home-link" href="/">Home</Link></header>
    <section className="articles-intro"><p className="section-label">FROM TC CLEANING SERVICES</p><h1>Cleaning tips for a home that feels good</h1><p>Practical recommendations and thoughtful advice for keeping your home comfortable, fresh, and ready for everyday life.</p></section>
    <section className="articles-list" aria-live="polite">
      {unavailable ? <p className="articles-empty">Articles are temporarily unavailable. Please check back soon.</p> : articles.length === 0 ? <p className="articles-empty">We’re preparing helpful cleaning advice. Check back soon for our first articles.</p> : articles.map((article) => <article key={article.id} className="article-card"><p className="article-category">{article.category}</p><h2><Link href={`/articles/${encodeURIComponent(article.slug)}`}>{article.title}</Link></h2><p>{article.excerpt}</p><div className="article-card-footer"><time dateTime={article.publishedAt || article.updatedAt}>{new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "America/Phoenix" }).format(new Date(article.publishedAt || article.updatedAt))}</time><Link href={`/articles/${encodeURIComponent(article.slug)}`}>Read article →</Link></div></article>)}
    </section>
    <footer className="articles-footer"><Link href="/">TC Cleaning Services AZ LLC</Link><span>Serving Mesa and the East Valley</span></footer>
  </main>;
}
