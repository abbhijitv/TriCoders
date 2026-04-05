"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import TopNav from "../components/TopNav";
import { getFlowData, setFlowData } from "@/lib/flow";

export default function Step4Page() {
  const router = useRouter();
  const flow = useMemo(() => getFlowData(), []);

  const selectedStack = flow.selectedStack;
  const issues = (flow.classifiedIssues || []).filter(
    (i: any) => i.stack === selectedStack
  );

  if (!selectedStack) {
    if (typeof window !== "undefined") router.replace("/step3");
    return null;
  }

  const grouped = {
    easy: issues.filter((i: any) => i.difficulty === "easy"),
    medium: issues.filter((i: any) => i.difficulty === "medium"),
    hard: issues.filter((i: any) => i.difficulty === "hard")
  };

  return (
    <div>
      <TopNav />

      <div className="container">
        <h1>Set Challenge Level in {selectedStack}</h1>

        <div className="grid grid-3">
          {(["easy", "medium", "hard"] as const).map((cat) => (
            <div key={cat} className="card">
              <h3>{cat.toUpperCase()}</h3>
              <p className="small">{grouped[cat].length} issue(s)</p>

              <button
                type="button"
                onClick={() => {
                  setFlowData({
                    selectedCategory: cat,
                    recommendations: [],
                    selectedIssue: null,
                    plan: null
                  });
                  router.push("/step5");
                }}
              >
                Continue
              </button>

              <div style={{ marginTop: 16 }}>
                {grouped[cat].map((issue: any) => (
                  <div key={issue.number} style={{ marginBottom: 12 }}>
                    <strong>#{issue.number}</strong> {issue.title}
                    <div className="small">
                      {issue.estimatedHours || 0} hrs
                      {issue.stack ? ` • ${issue.stack}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <button type="button" onClick={() => router.push("/step3")}>
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
