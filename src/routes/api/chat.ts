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

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

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

          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
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
            console.error("AI gateway error:", aiResp.status, t);
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
