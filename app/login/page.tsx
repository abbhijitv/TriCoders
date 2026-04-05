"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession, setAuthSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (getAuthSession()) {
      router.replace("/step1");
    }
  }, [router]);

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setAuthSession({
      email,
      passwordHint: password ? "saved-locally" : "",
      loggedInAt: new Date().toISOString()
    });

    setMessage("Login successful. Redirecting...");
    window.setTimeout(() => {
      router.push("/step1");
    }, 300);
  }

  return (
    <div className="container" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div className="card" style={{ width: "100%", maxWidth: 460 }}>
        <div className="badge">ContribAI</div>
        <h1 style={{ fontSize: "2.2rem", marginTop: 14 }}>Log in</h1>
        <p className="small" style={{ marginBottom: 18 }}>
          Access your contribution workspace.
        </p>

        <form onSubmit={handleLogin}>
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label className="small">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="small">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="row" style={{ justifyContent: "space-between" }}>
              <Link href="/" className="link">
                Home
              </Link>
              <Link href="/create-account" className="link">
                Create account
              </Link>
            </div>

            <button type="submit" disabled={!email.trim() || !password.trim()}>
              Log In
            </button>
          </div>
        </form>

        {message ? (
          <div className="card" style={{ marginTop: 18, marginBottom: 0 }}>
            <p>{message}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
