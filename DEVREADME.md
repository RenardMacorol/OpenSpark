# OpenSpark — Agent & Developer README
> Read this before writing any code. This is the source of truth for all technical decisions.

---

## Quick context for AI agents

You are working on **OpenSpark** — a Next.js 14 + TypeScript + Firebase platform for beginner developers to collaborate on structured projects. When asked to generate code for this project, always follow the conventions in this file. Never introduce a new library, pattern, or architecture decision that contradicts what is defined here.

**Stack summary:**
- Framework: Next.js 14, App Router, TypeScript strict mode
- Styling: Tailwind CSS v3 + shadcn/ui + Lucide React icons
- Database: Firestore (Firebase)
- Auth: Firebase Authentication (email + GitHub OAuth)
- Server logic: Next.js API Routes (no separate Express server)
- Event-driven: Firebase Cloud Functions
- Email: Resend
- Hosting: Vercel
- Testing: Vitest (unit) + Playwright (e2e) + Storybook (components)
- Local dev: Firebase Emulator Suite

---

## UI Library Decisions

### Tailwind CSS v3
All styling is done with Tailwind utility classes. No CSS modules, no styled-components, no inline styles.

```tsx
// ✅ correct
<div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">

// ❌ wrong
<div style={{ display: 'flex', gap: 12 }}>
```

Tailwind config extends the default with design tokens from shadcn/ui. Use semantic color tokens, not raw hex values:

```tsx
// ✅ use semantic tokens
className="bg-background text-foreground border-border"
className="bg-primary text-primary-foreground"
className="text-muted-foreground"

// ❌ avoid raw colors
className="bg-gray-100 text-gray-900"
```

### shadcn/ui
shadcn/ui provides the base component library. Components live in `components/ui/` and are installed via the CLI. They are built on Radix UI primitives and are fully accessible.

**Installed components (add to this list as you install more):**
- Button
- Input
- Textarea
- Card, CardHeader, CardContent, CardFooter
- Badge
- Avatar
- Dialog
- DropdownMenu
- Tabs
- Skeleton
- Toast (via Sonner)
- Form (react-hook-form + zod)
- Select
- Separator

**How to install a new shadcn component:**
```bash
npx shadcn-ui@latest add <component-name>
```

**Never modify files inside `components/ui/` directly.** If you need a custom variant, extend it in a wrapper component.

### Lucide React
All icons come from `lucide-react`. Never use emoji as icons in UI. Never import from a different icon library.

```tsx
import { Users, Trophy, ArrowRight, Bell, Settings } from 'lucide-react'

// Usage — always set explicit size
<Users className="h-4 w-4" />
<Trophy className="h-5 w-5 text-muted-foreground" />
```

### Fonts
Using Geist font via `next/font/google`. Already configured in `app/layout.tsx`. Do not add additional fonts.

### Additional UI utilities
```
clsx          — conditional classNames
tailwind-merge — merge Tailwind classes without conflicts
date-fns      — date formatting (NOT moment.js)
sonner        — toast notifications
react-hook-form + zod — all forms and validation
```

The `cn()` helper merges classes correctly — always use it when combining conditional classes:

```tsx
import { cn } from '@/lib/utils'

<div className={cn('base-classes', isActive && 'active-classes', className)}>
```

---

## TypeScript Rules

All code is TypeScript strict mode. The following rules are non-negotiable:

- **No `any` types.** If you don't know the type, use `unknown` and narrow it.
- **All Firestore documents map to an interface** defined in `types/index.ts`.
- **All API route request bodies have a typed interface.**
- **All component props have a typed interface.**

### Core interfaces — `types/index.ts`

```typescript
import { Timestamp } from 'firebase/firestore'

export type UserRole = 'beginner' | 'admin'
export type EventStatus = 'upcoming' | 'active' | 'closed'
export type NotificationType = 'team_join' | 'cycle_start' | 'deadline_soon' | 'submission_received'

export interface User {
  uid: string
  displayName: string
  avatarUrl: string
  githubUsername: string
  techStack: string[]
  timezone: string
  role: UserRole
  createdAt: Timestamp
}

export interface Cycle {
  id: string
  title: string
  description: string
  requirements: string[]
  startDate: Timestamp
  endDate: Timestamp
  status: EventStatus
  createdBy: string
}

export interface Hackathon {
  id: string
  theme: string
  description: string
  startDate: Timestamp
  endDate: Timestamp
  status: EventStatus
  createdBy: string
}

export interface Team {
  id: string
  cycleId?: string
  hackathonId?: string
  name: string
  members: string[]
  maxSize: number
  techStack: string[]
  isOpen: boolean
  createdBy: string
  createdAt: Timestamp
}

export interface Message {
  id: string
  authorUid: string
  text: string
  createdAt: Timestamp
}

export interface Submission {
  id: string
  teamId: string
  cycleId?: string
  hackathonId?: string
  repoUrl: string
  demoUrl?: string
  description: string
  submittedAt: Timestamp
  submittedBy: string
}

export interface Notification {
  id: string
  type: NotificationType
  message: string
  read: boolean
  createdAt: Timestamp
}
```

---

## Firebase Conventions

### Client SDK — `lib/firebase.ts`
Used in Client Components and custom hooks. Initializes once.

```typescript
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

if (process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, 'localhost', 8080)
  connectStorageEmulator(storage, 'localhost', 9199)
}
```

### Admin SDK — `lib/firebase-admin.ts`
Used ONLY inside API Routes and Cloud Functions. Never import this in a Client Component.

```typescript
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export const adminAuth = getAuth()
export const adminDb = getFirestore()
```

### Auth middleware — `lib/auth-middleware.ts`
Every protected API route calls this first.

```typescript
import { adminAuth } from './firebase-admin'
import { NextRequest } from 'next/server'

export async function verifyToken(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  try {
    return await adminAuth.verifyIdToken(token)
  } catch {
    return null
  }
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

### Firestore collection helpers
Define typed collection references to avoid string literals scattered around:

```typescript
// lib/collections.ts
import { collection, doc } from 'firebase/firestore'
import { db } from './firebase'

export const Collections = {
  users: () => collection(db, 'users'),
  user: (uid: string) => doc(db, 'users', uid),
  cycles: () => collection(db, 'cycles'),
  cycle: (id: string) => doc(db, 'cycles', id),
  hackathons: () => collection(db, 'hackathons'),
  teams: () => collection(db, 'teams'),
  team: (id: string) => doc(db, 'teams', id),
  teamMessages: (teamId: string) => collection(db, 'teams', teamId, 'messages'),
  submissions: () => collection(db, 'submissions'),
  notifications: (uid: string) => collection(db, 'notifications', uid, 'feed'),
}
```

---

## Next.js Conventions

### Server vs Client Components

| Use Server Component when | Use Client Component (`'use client'`) when |
|--------------------------|-------------------------------------------|
| Fetching data for initial render | Using `useState` or `useReducer` |
| Reading from Firestore once | Using `useEffect` |
| Calling Admin SDK safely | Using Firestore `onSnapshot` (real-time) |
| Page-level data loading | Handling user interactions (onClick, onChange) |
| SEO-critical pages | Using `useAuth` hook |

### API Route structure

Every API route follows this exact pattern:

```typescript
// app/api/teams/invite/route.ts
import { NextRequest } from 'next/server'
import { verifyToken, unauthorized } from '@/lib/auth-middleware'

interface InviteRequestBody {
  teamId: string
  inviteeEmail: string
}

export async function POST(req: NextRequest) {
  // 1. Verify auth
  const user = await verifyToken(req)
  if (!user) return unauthorized()

  // 2. Parse and validate body
  const body: InviteRequestBody = await req.json()
  if (!body.teamId || !body.inviteeEmail) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // 3. Business logic
  // ... send email, write to Firestore, etc.

  // 4. Return response
  return Response.json({ success: true })
}
```

### Custom hooks pattern

All Firestore subscriptions live in custom hooks in the `hooks/` directory.

```typescript
// hooks/useTeamChat.ts
'use client'
import { useEffect, useState } from 'react'
import { query, orderBy, onSnapshot } from 'firebase/firestore'
import { Collections } from '@/lib/collections'
import type { Message } from '@/types'

export function useTeamChat(teamId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(Collections.teamMessages(teamId), orderBy('createdAt', 'asc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)))
      setLoading(false)
    })
    return () => unsubscribe() // always clean up
  }, [teamId])

  return { messages, loading }
}
```

---

## Testing Guide

### 1. Start the emulator before any local development

```bash
firebase emulators:start
```

Visit `http://localhost:4000` for the Emulator UI. You can inspect Firestore documents, Auth users, and Function logs in real time.

### 2. Seed the emulator with test data

```bash
npm run seed
```

This creates:
- 1 admin user (`admin@openspark.dev` / `password123`)
- 5 beginner users with different tech stacks
- 1 active cycle with a brief
- 3 open teams in that cycle
- 1 upcoming hackathon
- Sample chat messages in each team

### 3. Run unit tests

```bash
npm run test           # run all unit tests
npm run test:watch     # watch mode during development
```

### 4. Develop components in Storybook

```bash
npm run storybook
```

Visit `http://localhost:6006`. Every component should have stories for:
- Default / happy path state
- Loading skeleton state
- Empty state
- Error state

### 5. Run end-to-end tests

```bash
npm run test:e2e             # headless
npm run test:e2e:ui          # with Playwright UI (good for debugging)
```

E2E tests run against the emulator, not production.

### 6. Type check before committing

```bash
npm run type-check    # tsc --noEmit
npm run lint          # ESLint
```

Husky runs both automatically on `git commit`. Fix all errors before pushing.

---

## Prompting Guide for AI Agents

When asking an AI assistant to generate code for this project, always include this context block at the start of your prompt:

```
Project: OpenSpark
Stack: Next.js 14 App Router, TypeScript strict, Tailwind CSS, shadcn/ui, Lucide React
Database: Firestore (Firebase)
Auth: Firebase Auth
Types: defined in types/index.ts (User, Cycle, Team, Submission, Hackathon, Notification)
Helpers: cn() from lib/utils, Collections from lib/collections
Testing: Firebase Emulator locally, Vitest for unit, Playwright for e2e
Rules: No 'any' types. Always handle loading and error states. Clean up onSnapshot listeners.
```

**Good prompt example:**
> "In the OpenSpark project (Next.js 14, TypeScript, Firebase), write a `useTeamChat` hook that subscribes to the `teams/{teamId}/messages` subcollection using `onSnapshot`, returns `{ messages: Message[], loading: boolean }`, and cleans up the listener on unmount. Use the `Collections` helper from `lib/collections`."

**Bad prompt example:**
> "Write a chat hook in React."

The difference in output quality is directly proportional to the context you provide.

---

## Git Workflow

```bash
# Start a new feature
git checkout -b feat/team-chat

# Commit with conventional commits format
git commit -m "feat: add real-time team chat with onSnapshot"
git commit -m "fix: clean up Firestore listener on unmount"
git commit -m "chore: add TeamChat Storybook stories"

# Push and open a PR to main — even working solo
git push origin feat/team-chat
```

**Branch naming:** `feat/`, `fix/`, `chore/`, `docs/`
**Every PR must pass:** TypeScript check + ESLint + Vitest unit tests

---

## Commands Reference

```bash
npm run dev           # start Next.js dev server
npm run build         # production build
npm run type-check    # TypeScript check without building
npm run lint          # ESLint
npm run test          # Vitest unit tests
npm run test:watch    # Vitest watch mode
npm run test:e2e      # Playwright end-to-end
npm run storybook     # Storybook component dev
npm run seed          # seed emulator with test data
npm run seed:reset    # clear and re-seed emulator

firebase emulators:start          # start all emulators
firebase deploy --only firestore  # deploy Security Rules only
firebase deploy --only functions  # deploy Cloud Functions only
```
