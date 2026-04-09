"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { format } from "date-fns";
import { Sparkles, Loader2, X, Plus, RefreshCw, StickyNote, Calendar } from "lucide-react";
import type { SelectionState, ThemeTokens, MonthConfig } from "./CalendarWidget";

interface NotesPanelProps {
  currentMonth: Date;
  selection: SelectionState;
  accent: string;
  tokens: ThemeTokens;
  config: MonthConfig;
  onNoteChange?: () => void;  // notify parent so it can refresh note indicators
}

// ── Determine storage key: per-range or per-month ─────────────────────────────
function makeKey(selection: SelectionState, monthKey: string): string {
  const { startDate: sd, endDate: ed } = selection;
  if (sd && ed) return `range:${format(sd, "yyyy-MM-dd")}_${format(ed, "yyyy-MM-dd")}`;
  return `month:${monthKey}`;
}

export default function NotesPanel({
  currentMonth, selection, accent, tokens, config, onNoteChange,
}: NotesPanelProps) {
  const monthKey    = format(currentMonth, "yyyy-MM");
  const storageKey  = makeKey(selection, monthKey);
  const isRangeMode = !!(selection.startDate && selection.endDate);

  const [notes, setNotes]      = useState("");
  const [mounted, setMounted]  = useState(false);
  const [aiState, setAiState]  = useState<"idle" | "loading" | "done" | "error">("idle");
  const [aiLines, setAiLines]  = useState<string[]>([]);
  const [expanded, setExpanded]= useState(false);
  const textareaRef            = useRef<HTMLTextAreaElement>(null);

  // Load notes from localStorage whenever key changes
  useEffect(() => {
    setMounted(true);
    setNotes(localStorage.getItem(storageKey) ?? "");
    setAiState("idle");
    setAiLines([]);
    setExpanded(false);
  }, [storageKey]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    localStorage.setItem(storageKey, val);
    onNoteChange?.();
  }, [storageKey, onNoteChange]);

  // ── Groq AI Suggestion ─────────────────────────────────────────────────────
  const fetchSuggestion = async () => {
    setAiState("loading");
    setAiLines([]);
    setExpanded(true);
    try {
      const res = await fetch("/api/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: selection.startDate ? format(selection.startDate, "MMMM d, yyyy") : null,
          endDate:   selection.endDate   ? format(selection.endDate,   "MMMM d, yyyy") : null,
          season: config.season,
          mood:   config.mood,
          monthName: format(currentMonth, "MMMM"),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const lines = (data.suggestion as string)
        .split("\n")
        .map((l: string) => l.replace(/^[•\-*]\s*/, "").trim())
        .filter(Boolean);
      setAiLines(lines);
      setAiState("done");
    } catch {
      setAiState("error");
      setExpanded(false);
    }
  };

  const insertLine = (line: string) => {
    const prefix = notes.trim() ? "\n• " : "• ";
    const newVal  = notes + prefix + line;
    setNotes(newVal);
    localStorage.setItem(storageKey, newVal);
    onNoteChange?.();
    textareaRef.current?.focus();
  };

  const dismissAI = () => { setAiState("idle"); setAiLines([]); setExpanded(false); };

  // ── Range label ────────────────────────────────────────────────────────────
  const { startDate: sd, endDate: ed } = selection;
  const dayCount = sd && ed ? Math.round((ed.getTime() - sd.getTime()) / 86400000) + 1 : null;
  const rangeLabel = sd && ed
    ? `${format(sd, "MMM d")} – ${format(ed, "MMM d, yyyy")}`
    : null;

  const charCount = notes.length;

  return (
    <div
      role="region"
      aria-label="Notes section"
      className="flex-shrink-0"
      style={{
        borderTop: `1px solid ${tokens.border}`,
        background: tokens.panel,
        transition: "background 0.4s ease",
      }}>

      {/* ── Mode indicator bar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-5 pt-3 pb-0">
        {/* Icon + label pill */}
        <span className="flex items-center gap-1.5">
          {isRangeMode
            ? <Calendar size={11} style={{ color: accent }} />
            : <StickyNote size={11} style={{ color: tokens.textMuted }} />}
          <span className="text-[9px] font-black tracking-[0.22em] uppercase"
            style={{ color: isRangeMode ? accent : tokens.textMuted }}>
            {isRangeMode ? "Range Notes" : "Monthly Notes"}
          </span>
        </span>

        {/* Range label + day count badge */}
        {rangeLabel && (
          <>
            <span className="text-[8.5px] font-mono" style={{ color: tokens.textMuted }}>·</span>
            <span className="text-[9px] font-semibold font-mono" style={{ color: accent }}>
              {rangeLabel}
            </span>
            {dayCount && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}28` }}>
                {dayCount}d
              </span>
            )}
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Char counter */}
        <span className="font-mono text-[9px]"
          style={{ color: charCount > 450 ? "rgba(239,68,68,0.7)" : tokens.textMuted }}>
          {charCount}/500
        </span>

        {/* AI Suggest button */}
        <button
          onClick={aiState === "done" ? dismissAI : fetchSuggestion}
          disabled={aiState === "loading"}
          aria-label={aiState === "done" ? "Dismiss AI suggestions" : "Get AI-powered suggestions using Groq"}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[8.5px] font-bold tracking-wider uppercase transition-all duration-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2"
          style={{
            background: aiState === "done" ? `${accent}22` : `${accent}14`,
            border: `1px solid ${accent}35`,
            color: accent,
            // @ts-expect-error — CSS custom property not in React.CSSProperties
            "--tw-ring-color": accent,
          }}
          onMouseEnter={e => { (e.currentTarget).style.background = `${accent}28`; }}
          onMouseLeave={e => { (e.currentTarget).style.background = aiState === "done" ? `${accent}22` : `${accent}14`; }}>
          {aiState === "loading"
            ? <Loader2 size={9} className="animate-spin" />
            : <Sparkles size={9} />}
          {aiState === "loading" ? "Thinking…" : aiState === "done" ? "Dismiss" : "AI Suggest"}
        </button>
      </div>

      {/* ── Textarea ──────────────────────────────────────────────────────── */}
      <div className="px-5 pt-2 pb-1">
        {mounted ? (
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={handleChange}
            placeholder={isRangeMode
              ? `Notes for ${rangeLabel ?? "this range"}…`
              : `Notes for ${format(currentMonth, "MMMM yyyy")}…`}
            maxLength={500}
            spellCheck
            rows={2}
            aria-label={isRangeMode ? "Notes for selected date range" : "Monthly notes"}
            aria-describedby="notes-footer-hint"
            className="w-full resize-none bg-transparent text-[12px] leading-relaxed focus:outline-none"
            style={{
              color: tokens.noteText,
              caretColor: accent,
              borderLeft: `2px solid ${accent}50`,
              paddingLeft: 10,
              transition: "color 0.3s, border-color 0.3s",
            }} />
        ) : (
          <div className="rounded-lg animate-pulse"
            style={{ height: 40, background: `${accent}08` }} />
        )}
      </div>

      {/* ── AI suggestion cards ────────────────────────────────────────────── */}
      {expanded && aiState === "done" && aiLines.length > 0 && (
        <div className="mx-5 mb-3 rounded-xl overflow-hidden"
          style={{ border: `1px solid ${accent}25`, background: `${accent}08` }}
          role="list" aria-label="AI suggestions">
          {/* AI panel header */}
          <div className="flex items-center justify-between px-3 py-2"
            style={{ borderBottom: `1px solid ${accent}18` }}>
            <span className="flex items-center gap-1.5 text-[8.5px] font-black tracking-[0.2em] uppercase"
              style={{ color: accent }}>
              <Sparkles size={8} /> AI Suggestions · {config.season} · {config.mood}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={fetchSuggestion} aria-label="Regenerate AI suggestions"
                className="flex items-center gap-1 text-[8px] font-bold tracking-wider uppercase transition-opacity hover:opacity-70"
                style={{ color: accent }}>
                <RefreshCw size={8} /> Regenerate
              </button>
              <button onClick={dismissAI} aria-label="Dismiss AI suggestions"
                className="transition-opacity hover:opacity-60"
                style={{ color: tokens.textMuted }}>
                <X size={12} />
              </button>
            </div>
          </div>
          {/* Suggestion lines */}
          {aiLines.map((line, i) => (
            <div key={i} role="listitem"
              className="flex items-start justify-between gap-3 px-3 py-2 group"
              style={{ borderBottom: i < aiLines.length - 1 ? `1px solid ${accent}12` : "none" }}>
              <p className="flex-1 text-[11px] leading-snug" style={{ color: tokens.noteText }}>
                <span style={{ color: `${accent}80`, marginRight: 4 }}>•</span>
                {line}
              </p>
              <button
                onClick={() => insertLine(line)}
                aria-label={`Insert: ${line}`}
                title="Insert into notes"
                className="flex-shrink-0 flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-all duration-150"
                style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}35` }}>
                <Plus size={8} /> Insert
              </button>
            </div>
          ))}
        </div>
      )}

      {aiState === "error" && (
        <p className="text-[9px] px-5 pb-2" role="alert" style={{ color: "rgba(239,68,68,0.7)" }}>
          AI suggestion unavailable — check connection and try again.
        </p>
      )}

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <p id="notes-footer-hint" className="text-right text-[8px] px-5 pb-2"
        style={{ color: tokens.textMuted, transition: "color 0.3s" }}>
        {storageKey.startsWith("range:") ? "Saved for this range" : "Saved for this month"}&nbsp;·&nbsp;auto-saved
      </p>
    </div>
  );
}
