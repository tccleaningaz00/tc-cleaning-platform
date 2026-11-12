import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPublishedArticle } from "../../lib/articles";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug).catch(() => null);
  return article
    ? {
        title: `${article.title} | TC Cleaning Services AZ LLC`,
        description: article.excerpt,
        alternates: { canonical: `/articles/${encodeURIComponent(article.slug)}` },
        openGraph: {
          title: `${article.title} | TC Cleaning Services AZ LLC`,
          description: article.excerpt,
          url: `/articles/${encodeURIComponent(article.slug)}`,
          type: "article",
          publishedTime: article.publishedAt || article.createdAt,
          modifiedTime: article.updatedAt,
        },
      }
    : { title: "Cleaning Advice | TC Cleaning Services AZ LLC", robots: { index: false, follow: false } };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug).catch(() => null);
  if (!article) notFound();
  const paragraphs = article.body.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  return <main className="articles-page"><header className="articles-header"><Link href="/" aria-label="TC Cleaning home"><Image src="/images/tc-cleaning-logo.png" alt="TC Cleaning Services AZ LLC" width={260} height={110} /></Link><Link className="articles-home-link" href="/">Home</Link></header><article className="article-detail"><Link className="article-back" href="/articles">← All cleaning tips</Link><p className="article-category">{article.category}</p><h1>{article.title}</h1><time dateTime={article.publishedAt || article.updatedAt}>{new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "America/Phoenix" }).format(new Date(article.publishedAt || article.updatedAt))}</time><div className="article-body">{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><div className="article-byline">Advice from TC Cleaning Services AZ LLC · Proudly serving Arizona’s East Valley</div></article><footer className="articles-footer"><Link href="/">TC Cleaning Services AZ LLC</Link><span><a href="tel:4803108040">(480) 310-8040</a></span></footer></main>;
}
