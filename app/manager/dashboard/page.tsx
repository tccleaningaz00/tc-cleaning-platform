
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyManagerSession } from "../../lib/manager-auth";

export const dynamic = "force-dynamic";

type CalendarEvent = {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
};

export default async function ManagerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ calendar?: string; calendar_reason?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("tc_manager_session")?.value;

  if (!token) {
    redirect("/manager/login");
  }

  const manager = await verifyManagerSession(token);

  if (!manager) {
    redirect("/manager/login");
  }

  const { calendar: calendarStatus, calendar_reason: calendarReason } = await searchParams;
  let events: CalendarEvent[] = [];
  let calendarError = "";
  const workerUrl = process.env.TC_CLEANING_API_URL;
  const apiSecret = process.env.TC_CLEANING_API_SECRET;

  const callbackMessages: Record<string, string> = {
    google_denied: "Google authorization was declined. Connect again and approve calendar access.",
    state: "The Google sign-in expired or returned to a different browser session. Start the connection again.",
    no_refresh_token: "Google did not issue ongoing calendar access. Retry with consent; if this repeats, remove TC Cleaning access from your Google Account and connect again.",
    worker_configuration: "The website could not reach its configured calendar service.",
    worker_rejected: "The calendar service rejected token storage. Check the Worker authorization settings.",
    worker_response: "The calendar service returned an invalid token-storage response.",
    code_exchange: "Google authorization could not be exchanged. Connect again.",
    worker_token_storage: "The calendar service could not securely save the Google token.",
  };
  const callbackError = calendarStatus === "error" && calendarReason
    ? callbackMessages[calendarReason]
    : undefined;

  if (workerUrl && apiSecret) {
    try {
      const endpoint = new URL(workerUrl);
      endpoint.pathname = endpoint.pathname.replace(/\/quote\/?$/, "");
      endpoint.pathname = `${endpoint.pathname.replace(/\/$/, "")}/calendar-events`;
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${apiSecret}` },
        cache: "no-store",
      });
      const data = await response.json() as {
        events?: { items?: CalendarEvent[] };
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Calendar could not be loaded.");
      events = data.events?.items || [];
    } catch (error) {
      calendarError = error instanceof Error ? error.message : "Calendar could not be loaded.";
    }
  } else {
    calendarError = "Calendar service configuration is missing.";
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

        <section style={{ background: "white", borderRadius: "12px", padding: "24px", marginTop: "24px", border: "1px solid #e3e9ed" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: "0 0 6px" }}>Google Calendar</h2>
              <p style={{ margin: 0, color: "#687786" }}>
                {calendarStatus === "connected" ? "Calendar connected." : callbackError || calendarError || `${events.length} upcoming and recent events.`}
              </p>
            </div>
            <a href="/api/calendar/connect" style={{ background: "#16834a", color: "white", textDecoration: "none", padding: "11px 16px", borderRadius: "7px", fontWeight: 700 }}>
              {calendarError ? "Connect Google Calendar" : "Reconnect Google Calendar"}
            </a>
          </div>
          {!calendarError && events.length > 0 && (
            <ul style={{ paddingLeft: "20px", marginBottom: 0 }}>
              {events.map((event) => {
                const startsAt = event.start?.dateTime || event.start?.date;
                const date = startsAt ? new Date(startsAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: event.start?.dateTime ? "short" : undefined, timeZone: "America/Phoenix" }) : "Time not set";
                return <li key={event.id} style={{ padding: "10px 0", color: "#172b3d" }}><strong>{date}</strong> · {event.summary || "Untitled event"}{event.location ? ` · ${event.location}` : ""}</li>;
              })}
            </ul>
          )}
          {!calendarError && events.length === 0 && <p style={{ color: "#687786", marginBottom: 0 }}>No events found in the selected date range.</p>}
        </section>

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
