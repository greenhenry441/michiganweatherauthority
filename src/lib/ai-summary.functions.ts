import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  city: z.string().min(1).max(80),
  county: z.string().min(1).max(80),
  shortForecast: z.string().max(200),
  detailed: z.string().max(2000),
  tempF: z.number(),
  windSpeed: z.string().max(40),
  precipPct: z.number().nullable(),
  aqi: z.number().nullable(),
  uv: z.number().nullable(),
});

export const summarizeForecast = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const prompt = `You are MWA's friendly local meteorologist for ${data.city}, ${data.county} County, Michigan.
Today: ${data.tempF}°F, ${data.shortForecast}. Wind ${data.windSpeed}. Precip ${data.precipPct ?? 0}%. AQI ${data.aqi ?? "n/a"}. UV ${data.uv ?? "n/a"}.
Detailed forecast: ${data.detailed}

Write a punchy 2–3 sentence vibe summary, then list exactly 3 recommended activities for today as a JSON array. Reply ONLY with strict JSON:
{"summary": "...", "activities": [{"title":"...","why":"..."},{"title":"...","why":"..."},{"title":"...","why":"..."}], "warnings": "short safety note or empty string"}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (r.status === 429) throw new Error("AI is rate-limited, try again in a minute");
    if (r.status === 402) throw new Error("AI credits exhausted");
    if (!r.ok) throw new Error(`AI error ${r.status}`);
    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content ?? "{}";
    try {
      const parsed = JSON.parse(text);
      return parsed as { summary: string; activities: { title: string; why: string }[]; warnings: string };
    } catch {
      return { summary: text, activities: [], warnings: "" };
    }
  });
