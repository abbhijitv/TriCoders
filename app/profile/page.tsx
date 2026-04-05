"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "../components/TopNav";
import { FlowData, getFlowData, setFlowData } from "@/lib/flow";

type AuthProfile = {
  sub?: string;
  nickname?: string;
  preferred_username?: string;
  name?: string;
  email?: string;
};

function extractGithubUsername(profile: AuthProfile | null): string {
  if (!profile) return "";
  if (profile.preferred_username) return profile.preferred_username;
  if (profile.nickname) return profile.nickname;
  if (profile.sub?.startsWith("github|") && profile.name) return profile.name;
  return "";
}

export default function ProfilePage() {
  const router = useRouter();
  const [flow, setFlow] = useState<FlowData>(getFlowData());
  const [authGithubUsername, setAuthGithubUsername] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAuthProfile() {
      try {
        const res = await fetch("/auth/profile", { cache: "no-store" });
        if (!res.ok) return;

        const profile = (await res.json()) as AuthProfile;
        const extracted = extractGithubUsername(profile);
        if (!active || !extracted) return;

        setAuthGithubUsername(extracted);
        if (!flow.profile?.githubUsername) {
          setFlowData({
            profile: {
              githubUsername: extracted,
              availability: flow.profile?.availability || { slots: [] }
            }
          });
          setFlow(getFlowData());
        }
      } catch {
        // non-blocking; keep existing flow data
      }
    }

    loadAuthProfile();
    return () => {
      active = false;
    };
  }, [flow.profile?.availability, flow.profile?.githubUsername]);

  const slots = flow.profile?.availability?.slots || [];
  const displayGithubUsername = flow.profile?.githubUsername || authGithubUsername;

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
              <span>{displayGithubUsername || "Not provided"}</span>
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
