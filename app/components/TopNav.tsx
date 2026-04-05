"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearFlowData, getFlowData } from "@/lib/flow";

const navLinks = [
  { href: "/step1", label: "Workspace" },
  { href: "/progress", label: "Progress" },
  { href: "/profile", label: "Profile" },
  { href: "/calendar", label: "Calendar" }
];

export default function TopNav() {
  const pathname = usePathname();
  const [summary, setSummary] = useState({
    githubUsername: "",
    repoName: "",
    missionStatus: ""
  });

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      const flow = getFlowData();
      let email = "";

      try {
        const res = await fetch("/auth/profile", { cache: "no-store" });
        if (res.ok) {
          const profile = await res.json();
          email = profile?.email || profile?.name || "";
        }
      } catch {
        // ignore profile lookup errors
      }

      if (!active) return;
      setSummary({
        githubUsername: flow.profile?.githubUsername || email || "",
        repoName: flow.owner && flow.repo ? `${flow.owner}/${flow.repo}` : "",
        missionStatus: flow.mission?.status || ""
      });
    }

    loadSummary();
    return () => {
      active = false;
    };
  }, [pathname]);

  function logout() {
    clearFlowData();
    localStorage.removeItem("step6Data");
    localStorage.removeItem("calendarPlannerData");
    window.location.assign("/auth/logout?federated=1");
  }

  return (
    <div className="topnav-shell">
      <div className="topnav">
        <div className="topnav-brand">
          <div className="topnav-mark">CAI</div>
          <div className="topnav-title">
            <strong>ContribAI</strong>
            <span className="topnav-subtitle">Autonomous contribution workspace</span>
          </div>
        </div>

        <div className="topnav-status">
          {summary.githubUsername ? <span className="nav-chip">{summary.githubUsername}</span> : null}
          {summary.repoName ? <span className="nav-chip">{summary.repoName}</span> : null}
          {summary.missionStatus ? (
            <span className="nav-chip nav-chip-accent">
              {summary.missionStatus.replace(/_/g, " ")}
            </span>
          ) : null}
        </div>

        {navLinks.map((link) => {
          const active = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link${active ? " active" : ""}`}
            >
              {link.label}
            </Link>
          );
        })}

        <button className="secondary nav-button" type="button" onClick={logout}>
          Log Out
        </button>
      </div>
    </div>
  );
}
