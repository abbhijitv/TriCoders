"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAuthSession, getAuthSession } from "@/lib/auth";
import { clearFlowData, getFlowData } from "@/lib/flow";

const navLinks = [
  { href: "/step1", label: "Workspace" },
  { href: "/progress", label: "Progress" },
  { href: "/profile", label: "Profile" },
  { href: "/calendar", label: "Calendar" }
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [summary, setSummary] = useState({
    githubUsername: "",
    repoName: "",
    missionStatus: ""
  });

  useEffect(() => {
    const flow = getFlowData();
    const session = getAuthSession();
    setSummary({
      githubUsername: flow.profile?.githubUsername || session?.email || "",
      repoName: flow.owner && flow.repo ? `${flow.owner}/${flow.repo}` : "",
      missionStatus: flow.mission?.status || ""
    });
  }, [pathname]);

  function logout() {
    clearAuthSession();
    clearFlowData();
    localStorage.removeItem("step6Data");
    localStorage.removeItem("calendarPlannerData");
    router.push("/login");
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
