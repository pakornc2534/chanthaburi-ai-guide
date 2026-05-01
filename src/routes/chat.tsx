import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Send, Sparkles, RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

export const Route = createFileRoute("/chat")({
  validateSearch: z.object({ q: z.string().optional() }),
  component: ChatPage,
  head: () => ({
    meta: [
      { title: "แชทกับ AI ไกด์จันทบุรี — TripChan" },
      { name: "description", content: "Ask anything about Chanthaburi to the AI guide." },
    ],
  }),
});

function ChatPage() {
  const search = Route.useSearch();
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (search.q && !initRef.current) {
      initRef.current = true;
      void send(search.q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.q]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    const userMsg: Msg = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, lang }),
      });

      if (!resp.ok) {
        if (resp.status === 429) setError(t("errorRateLimit"));
        else if (resp.status === 402) setError(t("errorPayment"));
        else setError(t("errorGeneric"));
        setLoading(false);
        return;
      }
      if (!resp.body) {
        setError(t("errorGeneric"));
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assistantSoFar = "";
      let done = false;

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
            );
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  const examples = [t("ex1"), t("ex2"), t("ex3"), t("ex4")];

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem-5rem)] max-w-3xl flex-col px-4 pt-3 md:h-[calc(100vh-3.5rem)] md:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">{t("chatTitle")}</h1>
        {messages.length > 0 && (
          <button
            onClick={() => {
              setMessages([]);
              setError(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-secondary"
          >
            <RotateCcw className="h-3.5 w-3.5" /> {t("newChat")}
          </button>
        )}
      </div>

      <div ref={scrollerRef} className="mt-3 flex-1 overflow-y-auto rounded-2xl">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-hero text-white shadow-elevated">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold">{t("chatTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("exampleQuestions")}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {examples.map((ex) => (
                <button
                  key={ex}
                  onClick={() => send(ex)}
                  className="rounded-full border border-border bg-card px-3.5 py-2 text-xs hover:bg-secondary"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} text={m.content} />
            ))}
            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="text-xs text-muted-foreground">{t("thinking")}</div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-soft"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("chatPlaceholder")}
          className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity",
            (loading || !input.trim()) && "opacity-50",
          )}
        >
          <Send className="h-4 w-4" /> {t("send")}
        </button>
      </form>
    </div>
  );
}

function Bubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-soft",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-card border border-border",
        )}
      >
        {text}
      </div>
    </div>
  );
}
