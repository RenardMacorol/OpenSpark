# OpenSpark — Project Charter
> Version 1.0 | Stack: Next.js 14 · TypeScript · Firebase · Tailwind CSS · Vercel

---

## 1. Project Overview

**OpenSpark** is a web platform for beginner developers to collaborate, build real projects, and grow their communication and teamwork skills in a structured environment. It runs two recurring programs:

- **Cycles** — a new beginner-friendly project brief drops every 3 months. Beginners form small teams, build it together, and submit before the deadline. A public gallery shows all submissions after each cycle closes.
- **Hackathons** — 48–72 hour beginner team events with a single focused prompt. No pressure to win — the goal is to ship something and get comfortable with the full dev cycle.

**Problem it solves:** Most beginner developers learn alone. They finish tutorials but never build with other people, never communicate about code, and never ship anything real. OpenSpark gives them a structured reason to collaborate with a deadline attached.

**Target users:**
- Beginner developers (0–1 year experience) looking for structured collaborative projects
- Developers who want to practice teamwork and communication alongside coding

---

## 2. Goals & Success Criteria

| Goal | How we measure it |
|------|------------------|
| Beginners can find and join a team in under 5 minutes | Team browsing and join flow works end-to-end |
| Teams can communicate without leaving the platform | Real-time team chat works reliably |
| Submissions are publicly viewable after cycle closes | Gallery page renders all submissions for a closed cycle |
| Admin can manage cycles and hackathons independently | Admin dashboard CRUD works for both event types |
| Platform costs $0 to run as a demo | All services stay within free tiers |

---

## 3. Scope

### In scope (3-month build)
- Authentication (email + GitHub OAuth)
- User profiles with tech stack and timezone
- Cycle management (create, view, join, submit, close, gallery)
- Hackathon management (create, register, team form, submit, showcase)
- Team formation with browsing and filtering
- Real-time team chat
- Email notifications on team join and submission
- Role system: `beginner` / `admin`
- Admin dashboard
- Public landing page with active cycle/hackathon info
- Deployed live demo on Vercel

### Out of scope (not in this version)
- Voting or judging on submissions
- Maintainer/open source project listings (OpenSpark v1 focus only)
- Mobile app
- Paid tiers or premium features
- Direct messaging between individual users
- File uploads beyond avatar image

---

## 4. Tech Stack

### Frontend & Backend
| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | Next.js 14 (App Router) | Industry standard, Server Components + API Routes in one project |
| Language | TypeScript | Type safety, professional standard, catches bugs at compile time |
| Styling | Tailwind CSS v3 | Utility-first, fast to build, consistent design system |
| UI Components | shadcn/ui | Accessible, unstyled base components built on Radix UI |
| Icons | Lucide React | Clean, consistent icon set, tree-shakeable |
| Fonts | Geist (Vercel) | Modern, readable, free |

### Firebase Services
| Service | Usage |
|---------|-------|
| Firebase Auth | Email/password + GitHub OAuth, session management |
| Firestore | All app data — users, cycles, teams, submissions, notifications |
| Cloud Functions | Event-driven triggers (user created, cycle closed, team joined) |
| Firebase Storage | User avatar uploads |

### Infrastructure & APIs
| Service | Usage | Cost |
|---------|-------|------|
| Vercel | Next.js hosting + API Routes as serverless functions | Free tier |
| Firebase Spark | All Firebase services | Free forever |
| Resend | Transactional email (team invites, submission confirm) | 3,000/mo free |
| GitHub OAuth App | Login with GitHub, pull username + avatar | Free |

### Development & Testing
| Tool | Usage |
|------|-------|
| Firebase Emulator Suite | Local Auth, Firestore, Functions — no real data touched |
| Vitest | Unit tests for utility functions and TypeScript interfaces |
| Playwright | End-to-end testing of critical user flows |
| Storybook | Component development and visual testing in isolation |
| ESLint + Prettier | Code consistency enforced on every commit |
| Husky | Pre-commit hooks — lint and type-check before every push |

---

## 5. Architecture Decision: Why No Separate Express Server

With Next.js 14, API Routes (`/app/api/`) run as serverless functions on Vercel. These replace a standalone Express server for all of OpenSpark's backend needs:

- Verifying Firebase tokens → `lib/auth-middleware.ts` called inside API routes
- Setting Firebase Custom Claims (admin role) → `app/api/admin/set-role/route.ts`
- Sending email via Resend → `app/api/teams/invite/route.ts`
- Closing a cycle → `app/api/cycles/close/route.ts`

A separate Express server would require a second deployment (Render.com), introduce cold-sleep latency, and split the codebase. Next.js API Routes give the same server-side capability inside one project, one deployment, and one `git push`.

Cloud Functions handle event-driven work that shouldn't be triggered by an HTTP request — creating a user Firestore document on signup, sending notifications when a team member joins, updating counts when a submission is received.

---

## 6. Firestore Data Model

```
users/{uid}
  displayName: string
  avatarUrl: string
  githubUsername: string
  techStack: string[]
  timezone: string
  role: 'beginner' | 'admin'
  createdAt: Timestamp

cycles/{cycleId}
  title: string
  description: string
  requirements: string[]
  startDate: Timestamp
  endDate: Timestamp
  status: 'upcoming' | 'active' | 'closed'
  createdBy: string  // admin uid

hackathons/{hackathonId}
  theme: string
  description: string
  startDate: Timestamp
  endDate: Timestamp
  status: 'upcoming' | 'active' | 'closed'
  createdBy: string

teams/{teamId}
  cycleId?: string          // set if cycle team
  hackathonId?: string      // set if hackathon team
  name: string
  members: string[]         // array of uid, max 4
  maxSize: number
  techStack: string[]
  isOpen: boolean
  createdBy: string
  createdAt: Timestamp

teams/{teamId}/messages/{messageId}   ← subcollection
  authorUid: string
  text: string
  createdAt: Timestamp

submissions/{submissionId}
  teamId: string
  cycleId?: string
  hackathonId?: string
  repoUrl: string
  demoUrl?: string
  description: string
  submittedAt: Timestamp
  submittedBy: string

notifications/{uid}/feed/{notifId}    ← subcollection
  type: 'team_join' | 'cycle_start' | 'deadline_soon' | 'submission_received'
  message: string
  read: boolean
  createdAt: Timestamp
```

---

## 7. Roles & Permissions

| Action | Beginner | Admin |
|--------|----------|-------|
| Register / login | ✅ | ✅ |
| View active cycle / hackathon | ✅ | ✅ |
| Create a team | ✅ | ✅ |
| Join a team | ✅ | ✅ |
| Send team chat messages | ✅ (own team only) | ✅ |
| Submit a project | ✅ (own team only) | ✅ |
| Create a cycle | ❌ | ✅ |
| Create a hackathon | ❌ | ✅ |
| Close a cycle / hackathon | ❌ | ✅ |
| View admin dashboard | ❌ | ✅ |

Admin role is set via Firebase Custom Claims through a protected API route. Only an existing admin can assign the admin claim to another user.

---

## 8. Testing Strategy (How to test without real users)

### Firebase Emulator Suite — local environment
The emulator runs a full local copy of Auth, Firestore, and Functions. You test everything without touching production data and without needing a real user account.

```bash
firebase emulators:start
# Auth on port 9099
# Firestore on port 8080
# Functions on port 5001
# Emulator UI on port 4000
```

Your `.env.local` switches automatically:
```env
NEXT_PUBLIC_USE_EMULATOR=true
```

### Seed scripts — simulate real users
A seed script creates fake users, teams, cycles, and submissions in the emulator so every page has real-looking data to render against.

```bash
npm run seed     # populates emulator with demo data
npm run seed:reset  # clears and re-seeds
```

### Storybook — test components in isolation
Every UI component is developed and tested in Storybook before being wired to real data. You write "stories" that represent each state a component can be in.

```bash
npm run storybook
```

Example: `TeamCard.stories.tsx` shows the card in states: open team, full team, your own team, loading skeleton.

### Vitest — unit test pure logic
TypeScript utility functions, data transformations, and helper functions get unit tests.

```bash
npm run test
```

Example: test that `formatCycleStatus(endDate)` returns `'closing soon'` when less than 7 days remain.

### Playwright — end-to-end test critical flows
Playwright automates a real browser against the emulator. It tests the flows that matter most without a human clicking through manually.

```bash
npm run test:e2e
```

Critical flows to cover:
1. User registers → profile created in Firestore
2. User creates a team for the active cycle
3. User joins an existing team
4. Team member sends a chat message → appears in real-time
5. Team submits a project → submission appears in gallery

---

## 9. Repository Structure

```
openspark/
├── app/
│   ├── api/
│   │   ├── admin/set-role/route.ts
│   │   ├── cycles/close/route.ts
│   │   └── teams/invite/route.ts
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── dashboard/page.tsx
│   │   ├── cycles/page.tsx
│   │   ├── cycles/[cycleId]/page.tsx
│   │   ├── hackathons/page.tsx
│   │   ├── hackathons/[hackathonId]/page.tsx
│   │   ├── teams/page.tsx
│   │   └── teams/[teamId]/page.tsx
│   ├── admin/
│   │   ├── dashboard/page.tsx
│   │   ├── cycles/page.tsx
│   │   └── hackathons/page.tsx
│   └── layout.tsx
├── components/
│   ├── ui/                    # shadcn/ui base components
│   ├── auth/                  # LoginForm, RegisterForm
│   ├── teams/                 # TeamCard, TeamChat, TeamForm
│   ├── cycles/                # CycleBrief, CycleCountdown, SubmitForm
│   ├── hackathons/            # HackathonCard, HackathonBanner
│   └── layout/                # Navbar, Sidebar, NotificationBell
├── lib/
│   ├── firebase.ts            # client SDK init
│   ├── firebase-admin.ts      # admin SDK init (server only)
│   └── auth-middleware.ts     # verifyToken() for API routes
├── hooks/
│   ├── useAuth.ts
│   ├── useTeamChat.ts
│   └── useNotifications.ts
├── types/
│   └── index.ts               # all TypeScript interfaces
├── functions/                 # Cloud Functions (separate deploy)
│   ├── src/
│   │   ├── onUserCreate.ts
│   │   ├── onTeamJoin.ts
│   │   └── onCycleClose.ts
│   └── package.json
├── scripts/
│   ├── seed.ts
│   └── seed-reset.ts
├── .storybook/
├── e2e/                       # Playwright tests
├── firebase.json
├── firestore.rules
├── .env.local.example
└── README.md
```

---

## 10. Environment Variables

```env
# .env.local — never commit the real values

# Firebase client (safe to expose — restricted by Security Rules)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server only — never expose to browser)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Resend email
RESEND_API_KEY=

# Emulator flag
NEXT_PUBLIC_USE_EMULATOR=false
```

---

## 11. Definition of Done (per issue)

A GitHub issue is only moved to **Done** when all of the following are true:

- [ ] Feature works end-to-end in the emulator
- [ ] TypeScript — no `any` types, no compiler errors
- [ ] Firestore Security Rules updated if new collection/document added
- [ ] Loading state handled (skeleton or spinner shown while fetching)
- [ ] Error state handled (user sees a meaningful message, not a blank screen)
- [ ] Storybook story written if a new UI component was created
- [ ] Branch merged to `main` via Pull Request (even working solo — practice the habit)
