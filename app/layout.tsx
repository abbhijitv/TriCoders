import "./globals.css";
import React from "react";
import AuthGate from "./components/AuthGate";

export const metadata = {
  title: "ContribAI",
  description: "Autonomous contribution agent"
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
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
