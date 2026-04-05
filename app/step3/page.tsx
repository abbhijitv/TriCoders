"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import TopNav from "../components/TopNav";
import { getFlowData, setFlowData } from "@/lib/flow";

export default function Step3Page() {
  const router = useRouter();
  const flow = useMemo(() => getFlowData(), []);

  const stacks = flow.detectedStacks || [];
  const classifiedIssues = flow.classifiedIssues || [];

  if (!stacks.length) {
    if (typeof window !== "undefined") router.replace("/step2");
    return null;
  }

  return (
    <div>
      <TopNav />

      <div className="container">
        <h1>Step 3 — Choose Your Build Track</h1>

        <div className="grid grid-3">
          {stacks.map((stack: string) => {
            const count = classifiedIssues.filter((i: any) => i.stack === stack).length;

            return (
              <div
                key={stack}
                className="card"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setFlowData({
                    selectedStack: stack,
                    selectedCategory: "",
                    recommendations: [],
                    selectedIssue: null,
                    plan: null
                  });
                  router.push("/step4");
                }}
              >
                <h3>{stack}</h3>
                <p className="small">{count} issue(s)</p>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16 }}>
          <button type="button" onClick={() => router.push("/step2")}>
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
