"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import TopNav from "../components/TopNav";
import { AvailabilitySlot, getFlowData, setFlowData } from "@/lib/flow";

type AuthProfile = {
  sub?: string;
  nickname?: string;
  preferred_username?: string;
  name?: string;
};

function getDayFromDate(date: string) {
  if (!date) return "";
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long" });
}

function extractGithubUsername(profile: AuthProfile | null): string {
  if (!profile) return "";
  if (profile.preferred_username) return profile.preferred_username;
  if (profile.nickname) return profile.nickname;
  if (profile.sub?.startsWith("github|") && profile.name) return profile.name;
  return "";
}

export default function Step1Page() {
  const router = useRouter();
  const flow = useMemo(() => getFlowData(), []);

  const [githubUsername, setGithubUsername] = useState(
    flow.profile?.githubUsername || ""
  );

  const [slots, setSlots] = useState<AvailabilitySlot[]>(
    flow.profile?.availability?.slots || []
  );

  useEffect(() => {
    let active = true;

    async function hydrateGithubUsername() {
      if (githubUsername.trim()) return;
      try {
        const res = await fetch("/auth/profile", { cache: "no-store" });
        if (!res.ok) return;

        const profile = (await res.json()) as AuthProfile;
        const extracted = extractGithubUsername(profile);
        if (!active || !extracted) return;

        setGithubUsername(extracted);
      } catch {
        // ignore profile lookup failures
      }
    }

    hydrateGithubUsername();
    return () => {
      active = false;
    };
  }, [githubUsername]);

  function addSlot() {
    setSlots([...slots, { date: "", day: "", start: "", end: "" }]);
  }

  function updateSlot(
    index: number,
    key: "date" | "day" | "start" | "end",
    value: string
  ) {
    const updated = [...slots];
    updated[index][key] = value;

    if (key === "date") {
      updated[index].day = getDayFromDate(value);
    }

    setSlots(updated);
  }

  function removeSlot(index: number) {
    setSlots(slots.filter((_, i) => i !== index));
  }

  function saveStepData() {
    setFlowData({
      profile: {
        githubUsername,
        availability: { slots }
      }
    });
  }

  function goNext() {
    saveStepData();
    router.push("/step2");
  }

  return (
    <div>
      <TopNav />

      <div className="container">
        <h1>Step 1 — Profile + Availability</h1>

        <div className="card">
          <label className="small">GitHub Username</label>
          <input
            value={githubUsername}
            readOnly
          />

          <div style={{ marginTop: 16 }}>
            <label className="small">Availability Slots</label>

            {slots.map((slot, index) => (
              <div
                key={index}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr 1fr 1fr auto",
                  gap: 10,
                  marginTop: 10
                }}
              >
                <input
                  type="date"
                  value={slot.date}
                  onChange={(e) => updateSlot(index, "date", e.target.value)}
                />

                <input
                  value={slot.day}
                  readOnly
                  placeholder="Day auto-filled"
                />

                <input
                  type="time"
                  value={slot.start}
                  onChange={(e) => updateSlot(index, "start", e.target.value)}
                />

                <input
                  type="time"
                  value={slot.end}
                  onChange={(e) => updateSlot(index, "end", e.target.value)}
                />

                <button type="button" onClick={() => removeSlot(index)}>
                  Remove
                </button>
              </div>
            ))}

            <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
              <button type="button" onClick={addSlot}>
                Add Availability Slot
              </button>
              <button type="button" onClick={goNext}>
                Next → Step 2
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
