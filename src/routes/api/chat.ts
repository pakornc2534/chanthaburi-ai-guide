import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

type Place = Database["public"]["Tables"]["places"]["Row"];
type Lang = "th" | "en";

type AgentResult = {
  intent: "places" | "chat";
  placeIds: string[];
  followups: string[];
};

async function agenticPreCall({
  apiKey,
  model,
  lang,
  userQuery,
  allPlaces,
}: {
  apiKey: string;
  model: string;
  lang: Lang;
  userQuery: string;
  allPlaces: Place[];
}): Promise<AgentResult> {
  const empty: AgentResult = { intent: "chat", placeIds: [], followups: [] };
  if (!userQuery.trim() || allPlaces.length === 0) return empty;

  const catalogText = allPlaces
    .map((p) => {
      const name = lang === "th" ? p.name_th : p.name_en;
      const tags = (p.tags ?? []).filter(Boolean).join(",");
      return `[${p.id}] ${name} | cat:${p.category} | dist:${p.district ?? "-"}${tags ? ` | tags:${tags}` : ""}`;
    })
    .join("\n");

  const systemPrompt =
    lang === "th"
      ? `คุณเป็น router ของแชทท่องเที่ยวจังหวัดจันทบุรี (TripChan) งานของคุณคือ:
1. จำแนกเจตนาของคำถามล่าสุด:
   - "places" = ผู้ใช้ขอคำแนะนำสถานที่/ที่กิน/คาเฟ่/กิจกรรม/แผนทริป (ต้องโชว์ place cards)
   - "chat"   = ทักทาย ขอบคุณ ถามอากาศ ถามความเห็น/ทั่วไป ที่ไม่ต้องแนะนำสถานที่
   - ถ้าก้ำกึ่งและเป็นเชิงท่องเที่ยว ให้เอน "places"
2. ถ้า intent="places" เลือก place IDs จาก catalog 1-4 รายการ เรียงจากตรงเจตนามากสุด ใช้ id จริงเท่านั้น (ห้ามแต่ง)
   ถ้า intent="chat" ให้ placeIds เป็น []
3. สร้าง followups 0-3 ข้อ — คำถามต่อยอดที่ผู้ใช้น่าจะอยากถามต่อ
   - ภาษาไทย จบด้วย "?" ไม่เกิน 35 ตัวอักษร
   - หลากหลายแง่มุม (เวลา/ราคา/ที่ใกล้เคียง/หมวดอื่น)
   - ห้ามซ้ำคำถามล่าสุด
   - ถ้า intent="chat" ใส่ chips เชิงนำทาง เช่น "ที่เที่ยวยอดนิยม?" "อยากไปทะเล?" ก็ได้

ตอบผ่าน tool ชื่อ route_query เท่านั้น`
      : `You are the router for a Chanthaburi travel chat (TripChan). Your job:
1. Classify the latest user message intent:
   - "places" = user asks for places/food/cafés/activities/trip plans (show place cards)
   - "chat"   = greetings, thanks, weather, opinions, general questions (no cards)
   - If ambiguous and travel-leaning, prefer "places"
2. If intent="places", pick 1-4 place IDs from the catalog ranked by relevance. Use real IDs only (no fabrication).
   If intent="chat", placeIds must be [].
3. Generate 0-3 followups — short follow-up questions the user might ask next:
   - English, end with "?", under 50 characters
   - Vary the angle (hours/price/nearby/related category)
   - Do not repeat the user's question
   - For intent="chat" you may add navigational chips like "Top places to visit?" or "Beaches?"

Respond ONLY via the route_query tool.`;

  const userPrompt =
    lang === "th"
      ? `คำถามล่าสุดของผู้ใช้: "${userQuery}"\n\nCatalog (id | ชื่อ | หมวด | อำเภอ | tags):\n${catalogText}`
      : `User's latest message: "${userQuery}"\n\nCatalog (id | name | category | district | tags):\n${catalogText}`;

  try {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "route_query",
              description: "Classify intent, pick relevant place IDs, and suggest follow-ups",
              parameters: {
                type: "object",
                properties: {
                  intent: {
                    type: "string",
                    enum: ["places", "chat"],
                  },
                  placeIds: {
                    type: "array",
                    items: { type: "string" },
                    maxItems: 4,
                  },
                  followups: {
                    type: "array",
                    items: { type: "string" },
                    maxItems: 3,
                  },
                },
                required: ["intent", "placeIds", "followups"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "route_query" } },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      console.error("agentic pre-call non-ok:", resp.status);
      return empty;
    }

    const result = await resp.json();
    const argStr = result.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argStr) return empty;

    const parsed = JSON.parse(argStr) as {
      intent?: unknown;
      placeIds?: unknown;
      followups?: unknown;
    };

    const intent: "places" | "chat" = parsed.intent === "places" ? "places" : "chat";
    const validIds = new Set(allPlaces.map((p) => p.id));
    const placeIds =
      intent === "places" && Array.isArray(parsed.placeIds)
        ? parsed.placeIds
            .filter((x): x is string => typeof x === "string" && validIds.has(x))
            .slice(0, 4)
        : [];
    const followups = Array.isArray(parsed.followups)
      ? parsed.followups
          .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
          .map((q) => q.trim())
          .slice(0, 3)
      : [];

    return { intent, placeIds, followups };
  } catch (err) {
    console.error("agentic pre-call error:", err);
    return empty;
  }
}

function pickPlacesByIds(ids: string[], allPlaces: Place[]): Place[] {
  const byId = new Map(allPlaces.map((p) => [p.id, p]));
  const out: Place[] = [];
  for (const id of ids) {
    const p = byId.get(id);
    if (p) out.push(p);
  }
  return out;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const messages = body.messages as { role: string; content: string }[];
          const lang: Lang = (body.lang as string) === "en" ? "en" : "th";

          const apiKey = process.env.OPENROUTER_API_KEY;
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY missing" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
          const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-lite-001";

          const { data: places } = await supabaseAdmin.from("places").select("*");
          const allPlaces = (places ?? []) as Place[];

          const lastUser = [...messages].reverse().find((m) => m.role === "user");

          // Agentic pre-call: classify intent, pick place IDs, generate followups.
          // Runs in parallel with the main streaming call below.
          const agentPromise: Promise<AgentResult> = lastUser
            ? agenticPreCall({
                apiKey,
                model,
                lang,
                userQuery: lastUser.content,
                allPlaces,
              })
            : Promise.resolve({ intent: "chat", placeIds: [], followups: [] });

          const placesCtx = allPlaces
            .map((p) =>
              lang === "th"
                ? `- ${p.name_th} [${p.category}] อ.${p.district ?? "-"} — ${p.description_th}`
                : `- ${p.name_en} [${p.category}] ${p.district ?? "-"} — ${p.description_en}`,
            )
            .join("\n");

          const systemPrompt =
            lang === "th"
              ? `คุณคือไกด์ท้องถิ่นจังหวัดจันทบุรีที่เป็นมิตร ตอบเป็นภาษาไทยด้วย markdown สั้น กระชับ มีประโยชน์
- ถ้าผู้ใช้ขอคำแนะนำสถานที่/ที่กิน/คาเฟ่/กิจกรรม ให้แนะนำเฉพาะจาก catalog ด้านล่างเท่านั้น และอ้างชื่อให้ตรง
- ถ้าผู้ใช้ทักทาย ขอบคุณ ถามอากาศ หรือคุยทั่วไปที่ไม่ใช่การขอแนะนำสถานที่ ให้ตอบสนทนาอย่างเป็นธรรมชาติโดยไม่ต้องโชว์รายการสถานที่
- ถ้าไม่แน่ใจให้เอนไปทางตอบสั้นและถามกลับเพื่อสำรวจความสนใจ

Catalog:
${placesCtx}`
              : `You are a friendly Chanthaburi local guide. Reply in English with concise, useful markdown.
- If the user asks for places/food/cafés/activities, recommend ONLY from the catalog below using exact names
- If the user greets, thanks, asks about weather, or makes general conversation, reply naturally without forcing a place list
- When unsure, lean towards a brief reply and a follow-up question

Catalog:
${placesCtx}`;

          const aiResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:5173",
              "X-Title": process.env.OPENROUTER_SITE_NAME || "TripChan",
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "system", content: systemPrompt }, ...messages],
              stream: true,
            }),
          });

          if (!aiResp.ok) {
            if (aiResp.status === 429) {
              return new Response(JSON.stringify({ error: "rate_limit" }), {
                status: 429,
                headers: { "Content-Type": "application/json" },
              });
            }
            if (aiResp.status === 402) {
              return new Response(JSON.stringify({ error: "payment_required" }), {
                status: 402,
                headers: { "Content-Type": "application/json" },
              });
            }
            const t = await aiResp.text();
            console.error("OpenRouter error:", aiResp.status, t);
            return new Response(JSON.stringify({ error: "ai_error" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          const upstream = aiResp.body;
          if (!upstream) {
            return new Response(JSON.stringify({ error: "ai_no_body" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          const encoder = new TextEncoder();
          const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
              // Emit places as soon as the agentic pre-call resolves (in parallel with stream).
              let agentEmitted = false;
              const emitAgentEvents = async () => {
                if (agentEmitted) return;
                agentEmitted = true;
                try {
                  const agent = await agentPromise;
                  if (agent.intent === "places" && agent.placeIds.length > 0) {
                    const topPlaces = pickPlacesByIds(agent.placeIds, allPlaces);
                    if (topPlaces.length > 0) {
                      controller.enqueue(
                        encoder.encode(
                          `event: places\ndata: ${JSON.stringify({ places: topPlaces })}\n\n`,
                        ),
                      );
                    }
                  }
                  if (agent.followups.length > 0) {
                    controller.enqueue(
                      encoder.encode(
                        `event: followups\ndata: ${JSON.stringify(agent.followups)}\n\n`,
                      ),
                    );
                  }
                } catch (err) {
                  console.error("agent emit error:", err);
                }
              };
              const agentEmitTask = emitAgentEvents();

              // Pump main streaming text.
              const reader = upstream.getReader();
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  if (value) controller.enqueue(value);
                }
              } catch (err) {
                console.error("upstream stream error:", err);
              }

              // Make sure agent events are emitted before closing the stream.
              await agentEmitTask;
              controller.close();
            },
          });

          return new Response(stream, {
            headers: { "Content-Type": "text/event-stream" },
          });
        } catch (e) {
          console.error("chat route error:", e);
          return new Response(JSON.stringify({ error: "server_error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
