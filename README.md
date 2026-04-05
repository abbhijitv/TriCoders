# ContribAI

ContribAI is an AI-powered open-source contribution assistant built for hackathons and beginner-friendly onboarding. It helps a user log in with GitHub, choose a repository, analyze open issues, pick a matching task, generate a practical contribution plan, schedule work sessions, track progress, and prepare maintainer updates and pull request drafts.

The project is built as a full-stack Next.js app with React, TypeScript, Auth0, Google Gemini, GitHub API integration, Google Calendar support, and optional voice accessibility through ElevenLabs.

## Why ContribAI

Getting started in open source is often harder than writing the code itself. New contributors usually struggle with:

- picking the right repository issue
- understanding how hard the issue really is
- knowing which files to inspect first
- fitting contribution work into limited free time
- figuring out how to communicate with maintainers
- staying organized until the final PR

ContribAI is designed to reduce that friction and turn a vague issue into a guided workflow.

## Features

- GitHub login with Auth0
- Repository issue analysis using the GitHub API
- Automatic grouping of issues by tech stack
- Difficulty classification into easy, medium, and hard
- Personalized issue recommendation flow
- AI-generated plain-English issue explanation
- AI-generated contribution plan with relevant files and execution steps
- Session-based work breakdown using the user’s available time slots
- Progress tracking across the mission lifecycle
- Adaptive rescheduling when work gets interrupted
- GitHub activity tracking for branches, commits, comments, and PRs
- AI-generated maintainer comment drafts
- AI-generated PR draft content
- Google Calendar event creation for planned sessions
- Accessibility controls and voice page reading via ElevenLabs

## User Flow

The current product flow is organized into guided steps:

1. The user signs in with GitHub through Auth0.
2. The app captures the user’s GitHub identity and availability slots.
3. The user enters a target GitHub repository.
4. ContribAI fetches open issues and the repository file tree.
5. The app groups issues by stack and classifies difficulty.
6. The user chooses a stack and challenge level.
7. ContribAI recommends issues in that category.
8. The app generates a mission plan for the selected issue.
9. The user tracks progress, handles blockers, reschedules sessions if needed, and drafts maintainer or PR content.
10. The user can create Google Calendar events for planned work sessions.

## Tech Stack

### Frontend

- Next.js 15
- React 19
- TypeScript
- App Router
- Custom CSS in `app/globals.css`

### Authentication

- Auth0 with `@auth0/nextjs-auth0`

### AI

- Google Gemini via `@google/genai`
- Current model in the codebase: `gemini-2.5-flash`

### Integrations

- GitHub REST API
- Google Calendar API via `googleapis`
- ElevenLabs text-to-speech API

### State and Storage

- Browser `localStorage` for flow/session persistence
- No project database is currently configured in this repository

## Architecture Overview

### Frontend pages

- `app/login/page.tsx`: login entry screen
- `app/create-account/page.tsx`: signup entry screen
- `app/step1/page.tsx`: collect GitHub identity and availability
- `app/step2/page.tsx`: select repository and start analysis
- `app/step3/page.tsx`: choose stack/build track
- `app/step4/page.tsx`: choose difficulty
- `app/step5/page.tsx`: view recommended issues and generate plan
- `app/step6/page.tsx`: mission execution, progress updates, blocker handling, PR prep
- `app/progress/page.tsx`: saved workflow and session timeline
- `app/profile/page.tsx`: contributor profile and availability summary
- `app/calendar/page.tsx`: preview and create calendar events

### Shared libraries

- `lib/github.ts`: GitHub issue fetching, repo tree fetch, relevant file guessing
- `lib/genai.ts`: Gemini client setup
- `lib/prompts.ts`: AI prompt builders
- `lib/flow.ts`: client-side workflow state
- `lib/types.ts`: shared TypeScript types
- `lib/auth0.ts`: Auth0 client setup

### API routes

- `app/api/classify/route.ts`: classify repo issues and group them by stack
- `app/api/recommend/route.ts`: recommend issues by stack and difficulty
- `app/api/plan/route.ts`: generate issue execution plan with Gemini
- `app/api/progress-update/route.ts`: update mission progress and next actions
- `app/api/reschedule/route.ts`: revise sessions after interruption
- `app/api/maintainer-comment/route.ts`: draft a GitHub issue comment
- `app/api/pr-draft/route.ts`: draft PR title, body, branch, and checklist
- `app/api/github-progress/route.ts`: inspect GitHub activity related to the issue
- `app/api/calendar/route.ts`: create Google Calendar events from planned sessions
- `app/api/gemini-help/route.ts`: quick contextual issue help
- `app/api/voice/route.ts`: convert page text to audio using ElevenLabs

## How It Works

### 1. Repository analysis

When a user selects a repository, ContribAI:

- validates that the repository exists
- fetches open issues from GitHub
- fetches the repository file tree
- infers likely technology stacks from file extensions and common config files
- classifies each issue into a stack and difficulty level
- estimates work hours for each issue

This gives the user a structured issue list instead of a raw GitHub issue board.

### 2. Recommendation flow

After stack and difficulty are selected, the app filters matching issues and sorts them by:

- fit score
- estimated effort
- issue metadata such as labels and keywords

### 3. AI planning

For a selected issue, ContribAI uses Gemini to generate:

- a simple explanation of the task
- likely relevant repository files
- a step-by-step implementation plan
- a realistic estimate of total effort
- session breakdowns based on the user’s availability

If the Gemini response fails, the app falls back to a deterministic plan generator.

### 4. Progress and rescheduling

Step 6 acts like a mission control screen. It supports:

- marking sessions complete
- recording blocker notes
- rescheduling unfinished work
- suggesting next actions
- updating mission status

Mission state is stored in local browser storage for continuity.

### 5. GitHub-aware workflow

The app can inspect GitHub for contribution signals tied to the selected issue, including:

- matching branches
- relevant commits
- issue comments
- opened PRs
- merged PRs

This lets ContribAI infer whether the mission is still planned, in progress, ready for review, or completed.

### 6. Calendar planning

The app converts planned work sessions into Google Calendar events so users can reserve contribution time directly on their schedule.

### 7. Accessibility

An accessibility panel supports:

- bigger text
- high contrast mode
- color-blind friendly mode
- keyboard navigation mode
- page reading through ElevenLabs text-to-speech

## Project Structure

```text
ContribAI/
├── app/
│   ├── api/
│   ├── calendar/
│   ├── components/
│   ├── create-account/
│   ├── login/
│   ├── profile/
│   ├── progress/
│   ├── step1/ ... step6/
│   ├── globals.css
│   └── layout.tsx
├── lib/
│   ├── auth.ts
│   ├── auth0.ts
│   ├── flow.ts
│   ├── genai.ts
│   ├── github.ts
│   ├── prompts.ts
│   └── types.ts
├── middleware.ts
├── next.config.js
├── package.json
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 18+ recommended
- npm
- Auth0 tenant and application setup
- GitHub token with access to repository metadata and issues
- Google service account credentials for Calendar API
- ElevenLabs API key and voice ID if you want voice support

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment Variables

Create a `.env.local` file in the project root and add the variables below.

### Auth0

```env
AUTH0_SECRET=
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
APP_BASE_URL=http://localhost:3000
```

### GitHub

```env
GITHUB_TOKEN=
```

### Gemini

The app uses `@google/genai`. Add the API key required by that SDK in your environment.

```env
GOOGLE_API_KEY=
```

### Google Calendar

```env
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_CALENDAR_ID=
GOOGLE_CALENDAR_SUBJECT=
GOOGLE_CALENDAR_TIMEZONE=America/Phoenix
```

Notes:

- `GOOGLE_PRIVATE_KEY` usually needs newline characters escaped in `.env.local`
- `GOOGLE_CALENDAR_SUBJECT` is only needed for domain-wide delegation impersonation
- if `GOOGLE_CALENDAR_ID` is not set, the app falls back to the service account email or primary calendar

### ElevenLabs

```env
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## API Summary

### `POST /api/classify`

Analyzes a GitHub repository and returns:

- open issues
- inferred stacks
- classified difficulty
- estimated hours
- fit score

### `POST /api/recommend`

Returns issue recommendations for a selected stack and category.

### `POST /api/plan`

Builds an AI plan for the selected issue using:

- issue details
- user profile
- availability
- likely relevant files from the repo tree

### `POST /api/progress-update`

Updates mission progress and returns:

- status
- next action
- agent message
- base branch suggestion

### `POST /api/reschedule`

Revises session planning if work was interrupted or stopped for the day.

### `POST /api/maintainer-comment`

Generates a concise issue comment draft for maintainers.

### `POST /api/pr-draft`

Generates:

- branch name
- base branch
- PR title
- PR body
- checklist

### `POST /api/github-progress`

Checks GitHub contribution activity and derives a mission status.

### `POST /api/calendar`

Creates Google Calendar events from planned sessions and availability slots.

### `POST /api/gemini-help`

Provides short AI help for issue-specific questions.

### `POST /api/voice`

Converts page text to audio using ElevenLabs.

## Authentication Notes

This project uses Auth0 middleware to protect the app. Public-facing access is limited mainly to the login and create-account screens. The UI checks `/auth/profile` to determine whether the user is logged in and redirects accordingly.

## Persistence Model

This repository currently uses browser storage instead of a backend database.

Main keys used in `localStorage`:

- `openSourceAllyFlow`
- `step6Data`
- `calendarPlannerData`
- `contribaiAccessibilitySettings`

This keeps the demo lightweight, but it also means progress is tied to the current browser.

## Current Limitations

- no database-backed persistence
- no team or multi-user collaboration layer
- no automated test suite included in this repository
- GitHub write operations are not automated yet
- behavior depends on external API credentials being configured correctly
- AI output can still vary and may need careful validation for production use

## Deployment Notes

This app is structured like a standard Next.js project and can be deployed on platforms such as Vercel, provided all environment variables are configured.

Before deployment, verify:

- Auth0 callback and logout URLs match the deployed domain
- Google service account access is configured correctly
- GitHub token permissions are sufficient
- Gemini API key is available in the runtime environment
- ElevenLabs credentials are present if voice is enabled

## Future Improvements

- persistent database-backed user history
- stronger personalization based on contributor skills and prior activity
- direct branch and PR creation workflows
- richer maintainer collaboration tooling
- testing and monitoring improvements
- broader accessibility support
- support for more calendars and productivity tools

## Built With

- TypeScript
- Next.js
- React
- Auth0
- Google Gemini API
- GitHub API
- Google Calendar API
- ElevenLabs API
- `@google/genai`
- `googleapis`

## License

No license file is currently included in this repository. Add one before public distribution if needed.
