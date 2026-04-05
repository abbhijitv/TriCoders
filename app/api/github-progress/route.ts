import { NextRequest, NextResponse } from "next/server";

type GithubProgressRequest = {
  owner: string;
  repo: string;
  username?: string;
  issueNumber?: number;
  issueTitle?: string;
};

function githubHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json"
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

async function safeFetchJson(url: string) {
  const res = await fetch(url, {
    headers: githubHeaders(),
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub request failed (${res.status}): ${url} :: ${text}`);
  }

  return res.json();
}

function normalizeText(value: string) {
  return value.toLowerCase();
}

function hasIssueReference(text: string, issueNumber?: number) {
  if (!issueNumber) return true;
  const value = normalizeText(text || "");
  return (
    value.includes(`#${issueNumber}`) ||
    value.includes(`issue ${issueNumber}`) ||
    value.includes(`issue-${issueNumber}`) ||
    value.includes(`/${issueNumber}`)
  );
}

function hasIssueTitleSignal(text: string, issueTitle?: string) {
  const haystack = normalizeText(text || "");
  const normalizedTitle = normalizeText(issueTitle || "");
  if (!haystack || !normalizedTitle) return false;

  const stopwords = new Set([
    "add",
    "the",
    "and",
    "for",
    "with",
    "from",
    "into",
    "your",
    "this",
    "that",
    "to",
    "in",
    "on",
    "a",
    "an",
    "of",
    "is",
    "txt"
  ]);

  const keywords = normalizedTitle
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 4 && !stopwords.has(part));

  if (!keywords.length) return false;
  return keywords.some((keyword) => haystack.includes(keyword));
}

function deriveStatus(input: {
  merged: boolean;
  prOpened: boolean;
  commitCount: number;
  branchFound: boolean;
  issueCommentCount: number;
}) {
  if (input.merged) return "completed" as const;
  if (input.prOpened) return "ready_for_review" as const;
  if (input.commitCount > 0 || input.branchFound || input.issueCommentCount > 0) {
    return "in_progress" as const;
  }
  return "planned" as const;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GithubProgressRequest;
    const { owner, repo, username = "", issueNumber, issueTitle } = body;

    if (!owner || !repo) {
      return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 });
    }

    const normalizedUsername = normalizeText(username);
    const [repoInfo, issueComments, branches, commits, pulls] = await Promise.all([
      safeFetchJson(`https://api.github.com/repos/${owner}/${repo}`),
      issueNumber
        ? safeFetchJson(
            `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100`
          ).catch(() => [])
        : Promise.resolve([]),
      safeFetchJson(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`).catch(
        () => []
      ),
      safeFetchJson(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`).catch(
        () => []
      ),
      safeFetchJson(`https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=100`).catch(
        () => []
      )
    ]);

    const defaultBranch = repoInfo.default_branch || "main";

    const userIssueComments = normalizedUsername
      ? (issueComments as any[]).filter(
          (comment) => normalizeText(comment?.user?.login || "") === normalizedUsername
        )
      : [];

    const matchedBranches = (branches as any[]).filter((branch) => {
      const name = normalizeText(branch?.name || "");
      if (!name) return false;
      if (issueNumber) {
        return hasIssueReference(name, issueNumber) || hasIssueTitleSignal(name, issueTitle);
      }
      if (normalizedUsername) return name.includes(normalizedUsername);
      return true;
    });

    const relevantCommits = (commits as any[]).filter((commit) => {
      const authorLogin = normalizeText(commit?.author?.login || "");
      const commitAuthor = normalizeText(commit?.commit?.author?.name || "");
      const message = normalizeText(commit?.commit?.message || "");

      const userMatch = normalizedUsername
        ? authorLogin === normalizedUsername || commitAuthor.includes(normalizedUsername)
        : true;

      const issueMatch =
        hasIssueReference(message, issueNumber) || hasIssueTitleSignal(message, issueTitle);

      return userMatch && issueMatch;
    });

    const matchedPr = (pulls as any[]).find((pull) => {
      const title = normalizeText(pull?.title || "");
      const bodyText = normalizeText(pull?.body || "");
      const headRef = normalizeText(pull?.head?.ref || "");
      const userLogin = normalizeText(pull?.user?.login || "");

      const userMatch = normalizedUsername ? userLogin === normalizedUsername : true;
      const issueMatch = issueNumber
        ? hasIssueReference(title, issueNumber) ||
          hasIssueReference(bodyText, issueNumber) ||
          hasIssueReference(headRef, issueNumber) ||
          hasIssueTitleSignal(title, issueTitle) ||
          hasIssueTitleSignal(bodyText, issueTitle) ||
          hasIssueTitleSignal(headRef, issueTitle)
        : true;

      // When an issue is selected, avoid leaking activity from other issues.
      return userMatch && issueMatch;
    });

    const branchFound = matchedBranches.length > 0;
    const branchName =
      matchedBranches[0]?.name ||
      matchedPr?.head?.ref ||
      "";
    const commitCount = relevantCommits.length;
    const latestCommitMessage = relevantCommits[0]?.commit?.message || "";
    const prOpened = Boolean(matchedPr);
    const prTitle = matchedPr?.title || "";
    const prState = matchedPr?.state || "";
    const merged = Boolean(matchedPr?.merged_at);
    const issueCommentCount = userIssueComments.length;
    const derivedStatus = deriveStatus({
      merged,
      prOpened,
      commitCount,
      branchFound,
      issueCommentCount
    });

    let lastActivity = "No GitHub activity detected yet";
    if (merged) {
      lastActivity = `Pull request merged into ${defaultBranch}`;
    } else if (prOpened) {
      lastActivity = `Pull request opened: ${prTitle}`;
    } else if (commitCount > 0) {
      lastActivity = `Latest commit: ${latestCommitMessage}`;
    } else if (branchFound) {
      lastActivity = `Working branch detected: ${branchName}`;
    } else if (issueCommentCount > 0) {
      lastActivity = "Issue comment detected from the contributor";
    }

    return NextResponse.json({
      branchFound,
      branchName,
      commitCount,
      latestCommitMessage,
      prOpened,
      prTitle,
      prState,
      merged,
      issueCommentCount,
      lastActivity,
      derivedStatus
    });
  } catch (error: any) {
    console.error("GITHUB PROGRESS ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch GitHub progress" },
      { status: 500 }
    );
  }
}
