"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import TopNav from "../components/TopNav";
import { getFlowData, setFlowData } from "@/lib/flow";

export default function Step2Page() {
  const router = useRouter();
  const flow = useMemo(() => getFlowData(), []);

  const [owner, setOwner] = useState(flow.owner || "");
  const [repo, setRepo] = useState(flow.repo || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!flow.profile) {
      router.replace("/step1");
    }
  }, [flow.profile, router]);

  async function analyzeRepo() {
    if (!owner.trim() || !repo.trim()) {
      alert("Missing owner or repo");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/classify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          owner: owner.trim(),
          repo: repo.trim(),
          profile: flow.profile
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to analyze repository");
        return;
      }

      setFlowData({
        owner: owner.trim(),
        repo: repo.trim(),
        classifiedIssues: data.issues || [],
        detectedStacks: data.stacks || [],
        selectedStack: "",
        selectedCategory: "",
        recommendations: [],
        selectedIssue: null,
        plan: null
      });

      router.push("/step3");
    } catch (error) {
      console.error(error);
      alert("Something went wrong while analyzing repository.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <TopNav />

      <div className="container">
        <h1>Step 2 — Pick Your Target Repo</h1>

        <div className="card">
          <label className="small">Repository Owner</label>
          <input value={owner} onChange={(e) => setOwner(e.target.value)} />

          <label className="small" style={{ marginTop: 12 }}>
            Repository Name
          </label>
          <input value={repo} onChange={(e) => setRepo(e.target.value)} />

          <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
            <button type="button" onClick={() => router.push("/step1")}>
              ← Back
            </button>
            <button type="button" onClick={analyzeRepo} disabled={loading}>
              {loading ? "Analyzing..." : "Analyze Repository"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
