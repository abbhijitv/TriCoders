"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAuthSession } from "@/lib/auth";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const session = getAuthSession();
    const isPublicAuthPage = pathname === "/login" || pathname === "/create-account";

    if (!session && !isPublicAuthPage) {
      router.replace("/login");
      return;
    }

    if (session && (pathname === "/" || pathname === "/login" || pathname === "/create-account")) {
      router.replace("/step1");
      return;
    }

    setChecked(true);
  }, [pathname, router]);

  if (!checked) {
    return <div style={{ padding: "24px" }}>Loading...</div>;
  }

  return <>{children}</>;
}
