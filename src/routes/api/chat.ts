import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const messages = body.messages as { role: string; content: string }[];
          const lang = (body.lang as string) === "en" ? "en" : "th";

          const apiKey = process.env.OPENROUTER_API_KEY;
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY missing" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
          const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-lite-001";

          // Inject places catalog into the system prompt
          const { data: places } = await supabaseAdmin
            .from("places")
            .select("name_th, name_en, category, district, description_th, description_en, tags");

          const placesCtx = (places ?? [])
            .map(
              (p) =>
                lang === "th"
                  ? `- ${p.name_th} [${p.category}] อ.${p.district ?? "-"} — ${p.description_th}`
                  : `- ${p.name_en} [${p.category}] ${p.district ?? "-"} — ${p.description_en}`,
            )
            .join("\n");

          const systemPrompt =
            lang === "th"
              ? `คุณคือไกด์นำเที่ยวจังหวัดจันทบุรี ตอบเป็นภาษาไทยอย่างเป็นมิตร ใช้ markdown ตอบสั้น กระชับ มีประโยชน์ แนะนำเฉพาะสถานที่จากรายการด้านล่างเท่านั้น และอ้างชื่อสถานที่ให้ตรง:\n\n${placesCtx}`
              : `You are a friendly local guide for Chanthaburi province, Thailand. Reply in English using markdown. Be concise and helpful. Only recommend places from the catalog below and use their exact names:\n\n${placesCtx}`;

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

          return new Response(aiResp.body, {
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
