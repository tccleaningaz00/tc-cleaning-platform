
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ManagerLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/manager/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data: { error?: string; success?: boolean; manager?: { email: string; role: string } } =
  await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to sign in.");
        return;
      }

      router.push("/manager/dashboard");
      router.refresh();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#101923",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "430px",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "40px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div
            style={{
              color: "#16834a",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "2px",
            }}
          >
            TC CLEANING SERVICES AZ LLC
          </div>

          <h1 style={{ color: "#172b3d", marginBottom: "8px" }}>
            Business Manager
          </h1>

          <p style={{ color: "#687786", fontSize: "14px" }}>
            Authorized management access only.
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <label
            htmlFor="email"
            style={{
              display: "block",
              marginBottom: "8px",
              color: "#172b3d",
            }}
          >
            Email address
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            autoComplete="username"
            required
            style={{
              width: "100%",
              padding: "13px",
              border: "1px solid #d7dee5",
              borderRadius: "8px",
              marginBottom: "20px",
              boxSizing: "border-box",
            }}
          />

          <label
            htmlFor="password"
            style={{
              display: "block",
              marginBottom: "8px",
              color: "#172b3d",
            }}
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            style={{
              width: "100%",
              padding: "13px",
              border: "1px solid #d7dee5",
              borderRadius: "8px",
              marginBottom: "20px",
              boxSizing: "border-box",
            }}
          />

          {error && (
            <p
              role="alert"
              style={{
                color: "#b42318",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: "#16834a",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p
          style={{
            color: "#8995a1",
            fontSize: "12px",
            textAlign: "center",
            marginTop: "24px",
          }}
        >
          Private management portal · TC Cleaning Services AZ LLC
        </p>

        <div style={{ textAlign: "center" }}>
          <a href="/" style={{ color: "#16834a", fontSize: "13px" }}>
            ← Return to public website
          </a>
        </div>
      </section>
    </main>
  );
}
