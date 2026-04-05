"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import TopNav from "../components/TopNav";
import { getFlowData } from "@/lib/flow";

export default function ProgressPage() {
  const router = useRouter();
  const flow = useMemo(() => getFlowData(), []);

  const completedSessions = flow.mission?.progress?.completedSessions || [];
  const totalSessions = flow.mission?.updatedPlan?.sessions?.length || flow.plan?.sessions?.length || 0;

  return (
    <div>
      <TopNav />

      <div className="container">
        <h1>Mission Timeline</h1>

        <div className="card">
          <h2>Saved Workflow Memory</h2>
          <div className="key-value-list">
            <div className="key-value-row">
              <strong>Repository</strong>
              <span>{flow.owner && flow.repo ? `${flow.owner}/${flow.repo}` : "Not set"}</span>
            </div>
            <div className="key-value-row">
              <strong>Selected stack</strong>
              <span>{flow.selectedStack || "Not set"}</span>
            </div>
            <div className="key-value-row">
              <strong>Difficulty</strong>
              <span>{flow.selectedCategory || "Not set"}</span>
            </div>
            <div className="key-value-row">
              <strong>Mission status</strong>
              <span>{flow.mission?.status || "Not started"}</span>
            </div>
            <div className="key-value-row">
              <strong>Completed sessions</strong>
              <span>{completedSessions.length}/{totalSessions}</span>
            </div>
            <div className="key-value-row">
              <strong>Next action</strong>
              <span>{flow.mission?.progress?.nextAction || "Not set"}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Selected Issue</h2>
          {flow.selectedIssue ? (
            <div className="stack">
              <h3>
                #{flow.selectedIssue.number} {flow.selectedIssue.title}
              </h3>
              <p className="small">{flow.selectedIssue.body || "No issue description saved."}</p>
            </div>
          ) : (
            <p className="small">No issue selected yet.</p>
          )}
        </div>

        <div className="card">
          <h2>Sessions</h2>
          {(flow.mission?.updatedPlan?.sessions || flow.plan?.sessions)?.length ? (
            <div className="stack">
              {(flow.mission?.updatedPlan?.sessions || flow.plan?.sessions).map((session: any) => (
                <div key={session.sessionNumber} className="session-item">
                  <div className="session-head">
                    <strong>
                      Session {session.sessionNumber} • {session.durationHours} hour(s)
                    </strong>
                    <span className="badge">
                      {completedSessions.includes(session.sessionNumber) ? "Completed" : "Pending"}
                    </span>
                  </div>
                  <ul>
                    {session.goals.map((goal: string, index: number) => (
                      <li key={index}>{goal}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="small">No saved session plan yet.</p>
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
