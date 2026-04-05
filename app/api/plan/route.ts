import { NextRequest, NextResponse } from "next/server";
import { ai, MODEL } from "@/lib/genai";
import { autonomousPlanPrompt } from "@/lib/prompts";
import { ClassifiedIssue, UserProfile } from "@/lib/types";
import { fetchRepoTree, guessRelevantFiles } from "@/lib/github";

function cleanJson(text: string) {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

function slotDurationHours(slot: { start: string; end: string }) {
  if (!slot.start || !slot.end) return 0;

  const [sh, sm] = slot.start.split(":").map(Number);
  const [eh, em] = slot.end.split(":").map(Number);

  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  if (endMinutes <= startMinutes) return 0;

  return (endMinutes - startMinutes) / 60;
}

function getAverageAvailableHours(profile: UserProfile) {
  const slots = profile.availability?.slots || [];

  if (!slots.length) return 2;

  const total = slots.reduce((sum, slot) => sum + slotDurationHours(slot), 0);
  const avg = total / slots.length;

  return Math.max(1, avg || 2);
}

function buildFallbackPlan(
  issue: ClassifiedIssue,
  profile: UserProfile,
  candidateFiles: string[]
) {
  const hoursPerSession = getAverageAvailableHours(profile);
  const estimatedHours = issue.estimatedHours || 4;
  const sessionCount = Math.max(1, Math.ceil(estimatedHours / hoursPerSession));

  return {
    source: "fallback",
    simpleExplanation:
      `This issue is about "${issue.title}". ` +
      `Based on the issue description, it looks like a ${issue.difficulty} task ` +
      `that may take about ${estimatedHours} hour(s) for this repository.`,
    estimatedHours,
    relevantFiles: candidateFiles.slice(0, 5).map((path) => ({
      path,
      why: "Likely relevant based on issue keywords and repository path matching."
    })),
    steps: [
      "Read the issue carefully and confirm what change is expected.",
      "Inspect the most relevant files and locate where the change should happen.",
      "Make the smallest correct change first.",
      "Check nearby files for related references or formatting consistency.",
      "Review your changes and prepare the final contribution."
    ],
    sessions: Array.from({ length: sessionCount }, (_, idx) => {
      const remainingBefore = estimatedHours - idx * hoursPerSession;
      const durationHours = Math.max(1, Math.min(hoursPerSession, remainingBefore));

      return {
        sessionNumber: idx + 1,
        durationHours,
        goals:
          idx === 0
            ? [
                "Understand the issue",
                "Inspect likely files",
                "Confirm the exact change location"
              ]
            : idx === sessionCount - 1
            ? [
                "Finalize implementation",
                "Review all edits",
                "Prepare commit / PR notes"
              ]
            : [
                "Continue implementation",
                "Validate related files",
                "Refine the changes"
              ]
      };
    })
  };
}

export async function POST(req: NextRequest) {
  try {
    const { issue, profile, owner, repo } = (await req.json()) as {
      issue: ClassifiedIssue;
      profile: UserProfile;
      owner?: string;
      repo?: string;
    };

    if (!issue) {
      return NextResponse.json({ error: "Missing issue" }, { status: 400 });
    }

    if (!owner || !repo) {
      return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 });
    }

    const repoTree = await fetchRepoTree(owner, repo);
    const candidateFiles = guessRelevantFiles(issue.title, issue.body, repoTree);

    try {
      const result = await ai.models.generateContent({
        model: MODEL,
        contents: autonomousPlanPrompt({
          profile,
          issue,
          candidateFiles,
          owner,
          repo
        })
      });

      const text = result.text ?? "";
      const cleaned = cleanJson(text);
      const parsed = JSON.parse(cleaned);

      return NextResponse.json(parsed);
    } catch (geminiError) {
      console.error("PLAN GEMINI ERROR, USING FALLBACK:", geminiError);

      const fallback = buildFallbackPlan(issue, profile, candidateFiles);
      return NextResponse.json(fallback);
    }
  } catch (error: any) {
    console.error("PLAN ROUTE ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to build plan" },
      { status: 500 }
    );
  }
}