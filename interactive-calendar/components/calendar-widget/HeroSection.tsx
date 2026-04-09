"use client";

import Image from "next/image";
import { format } from "date-fns";
import type { MonthConfig, ThemeTokens } from "./CalendarWidget";

interface HeroSectionProps {
  heroSrc: string;
  currentMonth: Date;
  config: MonthConfig;
  tokens: ThemeTokens;
}

export default function HeroSection({ heroSrc, currentMonth, config, tokens }: HeroSectionProps) {
  const monthNum = String(currentMonth.getMonth() + 1).padStart(2, "0");
  const rgb = tokens.heroRightFade;

  return (
    <div className="relative flex-shrink-0 overflow-hidden w-full h-72 sm:h-80 lg:w-[40%] lg:h-full"
      role="img"
      aria-label={`${config.season} season — ${config.mood}. Hero image for ${format(currentMonth, "MMMM yyyy")}.`}>

      {/* Hero image */}
      <Image src={heroSrc}
        alt=""   /* decorative – described by aria-label on parent */
        fill className="object-cover object-center"
        priority sizes="(max-width: 1024px) 100vw, 40vw"
        quality={90} />

      {/* Bottom gradient — makes text readable (strong) */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background:
          "linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, transparent 28%, rgba(0,0,0,0.08) 55%, rgba(0,0,0,0.82) 100%)" }} />

      {/* Right fade — blends into panel (desktop only) */}
      <div className="absolute inset-0 pointer-events-none hidden lg:block"
        style={{ background: `linear-gradient(to right, transparent 52%, rgba(${rgb},0.90) 100%)` }} />

      {/* Subtle accent tint */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `${config.accent}08`, mixBlendMode: "screen" }} />

      {/* Giant month number watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden>
        <span className="font-black leading-none"
          style={{ fontSize: "clamp(88px, 16vw, 172px)", color: "rgba(255,255,255,0.04)", letterSpacing: "-0.04em" }}>
          {monthNum}
        </span>
      </div>

      {/* Season / mood badge — top left with strong contrast */}
      <div className="absolute top-4 left-4" aria-hidden>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold tracking-[0.2em] uppercase"
          style={{
            background: "rgba(0,0,0,0.58)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: `1px solid ${config.accent}50`,
            color: config.accent,  /* AA-contrast: accent on dark bg */
          }}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: config.accent }} />
          {config.season}&nbsp;·&nbsp;{config.mood}
        </span>
      </div>

      {/* Month + year — bottom left, always readable with strong text-shadow */}
      <div className="absolute bottom-5 left-5 pointer-events-none" aria-hidden>
        <p className="text-[10px] font-semibold tracking-[0.32em] uppercase mb-1"
          style={{ color: "rgba(255,255,255,0.80)", textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>
          {format(currentMonth, "yyyy")}
        </p>
        <p className="text-2xl sm:text-3xl font-black tracking-tight leading-none"
          style={{ color: "#ffffff", textShadow: "0 2px 16px rgba(0,0,0,0.95)" }}>
          {format(currentMonth, "MMMM")}
        </p>
      </div>

      {/* Accent rule at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none" aria-hidden
        style={{ background: `linear-gradient(to right, ${config.accent}99, transparent)` }} />
    </div>
  );
}
