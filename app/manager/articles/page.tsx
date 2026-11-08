import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import ManagerArticlesEditor from "../../components/manager-articles-editor";
import { getManagerArticles } from "../../lib/articles";
import type { Article } from "../../lib/articles";
import { verifyManagerSession } from "../../lib/manager-auth";

export const dynamic = "force-dynamic";

export default async function ManagerArticlesPage() {
  const token = (await cookies()).get("tc_manager_session")?.value;
  if (!token || !(await verifyManagerSession(token))) redirect("/manager/login");

  let articles: Article[] = [];
  let error = "";
  try { articles = await getManagerArticles(); }
  catch { error = "The articles service is not available right now. Please try again shortly."; }

  return <main style={{ minHeight: "100vh", background: "#f3f6f8", color: "#172b3d", fontFamily: "Arial, sans-serif" }}>
    <header style={{ background: "#101923", color: "white", padding: "20px 5%" }}><div style={{ color: "#8bd34a", fontSize: 12, fontWeight: 700 }}>TC CLEANING SERVICES AZ LLC</div><h1 style={{ margin: "6px 0 0", fontSize: 24 }}>Cleaning Articles</h1></header>
    <section style={{ padding: "30px 5%", maxWidth: 1180, margin: "0 auto" }}>
      <Link href="/manager/dashboard" style={{ color: "#16834a", fontWeight: 700 }}>← Back to manager dashboard</Link>
      <p style={{ color: "#687786", marginTop: 14 }}>Write helpful cleaning advice and share it with the community. Saved drafts remain private.</p>
      {error ? <p role="alert" style={{ background: "white", borderRadius: 12, padding: 20, color: "#a22" }}>{error}</p> : <ManagerArticlesEditor initialArticles={articles} />}
    </section>
  </main>;
}
