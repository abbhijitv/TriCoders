"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession, setAuthSession } from "@/lib/auth";

type AccountForm = {
  firstName: string;
  lastName: string;
  email: string;
  githubUsername: string;
  role: string;
  timezone: string;
  password: string;
  confirmPassword: string;
};

const initialForm: AccountForm = {
  firstName: "",
  lastName: "",
  email: "",
  githubUsername: "",
  role: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Phoenix",
  password: "",
  confirmPassword: ""
};

export default function CreateAccountPage() {
  const router = useRouter();
  const [form, setForm] = useState<AccountForm>(initialForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (getAuthSession()) {
      router.replace("/step1");
    }
  }, [router]);

  function updateField<K extends keyof AccountForm>(key: K, value: AccountForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleCreateAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      setMessage("");
      return;
    }

    setAuthSession({
      email: form.email.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      githubUsername: form.githubUsername.trim(),
      passwordHint: form.password ? "saved-locally" : "",
      role: form.role.trim(),
      timezone: form.timezone.trim(),
      loggedInAt: new Date().toISOString()
    });

    setError("");
    setMessage("Account created. Redirecting to your workspace...");
    window.setTimeout(() => {
      router.push("/step1");
    }, 350);
  }

  return (
    <div className="container" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div className="card" style={{ width: "100%", maxWidth: 760 }}>
        <div className="badge">ContribAI</div>
        <h1 style={{ fontSize: "2.2rem", marginTop: 14 }}>Create account</h1>
        <p className="small" style={{ marginBottom: 18 }}>
          Set up your contributor workspace profile.
        </p>

        <form onSubmit={handleCreateAccount}>
          <div className="grid grid-2">
            <div>
              <label className="small">First name</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
                placeholder="Swetha"
                required
              />
            </div>

            <div>
              <label className="small">Last name</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
                placeholder="Rao"
                required
              />
            </div>

            <div>
              <label className="small">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="small">GitHub username</label>
              <input
                type="text"
                value={form.githubUsername}
                onChange={(event) => updateField("githubUsername", event.target.value)}
                placeholder="your-github-handle"
                required
              />
            </div>

            <div>
              <label className="small">Role / title</label>
              <input
                type="text"
                value={form.role}
                onChange={(event) => updateField("role", event.target.value)}
                placeholder="Student, Engineer, Maintainer"
              />
            </div>

            <div>
              <label className="small">Timezone</label>
              <input
                type="text"
                value={form.timezone}
                onChange={(event) => updateField("timezone", event.target.value)}
                placeholder="America/Phoenix"
                required
              />
            </div>

            <div>
              <label className="small">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="Create a password"
                required
              />
            </div>

            <div>
              <label className="small">Confirm password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(event) => updateField("confirmPassword", event.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>
          </div>

          <div className="row" style={{ justifyContent: "space-between", marginTop: 18 }}>
            <Link href="/login" className="link">
              Already have an account?
            </Link>
            <Link href="/" className="link">
              Home
            </Link>
          </div>

          <div className="row" style={{ marginTop: 18 }}>
            <button
              type="submit"
              disabled={
                !form.firstName.trim() ||
                !form.lastName.trim() ||
                !form.email.trim() ||
                !form.githubUsername.trim() ||
                !form.password.trim() ||
                !form.confirmPassword.trim()
              }
            >
              Create Account
            </button>
          </div>
        </form>

        {error ? (
          <div className="card" style={{ marginTop: 18, marginBottom: 0 }}>
            <p>{error}</p>
          </div>
        ) : null}

        {message ? (
          <div className="card" style={{ marginTop: 18, marginBottom: 0 }}>
            <p>{message}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
