import { NextRequest, NextResponse } from "next/server";
import { ClassifiedIssue } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { stack, category, issues } = await req.json();

    if (!stack) {
      return NextResponse.json({ error: "Missing stack" }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ error: "Missing category" }, { status: 400 });
    }

    const filtered = (issues || [])
      .filter((i: ClassifiedIssue) => i.stack === stack && i.difficulty === category)
      .sort((a: ClassifiedIssue, b: ClassifiedIssue) => {
        if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
        return a.estimatedHours - b.estimatedHours;
      })
      .map((issue: ClassifiedIssue) => ({
        issueNumber: issue.number,
        title: issue.title,
        estimatedHours: issue.estimatedHours,
        fitScore: issue.fitScore,
        whyFit: issue.whyFit,
        labels: issue.labels
      }));

    return NextResponse.json({
      recommendations: filtered,
      totalAvailable: filtered.length,
      shownCount: filtered.length,
      message: `Showing ${filtered.length} ${category} issue(s) in ${stack}.`
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to recommend issues" },
      { status: 500 }
    );
  }
}