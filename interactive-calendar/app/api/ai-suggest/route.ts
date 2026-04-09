import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(req: NextRequest) {
  try {
    const { startDate, endDate, season, mood, monthName } = await req.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const prompt = endDate
      ? `You are a creative calendar and productivity assistant. The user has selected the date range: ${startDate} to ${endDate} (${season} season, ${mood} mood, month: ${monthName}).

Generate exactly 3 short, practical and inspiring suggestions for this period. Each suggestion should:
- Be a single sentence (max 15 words)
- Be specific and actionable
- Match the season/mood theme
- Be varied (e.g., one work-related, one personal/wellness, one creative)

Format: Return ONLY the 3 suggestions as a bulleted list using • symbol. No introduction, no extra text.`
      : `Generate 3 quick ideas for ${monthName} (${season} · ${mood}). Short, inspiring, one sentence each. Use • bullets.`;

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You are a concise, creative calendar assistant. Always respond with exactly 3 bullet points using • symbol. No extra text or intro.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 200,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Groq error:", err);
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const data = await response.json();
    const suggestion =
      data.choices?.[0]?.message?.content?.trim() ?? "• Plan something amazing for this period.";

    return NextResponse.json({ suggestion });
  } catch (err) {
    console.error("AI suggest error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
