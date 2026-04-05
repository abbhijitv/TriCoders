import { Issue } from "@/lib/types";

function githubHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json"
  };

  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function fetchRepoIssues(owner: string, repo: string): Promise<Issue[]> {
  const repoCheckUrl = `https://api.github.com/repos/${owner}/${repo}`;

  const repoRes = await fetch(repoCheckUrl, {
    headers: githubHeaders(),
    cache: "no-store"
  });

  if (repoRes.status === 404) {
    throw new Error("REPO_NOT_FOUND");
  }

  if (!repoRes.ok) {
    const text = await repoRes.text();
    throw new Error(`GitHub repo fetch failed: ${repoRes.status} ${text}`);
  }

  const searchUrl =
    `https://api.github.com/search/issues?q=` +
    encodeURIComponent(`repo:${owner}/${repo} is:issue is:open`) +
    `&per_page=50`;

  const res = await fetch(searchUrl, {
    headers: githubHeaders(),
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub issue search failed: ${res.status} ${text}`);
  }

  const data = await res.json();

  return (data.items ?? []).map((item: any) => ({
    id: item.id,
    number: item.number,
    title: item.title ?? "",
    body: item.body ?? "",
    labels: (item.labels ?? []).map((l: any) => l.name).filter(Boolean),
    url: item.html_url ?? ""
  }));
}

export async function fetchDefaultBranch(owner: string, repo: string): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}`;

  const res = await fetch(url, {
    headers: githubHeaders(),
    cache: "no-store"
  });

  if (res.status === 404) {
    throw new Error("REPO_NOT_FOUND");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub repo fetch failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.default_branch || "main";
}

export async function fetchRepoTree(owner: string, repo: string): Promise<string[]> {
  const branch = await fetchDefaultBranch(owner, repo);
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;

  const res = await fetch(url, {
    headers: githubHeaders(),
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub tree fetch failed: ${res.status} ${text}`);
  }

  const data = await res.json();

  return (data.tree ?? [])
    .filter((item: any) => item.type === "blob")
    .map((item: any) => item.path)
    .filter(Boolean);
}

export function guessRelevantFiles(issueTitle: string, issueBody: string, paths: string[]): string[] {
  const text = `${issueTitle} ${issueBody}`.toLowerCase();

  const keywords = text
    .replace(/[^a-z0-9_\-./ ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const scored = paths.map((path) => {
    const lower = path.toLowerCase();
    let score = 0;

    for (const kw of keywords) {
      if (lower.includes(kw)) score += 3;
    }

    if (text.includes("readme") && lower.includes("readme")) score += 6;
    if (text.includes("doc") && lower.includes("doc")) score += 4;
    if (text.includes("tutorial") && lower.includes("tutorial")) score += 5;
    if (text.includes("translation") && (lower.includes("translation") || lower.includes("readme"))) score += 5;
    if (text.includes("cli") && lower.includes("cli")) score += 5;
    if (text.includes("auth") && lower.includes("auth")) score += 5;
    if (text.includes("test") && lower.includes("test")) score += 3;

    return { path, score };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((x) => x.path);
}