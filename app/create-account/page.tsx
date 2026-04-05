"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearFlowData } from "@/lib/flow";

export default function CreateAccountPage() {
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
        // stay on page if profile check fails
      }
    }

    checkSession();
    return () => {
      active = false;
    };
  }, [router]);

  function startSignup() {
    clearFlowData();
    localStorage.removeItem("step6Data");
    localStorage.removeItem("calendarPlannerData");
    setMessage("Redirecting to Auth0 signup...");
    window.location.assign("/auth/login?screen_hint=signup");
  }

  return (
    <div className="container" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div className="card" style={{ width: "100%", maxWidth: 520 }}>
        <div className="badge">ContribAI</div>
        <h1 style={{ fontSize: "2.2rem", marginTop: 14 }}>Create account</h1>
        <p className="small" style={{ marginBottom: 18 }}>
          Account creation is handled by Auth0.
        </p>

        <div style={{ display: "grid", gap: 14 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <Link href="/login" className="link">
              Already have an account?
            </Link>
            <Link href="/" className="link">
              Home
            </Link>
          </div>

          <button type="button" onClick={startSignup}>
            Continue to Auth0 Signup
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
