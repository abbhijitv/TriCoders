"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import TopNav from "../components/TopNav";
import { getFlowData } from "@/lib/flow";

export default function ProfilePage() {
  const router = useRouter();
  const flow = useMemo(() => getFlowData(), []);
  const slots = flow.profile?.availability?.slots || [];

  return (
    <div>
      <TopNav />

      <div className="container">
        <h1>Profile</h1>

        <div className="card">
          <h2>User Profile</h2>
          <div className="key-value-list">
            <div className="key-value-row">
              <strong>GitHub username</strong>
              <span>{flow.profile?.githubUsername || "Not provided"}</span>
            </div>
            <div className="key-value-row">
              <strong>Current repository</strong>
              <span>{flow.owner && flow.repo ? `${flow.owner}/${flow.repo}` : "Not selected"}</span>
            </div>
            <div className="key-value-row">
              <strong>Selected issue</strong>
              <span>
                {flow.selectedIssue ? `#${flow.selectedIssue.number} ${flow.selectedIssue.title}` : "Not selected"}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Availability</h2>
          {slots.length ? (
            <div className="stack">
              {slots.map((slot, index) => (
                <div key={index} className="session-item">
                  <div className="session-head">
                    <strong>{slot.day || "Unknown day"}</strong>
                    <span className="badge">{slot.date || "No date"}</span>
                  </div>
                  <p className="small">
                    {slot.start || "?"} - {slot.end || "?"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="small">No saved availability slots.</p>
          )}
        </div>

        <div className="row">
          <button type="button" onClick={() => router.push("/step1")}>
            Return to Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
