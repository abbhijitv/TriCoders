import { NextRequest, NextResponse } from "next/server";
import { ai, MODEL } from "@/lib/genai";

function cleanJsonFence(text: string) {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

function isIssueRelatedQuestion(question: string) {
  const q = question.toLowerCase();
  const keywords = [
    "issue",
    "github",
    "repo",
    "branch",
    "commit",
    "pr",
    "pull request",
    "code",
    "fix",
    "bug",
    "test",
    "session",
    "step",
    "calendar",
    "merge"
  ];
  return keywords.some((word) => q.includes(word));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      owner,
      repo,
      issueNumber,
      issueTitle,
      planSteps = [],
      currentSessionNumber,
      currentSessionHours,
      question
    } = body || {};

    if (!owner || !repo || !issueTitle || !question) {
      return NextResponse.json(
        { error: "Missing required fields for Gemini help" },
        { status: 400 }
      );
    }

    const issueRelated = isIssueRelatedQuestion(String(question));

    const prompt = [
      "You are a concise coding assistant helping with an open-source issue.",
      `Repository: ${owner}/${repo}`,
      `Issue: #${issueNumber || "N/A"} ${issueTitle}`,
      `Current session: ${currentSessionNumber || "N/A"} (${currentSessionHours || 0}h)`,
      "",
      "Plan steps:",
      ...(planSteps as string[]).map((step: string, index: number) => `${index + 1}. ${step}`),
      "",
      "User question:",
      String(question),
      "",
      issueRelated
        ? [
            "Respond with:",
            "1) immediate next steps",
            "2) commands/checks to run",
            "3) common mistakes to avoid",
            "Keep it practical and short."
          ].join("\n")
        : [
            "This question appears non-technical or unrelated to the issue.",
            "Reply naturally in 1-2 short sentences.",
            "Then add one short line: 'If you want issue help, ask me about code, branch, commits, PR, or next steps.'"
          ].join("\n")
    ].join("\n");

    const result = await ai.models.generateContent({
      model: MODEL,
      contents: prompt
    });

    const text = cleanJsonFence(result.text || "").trim();

    return NextResponse.json({
      answer: text || "No response received from Gemini."
    });
  } catch (error: any) {
    console.error("GEMINI HELP ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get Gemini help" },
      { status: 500 }
    );
  }
}
