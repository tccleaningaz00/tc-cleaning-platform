
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { verifyManagerSession } from "../../lib/manager-auth";
import GoogleCalendarGrid, { type CalendarEvent } from "../../components/google-calendar-grid";

export const dynamic = "force-dynamic";

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

  const todayParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const todayValues = Object.fromEntries(todayParts.map(({ type, value }) => [type, value]));
  const today = `${todayValues.year}-${todayValues.month}-${todayValues.day}`;

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: "0 0 6px" }}>Google Calendar</h2>
              <p style={{ margin: 0, color: "#687786" }}>
                {calendarError
                  ? `Calendar could not be loaded: ${calendarError}`
                  : calendarStatus === "connected"
                    ? "Calendar connected."
                    : callbackError || `${events.length} upcoming and recent events.`}
              </p>
            </div>
            <Image
              src="/images/tc-cleaning-logo.png"
              alt="TC Cleaning Services AZ LLC logo"
              width={1026}
              height={695}
              sizes="(max-width: 600px) 25vw, 136px"
              style={{ width: "clamp(88px, 25vw, 136px)", height: "auto", flexShrink: 0 }}
            />
          </div>
          {calendarError && (
            <a href="/api/calendar/connect" style={{ display: "inline-block", marginTop: "16px", background: "#16834a", color: "white", textDecoration: "none", padding: "11px 16px", borderRadius: "7px", fontWeight: 700 }}>
              Reconnect Google Calendar
            </a>
          )}
          {!calendarError && events.length > 0 && (
            <GoogleCalendarGrid events={events} initialMonth={today.slice(0, 7)} today={today} />
          )}
          {!calendarError && events.length === 0 && <p style={{ color: "#687786", marginBottom: 0 }}>No events found from the past month through the next three months.</p>}
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
            ["Cleaning Articles", "Write and publish helpful cleaning advice for the community."],
            ["Our Work Gallery", "Upload and organize photos of your cleaning work."],
            ["Estimates & Pricing", "Turn website quote requests into estimates clients can approve and pay a deposit toward."],
            ["Employees & Payroll", "Manage workforce information and labor costs."],
            ["Expenses & Payments", "Review business expenses and payments."],
            ["Business Reports", "Monitor company performance and financial results."]
          ].map(([title, description]) => {
            const card = (
              <article style={{
                background: "white",
                borderRadius: "12px",
                padding: "24px",
                boxShadow: "0 3px 14px rgba(0,0,0,0.05)",
                border: "1px solid #e3e9ed"
              }}>
                <h3 style={{ marginTop: 0 }}>{title}</h3>
                <p style={{ color: "#687786", lineHeight: 1.6 }}>{description}</p>
                <span style={{ color: "#16834a", fontSize: "13px", fontWeight: 700 }}>
                  {title === "Customers & Properties" ? "Open client directory" : title === "Cleaning Articles" ? "Write and publish articles" : title === "Our Work Gallery" ? "Manage gallery photos" : title === "Estimates & Pricing" ? "Create and send estimates" : "Coming soon"}
                </span>
              </article>
            );

            return title === "Expenses & Payments" || title === "Business Reports" ? (
              <Link key={title} href="/manager/finances" style={{ color: "inherit", textDecoration: "none" }}>{card}</Link>
            ) : title === "Customers & Properties" ? (
              <Link key={title} href="/manager/customers" style={{ color: "inherit", textDecoration: "none" }}>
                {card}
              </Link>
            ) : title === "Cleaning Articles" ? (
              <Link key={title} href="/manager/articles" style={{ color: "inherit", textDecoration: "none" }}>{card}</Link>
            ) : title === "Our Work Gallery" ? (
              <Link key={title} href="/manager/gallery" style={{ color: "inherit", textDecoration: "none" }}>{card}</Link>
            ) : title === "Estimates & Pricing" ? (
              <Link key={title} href="/manager/estimates" style={{ color: "inherit", textDecoration: "none" }}>{card}</Link>
            ) : (
              <div key={title}>{card}</div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
