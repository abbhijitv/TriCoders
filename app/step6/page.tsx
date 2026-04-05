"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "../components/TopNav";
import {
  getFlowData,
  setFlowData,
  GithubProgress,
  MissionStatus
} from "@/lib/flow";

type AvailabilitySlot = {
  date?: string;
  day: string;
  start: string;
  end: string;
};

type SessionPlan = {
  sessionNumber: number;
  durationHours: number;
  goals: string[];
};

type Step6Data = {
  owner: string;
  repo: string;
  profile?: {
    githubUsername?: string;
    availability?: {
      slots?: AvailabilitySlot[];
    };
  };
  selectedIssue: {
    number: number;
    title: string;
    body?: string;
    estimatedHours?: number;
    difficulty?: string;
    stack?: string;
  };
  plan: {
    simpleExplanation?: string;
    relevantFiles?: { path: string; why: string }[];
    steps?: string[];
    estimatedHours?: number;
    sessions?: SessionPlan[];
  };
};

type MaintainerComment = {
  subject: string;
  body: string;
};

type PrDraft = {
  branchName: string;
  baseBranch?: string;
  title: string;
  body: string;
  checklist: string[];
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatHoursLabel(hours: number) {
  if (hours <= 0) return "remaining 0 mins";

  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (wholeHours && minutes) {
    return `remaining ${wholeHours} hr ${minutes} mins`;
  }

  if (wholeHours) {
    return `remaining ${wholeHours} hr${wholeHours === 1 ? "" : "s"}`;
  }

  return `remaining ${minutes} mins`;
}

function calculateProgressPercent(completedSessions: number[], sessions: SessionPlan[]) {
  if (!sessions.length) return 0;
  return Math.min(100, Math.round((completedSessions.length / sessions.length) * 100));
}

function getCurrentActiveSession(
  sessions: SessionPlan[],
  completedSessions: number[]
) {
  return sessions.find((session) => !completedSessions.includes(session.sessionNumber)) || sessions[0] || null;
}

function normalizeMissionStatus(status: string | undefined): MissionStatus {
  if (
    status === "planned" ||
    status === "in_progress" ||
    status === "blocked" ||
    status === "rescheduled" ||
    status === "ready_for_pr" ||
    status === "ready_for_review" ||
    status === "completed"
  ) {
    return status;
  }

  return "planned";
}

function isContinuationSession(session: SessionPlan) {
  return (
    !Number.isInteger(session.sessionNumber) ||
    (session.goals || []).some((goal) =>
      goal.toLowerCase().includes("remaining portion")
    )
  );
}

function baseSessionNumber(sessionNumber: number) {
  return Math.floor(Number(sessionNumber));
}

export default function Step6Page() {
  const router = useRouter();
  const [data, setData] = useState<Step6Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [missionStatus, setMissionStatus] = useState<MissionStatus>("planned");
  const [completedSessions, setCompletedSessions] = useState<number[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [blocker, setBlocker] = useState("");
  const [agentMessage, setAgentMessage] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [baseBranchSuggestion, setBaseBranchSuggestion] = useState("");
  const [workedHoursToday, setWorkedHoursToday] = useState("0");
  const [stopForToday, setStopForToday] = useState(true);

  const [maintainerComment, setMaintainerComment] = useState<MaintainerComment | null>(null);
  const [prDraft, setPrDraft] = useState<PrDraft | null>(null);
  const [revisedPlan, setRevisedPlan] = useState<Step6Data["plan"] | null>(null);
  const [githubProgress, setGithubProgress] = useState<GithubProgress | null>(null);

  const [working, setWorking] = useState(false);
  const [workingAction, setWorkingAction] = useState("");
  const [uiMessage, setUiMessage] = useState("");
  const [geminiQuestion, setGeminiQuestion] = useState("");
  const [geminiAnswer, setGeminiAnswer] = useState("");
  const [geminiLoading, setGeminiLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("step6Data");
      const flow = getFlowData();

      if (!raw) {
        setErrorMessage("No Step 6 data found. Go back and generate the plan first.");
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(raw) as Step6Data;

      if (!parsed?.selectedIssue || !parsed?.plan) {
        setErrorMessage("Step 6 data is incomplete. Go back and try again.");
        setLoading(false);
        return;
      }

      const savedSessions =
        flow.mission?.updatedPlan?.sessions || parsed.plan.sessions || [];
      const savedCompletedSessions = flow.mission?.progress?.completedSessions || [];

      setData(parsed);
      setRevisedPlan(flow.mission?.updatedPlan || null);
      setMissionStatus(normalizeMissionStatus(flow.mission?.status || flow.mission?.progress?.status));
      setCompletedSessions(savedCompletedSessions);
      setProgressPercent(
        flow.mission?.progress?.progressPercent ||
          calculateProgressPercent(savedCompletedSessions, savedSessions)
      );
      setBlocker(flow.mission?.progress?.blocker || "");
      setNextAction(flow.mission?.progress?.nextAction || "");
      setAgentMessage(flow.mission?.progress?.status ? "Mission restored from local progress." : "");
      setMaintainerComment(flow.mission?.maintainerComment || null);
      setPrDraft(flow.mission?.prDraft || null);
      setBaseBranchSuggestion(flow.mission?.baseBranchSuggestion || "");
      setGithubProgress(flow.mission?.githubProgress || null);
      setWorkedHoursToday(String(flow.mission?.progress?.workedHoursToday || 0));
      setLoading(false);
    } catch (error) {
      console.error("STEP 6 PAGE ERROR:", error);
      setErrorMessage("Could not load Step 6 data.");
      setLoading(false);
    }
  }, []);

  const planToUse = revisedPlan || data?.plan || null;
  const sessions = useMemo(() => planToUse?.sessions || [], [planToUse]);
  const currentSession = useMemo(
    () => getCurrentActiveSession(sessions, completedSessions),
    [sessions, completedSessions]
  );

  useEffect(() => {
    if (!data?.owner || !data?.repo || !data?.profile?.githubUsername || !data?.selectedIssue?.number) {
      return;
    }

    let active = true;

    async function loadGithubProgress() {
      try {
        const res = await fetch("/api/github-progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            owner: data.owner,
            repo: data.repo,
            username: data.profile?.githubUsername,
            issueNumber: data.selectedIssue.number,
            issueTitle: data.selectedIssue.title
          })
        });

        const result = await res.json();
        if (!res.ok) return;
        if (!active) return;

        setGithubProgress(result);

        const derivedStatus = normalizeMissionStatus(
          result.derivedStatus === "ready_for_review" ? "ready_for_review" : result.derivedStatus
        );

        if (
          derivedStatus === "in_progress" ||
          derivedStatus === "ready_for_review" ||
          derivedStatus === "completed"
        ) {
          setMissionStatus(derivedStatus);
          const flow = getFlowData();
          setFlowData({
            mission: {
              status: derivedStatus,
              progress: {
                status: derivedStatus,
                completedSessions: flow.mission?.progress?.completedSessions || completedSessions,
                blocker: flow.mission?.progress?.blocker || blocker,
                lastUpdate: new Date().toISOString(),
                nextAction:
                  derivedStatus === "completed"
                    ? "Review merged contribution and pick the next issue."
                    : derivedStatus === "ready_for_review"
                    ? "Review the opened pull request and respond to feedback."
                    : flow.mission?.progress?.nextAction || nextAction,
                progressPercent:
                  derivedStatus === "completed"
                    ? 100
                    : flow.mission?.progress?.progressPercent || progressPercent,
                workedHoursToday: Number(workedHoursToday || 0)
              },
              maintainerComment: flow.mission?.maintainerComment || null,
              prDraft: flow.mission?.prDraft || null,
              updatedPlan: flow.mission?.updatedPlan || null,
              baseBranchSuggestion: flow.mission?.baseBranchSuggestion || baseBranchSuggestion,
              githubProgress: result
            }
          });
        }
      } catch (error) {
        console.error("GITHUB PROGRESS POLL ERROR:", error);
      }
    }

    loadGithubProgress();
    const interval = window.setInterval(loadGithubProgress, 20000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [
    data?.owner,
    data?.repo,
    data?.profile?.githubUsername,
    data?.selectedIssue?.number,
    completedSessions,
    blocker,
    nextAction,
    progressPercent,
    workedHoursToday,
    baseBranchSuggestion
  ]);

  function persistMission(update: {
    status?: MissionStatus;
    progress?: {
      status: MissionStatus;
      completedSessions: number[];
      blocker?: string;
      lastUpdate?: string;
      nextAction?: string;
      progressPercent?: number;
      workedHoursToday?: number;
    };
    maintainerComment?: MaintainerComment | null;
    prDraft?: PrDraft | null;
    updatedPlan?: Step6Data["plan"] | null;
    baseBranchSuggestion?: string;
    githubProgress?: GithubProgress | null;
  }) {
    const flow = getFlowData();
    setFlowData({
      mission: {
        status: update.status || flow.mission?.status || missionStatus,
        progress: update.progress || flow.mission?.progress || null,
        maintainerComment:
          update.maintainerComment !== undefined
            ? update.maintainerComment
            : flow.mission?.maintainerComment || null,
        prDraft:
          update.prDraft !== undefined ? update.prDraft : flow.mission?.prDraft || null,
        updatedPlan:
          update.updatedPlan !== undefined
            ? update.updatedPlan
            : flow.mission?.updatedPlan || null,
        baseBranchSuggestion:
          update.baseBranchSuggestion !== undefined
            ? update.baseBranchSuggestion
            : flow.mission?.baseBranchSuggestion || "",
        githubProgress:
          update.githubProgress !== undefined
            ? update.githubProgress
            : flow.mission?.githubProgress || null
      }
    });
  }

  async function callJsonApi<T>(url: string, payload: object, actionName: string): Promise<T> {
    setWorking(true);
    setWorkingAction(actionName);
    setUiMessage("");

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      const result = text ? JSON.parse(text) : {};

      if (!res.ok) {
        throw new Error(result.error || `Request failed for ${actionName}`);
      }

      return result as T;
    } finally {
      setWorking(false);
      setWorkingAction("");
    }
  }

  function updateLocalStep6Data(updatedPlan: Step6Data["plan"]) {
    if (!data) return;
    localStorage.setItem(
      "step6Data",
      JSON.stringify({
        ...data,
        plan: updatedPlan
      })
    );
  }

  async function syncCalendar(updatedPlan: Step6Data["plan"]) {
    if (!data) return;

    const raw = localStorage.getItem("calendarPlannerData");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      const replaceEventIds = (parsed.createdEvents || [])
        .map((event: { eventId?: string }) => event.eventId)
        .filter(Boolean);

      const result = await callJsonApi<{ createdEvents?: unknown[]; events?: unknown[] }>(
        "/api/calendar",
        {
          issue: data.selectedIssue,
          availability: data.profile?.availability || { slots: [] },
          plan: updatedPlan,
          replaceEventIds,
          syncMode: "replace_after_reschedule"
        },
        "Calendar Sync"
      );

      localStorage.setItem(
        "calendarPlannerData",
        JSON.stringify({
          ...parsed,
          owner: data.owner,
          repo: data.repo,
          profile: data.profile,
          selectedIssue: data.selectedIssue,
          plan: updatedPlan,
          createdEvents: result.createdEvents || result.events || []
        })
      );
    } catch (error) {
      console.error("CALENDAR SYNC ERROR:", error);
    }
  }

  async function markProgress() {
    if (!data) return;
    if (!currentSession) {
      setUiMessage("All sessions are already complete.");
      return;
    }

    const nextCompleted = completedSessions.includes(currentSession.sessionNumber)
      ? completedSessions
      : [...completedSessions, currentSession.sessionNumber].sort((a, b) => a - b);

    const nextProgressPercent = calculateProgressPercent(nextCompleted, sessions);
    const result = await callJsonApi<{
      status?: string;
      nextAction?: string;
      agentMessage?: string;
      baseBranchSuggestion?: string;
    }>(
      "/api/progress-update",
      {
        owner: data.owner,
        repo: data.repo,
        issueTitle: data.selectedIssue.title,
        plan: planToUse,
        updateType: "complete_session",
        completedSessions: nextCompleted,
        blocker
      },
      "Mark Progress"
    );

    const nextStatus = normalizeMissionStatus(result.status);
    setCompletedSessions(nextCompleted);
    setProgressPercent(nextProgressPercent);
    setMissionStatus(nextStatus);
    setNextAction(result.nextAction || "Continue to the next unfinished session.");
    setAgentMessage(result.agentMessage || "Mission progress updated.");
    setBaseBranchSuggestion(result.baseBranchSuggestion || baseBranchSuggestion);
    setUiMessage("Session marked complete.");

    persistMission({
      status: nextStatus,
      progress: {
        status: nextStatus,
        completedSessions: nextCompleted,
        blocker,
        nextAction: result.nextAction || "Continue to the next unfinished session.",
        lastUpdate: new Date().toISOString(),
        progressPercent: nextProgressPercent,
        workedHoursToday: Number(workedHoursToday || 0)
      },
      baseBranchSuggestion: result.baseBranchSuggestion || baseBranchSuggestion,
      githubProgress
    });
  }

  async function handleStuck() {
    if (!data) return;
    if (!blocker.trim()) {
      setUiMessage("Add a blocker note before using I'm Stuck.");
      return;
    }

    const progressResult = await callJsonApi<{
      status?: string;
      nextAction?: string;
      agentMessage?: string;
    }>(
      "/api/progress-update",
      {
        owner: data.owner,
        repo: data.repo,
        issueTitle: data.selectedIssue.title,
        plan: planToUse,
        updateType: "stuck",
        completedSessions,
        blocker
      },
      "I'm Stuck"
    );

    const commentResult = await callJsonApi<MaintainerComment>(
      "/api/maintainer-comment",
      {
        owner: data.owner,
        repo: data.repo,
        issue: data.selectedIssue,
        plan: planToUse,
        progress: {
          status: "blocked",
          completedSessions,
          blocker,
          nextAction: progressResult.nextAction || nextAction
        }
      },
      "Maintainer Comment"
    );

    setMissionStatus("blocked");
    setMaintainerComment(commentResult);
    setNextAction(progressResult.nextAction || "Ask for clarification from maintainers.");
    setAgentMessage(progressResult.agentMessage || "Mission marked as blocked.");
    setUiMessage("Maintainer comment generated from blocker context.");

    persistMission({
      status: "blocked",
      progress: {
        status: "blocked",
        completedSessions,
        blocker,
        nextAction: progressResult.nextAction || "Ask for clarification from maintainers.",
        lastUpdate: new Date().toISOString(),
        progressPercent,
        workedHoursToday: Number(workedHoursToday || 0)
      },
      maintainerComment: commentResult,
      baseBranchSuggestion,
      githubProgress
    });
  }

  async function handleReadyForPr() {
    if (!data) return;

    const progressResult = await callJsonApi<{
      status?: string;
      nextAction?: string;
      agentMessage?: string;
      baseBranchSuggestion?: string;
    }>(
      "/api/progress-update",
      {
        owner: data.owner,
        repo: data.repo,
        issueTitle: data.selectedIssue.title,
        plan: planToUse,
        updateType: "ready_for_pr",
        completedSessions,
        blocker
      },
      "Ready for PR"
    );

    const draftResult = await callJsonApi<PrDraft>(
      "/api/pr-draft",
      {
        owner: data.owner,
        repo: data.repo,
        issue: data.selectedIssue,
        plan: planToUse,
        progress: {
          status: "ready_for_pr",
          completedSessions,
          blocker,
          baseBranchSuggestion:
            progressResult.baseBranchSuggestion || baseBranchSuggestion || "main"
        }
      },
      "PR Draft"
    );

    const nextStatus = normalizeMissionStatus(progressResult.status || "ready_for_pr");
    setMissionStatus(nextStatus);
    setBaseBranchSuggestion(
      draftResult.baseBranch || progressResult.baseBranchSuggestion || "main"
    );
    setPrDraft(draftResult);
    setNextAction(progressResult.nextAction || "Review the draft PR content and submit it.");
    setAgentMessage(progressResult.agentMessage || "PR draft generated.");
    setUiMessage("PR draft generated.");

    persistMission({
      status: nextStatus,
      progress: {
        status: nextStatus,
        completedSessions,
        blocker,
        nextAction: progressResult.nextAction || "Review the draft PR content and submit it.",
        lastUpdate: new Date().toISOString(),
        progressPercent,
        workedHoursToday: Number(workedHoursToday || 0)
      },
      prDraft: draftResult,
      baseBranchSuggestion:
        draftResult.baseBranch || progressResult.baseBranchSuggestion || "main",
      githubProgress
    });
  }

  async function handleAdaptiveReschedule() {
    if (!data || !currentSession) return;

    const numericWorkedHours = Math.max(0, Number(workedHoursToday || 0));

    const result = await callJsonApi<{
      revisedSessions?: SessionPlan[];
      agentSummary?: string;
      nextAction?: string;
      shouldFinishNow?: boolean;
      messageIfNoFutureAvailability?: string;
      calendarSyncNeeded?: boolean;
    }>(
      "/api/reschedule",
      {
        issueTitle: data.selectedIssue.title,
        availability: data.profile?.availability || { slots: [] },
        plan: planToUse,
        progress: {
          completedSessions,
          blocker
        },
        currentSessionNumber: currentSession.sessionNumber,
        currentSessionDurationHours: currentSession.durationHours,
        workedHoursToday: numericWorkedHours,
        stopForToday
      },
      "Adaptive Reschedule"
    );

    if (result.shouldFinishNow) {
      setUiMessage(
        result.messageIfNoFutureAvailability ||
          "No future availability. Recommended to complete now."
      );
      setNextAction(result.nextAction || "Continue the current work now.");
      setAgentMessage(result.agentSummary || "No future slot was found.");
      return;
    }

    const updatedPlan: Step6Data["plan"] = {
      ...planToUse!,
      sessions: result.revisedSessions || sessions
    };
    const updatedSessions = updatedPlan.sessions || [];

    const hasContinuation = updatedSessions.some(
      (session) =>
        Number(session.sessionNumber).toFixed(1) ===
        (Number(currentSession.sessionNumber) + 0.1).toFixed(1)
    );
    const updatedCurrentSession = updatedSessions.find(
      (session) => session.sessionNumber === currentSession.sessionNumber
    );
    const shouldMarkOriginalAsComplete =
      hasContinuation && Number(updatedCurrentSession?.durationHours || 0) > 0;

    const nextCompletedSessions = shouldMarkOriginalAsComplete
      ? Array.from(new Set([...completedSessions, currentSession.sessionNumber])).sort(
          (a, b) => a - b
        )
      : completedSessions;
    const nextProgressPercent = calculateProgressPercent(
      nextCompletedSessions,
      updatedSessions
    );

    setRevisedPlan(updatedPlan);
    setCompletedSessions(nextCompletedSessions);
    setProgressPercent(nextProgressPercent);
    setWorkedHoursToday("0");
    setMissionStatus("rescheduled");
    setAgentMessage(result.agentSummary || "Mission rescheduled.");
    setNextAction(result.nextAction || "Continue in the next available slot.");
    setUiMessage("Adaptive reschedule completed.");

    updateLocalStep6Data(updatedPlan);
    if (result.calendarSyncNeeded) {
      await syncCalendar(updatedPlan);
    }

    persistMission({
      status: "rescheduled",
      progress: {
        status: "rescheduled",
        completedSessions: nextCompletedSessions,
        blocker,
        nextAction: result.nextAction || "Continue in the next available slot.",
        lastUpdate: new Date().toISOString(),
        progressPercent: nextProgressPercent,
        workedHoursToday: numericWorkedHours
      },
      updatedPlan: updatedPlan,
      baseBranchSuggestion,
      githubProgress
    });
  }

  function openCalendarPlanner() {
    if (!data) return;

    localStorage.setItem(
      "calendarPlannerData",
      JSON.stringify({
        owner: data.owner,
        repo: data.repo,
        profile: data.profile,
        selectedIssue: data.selectedIssue,
        plan: planToUse
      })
    );

    router.push("/calendar");
  }

  async function askGeminiForHelp() {
    if (!data) return;
    if (!geminiQuestion.trim()) {
      setUiMessage("Type a question for Gemini.");
      return;
    }

    try {
      setGeminiLoading(true);
      setUiMessage("");
      const res = await fetch("/api/gemini-help", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          owner: data.owner,
          repo: data.repo,
          issueNumber: data.selectedIssue.number,
          issueTitle: data.selectedIssue.title,
          planSteps: planToUse?.steps || [],
          currentSessionNumber: currentSession?.sessionNumber || null,
          currentSessionHours: currentSession?.durationHours || 0,
          question: geminiQuestion
        })
      });

      const result = await res.json();
      if (!res.ok) {
        setUiMessage(result.error || "Failed to get Gemini help.");
        return;
      }

      setGeminiAnswer(result.answer || "No response.");
    } catch (error: any) {
      setUiMessage(error.message || "Failed to get Gemini help.");
    } finally {
      setGeminiLoading(false);
    }
  }

  function downloadMissionReport() {
    if (!data) return;

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Mission Report - Open Source Ally</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 32px; color: #111827; background: white; }
            .container { max-width: 920px; margin: 0 auto; }
            h1 { font-size: 34px; margin-bottom: 24px; }
            h2 { font-size: 24px; margin: 0 0 12px 0; }
            p, li, div { font-size: 15px; line-height: 1.55; }
            .card { border: 1px solid #d1d5db; border-radius: 14px; padding: 18px; margin-bottom: 18px; break-inside: avoid; page-break-inside: avoid; }
            ul, ol { padding-left: 22px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Mission Report — Open Source Ally</h1>
            <div class="card">
              <h2>Mission Overview</h2>
              <p><strong>Status:</strong> ${escapeHtml(missionStatus)}</p>
              <p><strong>Repository:</strong> ${escapeHtml(data.owner)}/${escapeHtml(data.repo)}</p>
              <p><strong>Issue:</strong> #${data.selectedIssue.number} ${escapeHtml(data.selectedIssue.title)}</p>
              <p><strong>Progress:</strong> ${progressPercent}%</p>
              <p><strong>Next Action:</strong> ${escapeHtml(nextAction || "Not set")}</p>
              <p><strong>Agent Guidance:</strong> ${escapeHtml(agentMessage || "No guidance yet")}</p>
              <p><strong>Suggested Base Branch:</strong> ${escapeHtml(baseBranchSuggestion || "Not suggested yet")}</p>
            </div>
            ${
              githubProgress
                ? `<div class="card"><h2>Live GitHub Progress</h2><p><strong>Branch:</strong> ${escapeHtml(
                    githubProgress.branchName || "Not found"
                  )}</p><p><strong>Commits:</strong> ${escapeHtml(
                    String(githubProgress.commitCount)
                  )}</p><p><strong>PR:</strong> ${escapeHtml(
                    githubProgress.prTitle || githubProgress.prState || "Not opened"
                  )}</p><p><strong>Last Activity:</strong> ${escapeHtml(
                    githubProgress.lastActivity || "No activity"
                  )}</p></div>`
                : ""
            }
            ${
              planToUse?.simpleExplanation
                ? `<div class="card"><h2>Plan Summary</h2><p>${escapeHtml(
                    planToUse.simpleExplanation
                  )}</p></div>`
                : ""
            }
            ${
              planToUse?.steps?.length
                ? `<div class="card"><h2>Implementation Plan</h2><ol>${planToUse.steps
                    .map((step) => `<li>${escapeHtml(step)}</li>`)
                    .join("")}</ol></div>`
                : ""
            }
            ${
              sessions.length
                ? `<div class="card"><h2>Sessions</h2>${sessions
                    .map(
                      (session) =>
                        `<div class="card"><p><strong>Session ${session.sessionNumber} — ${session.durationHours} hour(s)</strong></p><p>${escapeHtml(
                          formatHoursLabel(
                            completedSessions.includes(session.sessionNumber) ? 0 : session.durationHours
                          )
                        )}</p><ul>${session.goals
                          .map((goal) => `<li>${escapeHtml(goal)}</li>`)
                          .join("")}</ul></div>`
                    )
                    .join("")}</div>`
                : ""
            }
            ${
              blocker
                ? `<div class="card"><h2>Blocker</h2><p>${escapeHtml(blocker)}</p></div>`
                : ""
            }
            ${
              maintainerComment
                ? `<div class="card"><h2>Maintainer Comment</h2><p><strong>${escapeHtml(
                    maintainerComment.subject
                  )}</strong></p><p>${escapeHtml(maintainerComment.body).replace(/\n/g, "<br/>")}</p></div>`
                : ""
            }
            ${
              prDraft
                ? `<div class="card"><h2>PR Draft</h2><p><strong>Branch:</strong> ${escapeHtml(
                    prDraft.branchName
                  )}</p><p><strong>Base Branch:</strong> ${escapeHtml(
                    prDraft.baseBranch || ""
                  )}</p><p><strong>Title:</strong> ${escapeHtml(
                    prDraft.title
                  )}</p><p>${escapeHtml(prDraft.body).replace(/\n/g, "<br/>")}</p><ul>${(
                    prDraft.checklist || []
                  )
                    .map((item) => `<li>${escapeHtml(item)}</li>`)
                    .join("")}</ul></div>`
                : ""
            }
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1100,height=900");
    if (!printWindow) {
      alert("Popup blocked. Please allow popups for this site.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    };
  }

  if (loading) {
    return <div style={{ padding: "24px" }}>Loading...</div>;
  }

  if (errorMessage) {
    return (
      <div>
        <TopNav />
        <div className="container">
          <h1>Step 6 — Mission Control</h1>
          <div className="card">
            <p>{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !planToUse) {
    return (
      <div>
        <TopNav />
        <div className="container">
          <h1>Step 6 — Mission Control</h1>
          <div className="card">
            <p>No data available.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopNav />

      <div className="container" style={{ paddingBottom: 40 }}>
        <h1>Step 6 — Mission Control</h1>

        <div className="card">
          <h2>Mission Overview</h2>
          <p><strong>Status:</strong> {missionStatus}</p>
          <p><strong>Repo:</strong> {data.owner}/{data.repo}</p>
          <p><strong>Issue:</strong> #{data.selectedIssue.number} {data.selectedIssue.title}</p>
          <p><strong>Next Action:</strong> {nextAction || "Not set yet"}</p>
          <p><strong>Agent Guidance:</strong> {agentMessage || "No adaptive guidance yet"}</p>
          <p><strong>Suggested Base Branch:</strong> {baseBranchSuggestion || "Not suggested yet"}</p>
          {uiMessage ? <p><strong>System:</strong> {uiMessage}</p> : null}
        </div>

        <div className="card">
          <h2>Live GitHub Progress</h2>
          {data.profile?.githubUsername ? (
            githubProgress ? (
              <>
                <p><strong>Branch Name:</strong> {githubProgress.branchName || "Not found"}</p>
                <p><strong>PR Opened:</strong> {githubProgress.prOpened ? "Yes" : "No"}</p>
                <p><strong>PR Title:</strong> {githubProgress.prTitle || "No PR detected"}</p>
                <p><strong>PR State:</strong> {githubProgress.prState || "N/A"}</p>
                <p><strong>Merged:</strong> {githubProgress.merged ? "Yes" : "No"}</p>
                <p><strong>Issue Comment Count:</strong> {githubProgress.issueCommentCount}</p>
                <p><strong>Last Activity:</strong> {githubProgress.lastActivity}</p>
              </>
            ) : (
              <p className="small">Polling GitHub every 20 seconds for live contribution activity.</p>
            )
          ) : (
            <p className="small">Add a GitHub username in Step 1 to enable live GitHub progress tracking.</p>
          )}
        </div>

        {planToUse.simpleExplanation ? (
          <div className="card">
            <h2>Agent Understanding</h2>
            <p>{planToUse.simpleExplanation}</p>
          </div>
        ) : null}

        {planToUse.relevantFiles?.length ? (
          <div className="card">
            <h2>Relevant Files To Inspect</h2>
            {planToUse.relevantFiles.map((file, index) => (
              <div key={index} style={{ marginBottom: 12 }}>
                <strong>{file.path}</strong>
                <div className="small">{file.why}</div>
              </div>
            ))}
          </div>
        ) : null}

        {planToUse.steps?.length ? (
          <div className="card">
            <h2>Implementation Plan</h2>
            <ol>
              {planToUse.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
        ) : null}

        {sessions.length ? (
          <div className="card">
            <h2>Progress Tracking</h2>
            {sessions.map((session) => {
              const completed = completedSessions.includes(session.sessionNumber);
              const continuation = isContinuationSession(session);
              const remainingHours =
                currentSession?.sessionNumber === session.sessionNumber && !completed
                  ? Math.max(0, session.durationHours - Number(workedHoursToday || 0))
                  : completed
                  ? 0
                  : session.durationHours;
              const badgeLabel = completed
                ? "Complete"
                : continuation
                ? "In Progress"
                : "Pending";

              return (
                <div key={session.sessionNumber} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <strong>
                        Session {session.sessionNumber} — {session.durationHours} hour(s)
                      </strong>
                      {continuation ? (
                        <div className="small">
                          Continue from Session {baseSessionNumber(session.sessionNumber)}
                        </div>
                      ) : null}
                      <div className="small">{formatHoursLabel(remainingHours)}</div>
                    </div>
                    <span className="badge">
                      {badgeLabel}
                    </span>
                  </div>

                  <ul style={{ marginTop: 10 }}>
                    {session.goals.map((goal, idx) => (
                      <li key={idx}>{goal}</li>
                    ))}
                  </ul>
                </div>
              );
            })}

            <div className="grid grid-2" style={{ marginTop: 14 }}>
              <div>
                <label className="small">Hours Worked In Current Session</label>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={workedHoursToday}
                  onChange={(event) => setWorkedHoursToday(event.target.value)}
                />
              </div>
              <div>
                <label className="small">Stop For Today</label>
                <select
                  value={stopForToday ? "yes" : "no"}
                  onChange={(event) => setStopForToday(event.target.value === "yes")}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button type="button" onClick={markProgress} disabled={working}>
                {workingAction === "Mark Progress" ? "Working..." : "Mark Progress"}
              </button>
              <button type="button" onClick={handleReadyForPr} disabled={working}>
                {workingAction === "Ready for PR" ? "Working..." : "Ready for PR"}
              </button>
              <button type="button" onClick={handleAdaptiveReschedule} disabled={working}>
                {workingAction === "Adaptive Reschedule" ? "Working..." : "Adaptive Reschedule"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="card">
          <h2>Autonomous Agent Actions</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={downloadMissionReport}>
              Download Mission Report
            </button>
            <button type="button" onClick={openCalendarPlanner}>
              Open Calendar Planner
            </button>
            <button type="button" onClick={askGeminiForHelp}>
              {geminiLoading ? "Asking Gemini..." : "Ask Gemini In App"}
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Gemini Help</h2>
          <label className="small">Ask a question about your current issue/session</label>
          <textarea
            value={geminiQuestion}
            onChange={(event) => setGeminiQuestion(event.target.value)}
            rows={4}
            placeholder="Example: I split session 1. What exact git commands should I run next?"
          />
          {geminiAnswer ? (
            <>
              <h3 style={{ marginTop: 14 }}>Gemini Response</h3>
              <textarea value={geminiAnswer} readOnly rows={12} />
            </>
          ) : (
            <p className="small" style={{ marginTop: 10 }}>
              Response will appear here after you ask.
            </p>
          )}
        </div>

        {maintainerComment ? (
          <div className="card">
            <h2>Maintainer Comment Draft</h2>
            <p><strong>{maintainerComment.subject}</strong></p>
            <textarea value={maintainerComment.body} readOnly rows={10} />
          </div>
        ) : null}

        {prDraft ? (
          <div className="card">
            <h2>PR Draft</h2>
            <p><strong>Base branch:</strong> {prDraft.baseBranch || baseBranchSuggestion || "main"}</p>
            <p><strong>Branch name:</strong> {prDraft.branchName}</p>
            <p><strong>PR title:</strong> {prDraft.title}</p>
            <textarea value={prDraft.body} readOnly rows={12} />
            {prDraft.checklist?.length ? (
              <>
                <h3 style={{ marginTop: 16 }}>Checklist</h3>
                <ul>
                  {prDraft.checklist.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}

        <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="secondary" type="button" onClick={() => router.push("/step5")}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
