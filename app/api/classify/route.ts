import { NextRequest, NextResponse } from "next/server";
import { fetchRepoIssues, fetchRepoTree } from "@/lib/github";
import { ClassifiedIssue, Issue } from "@/lib/types";

function lower(text: string) {
  return text.toLowerCase();
}

function repoStacksFromTree(paths: string[]): string[] {
  const p = paths.map((x) => x.toLowerCase());
  const stacks = new Set<string>();

  if (p.some(x => x.endsWith(".md") || x.includes("docs/") || x.includes("readme"))) {
    stacks.add("Documentation");
  }
  if (p.some(x => x.endsWith(".py") || x === "requirements.txt" || x.endsWith("pyproject.toml"))) {
    stacks.add("Python");
  }
  if (p.some(x => x.endsWith(".js") || x.endsWith(".ts") || x.endsWith(".tsx") || x === "package.json")) {
    stacks.add("JavaScript/TypeScript");
  }
  if (p.some(x => x.endsWith(".java") || x.endsWith(".kt") || x.endsWith("pom.xml") || x.endsWith("build.gradle"))) {
    stacks.add("Java/Kotlin");
  }
  if (p.some(x => x.endsWith(".cpp") || x.endsWith(".cc") || x.endsWith(".cxx") || x.endsWith(".c") || x.endsWith(".h") || x.endsWith(".hpp") || x.endsWith("cmakelists.txt"))) {
    stacks.add("C/C++");
  }
  if (p.some(x => x.endsWith(".swift") || x.endsWith("package.swift") || x.includes(".xcodeproj"))) {
    stacks.add("Swift/iOS");
  }
  if (p.some(x => x.endsWith(".go") || x === "go.mod")) {
    stacks.add("Go");
  }

  // Always include this so no issue gets left out
  stacks.add("General / Project-wide");

  return [...stacks];
}

function stackScore(issue: Issue, stack: string): number {
  const text = lower(`${issue.title} ${issue.body} ${issue.labels.join(" ")}`);
  let score = 0;

  if (stack === "Documentation") {
    if (/(readme|docs|documentation|translation|translate|markdown|tutorial|guide|typo|broken link)/.test(text)) score += 12;
    if (/(good first issue)/.test(text)) score += 2;
  }

  if (stack === "Python") {
    if (/(python|django|flask|pyproject|requirements\.txt|pytest)/.test(text)) score += 12;
    if (/(script|notebook|jupyter)/.test(text)) score += 4;
  }

  if (stack === "JavaScript/TypeScript") {
    if (/(javascript|typescript|\bjs\b|\bts\b|react|next|node|npm|frontend|ui|component|css|html)/.test(text)) score += 12;
    if (/(browser|client|web)/.test(text)) score += 4;
  }

  if (stack === "Java/Kotlin") {
    if (/(java|kotlin|android|gradle|maven|spring)/.test(text)) score += 12;
  }

  if (stack === "C/C++") {
    if (/(c\+\+|cpp|cmake|pointer|memory|segfault|native|compiler)/.test(text)) score += 12;
  }

  if (stack === "Swift/iOS") {
    if (/(swift|ios|xcode|uikit|swiftui)/.test(text)) score += 12;
  }

  if (stack === "Go") {
    if (/(golang|\bgo\b|go mod|gin|goroutine)/.test(text)) score += 12;
  }

  if (stack === "General / Project-wide") {
    if (/(workflow|github actions|ci|cd|pipeline|contributors\.md|contributing|project card|home page|site-wide|global|repo-wide)/.test(text)) {
      score += 10;
    }
    if (/(discussion|question|enhancement|meta)/.test(text)) {
      score += 6;
    }
  }

  return score;
}

function inferIssueStack(issue: Issue, repoStacks: string[]): string {
  let bestStack = "General / Project-wide";
  let bestScore = -1;

  for (const stack of repoStacks) {
    const score = stackScore(issue, stack);
    if (score > bestScore) {
      bestScore = score;
      bestStack = stack;
    }
  }

  // If nothing meaningful matched, still keep it grouped
  if (bestScore <= 0) {
    return "General / Project-wide";
  }

  return bestStack;
}

function classifyDifficulty(issue: Issue, stack: string): "easy" | "medium" | "hard" {
  const text = lower(`${issue.title} ${issue.body} ${issue.labels.join(" ")}`);
  const labels = issue.labels.map((l) => l.toLowerCase());

  if (
    labels.includes("good first issue") ||
    labels.includes("documentation") ||
    labels.includes("help wanted") ||
    /(translation|translate|typo|broken link|readme|docs|documentation)/.test(text)
  ) {
    return "easy";
  }

  if (
    /(architecture|pipeline|performance|refactor|redesign|multi-file|major change)/.test(text) ||
    issue.body.length > 1200
  ) {
    return "hard";
  }

  if (stack === "Documentation" && issue.body.length < 900) {
    return "easy";
  }

  if (stack === "General / Project-wide" && /(workflow|ci|cd|contributors\.md|automation)/.test(text)) {
    return "hard";
  }

  return "medium";
}

function estimateHours(issue: Issue, difficulty: "easy" | "medium" | "hard", stack: string): number {
  const text = lower(`${issue.title} ${issue.body} ${issue.labels.join(" ")}`);
  let hours = difficulty === "easy" ? 2 : difficulty === "medium" ? 5 : 8;

  if (stack === "Documentation") hours -= 1;
  if (/(translation|translate)/.test(text)) hours += 1;
  if (/(tests|testing)/.test(text)) hours += 1;
  if (/(refactor|architecture|pipeline|workflow|performance|automation)/.test(text)) hours += 2;
  if (issue.body.length > 1500) hours += 1;

  return Math.max(1, hours);
}

function relevanceScore(issue: Issue, stack: string): number {
  const text = lower(`${issue.title} ${issue.body} ${issue.labels.join(" ")}`);
  let score = 60;

  const s = stackScore(issue, stack);
  score += Math.min(30, s * 2);

  if (issue.labels.map((l) => l.toLowerCase()).includes("good first issue")) score += 10;

  return Math.min(100, score);
}

function whyText(issue: Issue, stack: string, difficulty: string, estimatedHours: number) {
  const text = lower(`${issue.title} ${issue.body} ${issue.labels.join(" ")}`);
  const parts: string[] = [];

  parts.push(`best grouped under ${stack}`);

  if (stack === "Documentation" && /(translation|translate|readme|docs|tutorial)/.test(text)) {
    parts.push("focuses on documentation or translation work");
  }
  if (stack === "General / Project-wide" && /(workflow|contributors\.md|contributing|project card|home page|automation)/.test(text)) {
    parts.push("looks like a repo-wide or workflow-related task");
  }

  if (difficulty === "hard") parts.push("has broader scope");
  if (estimatedHours > 3) parts.push("may need multiple sessions");

  return parts.join(", ") + ".";
}

export async function POST(req: NextRequest) {
  try {
    const { owner, repo } = await req.json();

    if (!owner || !repo) {
      return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 });
    }

    const [issues, tree] = await Promise.all([
      fetchRepoIssues(owner, repo),
      fetchRepoTree(owner, repo)
    ]);

    if (!issues.length) {
      return NextResponse.json({
        issues: [],
        stacks: [],
        message: "No open issues found for this repository."
      });
    }

    const stacks = repoStacksFromTree(tree);

    const classified: ClassifiedIssue[] = issues.map((issue) => {
      const stack = inferIssueStack(issue, stacks);
      const difficulty = classifyDifficulty(issue, stack);
      const estimatedHours = estimateHours(issue, difficulty, stack);
      const fitScore = relevanceScore(issue, stack);

      return {
        ...issue,
        stack,
        difficulty,
        estimatedHours,
        fitScore,
        whyFit: whyText(issue, stack, difficulty, estimatedHours)
      };
    });

    return NextResponse.json({
      issues: classified,
      stacks,
      message: `Loaded ${classified.length} open issues and grouped every issue into a tech area.`
    });
  } catch (error: any) {
    if (error.message === "REPO_NOT_FOUND") {
      return NextResponse.json({ error: "Repository does not exist." }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to classify issues" },
      { status: 500 }
    );
  }
}