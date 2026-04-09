"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay,
  isWithinInterval, isToday, format, getDay, getMonth, getDate,
  addDays, subDays,
} from "date-fns";
import { gsap } from "gsap";
import type { SelectionState, NavDirection, ThemeTokens } from "./CalendarWidget";

const WEEK_START = 1; // Monday-first
const WEEKDAYS   = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// ── Holiday markers ───────────────────────────────────────────────────────────
const HOLIDAYS: Record<string, string> = {
  "1-1":   "New Year's Day",
  "2-14":  "Valentine's Day",
  "3-17":  "St. Patrick's Day",
  "4-1":   "April Fools' Day",
  "4-22":  "Earth Day",
  "5-1":   "Labour Day",
  "5-4":   "Star Wars Day",
  "6-21":  "Midsummer",
  "7-4":   "Independence Day",
  "10-31": "Halloween",
  "11-11": "Veterans Day",
  "12-24": "Christmas Eve",
  "12-25": "Christmas Day",
  "12-31": "New Year's Eve",
};

interface DateGridProps {
  id?: string;
  "aria-labelledby"?: string;
  currentMonth: Date;
  selection: SelectionState;
  onDayClick: (day: Date) => void;
  onMonthChange: (direction: "prev" | "next") => void;
  navDirection: NavDirection;
  accent: string;
  tokens: ThemeTokens;
  notedDates: Set<string>;   // YYYY-MM-DD strings with stored notes
}

type DayVariant = "start" | "end" | "between" | "today" | "other-month" | "default";

function getDayVariant(day: Date, current: Date, { startDate, endDate }: SelectionState): DayVariant {
  if (!isSameMonth(day, current)) return "other-month";
  if (startDate && isSameDay(day, startDate)) return "start";
  if (endDate   && isSameDay(day, endDate))   return "end";
  if (startDate && endDate && isWithinInterval(day, { start: startDate, end: endDate })) return "between";
  if (isToday(day)) return "today";
  return "default";
}

export default function DateGrid({
  id, "aria-labelledby": aLabelledBy,
  currentMonth, selection, onDayClick, onMonthChange,
  navDirection, accent, tokens, notedDates,
}: DateGridProps) {
  const gridRef    = useRef<HTMLDivElement>(null);
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);

  // ── Direction-aware GSAP slide ─────────────────────────────────────────────
  useEffect(() => {
    if (!gridRef.current) return;
    const cells = gridRef.current.querySelectorAll("[data-day]");
    const xFrom = navDirection === "next" ? 16 : navDirection === "prev" ? -16 : 0;
    gsap.fromTo(cells,
      { x: xFrom, y: 12, opacity: 0 },
      { x: 0, y: 0, opacity: 1, duration: 0.45, ease: "power4.out",
        stagger: { each: 0.011, from: "start" }, clearProps: "transform,opacity" }
    );
    // Defer reset to avoid setState-in-effect lint warning
    const tid = setTimeout(() => setFocusedDate(null), 0);
    return () => clearTimeout(tid);
  }, [currentMonth]); // eslint-disable-line

  // Focus correct button when focusedDate changes
  useEffect(() => {
    if (!focusedDate || !gridRef.current) return;
    const key = format(focusedDate, "yyyy-MM-dd");
    const btn = gridRef.current.querySelector(`[data-date="${key}"]`) as HTMLElement | null;
    btn?.focus();
  }, [focusedDate]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: WEEK_START }),
    end:   endOfWeek(endOfMonth(currentMonth),     { weekStartsOn: WEEK_START }),
  });

  // ── Keyboard navigation handler ───────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>, day: Date) => {
    let newDate: Date | null = null;

    switch (e.key) {
      case "ArrowRight": e.preventDefault(); newDate = addDays(day, 1); break;
      case "ArrowLeft":  e.preventDefault(); newDate = subDays(day, 1); break;
      case "ArrowDown":  e.preventDefault(); newDate = addDays(day, 7); break;
      case "ArrowUp":    e.preventDefault(); newDate = subDays(day, 7); break;
      case "Home":       e.preventDefault(); newDate = startOfMonth(currentMonth); break;
      case "End":        e.preventDefault(); newDate = endOfMonth(currentMonth); break;
      case "Enter": case " ":
        e.preventDefault();
        onDayClick(day);
        return;
      case "Escape": return;
      default: return;
    }

    if (!newDate) return;
    if (!isSameMonth(newDate, currentMonth)) {
      onMonthChange(newDate > currentMonth ? "next" : "prev");
      setTimeout(() => setFocusedDate(newDate), 120);
    } else {
      setFocusedDate(newDate);
    }
  }, [currentMonth, onDayClick, onMonthChange]);

  return (
    <div id={id} className="flex-1 flex flex-col px-4 sm:px-5 py-3 overflow-hidden min-h-0">

      {/* ── Weekday headers ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 mb-1" role="row" aria-hidden>
        {WEEKDAYS.map((wd, i) => (
          <div key={wd} role="columnheader"
            className="text-center text-[9px] font-bold tracking-[0.18em] uppercase pb-2"
            style={{ color: i >= 5 ? `${accent}cc` : tokens.textMuted, transition: "color 0.3s" }}>
            {wd}
          </div>
        ))}
      </div>

      {/* ── Day cell grid ────────────────────────────────────────────────── */}
      <div ref={gridRef}
        className="grid grid-cols-7 flex-1"
        role="grid"
        aria-labelledby={aLabelledBy}
        aria-label={`Calendar grid for ${format(currentMonth, "MMMM yyyy")}`}>
        {days.map(day => {
          const variant    = getDayVariant(day, currentMonth, selection);
          const isOther    = variant === "other-month";
          const isStart    = variant === "start";
          const isEnd      = variant === "end";
          const isBetween  = variant === "between";
          const isTodayDay = variant === "today";
          const weekend    = getDay(day) === 0 || getDay(day) === 6;

          const hKey    = `${getMonth(day) + 1}-${getDate(day)}`;
          const holiday = !isOther ? HOLIDAYS[hKey] : undefined;
          const isFocused = focusedDate ? isSameDay(day, focusedDate) : false;
          const hasNote = !isOther && notedDates.has(format(day, "yyyy-MM-dd"));

          // ARIA label for each cell
          let ariaLabel = format(day, "EEEE, MMMM d, yyyy");
          if (isTodayDay)  ariaLabel += ", today";
          if (holiday)     ariaLabel += `, ${holiday}`;
          if (hasNote)     ariaLabel += ", has notes";
          if (isStart)     ariaLabel += ", selected as start date";
          if (isEnd)       ariaLabel += ", selected as end date";
          if (isBetween)   ariaLabel += ", in selected range";
          if (isOther)     ariaLabel += " (different month)";

          // Text colour
          let color: string;
          if (isStart || isEnd) color = "#fff";
          else if (isBetween)   color = accent;
          else if (isTodayDay)  color = accent;
          else if (weekend)     color = `${accent}cc`;
          else if (isOther)     color = tokens.dayOther;
          else                  color = tokens.dayText;

          return (
            <div key={day.toISOString()}
              role="gridcell"
              aria-selected={isStart || isEnd || isBetween || undefined}
              aria-disabled={isOther || undefined}
              className="relative flex items-center justify-center"
              style={{ height: 36 }}>

              {/* Range bar */}
              {isBetween && (
                <span aria-hidden className="absolute inset-y-1 inset-x-0"
                  style={{ background: `${accent}${tokens.rangeAlpha}` }} />
              )}
              {isStart && (
                <span aria-hidden className="absolute inset-y-1 left-1/2 right-0"
                  style={{ background: `${accent}${tokens.rangeAlpha}` }} />
              )}
              {isEnd && (
                <span aria-hidden className="absolute inset-y-1 left-0 right-1/2"
                  style={{ background: `${accent}${tokens.rangeAlpha}` }} />
              )}

              {/* Day button */}
              <button
                data-day
                data-date={format(day, "yyyy-MM-dd")}
                aria-label={ariaLabel}
                aria-current={isTodayDay ? "date" : undefined}
                onClick={() => !isOther && onDayClick(day)}
                onKeyDown={e => !isOther && handleKeyDown(e, day)}
                onFocus={() => setFocusedDate(day)}
                disabled={isOther}
                tabIndex={isOther ? -1 : (isFocused || (!focusedDate && isSameDay(day, new Date()) && isSameMonth(day, currentMonth))) ? 0 : -1}
                className="relative z-10 flex items-center justify-center rounded-full font-tabular text-[12px] font-medium select-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                style={{
                  width: 30, height: 30, color,
                  fontWeight: isStart || isEnd || isTodayDay ? 700 : 500,
                  background: isStart || isEnd ? accent : "transparent",
                  boxShadow: isStart || isEnd ? `0 2px 12px ${accent}55` : "none",
                  transition: "color 0.3s, background 0.3s",
                  // @ts-expect-error — CSS custom property not in React.CSSProperties
                  "--tw-ring-color": accent,
                  "--tw-ring-offset-color": tokens.panel,
                  cursor: isOther ? "default" : "pointer",
                }}
                onMouseEnter={e => {
                  if (!isStart && !isEnd && !isOther) {
                    (e.currentTarget).style.background = tokens.dayHover;
                    (e.currentTarget).style.transform  = "scale(1.12)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isStart && !isEnd) {
                    (e.currentTarget).style.background = isStart || isEnd ? accent : "transparent";
                    (e.currentTarget).style.transform  = "scale(1)";
                  }
                }}>
                {format(day, "d")}
              </button>

              {/* Today dot */}
              {isTodayDay && !isStart && !isEnd && (
                <span aria-hidden className="absolute rounded-full"
                  style={{ bottom: 2, left: "50%", transform: "translateX(-50%)",
                    width: 3, height: 3, background: accent }} />
              )}

              {/* Holiday dot — accent dot above number */}
              {holiday && !isStart && !isEnd && (
                <span aria-hidden
                  className="absolute rounded-full"
                  style={{ top: 2, left: "50%", transform: "translateX(-50%)",
                    width: 3, height: 3, background: accent, opacity: 0.7 }} />
              )}

              {/* Note indicator — amber square top-right corner */}
              {hasNote && !isStart && !isEnd && (
                <span aria-hidden
                  className="absolute rounded-sm z-20"
                  title="Has notes"
                  style={{
                    top: 3, right: 3,
                    width: 4, height: 4,
                    background: "#f59e0b",
                    boxShadow: "0 0 4px rgba(245,158,11,0.6)",
                  }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
