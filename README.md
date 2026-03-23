# Projects Alpha
**AI-Powered Project Execution Software**
*Built for Lean Six Sigma Experts (LSSE) — March 2026*

---

## Live App
**https://projects-alpha-umber.vercel.app**

## Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Row-Level Security)
- **Hosting:** Vercel (auto-deploy on push to main)

---

## Current Status — Phase 1 Complete ✅

All 7 core modules are built and live with full demo data:

| Module | Route | Description |
|--------|-------|-------------|
| Dashboard | `/dashboard` | Portfolio snapshot + activity feed |
| Portfolio | `/portfolio` | Prioritization matrix — score, rank, and track active projects |
| Intake Queue | `/intake` | Submit and review/approve project requests |
| Workspace | `/workspace` | Project charter editor with DMAIC phase tabs |
| Execution | `/execution` | Kanban task board with phase and status filters |
| Templates | `/templates` | Pre-built project type templates |
| Activity Feed | `/activity` | Chronological event feed with filtering |
| Settings | `/settings` | Company, user profile, and team management |

---

## Project Structure

```
src/
├── pages/
│   ├── auth/           Login.jsx, Register.jsx
│   ├── dashboard/      Dashboard.jsx
│   ├── portfolio/      Portfolio.jsx
│   ├── intake/         IntakeQueue.jsx, IntakeForm.jsx, IntakeReview.jsx
│   ├── workspace/      Workspace.jsx
│   ├── execution/      Execution.jsx
│   ├── templates/      Templates.jsx
│   ├── activity/       ActivityFeed.jsx
│   ├── charter/        Charter.jsx
│   └── settings/       Settings.jsx
├── components/
│   ├── layout/         Sidebar.jsx, Header.jsx, Layout.jsx
│   ├── auth/           ProtectedRoute.jsx
│   └── ui/             Shared UI components
├── lib/
│   └── supabase.js     Supabase client
└── App.jsx             Route definitions

supabase/
├── migrations/
│   ├── 001_initial_schema.sql
│   └── 002_tasks_and_notes.sql
└── seed_demo_data.sql
```

---

## Environment Variables

```
VITE_SUPABASE_URL=https://hlrsegapueqyghqwysgv.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

---

## Database

Supabase project ref: `hlrsegapueqyghqwysgv`

Tables: `profiles`, `companies`, `projects`, `intake_requests`, `tasks`, `project_notes`, `activity_logs`

Demo data: 10 projects · 13 intake requests · 59 tasks · 10 charter notes · 29 activity logs

---

## Next Up

1. **UI & flow refinements** — polish current modules based on JP's feedback
2. **AI Project Planner** — type a description, get a full charter + task plan
3. **AI Coach** — per-project conversational assistant (Phase 1 AI)
4. **AI Risk Radar** — proactive project health monitoring (Phase 2)
5. **AI Status Narrator** — auto-generated status reports (Phase 2)

See `../Projects Alpha - Session Status.md` for full session handoff notes.
See `../Projects Alpha - Product Requirements Document.docx` for the full PRD.
