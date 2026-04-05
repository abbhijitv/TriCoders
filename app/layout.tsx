import "./globals.css";
import React from "react";
import AuthGate from "./components/AuthGate";
import AccessibilityVoiceButton from "./components/AccessibilityVoiceButton";

export const metadata = {
  title: "ContribAI Hackathon Copilot",
  description: "Ship open-source contributions faster during hackathons"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="site-bg" aria-hidden="true">
          <div className="site-orb site-orb-a" />
          <div className="site-orb site-orb-b" />
          <div className="site-grid" />
        </div>
        <AuthGate>
          {children}
          <AccessibilityVoiceButton />
        </AuthGate>
      </body>
    </html>
  );
}
