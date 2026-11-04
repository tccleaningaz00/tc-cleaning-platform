
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyManagerSession } from "../../lib/manager-auth";

export const dynamic = "force-dynamic";

export default async function ManagerDashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get("tc_manager_session")?.value;

  if (!token) {
    redirect("/manager/login");
  }

  const manager = await verifyManagerSession(token);

  if (!manager) {
    redirect("/manager/login");
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f3f6f8",
      fontFamily: "Arial, sans-serif",
      color: "#172b3d"
    }}>
      <header style={{
        background: "#101923",
        color: "white",
        padding: "22px 5%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px"
      }}>
        <div>
          <div style={{ color: "#8bd34a", fontSize: "12px", fontWeight: 700 }}>
            TC CLEANING SERVICES AZ LLC
          </div>
          <h1 style={{ margin: "6px 0 0", fontSize: "24px" }}>
            Business Manager
          </h1>
        </div>

        <form action="/api/manager/logout" method="POST">
          <button type="submit" style={{
            background: "#16834a",
            color: "white",
            border: 0,
            padding: "11px 18px",
            borderRadius: "7px",
            fontWeight: 700,
            cursor: "pointer"
          }}>
            Sign Out
          </button>
        </form>
      </header>

      <section style={{ padding: "35px 5%" }}>
        <p style={{ color: "#16834a", fontWeight: 700 }}>
          AUTHENTICATED MANAGEMENT ACCESS
        </p>

        <h2 style={{ fontSize: "28px", marginBottom: "8px" }}>
          Welcome to TC Cleaning.
        </h2>

        <p style={{ color: "#687786" }}>
          Signed in as {manager.email}
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
          marginTop: "30px"
        }}>
          {[
            ["Scheduling & Dispatch", "Manage appointments, routes and crew assignments."],
            ["Customers & Properties", "Access customer and property records."],
            ["Estimates & Pricing", "Review quotes and deep-clean profitability."],
            ["Employees & Payroll", "Manage workforce information and labor costs."],
            ["Expenses & Payments", "Review business expenses and payments."],
            ["Business Reports", "Monitor company performance and financial results."]
          ].map(([title, description]) => (
            <article key={title} style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 3px 14px rgba(0,0,0,0.05)",
              border: "1px solid #e3e9ed"
            }}>
              <h3 style={{ marginTop: 0 }}>{title}</h3>
              <p style={{ color: "#687786", lineHeight: 1.6 }}>
                {description}
              </p>
              <span style={{ color: "#16834a", fontSize: "13px", fontWeight: 700 }}>
                Coming soon
              </span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
