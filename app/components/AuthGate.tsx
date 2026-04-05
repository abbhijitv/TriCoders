"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    const isPublicAuthPage = pathname === "/login" || pathname === "/create-account";

    async function checkSession() {
      try {
        const res = await fetch("/auth/profile", { cache: "no-store" });
        const loggedIn = res.ok;
        if (!active) return;

        if (!loggedIn && !isPublicAuthPage) {
          router.replace("/login");
          return;
        }

        if (loggedIn && (pathname === "/" || isPublicAuthPage)) {
          router.replace("/step1");
          return;
        }

        if (!loggedIn && pathname === "/") {
          router.replace("/login");
          return;
        }

        setChecked(true);
      } catch {
        if (!active) return;
        if (!isPublicAuthPage) {
          router.replace("/login");
          return;
        }
        setChecked(true);
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (!checked) {
    return <div style={{ padding: "24px" }}>Loading...</div>;
  }

  return <>{children}</>;
}
