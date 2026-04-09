"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  format, addMonths, subMonths, addYears, subYears,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  getYear, setYear, setMonth,
} from "date-fns";
import { gsap } from "gsap";
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Sun, Moon, ChevronDown,
} from "lucide-react";
import HeroSection from "./HeroSection";
import DateGrid from "./DateGrid";
import NotesPanel from "./NotesPanel";

// ── Types ─────────────────────────────────────────────────────────────────────
export type SelectionState = { startDate: Date | null; endDate: Date | null };
export type NavDirection   = "next" | "prev" | "init";
export type MonthConfig    = { accent: string; season: string; mood: string };

export type ThemeTokens = {
  page: string; cardShadow: string; panel: string;
  text: string; textMuted: string; border: string;
  btnBorder: string; btnText: string;
  dayText: string; dayOther: string; dayHover: string;
  noteText: string; heroRightFade: string; rangeAlpha: string;
};

const DARK: ThemeTokens = {
  page:          "radial-gradient(ellipse 80% 60% at 50% 40%, #12122a 0%, #060610 60%, #000 100%)",
  cardShadow:    "0 0 0 1px rgba(255,255,255,0.06), 0 40px 100px rgba(0,0,0,0.75)",
  panel:         "#0c0d1a",
  text:          "#f8fafc",
  textMuted:     "rgba(248,250,252,0.35)",
  border:        "rgba(255,255,255,0.06)",
  btnBorder:     "rgba(255,255,255,0.12)",
  btnText:       "rgba(255,255,255,0.50)",
  dayText:       "rgba(248,250,252,0.85)",
  dayOther:      "rgba(255,255,255,0.12)",
  dayHover:      "rgba(255,255,255,0.08)",
  noteText:      "rgba(248,250,252,0.72)",
  heroRightFade: "12,13,26",
  rangeAlpha:    "22",
};

const LIGHT: ThemeTokens = {
  page:          "radial-gradient(ellipse 100% 80% at 50% 30%, #eef2ff 0%, #f4f6ff 55%, #e8ecf8 100%)",
  cardShadow:    "0 0 0 1px rgba(0,0,0,0.07), 0 24px 64px rgba(0,0,0,0.11)",
  panel:         "#ffffff",
  text:          "#0f172a",
  textMuted:     "rgba(15,23,42,0.42)",
  border:        "rgba(0,0,0,0.07)",
  btnBorder:     "rgba(0,0,0,0.14)",
  btnText:       "rgba(0,0,0,0.48)",
  dayText:       "rgba(15,23,42,0.85)",
  dayOther:      "rgba(0,0,0,0.16)",
  dayHover:      "rgba(0,0,0,0.06)",
  noteText:      "rgba(15,23,42,0.78)",
  heroRightFade: "255,255,255",
  rangeAlpha:    "18",
};

// ── Season/colour map ─────────────────────────────────────────────────────────
export const MONTH_CONFIGS: Record<number, MonthConfig> = {
  0:  { accent: "#60a5fa", season: "Winter",  mood: "Arctic"   },
  1:  { accent: "#a78bfa", season: "Winter",  mood: "Serene"   },
  2:  { accent: "#34d399", season: "Spring",  mood: "Fresh"    },
  3:  { accent: "#fb7185", season: "Spring",  mood: "Bloom"    },
  4:  { accent: "#4ade80", season: "Spring",  mood: "Lush"     },
  5:  { accent: "#fbbf24", season: "Summer",  mood: "Bright"   },
  6:  { accent: "#22d3ee", season: "Summer",  mood: "Vivid"    },
  7:  { accent: "#f59e0b", season: "Summer",  mood: "Golden"   },
  8:  { accent: "#a3e635", season: "Autumn",  mood: "Harvest"  },
  9:  { accent: "#fb923c", season: "Autumn",  mood: "Ember"    },
  10: { accent: "#818cf8", season: "Autumn",  mood: "Twilight" },
  11: { accent: "#67e8f9", season: "Winter",  mood: "Frost"    },
};

export const HERO_IMAGES: Record<number, string> = {
  0: "/hero_aurora.png",  1: "/hero_aurora.png",
  2: "/hero_april.png",   3: "/hero_april.png",
  4: "/hero_april.png",   5: "/hero_summer.png",
  6: "/hero_summer.png",  7: "/hero_sunset.png",
  8: "/hero_autumn.png",  9: "/hero_autumn.png",
  10: "/hero_january.png", 11: "/hero_aurora.png",
};

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// Build year range: current ±7
function yearRange(center: number, span = 7) {
  return Array.from({ length: span * 2 + 1 }, (_, i) => center - span + i);
}

export default function CalendarWidget() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selection, setSelection]       = useState<SelectionState>({ startDate: null, endDate: null });
  const [navDirection, setNavDirection] = useState<NavDirection>("init");
  const [isDark, setIsDark]             = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const [noteVersion, setNoteVersion]   = useState(0);   // bumps when notes change
  const [notedDates, setNotedDates]     = useState<Set<string>>(new Set()); // YYYY-MM-DD strings
  const [picker, setPicker]             = useState<"none" | "year" | "month">("none");

  const cardRef  = useRef<HTMLDivElement>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const pickerRef= useRef<HTMLDivElement>(null);

  const tokens    = isDark ? DARK : LIGHT;
  const config    = MONTH_CONFIGS[currentMonth.getMonth()];
  const heroSrc   = HERO_IMAGES[currentMonth.getMonth()] ?? "/hero_aurora.png";
  const monthName = format(currentMonth, "MMMM");
  const accent    = config.accent;
  const yearNow   = getYear(currentMonth);

  // ── Gradient for month name: vivid in both themes ─────────────────────────
  // Dark: white → accent | Light: accent → accent (saturated)
  const monthGradient = isDark
    ? `linear-gradient(120deg, #f8fafc 30%, ${accent})`
    : `linear-gradient(120deg, ${accent} 10%, ${accent}bb)`;

  // ── Card entrance ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(cardRef.current,
      { y: 50, opacity: 0, scale: 0.97 },
      { y: 0, opacity: 1, scale: 1, duration: 1.1, ease: "power4.out" }
    );
  }, []);

  // ── Month letter reveal ───────────────────────────────────────────────────
  useEffect(() => {
    const chars = charRefs.current.filter(Boolean) as HTMLSpanElement[];
    gsap.fromTo(chars,
      { y: 22, opacity: 0, skewX: 10 },
      { y: 0, opacity: 1, skewX: 0, duration: 0.5, ease: "power4.out",
        stagger: 0.04, clearProps: "transform,opacity,skew" }
    );
    const id = setTimeout(() => setAnnouncement(`Showing ${monthName} ${format(currentMonth, "yyyy")}`), 0);
    return () => clearTimeout(id);
  }, [currentMonth]); // eslint-disable-line

  // ── aria-live on selection ────────────────────────────────────────────────
  useEffect(() => {
    const { startDate: sd, endDate: ed } = selection;
    const id = setTimeout(() => {
      if (sd && ed) {
        const days = Math.round((ed.getTime() - sd.getTime()) / 86400000) + 1;
        setAnnouncement(`Range: ${format(sd, "MMM d")} to ${format(ed, "MMM d")}. ${days} days.`);
      } else if (sd) {
        setAnnouncement(`${format(sd, "MMM d, yyyy")} selected. Now pick an end date.`);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [selection]);

  // ── Scan localStorage for dates with notes ────────────────────────────────
  useEffect(() => {
    const noted = new Set<string>();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const val = localStorage.getItem(key);
        if (!val?.trim()) continue;
        if (key.startsWith("range:")) {
          const m = key.match(/^range:(\d{4}-\d{2}-\d{2})/);
          if (m) noted.add(m[1]);
        } else if (key.startsWith("month:")) {
          // Mark the 1st of that month
          const ym = key.replace("month:", "");
          noted.add(`${ym}-01`);
        }
      }
    } catch { /* localStorage not available in SSR */ }
    const tid = setTimeout(() => setNotedDates(noted), 0);
    return () => clearTimeout(tid);
  }, [noteVersion, currentMonth]);

  // ── Close picker when clicking outside ───────────────────────────────────
  useEffect(() => {
    if (picker === "none") return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node))
        setPicker("none");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [picker]);

  // ── Theme toggle with GSAP fade ───────────────────────────────────────────
  const toggleTheme = () => {
    if (!cardRef.current) { setIsDark(d => !d); return; }
    gsap.to(cardRef.current, { opacity: 0.6, duration: 0.12, onComplete: () => {
      setIsDark(d => !d);
      gsap.to(cardRef.current!, { opacity: 1, duration: 0.22 });
    }});
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const handlePrev = () => { setNavDirection("prev"); setCurrentMonth(m => subMonths(m, 1)); };
  const handleNext = () => { setNavDirection("next"); setCurrentMonth(m => addMonths(m, 1)); };
  const handlePrevYear = () => { setNavDirection("prev"); setCurrentMonth(m => subYears(m, 1)); };
  const handleNextYear = () => { setNavDirection("next"); setCurrentMonth(m => addYears(m, 1)); };

  const jumpToYear = (year: number) => {
    setNavDirection("init");
    setCurrentMonth(m => setYear(m, year));
    setPicker("none");
  };
  const jumpToMonth = (monthIdx: number) => {
    setNavDirection("init");
    setCurrentMonth(m => setMonth(m, monthIdx));
    setPicker("none");
  };

  const handleDayClick = (day: Date) => {
    setSelection(prev => {
      if (!prev.startDate || (prev.startDate && prev.endDate))
        return { startDate: day, endDate: null };
      if (day < prev.startDate) return { startDate: day, endDate: prev.startDate };
      return { ...prev, endDate: day };
    });
  };
  const handleClear = () => { setSelection({ startDate: null, endDate: null }); };
  const handleNoteChange = useCallback(() => setNoteVersion(v => v + 1), []);

  // Quick ranges
  const today = new Date();
  const quickRanges = [
    { label: "Today",
      action: () => { setCurrentMonth(new Date()); setSelection({ startDate: today, endDate: today }); } },
    { label: "This Week",
      action: () => { setCurrentMonth(new Date()); setSelection({
        startDate: startOfWeek(today, { weekStartsOn: 1 }),
        endDate:   endOfWeek(today,   { weekStartsOn: 1 }),
      }); } },
    { label: "This Month",
      action: () => { setCurrentMonth(new Date()); setSelection({
        startDate: startOfMonth(today),
        endDate:   endOfMonth(today),
      }); } },
  ];

  const hasStart   = !!selection.startDate;
  const hasRange   = !!(selection.startDate && selection.endDate);
  const monthChars = monthName.split("");

  return (
    <>
      {/* Screen reader live region */}
      <div aria-live="polite" aria-atomic className="sr-only">{announcement}</div>

      {/* Skip to content */}
      <a href="#calendar-grid"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-bold"
        style={{ background: accent, color: "#fff" }}>
        Skip to calendar
      </a>

      {/* ── Page with animated ambient blobs ────────────────────────────── */}
      <div className="min-h-screen w-full flex items-center justify-center p-3 sm:p-6 lg:p-8 relative overflow-hidden"
        style={{ background: tokens.page, transition: "background 0.5s ease" }}
        role="application" aria-label="Interactive wall calendar">

        {/* Ambient background blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <div style={{
            position: "absolute", top: "-15%", left: "-5%",
            width: "55vw", height: "55vw",
            background: `radial-gradient(circle, ${accent}18 0%, transparent 68%)`,
            borderRadius: "50%", filter: "blur(72px)",
            transition: "background 0.8s ease",
          }} />
          <div style={{
            position: "absolute", bottom: "-10%", right: "-8%",
            width: "48vw", height: "48vw",
            background: isDark
              ? "radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 68%)"
              : "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 68%)",
            borderRadius: "50%", filter: "blur(80px)",
          }} />
          <div style={{
            position: "absolute", top: "40%", right: "20%",
            width: "30vw", height: "30vw",
            background: isDark
              ? `radial-gradient(circle, ${accent}0d 0%, transparent 70%)`
              : `radial-gradient(circle, ${accent}0b 0%, transparent 70%)`,
            borderRadius: "50%", filter: "blur(60px)",
            transition: "background 0.8s ease",
          }} />
        </div>

        {/* ── Main card ──────────────────────────────────────────────────── */}
        <div ref={cardRef}
          className="w-full max-w-5xl flex flex-col lg:flex-row overflow-hidden lg:h-[610px] relative z-10"
          style={{ borderRadius: 20, boxShadow: tokens.cardShadow, transition: "box-shadow 0.4s ease" }}>

          {/* LEFT: Hero image */}
          <HeroSection heroSrc={heroSrc} currentMonth={currentMonth} config={config} tokens={tokens} />

          {/* RIGHT: Calendar panel */}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative"
            style={{ background: tokens.panel, transition: "background 0.4s ease" }}>

            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="px-5 sm:px-6 pt-5 pb-3 flex-shrink-0"
              style={{ borderBottom: `1px solid ${tokens.border}` }}>

              {/* Picker portal — rendered ABOVE the flex row so overflow never clips it */}
              <div className="relative">

                {/* ── Top row: month name + nav controls ─────────────────── */}
                <div className="flex items-center justify-between mb-3 gap-2">

                  {/* Month name button */}
                  <button
                    onClick={() => setPicker(p => p === "month" ? "none" : "month")}
                    aria-label={`${monthName} — click to change month`}
                    aria-expanded={picker === "month"}
                    aria-haspopup="listbox"
                    className="flex items-baseline gap-1.5 group focus:outline-none flex-1 min-w-0">
                    <h1 id="calendar-heading"
                      className="text-2xl sm:text-[28px] font-black tracking-tight leading-none flex items-baseline">
                      {monthChars.map((ch, i) => (
                        <span key={`${currentMonth.getMonth()}-${i}`}
                          ref={el => { charRefs.current[i] = el; }}
                          style={{ display: "inline-block", willChange: "transform" }}>
                          <span style={{
                            backgroundImage: monthGradient,
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                            display: "inline-block",
                          }}>
                            {ch}
                          </span>
                        </span>
                      ))}
                    </h1>
                    <ChevronDown size={12} className="flex-shrink-0"
                      style={{
                        color: accent, opacity: 0.7,
                        transform: picker === "month" ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s",
                      }} />
                  </button>

                  {/* Navigation controls */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* « prev year */}
                    <NavBtn onClick={handlePrevYear}
                      label={`Previous year: ${format(subYears(currentMonth, 1), "yyyy")}`}
                      tokens={tokens} accent={accent} small>
                      <ChevronsLeft size={13} />
                    </NavBtn>
                    {/* ‹ prev month */}
                    <NavBtn onClick={handlePrev}
                      label={`Previous month: ${format(subMonths(currentMonth, 1), "MMMM yyyy")}`}
                      tokens={tokens} accent={accent}>
                      <ChevronLeft size={14} />
                    </NavBtn>

                    {/* Year badge — click to open year picker */}
                    <button
                      onClick={() => setPicker(p => p === "year" ? "none" : "year")}
                      aria-label={`Year ${yearNow} — click to change year`}
                      aria-expanded={picker === "year"}
                      aria-haspopup="listbox"
                      className="font-mono text-[11px] font-bold px-2 py-1 rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 flex items-center gap-0.5"
                      style={{
                        color: picker === "year" ? accent : tokens.textMuted,
                        minWidth: 50, textAlign: "center",
                        background: picker === "year" ? `${accent}18` : "transparent",
                        border: `1px solid ${picker === "year" ? accent + "44" : "transparent"}`,
                        // @ts-expect-error — CSS var
                        "--tw-ring-color": accent,
                      }}>
                      {format(currentMonth, "yyyy")}
                      <ChevronDown size={8} style={{
                        opacity: 0.5,
                        transform: picker === "year" ? "rotate(180deg)" : "rotate(0)",
                        transition: "transform 0.2s",
                      }} />
                    </button>

                    {/* next month › */}
                    <NavBtn onClick={handleNext}
                      label={`Next month: ${format(addMonths(currentMonth, 1), "MMMM yyyy")}`}
                      tokens={tokens} accent={accent}>
                      <ChevronRight size={14} />
                    </NavBtn>
                    {/* next year » */}
                    <NavBtn onClick={handleNextYear}
                      label={`Next year: ${format(addYears(currentMonth, 1), "yyyy")}`}
                      tokens={tokens} accent={accent} small>
                      <ChevronsRight size={13} />
                    </NavBtn>

                    {/* Divider */}
                    <span className="w-px h-5 mx-0.5" style={{ background: tokens.btnBorder }} aria-hidden />

                    {/* Theme toggle */}
                    <NavBtn onClick={toggleTheme}
                      label={isDark ? "Switch to light theme" : "Switch to dark theme"}
                      tokens={tokens} accent={accent}>
                      {isDark ? <Sun size={13} /> : <Moon size={13} />}
                    </NavBtn>
                  </div>
                </div>

                {/* ── MONTH PICKER — anchored top-left of header ──────────── */}
                {picker === "month" && (
                  <div ref={pickerRef}
                    role="listbox" aria-label="Choose month"
                    className="absolute z-50 rounded-2xl p-3"
                    style={{
                      top: "calc(100% + 4px)", left: 0,
                      background: tokens.panel,
                      border: `1px solid ${tokens.border}`,
                      boxShadow: isDark
                        ? "0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)"
                        : "0 16px 40px rgba(0,0,0,0.18)",
                      minWidth: 230,
                    }}>
                    <p className="text-[8px] font-black tracking-[0.25em] uppercase mb-2 px-1"
                      style={{ color: tokens.textMuted }}>
                      {yearNow} — Select Month
                    </p>
                    <div className="grid grid-cols-4 gap-1" role="group">
                      {MONTH_NAMES.map((mn, idx) => (
                        <button key={mn}
                          role="option"
                          aria-selected={idx === currentMonth.getMonth()}
                          onClick={() => jumpToMonth(idx)}
                          aria-label={`${MONTH_FULL[idx]} ${yearNow}`}
                          className="text-[11px] font-bold py-2 rounded-xl transition-all duration-150"
                          style={{
                            background: idx === currentMonth.getMonth() ? accent : "transparent",
                            color: idx === currentMonth.getMonth() ? "#fff" : tokens.dayText,
                          }}
                          onMouseEnter={e => {
                            if (idx !== currentMonth.getMonth())
                              (e.currentTarget).style.background = tokens.dayHover;
                          }}
                          onMouseLeave={e => {
                            if (idx !== currentMonth.getMonth())
                              (e.currentTarget).style.background = "transparent";
                          }}>
                          {mn}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── YEAR PICKER — anchored top-right of header ─────────── */}
                {picker === "year" && (
                  <div ref={pickerRef}
                    role="listbox" aria-label="Choose year"
                    className="absolute z-50 rounded-2xl p-3"
                    style={{
                      top: "calc(100% + 4px)", right: 0,
                      background: tokens.panel,
                      border: `1px solid ${tokens.border}`,
                      boxShadow: isDark
                        ? "0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)"
                        : "0 16px 40px rgba(0,0,0,0.18)",
                      minWidth: 210,
                    }}>
                    <p className="text-[8px] font-black tracking-[0.25em] uppercase mb-2 px-1"
                      style={{ color: tokens.textMuted }}>
                      Select Year
                    </p>
                    <div className="grid grid-cols-3 gap-1" role="group">
                      {yearRange(yearNow).map(yr => (
                        <button key={yr}
                          role="option"
                          aria-selected={yr === yearNow}
                          onClick={() => jumpToYear(yr)}
                          aria-label={`Year ${yr}`}
                          className="text-[11px] font-bold py-2 rounded-xl transition-all duration-150"
                          style={{
                            background: yr === yearNow ? accent : "transparent",
                            color: yr === yearNow ? "#fff" : tokens.dayText,
                          }}
                          onMouseEnter={e => {
                            if (yr !== yearNow) (e.currentTarget).style.background = tokens.dayHover;
                          }}
                          onMouseLeave={e => {
                            if (yr !== yearNow) (e.currentTarget).style.background = "transparent";
                          }}>
                          {yr}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>{/* /relative picker portal */}

              {/* Quick select row */}
              <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Quick date selection">
                {quickRanges.map(({ label, action }) => (
                  <QuickBtn key={label} label={label} action={action} tokens={tokens} accent={accent} />
                ))}

                {hasStart && !hasRange && (
                  <span className="text-[9px] font-semibold italic ml-1 animate-pulse" aria-live="polite"
                    style={{ color: accent }}>
                    ← pick an end date
                  </span>
                )}

                {hasRange && (
                  <button onClick={handleClear} aria-label="Clear date range"
                    className="ml-auto text-[9px] font-bold tracking-[0.15em] uppercase"
                    style={{ color: tokens.textMuted }}
                    onMouseEnter={e => (e.currentTarget.style.color = "rgba(239,68,68,0.75)")}
                    onMouseLeave={e => (e.currentTarget.style.color = tokens.textMuted)}>
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Date grid */}
            <DateGrid
              id="calendar-grid"
              aria-labelledby="calendar-heading"
              currentMonth={currentMonth}
              selection={selection}
              onDayClick={handleDayClick}
              onMonthChange={(dir: "prev" | "next") => { if (dir === "prev") handlePrev(); else handleNext(); }}
              navDirection={navDirection}
              accent={accent}
              tokens={tokens}
              notedDates={notedDates}
            />

            {/* Notes */}
            <NotesPanel
              currentMonth={currentMonth}
              selection={selection}
              accent={accent}
              tokens={tokens}
              config={config}
              onNoteChange={handleNoteChange}
            />
          </div>
        </div>
      </div>
    </>
  );
}

// ── NavBtn ────────────────────────────────────────────────────────────────────
function NavBtn({ onClick, label, tokens, accent, small, children }: {
  onClick: () => void; label: string;
  tokens: ThemeTokens; accent: string;
  small?: boolean; children: React.ReactNode;
}) {
  const sz = small ? "w-6 h-6" : "w-8 h-8";
  return (
    <button onClick={onClick} aria-label={label}
      className={`${sz} rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2`}
      style={{ border: `1px solid ${tokens.btnBorder}`, color: tokens.btnText,
        // @ts-expect-error — CSS var
        "--tw-ring-color": accent }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.color = accent;
        (e.currentTarget as HTMLElement).style.borderColor = `${accent}55`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.color = tokens.btnText;
        (e.currentTarget as HTMLElement).style.borderColor = tokens.btnBorder;
      }}>
      {children}
    </button>
  );
}

// ── QuickBtn ──────────────────────────────────────────────────────────────────
function QuickBtn({ label, action, tokens, accent }: {
  label: string; action: () => void; tokens: ThemeTokens; accent: string;
}) {
  return (
    <button onClick={action} aria-label={`Select ${label.toLowerCase()}`}
      className="text-[9px] font-bold tracking-[0.18em] uppercase px-3 py-1 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2"
      style={{ border: `1px solid ${tokens.btnBorder}`, color: tokens.btnText,
        // @ts-expect-error — CSS var
        "--tw-ring-color": accent }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.color = accent;
        (e.currentTarget as HTMLElement).style.borderColor = `${accent}55`;
        (e.currentTarget as HTMLElement).style.background = `${accent}12`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.color = tokens.btnText;
        (e.currentTarget as HTMLElement).style.borderColor = tokens.btnBorder;
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}>
      {label}
    </button>
  );
}
