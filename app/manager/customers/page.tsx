import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import CustomerDirectory, {
  type CustomerRecord,
  type ImportBatch,
} from "../../components/customer-directory";
import { verifyManagerSession } from "../../lib/manager-auth";

export const dynamic = "force-dynamic";

export default async function ManagerCustomersPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("tc_manager_session")?.value;
  const manager = sessionToken ? await verifyManagerSession(sessionToken) : null;
  if (!manager) {
    redirect("/manager/login");
  }

  let customers: CustomerRecord[] = [];
  let importBatch: ImportBatch | null = null;
  let errorMessage = "";
  const workerUrl = process.env.TC_CLEANING_API_URL;
  const apiSecret = process.env.TC_CLEANING_API_SECRET;

  if (!workerUrl || !apiSecret) {
    errorMessage = "The customer database service is not configured.";
  } else {
    try {
      const endpoint = new URL(workerUrl);
      endpoint.pathname = endpoint.pathname.replace(/\/quote\/?$/, "");
      endpoint.pathname = `${endpoint.pathname.replace(/\/$/, "")}/customers`;
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${apiSecret}` },
        cache: "no-store",
      });
      const data = await response.json() as {
        customers?: CustomerRecord[];
        importBatch?: ImportBatch | null;
      };
      if (!response.ok) throw new Error("The customer directory could not be loaded.");
      customers = Array.isArray(data.customers) ? data.customers : [];
      importBatch = data.importBatch || null;
    } catch {
      errorMessage = "The customer directory could not be loaded. Please try again later.";
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f3f6f8", color: "#172b3d", fontFamily: "Arial, sans-serif" }}>
      <header style={{ background: "#101923", color: "white", padding: "20px 5%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "#8bd34a", fontSize: "12px", fontWeight: 700 }}>TC CLEANING SERVICES AZ LLC</div>
          <h1 style={{ margin: "6px 0 0", fontSize: "24px" }}>Customers &amp; Properties</h1>
        </div>
        <form action="/api/manager/logout" method="POST">
          <button type="submit" style={{ background: "#16834a", color: "white", border: 0, padding: "11px 18px", borderRadius: "7px", fontWeight: 700, cursor: "pointer" }}>Sign Out</button>
        </form>
      </header>

      <section style={{ padding: "28px 5% 50px", maxWidth: "1400px", margin: "0 auto" }}>
        <Link href="/manager/dashboard" style={{ color: "#176da2", textDecoration: "none", fontSize: "14px", fontWeight: 700 }}>← Back to Business Manager</Link>
        <p style={{ color: "#16834a", fontWeight: 700, margin: "22px 0 4px" }}>AUTHORIZED MANAGEMENT ACCESS</p>
        <p style={{ color: "#687786", margin: 0 }}>Signed in as {manager.email}</p>
        {errorMessage ? (
          <section style={{ marginTop: "22px", padding: "18px", borderRadius: "10px", background: "white", color: "#8a3a32" }}>{errorMessage}</section>
        ) : (
          <CustomerDirectory customers={customers} importBatch={importBatch} />
        )}
      </section>
    </main>
  );
}
