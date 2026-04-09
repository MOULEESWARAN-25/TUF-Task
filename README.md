# 🗓️ Interactive Wall Calendar

A premium, interactive wall calendar built with **Next.js 16**, **React 19**, and **GSAP**. Features date-range selection, per-range notes, AI-powered activity suggestions via **Groq**, dark/light themes, and fully accessible keyboard navigation — all in a single-page, responsive UI.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Seasonal Hero Panel** | Stunning full-bleed photo changes per month (Aurora, Spring bloom, Summer, Autumn, etc.) with season/mood badge |
| **Date-Range Selection** | Click any two dates to define a start–end range; range highlighted with accent-coloured bar |
| **Quick Ranges** | One-click buttons for *Today*, *This Week*, *This Month* |
| **Month / Year Picker** | Dropdown pickers for fast navigation (±7 years from current year) |
| **Monthly & Range Notes** | Rich textarea notes auto-saved to `localStorage`, scoped per month **or** per selected range |
| **AI Suggestions** | Groq-powered (Llama 3) activity/event ideas for the selected period, insert with one click |
| **Holiday Markers** | Built-in dot indicators for 14 global holidays / observances |
| **Note Indicators** | Amber dot in the calendar cell for any day/month that has a saved note |
| **Dark / Light Theme** | Smooth GSAP crossfade between dark (deep indigo) and light (lavender) palettes |
| **GSAP Animations** | Card entrance, month-name letter-stagger reveal, direction-aware grid slide |
| **Accessibility** | Full ARIA roles (`grid`, `gridcell`, `listbox`, `live`), keyboard arrow navigation, skip-to-content link, `aria-live` announcements |
| **Responsive Layout** | Stacked on mobile → side-by-side hero + calendar on `lg` screens |

---

## 🏗️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org) (App Router)
- **UI Library:** [React 19](https://react.dev)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com) + `tw-animate-css`
- **Animations:** [GSAP 3](https://gsap.com)
- **Date Utilities:** [date-fns 4](https://date-fns.org)
- **Icons:** [Lucide React](https://lucide.dev)
- **Components:** [shadcn/ui](https://ui.shadcn.com) + Radix UI primitives
- **AI Backend:** [Groq API](https://groq.com) (Llama 3 model, via `/api/ai-suggest`)
- **Language:** TypeScript 5

---

## 📁 Project Structure

```
interactive-calendar/
├── app/
│   ├── api/
│   │   └── ai-suggest/
│   │       └── route.ts        # POST endpoint — calls Groq API (Llama 3)
│   ├── favicon.ico
│   ├── globals.css             # Global styles & CSS variables
│   ├── layout.tsx              # Root layout (Geist + Inter fonts, metadata)
│   └── page.tsx                # Entry page — renders <CalendarWidget />
├── components/
│   ├── calendar-widget/
│   │   ├── CalendarWidget.tsx  # Main orchestrator: state, theme, navigation
│   │   ├── DateGrid.tsx        # 7-col grid, GSAP slide, keyboard nav, holiday dots
│   │   ├── HeroSection.tsx     # Left panel: seasonal hero image + overlays
│   │   └── NotesPanel.tsx      # Notes textarea + Groq AI suggestion cards
│   └── ui/
│       └── button.tsx          # Reusable shadcn/ui Button component
├── lib/
│   └── utils.ts                # Utility helpers (cn / class merging)
├── public/
│   ├── hero_aurora.png         # Jan, Feb, Dec hero image
│   ├── hero_april.png          # Mar, Apr, May hero image
│   ├── hero_summer.png         # Jun, Jul hero image
│   ├── hero_sunset.png         # Aug hero image
│   ├── hero_autumn.png         # Sep, Oct hero image
│   ├── hero_january.png        # Nov hero image
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── .env.local                  # GROQ_API_KEY (not committed)
├── .gitignore
├── components.json             # shadcn/ui config
├── eslint.config.mjs
├── next.config.ts
├── next-env.d.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Groq API key](https://console.groq.com) (free tier available)

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd TUF-Task/interactive-calendar

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.local.example .env.local   # then edit the file
```

### Environment Variables

Create `.env.local` inside `interactive-calendar/`:

```env
GROQ_API_KEY=your_groq_api_key_here
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm run start
```

---

## 🎨 Theme System

Two complete token sets are defined in `CalendarWidget.tsx`:

| Token | Dark | Light |
|---|---|---|
| Page background | Deep indigo radial gradient | Lavender radial gradient |
| Panel | `#0c0d1a` | `#ffffff` |
| Accent | Per-month colour (see below) | Same per-month colour |

### Per-Month Accent Colours

| Month | Accent | Season · Mood |
|---|---|---|
| January | `#60a5fa` (blue) | Winter · Arctic |
| February | `#a78bfa` (violet) | Winter · Serene |
| March | `#34d399` (emerald) | Spring · Fresh |
| April | `#fb7185` (rose) | Spring · Bloom |
| May | `#4ade80` (green) | Spring · Lush |
| June | `#fbbf24` (amber) | Summer · Bright |
| July | `#22d3ee` (cyan) | Summer · Vivid |
| August | `#f59e0b` (yellow) | Summer · Golden |
| September | `#a3e635` (lime) | Autumn · Harvest |
| October | `#fb923c` (orange) | Autumn · Ember |
| November | `#818cf8` (indigo) | Autumn · Twilight |
| December | `#67e8f9` (sky) | Winter · Frost |

---

## ♿ Accessibility

- `role="grid"` / `role="gridcell"` for the date grid
- Arrow key navigation (←→↑↓), `Home`/`End` to jump to start/end of month
- `aria-live="polite"` announcements for month changes and range selections
- `aria-expanded` + `aria-haspopup="listbox"` on month/year picker buttons
- Skip-to-content link for keyboard users
- All interactive elements labelled with `aria-label`

---

## 🤖 AI Suggestions (Groq)

The **AI Suggest** button in the Notes panel calls `POST /api/ai-suggest` with:

```json
{
  "startDate": "April 9, 2026",
  "endDate": "April 15, 2026",
  "season": "Spring",
  "mood": "Bloom",
  "monthName": "April"
}
```

The route forwards the request to Groq (Llama 3) and returns bullet-point activity ideas for the period. Each suggestion can be inserted into the notes textarea with a single click.

> **Note:** AI suggestions require a valid `GROQ_API_KEY` in `.env.local`.

---

## 📜 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Create production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint across the project |

---

## 📄 License

This project was built as part of the **TUF Task** assignment. All rights reserved.
