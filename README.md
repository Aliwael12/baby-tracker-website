# Baby Tracker

<div align="center">
  <img src="docs/screenshots/banner.svg" alt="Baby Tracker — Feeds · Pumps · Sleep · Diapers · Growth" width="100%"/>

  <h3>👶 A simple, mobile-first baby tracker</h3>
  <p><strong>Feeds • Pumps • Sleep • Diapers • Showers • Growth</strong></p>

  ![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
  ![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
  ![Tailwind](https://img.shields.io/badge/Tailwind-v4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)
  ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
  ![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
</div>

---

## ✨ Why this exists

Most baby-tracking apps are bloated, ad-supported, or behind a paywall. **Baby Tracker** is a tiny, fast, opinionated PWA-style web app that one or two parents can share to log everything that matters in the first year — without thinking about it at 3 a.m.

- 📱 **One-tap timers** for feeding, sleep, and pumping (with pause / resume)
- 💾 **Resilient state** — timers persist in `localStorage`, so closing the tab won't lose your session
- 👨‍👩‍👧 **Multi-caregiver** — every entry is tagged with who logged it
- 📈 **Growth, analytics & history** built in
- 🌐 **Works on any device** — phone-first, works great on desktop too

---

## 📸 Screenshots

<div align="center">
  <img src="docs/screenshots/home.svg" alt="Home — activity timer cards for feed, pump, sleep, diaper, shower" width="32%"/>
  <img src="docs/screenshots/log.svg" alt="Activity log — chronological entries with filters and live timers" width="32%"/>
  <img src="docs/screenshots/analytics.svg" alt="Analytics — weekly bar chart, donut split, daily insights" width="32%"/>
</div>

<div align="center">
  <img src="docs/screenshots/growth.svg" alt="Growth — weight & height curve vs WHO percentile, measurement form" width="32%"/>
  <img src="docs/screenshots/history.svg" alt="History — calendar view, day summary, sleep pattern heatmap" width="32%"/>
</div>

---

## 🧩 Features

| Activity | Timer | Side L/R | Extra fields |
|---|:---:|:---:|---|
| 🤱 **Feed** | ✅ pause/resume | ✅ | duration, comments |
| 🍼 **Pump** | — instant log | ✅ | comments |
| 😴 **Sleep** | ✅ pause/resume | — | duration, comments |
| 🩲 **Diaper** | — instant log | — | wet / soiled / mixed |
| 🚿 **Shower** | — instant log | — | comments |
| 📏 **Growth** | — | — | weight (kg), height (cm) |

Other goodies:

- 🕐 **Last-feed banner** at the top of home so you always know how long it's been
- ⏸️ **Pause timeline** — every pause/resume is recorded as JSON for accurate active-time math
- 👤 **Per-entry attribution** — `enteredByName` is captured automatically from the device
- ✍️ **Manual entry** for activities that already happened
- 🗑️ **Swipeable rows** to delete with one gesture
- 📅 **Calendar history** with per-day summaries and a sleep heatmap

---

## 🛠️ Tech stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router) + **React 19**
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS v4 (zero-config, custom `baby-*` palette)
- **Database:** PostgreSQL via [**Prisma**](https://www.prisma.io/) ORM
- **Hosting / DB provider:** [Supabase](https://supabase.com/) (PostgreSQL + auth-ready)
- **Auth:** `bcryptjs` (lightweight name-based identification, no email required)

The single source of truth for entries is the `ActivityLog` model in [prisma/schema.prisma](prisma/schema.prisma).

---

## 🚀 Getting started

### 1. Clone & install

```bash
git clone https://github.com/Aliwael12/baby-tracker-website.git
cd baby-tracker-website
npm install
```

### 2. Configure the database

Create a `.env.local` and set your PostgreSQL connection string (Supabase, Neon, Vercel Postgres, or local Postgres all work):

```env
PRISMA_DATABASE_URL="postgresql://user:password@host:5432/babytracker"
```

### 3. Push the schema

```bash
npx prisma db push
npx prisma generate
```

### 4. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first launch you'll be asked for a caregiver name — that name is stored in `localStorage` and stamped onto every log you save.

---

## 📁 Project structure

```
baby-tracker-website/
│
├── prisma/
│   └── schema.prisma            # ActivityLog model
│
├── src/
│   ├── app/
│   │   ├── page.tsx             # Home — timer cards
│   │   ├── log/page.tsx         # Activity log
│   │   ├── growth/page.tsx      # Weight & height tracking
│   │   ├── analytics/page.tsx   # Charts & insights
│   │   ├── history/page.tsx     # Calendar history
│   │   ├── api/                 # Route handlers (logs, growth)
│   │   ├── layout.tsx
│   │   └── globals.css          # Tailwind + baby-* palette
│   │
│   ├── components/
│   │   ├── ActivityTimerCard.tsx     # The core feed/sleep/pump card
│   │   ├── LastFeedBanner.tsx
│   │   ├── ManualEntry.tsx
│   │   ├── DailyStats.tsx
│   │   ├── LogsList.tsx
│   │   ├── SwipeableLogRow.tsx
│   │   ├── PauseTimelineIndicator.tsx
│   │   ├── NamePrompt.tsx
│   │   ├── PageHeader.tsx
│   │   └── Sidebar.tsx
│   │
│   └── lib/                     # DB client & helpers
│
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## 🎨 Design

- **Brand color:** `#ff3d72` (a soft baby rose) with a 50–600 ramp defined as Tailwind tokens (`baby-50` … `baby-600`) in [src/app/globals.css](src/app/globals.css)
- **Background:** soft pink → white → pink vertical gradient
- **Mobile-first:** 360-wide layouts, system fonts, no heavy webfont
- **Motion:** custom `pulse-soft` and `slide-up` keyframes for live indicators and modal entrance

---

## 🤝 Contributing

PRs welcome. The code is intentionally small — most components are <300 lines. If you're adding a new activity type, the rough recipe is:

1. Add the type to `ActivityType` in [src/components/ActivityTimerCard.tsx](src/components/ActivityTimerCard.tsx)
2. Add an entry to `ACTIVITY_CONFIG` (icon, label, has-timer, has-side)
3. Render it in [src/app/page.tsx](src/app/page.tsx)
4. (Optional) extend the `ActivityLog` Prisma model if you need a new column

---

## 📝 License

MIT. Have a baby, ship some code.

---

<div align="center">
  <p><strong>Baby Tracker</strong> — built for tired parents who still ship 🍼</p>
  <a href="https://github.com/Aliwael12/baby-tracker-website">⭐ Star the repo</a>
</div>
