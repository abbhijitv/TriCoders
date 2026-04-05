import { NextRequest, NextResponse } from "next/server";
import { ai, MODEL } from "@/lib/genai";
import { adaptiveReschedulePrompt } from "@/lib/prompts";

type AvailabilitySlot = {
  date?: string;
  day: string;
  start: string;
  end: string;
};

type Session = {
  sessionNumber: number;
  durationHours: number;
  goals: string[];
};

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm}`;
}

function slotDurationHours(slot: AvailabilitySlot) {
  return Math.max(0, (toMinutes(slot.end) - toMinutes(slot.start)) / 60);
}

function slotSortValue(slot: AvailabilitySlot) {
  const base = slot.date ? new Date(slot.date + "T00:00:00").getTime() : Number.MAX_SAFE_INTEGER;
  return base + toMinutes(slot.start);
}

function buildFutureSlots(slots: AvailabilitySlot[]) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayStr = now.toISOString().slice(0, 10);

  return [...slots]
    .filter((slot) => {
      if (!slot.date) return false;
      if (slot.date > todayStr) return true;
      if (slot.date < todayStr) return false;
      return toMinutes(slot.end) > nowMinutes;
    })
    .sort((a, b) => slotSortValue(a) - slotSortValue(b));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      issueTitle,
      availability,
      plan,
      progress,
      currentSessionNumber,
      currentSessionDurationHours,
      workedHoursToday,
      stopForToday
    } = body;

    const slots: AvailabilitySlot[] = availability?.slots || [];
    const sessions: Session[] = plan?.sessions || [];
    const completedSessions: number[] = progress?.completedSessions || [];
    const blocker: string = progress?.blocker || "";

    if (!issueTitle || !plan || !currentSessionNumber || currentSessionDurationHours === undefined) {
      return NextResponse.json(
        { error: "Missing required fields for adaptive reschedule" },
        { status: 400 }
      );
    }

    const remainingToday = Math.max(0, Number(currentSessionDurationHours) - Number(workedHoursToday || 0));
    const futureSlots = buildFutureSlots(slots);
    const futureSummary = futureSlots
      .map((s) => `- ${s.date} ${s.start}-${s.end}`)
      .join("\n");

    const prompt = adaptiveReschedulePrompt({
      issueTitle,
      blocker,
      workedHoursToday: Number(workedHoursToday || 0),
      currentSessionNumber: Number(currentSessionNumber),
      currentSessionDurationHours: Number(currentSessionDurationHours),
      stopForToday: Boolean(stopForToday),
      futureSlotsSummary: futureSummary
    });

    const aiResult = await ai.models.generateContent({
      model: MODEL,
      contents: prompt
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse((aiResult.text || "").replace(/```json/g, "").replace(/```/g, "").trim());
    } catch {
      parsed = {};
    }

    if (!stopForToday) {
      return NextResponse.json({
        revisedSessions: sessions,
        agentSummary:
          parsed.agentSummary ||
          "You chose to keep going today, so the mission schedule stays the same.",
        nextAction:
          parsed.nextAction ||
          "Continue working on the current session until it is complete.",
        shouldFinishNow: false,
        calendarSyncNeeded: false
      });
    }

    if (remainingToday <= 0) {
      return NextResponse.json({
        revisedSessions: sessions,
        agentSummary:
          parsed.agentSummary ||
          "There is no remaining time left for the current session, so no reschedule was needed.",
        nextAction:
          parsed.nextAction ||
          "Move to the next session or mark progress.",
        shouldFinishNow: false,
        calendarSyncNeeded: false
      });
    }

    const firstFutureSlot = futureSlots.find((slot) => slotDurationHours(slot) > 0);

    if (!firstFutureSlot) {
      return NextResponse.json({
        revisedSessions: sessions,
        agentSummary:
          parsed.agentSummary ||
          "No future availability was found for the unfinished work.",
        nextAction:
          parsed.nextAction ||
          "It is better to finish the remaining work now, because no future slot is available.",
        shouldFinishNow: true,
        messageIfNoFutureAvailability:
          parsed.messageIfNoFutureAvailability ||
          "It is better to finish now as no availability exists in the future.",
        calendarSyncNeeded: false
      });
    }

    const targetSessionIndex = sessions.findIndex(
      (s) => s.sessionNumber === Number(currentSessionNumber)
    );

    const updatedSessions = [...sessions];

    if (targetSessionIndex !== -1) {
      const currentSession = updatedSessions[targetSessionIndex];

      updatedSessions[targetSessionIndex] = {
        ...currentSession,
        durationHours: Number(workedHoursToday || 0),
        goals: [
          ...(currentSession.goals || []),
          "(Partial work completed in original slot)"
        ]
      };

      updatedSessions.splice(targetSessionIndex + 1, 0, {
        sessionNumber: currentSession.sessionNumber + 0.1,
        durationHours: Number(remainingToday.toFixed(2)),
        goals: [
          "Complete the remaining portion of the interrupted session",
          ...(currentSession.goals || [])
        ]
      });
    }

    const calendarSyncPayload = {
      mode: "sync_after_reschedule",
      revisedSessions: updatedSessions,
      completedSessions,
      availability,
      issueTitle
    };

    return NextResponse.json({
      revisedSessions: updatedSessions,
      agentSummary:
        parsed.agentSummary ||
        `The remaining ${remainingToday.toFixed(
          2
        )} hour(s) were moved to a future available slot on ${firstFutureSlot.date}.`,
      nextAction:
        parsed.nextAction ||
        `Resume the unfinished work in the next available slot on ${firstFutureSlot.date}.`,
      shouldFinishNow: false,
      calendarSyncNeeded: true,
      calendarSyncPayload
    });
  } catch (error: any) {
    console.error("RESCHEDULE ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reschedule mission" },
      { status: 500 }
    );
  }
}