import { NextRequest, NextResponse } from "next/server";
import { ai, MODEL } from "@/lib/genai";

function cleanJson(text: string) {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

function buildPrompt(input: {
  owner: string;
  repo: string;
  issue: {
    number: number;
    title: string;
    body?: string;
    difficulty?: string;
    stack?: string;
  };
  plan: {
    simpleExplanation?: string;
    steps?: string[];
    relevantFiles?: { path: string; why: string }[];
  };
  progress?: {
    status?: string;
    completedSessions?: number[];
    blocker?: string;
    nextAction?: string;
  };
}) {
  return `
You are an autonomous open-source contribution agent drafting a GitHub issue comment.

Repository: ${input.owner}/${input.repo}
Issue #${input.issue.number}: ${input.issue.title}

Issue description:
${input.issue.body || "No issue body provided."}

Mission summary:
${input.plan.simpleExplanation || "No summary available."}

Plan steps:
${(input.plan.steps || []).map((s, i) => `${i + 1}. ${s}`).join("\n")}

Relevant files:
${(input.plan.relevantFiles || [])
  .map((f) => `- ${f.path}: ${f.why}`)
  .join("\n")}

Progress:
Status: ${input.progress?.status || "planned"}
Completed sessions: ${(input.progress?.completedSessions || []).join(", ") || "none"}
Blocker: ${input.progress?.blocker || "none"}
Next action: ${input.progress?.nextAction || "not set"}

Return ONLY valid JSON:
{
  "subject": "short label for this comment",
  "body": "the final GitHub issue comment text"
}

Rules:
- sound human and concise
- if blocked, ask a specific clarifying question
- if progress exists, mention it briefly
- if no blocker exists, keep it optimistic and action-oriented
- do not overclaim completion
`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body?.owner || !body?.repo || !body?.issue || !body?.plan) {
      return NextResponse.json(
        { error: "Missing required fields for maintainer comment" },
        { status: 400 }
      );
    }

    const prompt = buildPrompt(body);

    const result = await ai.models.generateContent({
      model: MODEL,
      contents: prompt
    });

    const text = result.text || "";
    let parsed: any;

    try {
      parsed = JSON.parse(cleanJson(text));
    } catch {
      parsed = {
        subject: "Issue update",
        body: text || "I would like to continue working on this issue."
      };
    }

    return NextResponse.json({
      subject: parsed.subject || "Issue update",
      body: parsed.body || "I would like to continue working on this issue."
    });
  } catch (error: any) {
    console.error("MAINTAINER COMMENT ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate maintainer comment" },
      { status: 500 }
    );
  }
}