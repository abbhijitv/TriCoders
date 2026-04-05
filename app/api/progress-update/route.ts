import { NextRequest, NextResponse } from "next/server";
import { ai, MODEL } from "@/lib/genai";
import { progressUpdatePrompt } from "@/lib/prompts";

function cleanJson(text: string) {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

async function fetchDefaultBranch(owner: string, repo: string) {
  try {
    const headers: HeadersInit = {
      Accept: "application/vnd.github+json"
    };

    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      cache: "no-store"
    });

    if (!res.ok) return "main";

    const data = await res.json();
    return data.default_branch || "main";
  } catch {
    return "main";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      owner,
      repo,
      issueTitle,
      plan,
      updateType,
      completedSessions = [],
      blocker = ""
    } = body;

    if (!owner || !repo || !issueTitle || !plan || !updateType) {
      return NextResponse.json(
        { error: "Missing required fields for progress update" },
        { status: 400 }
      );
    }

    const totalSessions = plan?.sessions?.length || 0;
    const completedCount = completedSessions.length;
    const defaultBranch = await fetchDefaultBranch(owner, repo);

    let deterministicStatus:
      | "planned"
      | "in_progress"
      | "blocked"
      | "rescheduled"
      | "ready_for_pr"
      | "completed" = "planned";

    if (updateType === "stuck") deterministicStatus = "blocked";
    else if (updateType === "ready_for_pr") deterministicStatus = "ready_for_pr";
    else if (completedCount > 0 && completedCount < totalSessions) deterministicStatus = "in_progress";
    else if (totalSessions > 0 && completedCount >= totalSessions) deterministicStatus = "ready_for_pr";
    else deterministicStatus = "planned";

    const prompt = progressUpdatePrompt({
      owner,
      repo,
      issueTitle,
      updateType,
      completedSessions,
      blocker,
      plan,
      defaultBranch
    });

    const result = await ai.models.generateContent({
      model: MODEL,
      contents: prompt
    });

    const text = result.text || "";
    let parsed: any = {};

    try {
      parsed = JSON.parse(cleanJson(text));
    } catch {
      parsed = {};
    }

    const finalStatus = parsed.status || deterministicStatus;

    return NextResponse.json({
      status: finalStatus,
      nextAction:
        parsed.nextAction ||
        (finalStatus === "ready_for_pr"
          ? "Generate a PR draft and review changes before submission."
          : finalStatus === "blocked"
          ? "Use the blocker note to simplify the next task or reschedule the remaining work."
          : "Continue with the next unfinished session."),
      agentMessage:
        parsed.agentMessage ||
        (finalStatus === "ready_for_pr"
          ? "You are close to submission. Review your changes and prepare the PR."
          : finalStatus === "blocked"
          ? "You marked the mission as blocked. I’ve shifted the focus to recovery and next-best action."
          : "Progress has been updated."),
      riskLevel: parsed.riskLevel || "medium",
      baseBranchSuggestion:
        finalStatus === "ready_for_pr"
          ? parsed.baseBranchSuggestion || defaultBranch
          : ""
    });
  } catch (error: any) {
    console.error("PROGRESS UPDATE ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update mission progress" },
      { status: 500 }
    );
  }
}