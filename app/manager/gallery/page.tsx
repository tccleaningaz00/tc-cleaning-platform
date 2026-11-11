import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import ManagerGalleryEditor from "../../components/manager-gallery-editor";
import { verifyManagerSession } from "../../lib/manager-auth";

export const dynamic = "force-dynamic";

export default async function ManagerGalleryPage() {
  const token = (await cookies()).get("tc_manager_session")?.value;
  if (!token || !(await verifyManagerSession(token))) redirect("/manager/login");

  return <main style={{ minHeight: "100vh", background: "#f3f6f8", color: "#172b3d", fontFamily: "Arial, sans-serif" }}>
    <header style={{ background: "#101923", color: "white", padding: "20px 5%" }}><div style={{ color: "#8bd34a", fontSize: 12, fontWeight: 700 }}>TC CLEANING SERVICES AZ LLC</div><h1 style={{ margin: "6px 0 0", fontSize: 24 }}>Our Work Gallery</h1></header>
    <section style={{ padding: "30px 5%", maxWidth: 1180, margin: "0 auto" }}>
      <Link href="/manager/dashboard" style={{ color: "#16834a", fontWeight: 700 }}>← Back to manager dashboard</Link>
      <p style={{ color: "#687786", marginTop: 14 }}>Manage the photos customers see on your public Our Work page.</p>
      <ManagerGalleryEditor />
    </section>
  </main>;
}
