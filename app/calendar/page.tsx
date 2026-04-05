"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "../components/TopNav";

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

type PlannerData = {
  owner: string;
  repo: string;
  profile?: {
    githubUsername?: string;
    availability?: {
      slots?: AvailabilitySlot[];
    };
  };
  selectedIssue: {
    number?: number;
    title: string;
    body?: string;
    difficulty?: string;
    stack?: string;
  };
  plan: {
    simpleExplanation?: string;
    estimatedHours?: number;
    steps?: string[];
    sessions?: Session[];
  };
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

function buildPreviewEvents(data: PlannerData) {
  const slots = getOrderedSlots(data.profile?.availability?.slots || []);
  const sessions = data.plan?.sessions || [];

  const preview: Array<{
    label: string;
    detail: string;
    date: string;
    start: string;
    end: string;
    goals: string[];
  }> = [];

  let slotIndex = 0;

  for (const session of sessions) {
    let remaining = Number(session.durationHours || 0);

    while (remaining > 0 && slotIndex < slots.length) {
      const slot = slots[slotIndex];
      const slotHours = slotDurationHours(slot);

      if (!slot.date || slotHours <= 0) {
        slotIndex += 1;
        continue;
      }

      const useHours = Math.min(remaining, slotHours);
      const endMinutes = toMinutes(slot.start) + Math.round(useHours * 60);

      preview.push({
        label: `Session ${session.sessionNumber}`,
        detail: data.selectedIssue.title,
        date: slot.date,
        start: slot.start,
        end: fromMinutes(endMinutes),
        goals: session.goals || []
      });

      remaining = Number((remaining - useHours).toFixed(2));
      slotIndex += 1;
    }
  }

  return preview;
}

export default function CalendarPage() {
  const router = useRouter();

  const [data, setData] = useState<PlannerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [uiMessage, setUiMessage] = useState("");
  const [createdEvents, setCreatedEvents] = useState<any[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("calendarPlannerData");

      if (!raw) {
        setUiMessage("No planner data found. Open Step 6 first.");
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(raw) as PlannerData;
      setData(parsed);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setUiMessage("Could not load calendar planner data.");
      setLoading(false);
    }
  }, []);

  const previewEvents = useMemo(() => {
    if (!data) return [];
    return buildPreviewEvents(data);
  }, [data]);

  async function createCalendarEvents() {
    if (!data) return;

    try {
      setWorking(true);
      setUiMessage("");

      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          issue: data.selectedIssue,
          availability: data.profile?.availability || { slots: [] },
          plan: data.plan
        })
      });

      const result = await res.json();

      if (!res.ok) {
        setUiMessage(result.error || "Failed to create calendar events.");
        return;
      }

      setCreatedEvents(result.events || []);
      setUiMessage(result.message || "Calendar events created successfully.");
    } catch (error: any) {
      console.error(error);
      setUiMessage(error.message || "Something went wrong while creating events.");
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return <div style={{ padding: "24px" }}>Loading...</div>;
  }

  return (
    <div>
      <TopNav />

      <div className="container">
        <h1>Sprint Calendar Planner</h1>

        {uiMessage ? (
          <div className="card">
            <p>{uiMessage}</p>
          </div>
        ) : null}

        {!data ? (
          <div className="card">
            <p>No planner data available.</p>
            <button type="button" onClick={() => router.push("/step6")}>
              ← Back to Step 6
            </button>
          </div>
        ) : (
          <>
            <div className="card">
              <h2>Mission Summary</h2>
              <p>
                <strong>Repo:</strong> {data.owner}/{data.repo}
              </p>
              <p>
                <strong>Issue:</strong> #{data.selectedIssue.number} {data.selectedIssue.title}
              </p>
              <p>
                <strong>Estimated Hours:</strong> {data.plan?.estimatedHours || "N/A"}
              </p>
            </div>

            <div className="card">
              <h2>Calendar Preview</h2>

              {!previewEvents.length ? (
                <p>No preview events could be created from current availability and plan.</p>
              ) : (
                previewEvents.map((evt, idx) => (
                  <div key={idx} className="card">
                    <strong>{evt.label}</strong>
                    <div>
                      {evt.date} • {evt.start} - {evt.end}
                    </div>
                    <div>{evt.detail}</div>
                    {evt.goals?.length ? (
                      <ul style={{ marginTop: 8 }}>
                        {evt.goals.map((goal, gidx) => (
                          <li key={gidx}>{goal}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <div className="card">
              <h2>Actions</h2>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button type="button" onClick={createCalendarEvents} disabled={working}>
                  {working ? "Creating Events..." : "Create Google Calendar Events"}
                </button>
                <button type="button" onClick={() => router.push("/step6")}>
                  ← Back to Step 6
                </button>
              </div>
            </div>

            {createdEvents.length ? (
              <div className="card">
                <h2>Created Google Calendar Events</h2>
                {createdEvents.map((evt, idx) => (
                  <div key={idx} className="card">
                    <strong>{evt.summary}</strong>
                    <div>
                      {evt.start} → {evt.end}
                    </div>
                    {evt.openLink || evt.htmlLink ? (
                      <div style={{ marginTop: 8 }}>
                        <a
                          href={evt.openLink || evt.htmlLink}
                          target="_blank"
                          rel="noreferrer"
                          className="link"
                        >
                          Open in Google Calendar
                        </a>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
