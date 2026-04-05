import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

type AvailabilitySlot = {
  date?: string;
  day: string;
  start: string;
  end: string;
};

type Session = {
  sessionNumber: number | string;
  durationHours: number;
  goals: string[];
};

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function slotDurationHours(slot: AvailabilitySlot) {
  return Math.max(0, (toMinutes(slot.end) - toMinutes(slot.start)) / 60);
}

function getOrderedSlots(slots: AvailabilitySlot[]) {
  return [...slots].sort((a, b) => {
    const ad = a.date ? new Date(a.date + "T00:00:00").getTime() : 0;
    const bd = b.date ? new Date(b.date + "T00:00:00").getTime() : 0;
    if (ad !== bd) return ad - bd;
    return toMinutes(a.start) - toMinutes(b.start);
  });
}

function buildEventsFromSessions(params: {
  issue: { number?: number; title: string };
  availability: { slots?: AvailabilitySlot[] };
  plan: { sessions?: Session[] };
}) {
  const slots = getOrderedSlots(params.availability?.slots || []);
  const sessions = params.plan?.sessions || [];

  const events: Array<{
    summary: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
  }> = [];

  let slotIndex = 0;

  for (const session of sessions) {
    let remaining = Number(session.durationHours || 0);

    while (remaining > 0 && slotIndex < slots.length) {
      const slot = slots[slotIndex];
      const slotHours = slotDurationHours(slot);

      if (slotHours <= 0 || !slot.date) {
        slotIndex += 1;
        continue;
      }

      const useHours = Math.min(remaining, slotHours);
      const startMins = toMinutes(slot.start);
      const endMins = startMins + Math.round(useHours * 60);

      const startDateTime = `${slot.date}T${slot.start}:00`;
      const endDateTime = `${slot.date}T${fromMinutes(endMins)}:00`;

      events.push({
        summary: `Work on Issue #${params.issue.number ?? ""} ${params.issue.title}`.trim(),
        description: [
          `Session ${session.sessionNumber}`,
          "",
          "Goals:",
          ...(session.goals || []).map((g) => `- ${g}`)
        ].join("\n"),
        startDateTime,
        endDateTime
      });

      remaining = Number((remaining - useHours).toFixed(2));
      slotIndex += 1;
    }
  }

  return events;
}

async function getCalendarClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google service account credentials in .env.local");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar"]
  });

  return google.calendar({ version: "v3", auth });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const issue = body.issue;
    const availability = body.availability || { slots: [] };
    const plan = body.plan || {};
    const syncMode = body.syncMode || "default";

    if (!issue || !availability || !plan) {
      return NextResponse.json(
        { error: "Missing issue, availability, or plan" },
        { status: 400 }
      );
    }

    const calendar = await getCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
    const timezone = process.env.GOOGLE_CALENDAR_TIMEZONE || "America/Phoenix";

    const eventsToCreate = buildEventsFromSessions({
      issue,
      availability,
      plan
    });

    if (!eventsToCreate.length) {
      return NextResponse.json(
        { error: "No calendar events could be generated from current availability and plan" },
        { status: 400 }
      );
    }

    const createdEvents = [];

    for (const evt of eventsToCreate) {
      const created = await calendar.events.insert({
        calendarId,
        requestBody: {
          summary: evt.summary,
          description: evt.description,
          start: {
            dateTime: evt.startDateTime,
            timeZone: timezone
          },
          end: {
            dateTime: evt.endDateTime,
            timeZone: timezone
          }
        }
      });

      createdEvents.push({
        id: created.data.id,
        summary: created.data.summary,
        start: created.data.start?.dateTime,
        end: created.data.end?.dateTime,
        htmlLink: created.data.htmlLink
      });
    }

    return NextResponse.json({
      message:
        syncMode === "replace_after_reschedule"
          ? "Calendar updated after reschedule."
          : "Calendar events created successfully.",
      syncMode,
      events: createdEvents
    });
  } catch (error: any) {
    console.error("CALENDAR ROUTE ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create calendar events" },
      { status: 500 }
    );
  }
}