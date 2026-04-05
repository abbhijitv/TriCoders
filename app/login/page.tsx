"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearFlowData } from "@/lib/flow";

export default function LoginPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const res = await fetch("/auth/profile", { cache: "no-store" });
        if (res.ok && active) {
          router.replace("/step1");
        }
      } catch {
        // ignore and stay on login page
      }
    }

    checkSession();
    return () => {
      active = false;
    };
  }, [router]);

  function startLogin() {
    // Fresh demo on every login.
    clearFlowData();
    localStorage.removeItem("step6Data");
    localStorage.removeItem("calendarPlannerData");
    setMessage("Redirecting to Auth0...");
    window.location.assign("/auth/login");
  }

  return (
    <div className="container" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div className="card" style={{ width: "100%", maxWidth: 460 }}>
        <div className="badge">ContribAI</div>
        <h1 style={{ fontSize: "2.2rem", marginTop: 14 }}>Log in</h1>
        <p className="small" style={{ marginBottom: 18 }}>
          Access your contribution workspace.
        </p>

        <div style={{ display: "grid", gap: 14 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <Link href="/" className="link">
              Home
            </Link>
            <Link href="/create-account" className="link">
              Create account
            </Link>
          </div>

          <button type="button" onClick={startLogin}>
            Continue with Auth0
          </button>
        </div>

        {message ? (
          <div className="card" style={{ marginTop: 18, marginBottom: 0 }}>
            <p>{message}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
