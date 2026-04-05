export type AvailabilitySlot = {
  date?: string;
  day: string;
  start: string;
  end: string;
};

export type MissionStatus =
  | "planned"
  | "in_progress"
  | "blocked"
  | "rescheduled"
  | "ready_for_pr"
  | "ready_for_review"
  | "completed";

export type GithubProgress = {
  branchFound: boolean;
  branchName: string;
  commitCount: number;
  latestCommitMessage: string;
  prOpened: boolean;
  prTitle: string;
  prState: string;
  merged: boolean;
  issueCommentCount: number;
  lastActivity: string;
  derivedStatus:
    | "planned"
    | "in_progress"
    | "ready_for_review"
    | "blocked"
    | "completed";
};

export type MaintainerComment = {
  subject: string;
  body: string;
};

export type PrDraft = {
  branchName: string;
  baseBranch?: string;
  title: string;
  body: string;
  checklist: string[];
};

export type MissionProgress = {
  status: MissionStatus;
  completedSessions: number[];
  blocker?: string;
  lastUpdate?: string;
  nextAction?: string;
  progressPercent?: number;
  workedHoursToday?: number;
};

export type FlowData = {
  profile?: {
    githubUsername?: string;
    availability?: {
      slots?: AvailabilitySlot[];
    };
  };
  owner?: string;
  repo?: string;
  detectedStacks?: string[];
  classifiedIssues?: any[];
  selectedStack?: string;
  selectedCategory?: "easy" | "medium" | "hard" | "";
  recommendations?: any[];
  selectedIssue?: any;
  plan?: any;

  mission?: {
    status: MissionStatus;
    progress?: MissionProgress;
    maintainerComment?: MaintainerComment | null;
    prDraft?: PrDraft | null;
    updatedPlan?: any | null;
    baseBranchSuggestion?: string;
    githubProgress?: GithubProgress | null;
  };
};

const STORAGE_KEY = "openSourceAllyFlow";

export function getFlowData(): FlowData {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setFlowData(update: Partial<FlowData>) {
  if (typeof window === "undefined") return;
  const current = getFlowData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...update }));
}

export function clearFlowData() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
