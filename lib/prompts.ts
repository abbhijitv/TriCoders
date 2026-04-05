import { Availability, ClassifiedIssue, Issue, UserProfile } from "@/lib/types";

export function classifyIssuesPrompt(profile: UserProfile, issues: Issue[]) {
  return `
You are an autonomous open-source contribution agent.

Task:
Classify repository issues for this user into one of:
easy, medium, hard.

Classify based on:
- user skills
- likely issue scope
- ambiguity
- expected debugging complexity
- labels
- estimated time

User profile:
${JSON.stringify(profile, null, 2)}

Issues:
${JSON.stringify(issues, null, 2)}

Return ONLY valid JSON in this shape:
{
  "issues": [
    {
      "issueNumber": 123,
      "difficulty": "easy",
      "estimatedHours": 4,
      "fitScore": 91,
      "whyFit": "Short personalized reason"
    }
  ]
}
`;
}

export function recommendTop5Prompt(
  profile: UserProfile,
  category: "easy" | "medium" | "hard",
  classifiedIssues: ClassifiedIssue[]
) {
  return `
You are an autonomous open-source contribution agent.

Task:
The user already selected difficulty category "${category}".
From that category only, recommend the best issues for this user.

Optimize for:
- strongest skill match
- realistic time fit
- clarity of issue
- likely successful completion

User profile:
${JSON.stringify(profile, null, 2)}

Candidate issues:
${JSON.stringify(classifiedIssues, null, 2)}

Return ONLY valid JSON in this shape:
{
  "recommendations": [
    {
      "issueNumber": 123,
      "title": "Fix login validation bug",
      "estimatedHours": 4,
      "fitScore": 92,
      "whyFit": "Why it fits this user",
      "labels": ["bug", "good first issue"]
    }
  ]
}
`;
}

export function autonomousPlanPrompt(args: {
  profile: UserProfile;
  issue: ClassifiedIssue;
  candidateFiles: string[];
  owner: string;
  repo: string;
}) {
  const { profile, issue, candidateFiles, owner, repo } = args;

  return `
You are an autonomous open-source execution agent.

Your job:
1. Explain the issue in plain English.
2. Estimate realistic time for THIS user based on their skills and availability.
3. Analyze the candidate repository files and choose the most relevant files they should inspect/edit first.
4. Create a practical step-by-step implementation plan.
5. Split the work into realistic sessions using the user's availability.

Important:
- Be practical, not generic.
- If the issue is mostly documentation/translation, say that clearly.
- If exact file certainty is low, say "likely relevant" instead of pretending certainty.
- Return ONLY valid JSON. No markdown fences.

User profile:
${JSON.stringify(profile, null, 2)}

Repository:
${owner}/${repo}

Selected issue:
${JSON.stringify(issue, null, 2)}

Candidate file paths from repository tree:
${JSON.stringify(candidateFiles, null, 2)}

Return ONLY valid JSON in this shape:
{
  "simpleExplanation": "string",
  "estimatedHours": 4,
  "relevantFiles": [
    { "path": "docs/example.md", "why": "short reason" }
  ],
  "steps": [
    "step 1",
    "step 2"
  ],
  "sessions": [
    {
      "sessionNumber": 1,
      "durationHours": 2,
      "goals": ["goal 1", "goal 2"]
    }
  ]
}
`;
}
export function maintainerCommentPrompt(input: {
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
You are helping draft a concise, professional GitHub issue comment.

Repository: ${input.owner}/${input.repo}
Issue #${input.issue.number}: ${input.issue.title}

Issue body:
${input.issue.body || "No issue body provided."}

Current plan summary:
${input.plan.simpleExplanation || "No summary."}

Implementation steps:
${(input.plan.steps || []).map((s, i) => `${i + 1}. ${s}`).join("\n")}

Relevant files:
${(input.plan.relevantFiles || []).map((f) => `- ${f.path}: ${f.why}`).join("\n")}

Mission progress:
Status: ${input.progress?.status || "planned"}
Completed sessions: ${(input.progress?.completedSessions || []).join(", ") || "none"}
Blocker: ${input.progress?.blocker || "none"}
Next action: ${input.progress?.nextAction || "none"}

Return ONLY valid JSON:
{
  "subject": "short internal label",
  "body": "final GitHub issue comment text"
}

Comment should:
- sound human and professional
- be concise
- mention interest/progress clearly
- ask for clarification only if needed
- not overclaim completion
`;
}

export function prDraftPrompt(input: {
  owner: string;
  repo: string;
  issue: {
    number: number;
    title: string;
    body?: string;
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
  };
}) {
  return `
You are generating a GitHub PR draft for an open-source contribution.

Repository: ${input.owner}/${input.repo}
Issue #${input.issue.number}: ${input.issue.title}

Issue body:
${input.issue.body || "No issue body provided."}

Plan summary:
${input.plan.simpleExplanation || "No summary."}

Steps:
${(input.plan.steps || []).map((s, i) => `${i + 1}. ${s}`).join("\n")}

Relevant files:
${(input.plan.relevantFiles || []).map((f) => `- ${f.path}: ${f.why}`).join("\n")}

Progress:
Status: ${input.progress?.status || "planned"}
Completed sessions: ${(input.progress?.completedSessions || []).join(", ") || "none"}
Blocker: ${input.progress?.blocker || "none"}

Return ONLY valid JSON:
{
  "branchName": "short-branch-name",
  "title": "PR title",
  "body": "PR description in markdown",
  "checklist": ["item 1", "item 2", "item 3"]
}

Requirements:
- branch name should be git-safe
- PR title should be concise
- body should mention issue number and summary of changes
- checklist should be practical
`;
}

export function progressUpdatePrompt(input: {
  owner: string;
  repo: string;
  issueTitle: string;
  updateType: "complete_session" | "stuck" | "ready_for_pr" | "general_update";
  completedSessions?: number[];
  blocker?: string;
  plan: {
    simpleExplanation?: string;
    steps?: string[];
    sessions?: { sessionNumber: number; durationHours: number; goals: string[] }[];
  };
  defaultBranch?: string;
}) {
  return `
You are an autonomous open-source contribution mission manager.

Repository: ${input.owner}/${input.repo}
Issue title: ${input.issueTitle}
Update type: ${input.updateType}
Repository default branch: ${input.defaultBranch || "unknown"}

Mission summary:
${input.plan.simpleExplanation || "No summary available."}

Plan steps:
${(input.plan.steps || []).map((s, i) => `${i + 1}. ${s}`).join("\n")}

Sessions:
${(input.plan.sessions || [])
  .map((s) => `Session ${s.sessionNumber} (${s.durationHours}h): ${s.goals.join("; ")}`)
  .join("\n")}

Completed sessions: ${(input.completedSessions || []).join(", ") || "none"}
Blocker note: ${input.blocker || "none"}

Return ONLY valid JSON:
{
  "status": "planned | in_progress | blocked | rescheduled | ready_for_pr | completed",
  "nextAction": "one specific next action",
  "agentMessage": "short helpful guidance for the user",
  "riskLevel": "low | medium | high",
  "baseBranchSuggestion": "main or master or develop or repo default branch if ready_for_pr else empty string"
}

Rules:
- If updateType is "stuck", status should usually be "blocked"
- If updateType is "ready_for_pr", status should be "ready_for_pr"
- If some sessions are completed but not all, status should usually be "in_progress"
- If all sessions seem done, status can be "completed" or "ready_for_pr"
- baseBranchSuggestion should be filled especially for ready_for_pr
- Keep the message practical and concise
`;
}

export function adaptiveReschedulePrompt(input: {
  issueTitle: string;
  blocker?: string;
  workedHoursToday: number;
  currentSessionNumber: number;
  currentSessionDurationHours: number;
  stopForToday: boolean;
  futureSlotsSummary: string;
}) {
  return `
You are helping reschedule remaining work for an open-source mission.

Issue title: ${input.issueTitle}
Current session number: ${input.currentSessionNumber}
Original session duration: ${input.currentSessionDurationHours} hours
Hours worked today: ${input.workedHoursToday}
Stop for today requested: ${input.stopForToday ? "yes" : "no"}
Blocker: ${input.blocker || "none"}

Future availability slots:
${input.futureSlotsSummary || "none"}

Return ONLY valid JSON:
{
  "agentSummary": "short explanation of the decision",
  "nextAction": "specific next action",
  "shouldFinishNow": true,
  "messageIfNoFutureAvailability": "if no future slot exists, explain why it's better to finish now"
}

Rules:
- If there are no future slots and stopForToday is true, shouldFinishNow should be true
- If future slots exist, shouldFinishNow should be false
- Keep summary direct and practical
`;
}