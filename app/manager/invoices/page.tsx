import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import InvoiceManager from "../../components/invoice-manager";
import { verifyManagerSession } from "../../lib/manager-auth";
import { getArticlesWorkerUrl } from "../../lib/articles";

export const dynamic = "force-dynamic";

type Client = {
  customer_id: string; first_name: string; last_name: string; email: string | null; phone: string | null;
  address_line1: string | null; address_line2: string | null; city: string | null; state: string | null; zip_code: string | null;
};

export default async function ManagerInvoicesPage() {
  const token = (await cookies()).get("tc_manager_session")?.value;
  const manager = token ? await verifyManagerSession(token) : null;
  if (!manager) redirect("/manager/login");

  let clients: Client[] = [];
  const secret = process.env.TC_CLEANING_API_SECRET;
  if (secret) {
    try {
      const response = await fetch(getArticlesWorkerUrl("/customers"), { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" });
      if (response.ok) {
        const data = await response.json() as { customers?: Client[] };
        clients = Array.isArray(data.customers) ? data.customers : [];
      }
    } catch { /* New-client invoices remain available while the directory is offline. */ }
  }

  return <main style={{ minHeight: "100vh", background: "#f3f6f8", color: "#172b3d", fontFamily: "Arial, sans-serif" }}>
    <header style={{ background: "#101923", color: "white", padding: "20px 5%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div><div style={{ color: "#8bd34a", fontSize: 12, fontWeight: 700 }}>TC CLEANING SERVICES AZ LLC</div><h1 style={{ margin: "6px 0 0", fontSize: 24 }}>Estimates &amp; Pricing</h1></div><form action="/api/manager/logout" method="POST"><button type="submit" style={{ background: "#16834a", color: "white", border: 0, padding: "11px 18px", borderRadius: 7, fontWeight: 700, cursor: "pointer" }}>Sign Out</button></form></header>
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 5% 50px" }}>
      <Link href="/manager/dashboard" style={{ color: "#176da2", textDecoration: "none", fontSize: 14, fontWeight: 700 }}>← Back to Business Manager</Link>
      <p style={{ color: "#16834a", fontWeight: 700, margin: "22px 0 4px" }}>AUTHORIZED MANAGEMENT ACCESS</p><p style={{ color: "#687786", marginTop: 0 }}>Signed in as {manager.email}</p>
      <InvoiceManager clients={clients} />
    </section>
  </main>;
}
