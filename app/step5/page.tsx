"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "../components/TopNav";
import { getFlowData, setFlowData } from "@/lib/flow";

export default function Step5Page() {
  const router = useRouter();
  const flow = useMemo(() => getFlowData(), []);

  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>(
    flow.recommendations || []
  );

  useEffect(() => {
    async function load() {
      if (!flow.selectedStack || !flow.selectedCategory) {
        router.replace("/step4");
        return;
      }

      if (recommendations.length) return;

      try {
        setLoading(true);

        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            stack: flow.selectedStack,
            category: flow.selectedCategory,
            issues: flow.classifiedIssues || [],
            profile: flow.profile
          })
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.error || "Failed to load recommendations");
          return;
        }

        setRecommendations(data.recommendations || []);
        setFlowData({ recommendations: data.recommendations || [] });
      } catch (error) {
        console.error(error);
        alert("Something went wrong while loading recommendations.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [flow, recommendations.length, router]);

  async function selectIssue(issueNumber: number) {
    const selectedIssue = (flow.classifiedIssues || []).find(
      (i: any) => i.number === issueNumber
    );
    if (!selectedIssue) return;

    try {
      setLoading(true);

      const res = await fetch("/api/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          issue: selectedIssue,
          profile: flow.profile,
          owner: flow.owner,
          repo: flow.repo
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to build plan");
        return;
      }

      setFlowData({
        selectedIssue,
        plan: data
      });

      localStorage.setItem(
        "step6Data",
        JSON.stringify({
          owner: flow.owner,
          repo: flow.repo,
          profile: flow.profile,
          selectedIssue,
          plan: data
        })
      );

      router.push("/step6");
    } catch (error) {
      console.error(error);
      alert("Something went wrong while building the plan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <TopNav />

      <div className="container">
        <h1>Step 5 — Recommendations</h1>

        {loading && <p>Loading...</p>}

        {!loading &&
          recommendations.map((rec) => (
            <div key={rec.issueNumber} className="card">
              <h3>
                #{rec.issueNumber} {rec.title}
              </h3>
              <p className="small">{rec.estimatedHours} hrs</p>
              <p>{rec.whyFit}</p>

              <button type="button" onClick={() => selectIssue(rec.issueNumber)}>
                Build Plan
              </button>
            </div>
          ))}

        <div style={{ marginTop: 16 }}>
          <button type="button" onClick={() => router.push("/step4")}>
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}