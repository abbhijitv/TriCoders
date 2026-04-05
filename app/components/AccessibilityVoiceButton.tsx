"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

function collectReadableText() {
  const heading = document.querySelector("h1")?.textContent?.trim() || "";
  const paragraphs = Array.from(document.querySelectorAll("p, li"))
    .map((node) => node.textContent?.trim() || "")
    .filter(Boolean)
    .slice(0, 12);

  const combined = [heading ? `Page: ${heading}` : "", ...paragraphs]
    .filter(Boolean)
    .join(". ");

  return combined.slice(0, 2000);
}

export default function AccessibilityVoiceButton() {
  const SETTINGS_KEY = "contribaiAccessibilitySettings";
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [settings, setSettings] = useState({
    largeText: false,
    highContrast: false,
    colorBlind: false,
    keyboardNav: false
  });

  const hidden = useMemo(
    () => pathname === "/login" || pathname === "/create-account",
    [pathname]
  );

  function applySettings(next: typeof settings) {
    document.body.classList.toggle("a11y-large-text", next.largeText);
    document.body.classList.toggle("a11y-high-contrast", next.highContrast);
    document.body.classList.toggle("a11y-colorblind", next.colorBlind);
    document.body.classList.toggle("a11y-keyboard-nav", next.keyboardNav);
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as typeof settings;
      setSettings(saved);
      applySettings(saved);
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    applySettings(settings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  function toggleSetting(key: keyof typeof settings) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (hidden) return null;

  async function handleReadPage() {
    try {
      setLoading(true);
      setError("");

      const text = collectReadableText();
      if (!text) {
        setError("No readable text found on this page.");
        return;
      }

      const res = await fetch("/api/voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
      });

      if (!res.ok) {
        const message = await res.text();
        setError(message || "Failed to generate voice.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (audio) {
        audio.pause();
      }

      const nextAudio = new Audio(url);
      nextAudio.onended = () => URL.revokeObjectURL(url);
      nextAudio.play().catch(() => {
        setError("Audio playback failed.");
      });
      setAudio(nextAudio);
    } catch (err: any) {
      setError(err?.message || "Voice request failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleStop() {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }

  return (
    <div className="a11y-shell">
      {open ? (
        <div className="a11y-panel card">
          <h3 style={{ marginBottom: 8 }}>Accessibility</h3>
          <p className="small" style={{ marginTop: 0 }}>
            ElevenLabs voice reading
          </p>
          <div className="a11y-toggle-grid">
            <button
              type="button"
              className={settings.largeText ? "" : "secondary"}
              onClick={() => toggleSetting("largeText")}
            >
              Bigger Text
            </button>
            <button
              type="button"
              className={settings.highContrast ? "" : "secondary"}
              onClick={() => toggleSetting("highContrast")}
            >
              High Contrast
            </button>
            <button
              type="button"
              className={settings.colorBlind ? "" : "secondary"}
              onClick={() => toggleSetting("colorBlind")}
            >
              Color-Blind Friendly
            </button>
            <button
              type="button"
              className={settings.keyboardNav ? "" : "secondary"}
              onClick={() => toggleSetting("keyboardNav")}
            >
              Keyboard Navigation
            </button>
          </div>
          <div className="row">
            <button type="button" onClick={handleReadPage} disabled={loading}>
              {loading ? "Reading..." : "Read Page"}
            </button>
            <button type="button" className="secondary" onClick={handleStop}>
              Stop
            </button>
          </div>
          {error ? <p className="small" style={{ color: "#f5cf7d" }}>{error}</p> : null}
        </div>
      ) : null}

      <button
        type="button"
        className="a11y-fab"
        aria-label="Open accessibility controls"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Close A11y" : "Accessibility"}
      </button>
    </div>
  );
}
