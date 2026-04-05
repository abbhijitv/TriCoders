"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getAuthSession() ? "/step1" : "/login");
  }, [router]);

  return <div style={{ padding: "24px" }}>Loading...</div>;
}
