import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const TripParamsSchema = z.object({
  days: z.number().min(1).max(5),
  budget: z.enum(["low", "mid", "high"]),
  interests: z.array(z.string()).default([]),
  travelStyle: z.enum(["family", "couple", "friends", "solo"]),
  month: z.string().optional(),
  lang: z.enum(["th", "en"]).default("th"),
});

export const generateTripPlan = createServerFn({ method: "POST" })
  .inputValidator((d) => TripParamsSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-lite-001";

    // Pull places catalog (compact form) so AI uses real places
    const { data: places, error } = await supabaseAdmin
      .from("places")
      .select("id, slug, name_th, name_en, category, district, tags, is_free");
    if (error) throw new Error(error.message);

    const placesContext = (places ?? [])
      .map(
        (p) =>
          `- id:${p.id} | ${p.name_th} (${p.name_en}) | cat:${p.category} | district:${p.district ?? "-"} | tags:${(p.tags ?? []).join(",")} | free:${p.is_free}`,
      )
      .join("\n");

    const systemPrompt = `You are an expert travel planner for Chanthaburi province, Thailand. Build a realistic ${data.days}-day itinerary using ONLY places from the provided catalog. Use the place IDs (UUIDs) exactly as given. Output language: ${data.lang === "th" ? "Thai" : "English"}.

Available places (use real ids only):
${placesContext}

Rules:
- Each day has 3-5 items spanning morning, noon, afternoon, evening
- Match user's interests, budget (${data.budget}), travel style (${data.travelStyle})
- Group nearby places together to minimize travel time
- Provide a short tip per item in the user's language
- Title the trip nicely`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:5173",
        "X-Title": process.env.OPENROUTER_SITE_NAME || "TripChan",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Plan: days=${data.days}, budget=${data.budget}, interests=${data.interests.join(", ") || "any"}, style=${data.travelStyle}, month=${data.month ?? "any"}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "build_trip",
              description: "Return the structured trip plan",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  summary: { type: "string" },
                  days: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "number" },
                        theme: { type: "string" },
                        items: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              time: {
                                type: "string",
                                enum: ["morning", "noon", "afternoon", "evening"],
                              },
                              placeId: { type: "string" },
                              activity: { type: "string" },
                              tip: { type: "string" },
                            },
                            required: ["time", "placeId", "activity", "tip"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["day", "theme", "items"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "summary", "days"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "build_trip" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("RATE_LIMIT");
      if (response.status === 402) throw new Error("PAYMENT_REQUIRED");
      const t = await response.text();
      console.error("OpenRouter error:", response.status, t);
      throw new Error("AI_ERROR");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI_NO_PLAN");

    const planArgs = JSON.parse(toolCall.function.arguments);
    return { plan: planArgs, params: data };
  });
