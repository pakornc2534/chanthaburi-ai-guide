import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Send, Sparkles, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useI18n, examplePool } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PlaceCard } from "@/components/PlaceCard";
import type { Database } from "@/integrations/supabase/types";

type Place = Database["public"]["Tables"]["places"]["Row"];

type Msg = {
  role: "user" | "assistant";
  content: string;
  places?: Place[];
  followups?: string[];
};

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
      let assistantStarted = false;
      let currentEvent: string = "message";

      const ensureAssistant = (patch: Partial<Msg> = {}) => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, ...patch } : m));
          }
          return [...prev, { role: "assistant", content: "", ...patch }];
        });
      };

      const upsertText = (chunk: string) => {
        assistantSoFar += chunk;
        if (!assistantStarted) {
          assistantStarted = true;
          ensureAssistant({ content: assistantSoFar });
        } else {
          setMessages((prev) =>
            prev.map((m, i) =>
              i === prev.length - 1 && m.role === "assistant"
                ? { ...m, content: assistantSoFar }
                : m,
            ),
          );
        }
      };

      while (true) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);

          if (line === "") {
            currentEvent = "message";
            continue;
          }
          if (line.startsWith(":")) continue;

          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
            continue;
          }
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();

          if (currentEvent === "places") {
            try {
              const parsed = JSON.parse(payload) as { places?: Place[] };
              ensureAssistant({ places: parsed.places ?? [] });
            } catch {
              buf = line + "\n" + buf;
              break;
            }
            continue;
          }

          if (currentEvent === "followups") {
            try {
              const parsed = JSON.parse(payload) as unknown;
              if (Array.isArray(parsed)) {
                const arr = parsed.filter(
                  (q): q is string => typeof q === "string" && q.trim().length > 0,
                );
                if (arr.length > 0) ensureAssistant({ followups: arr });
              }
            } catch {
              buf = line + "\n" + buf;
              break;
            }
            continue;
          }

          if (payload === "[DONE]") {
            // OpenRouter end marker; server may still emit trailing
            // event: followups after this. Keep reading until the stream actually closes.
            continue;
          }
          try {
            const parsed = JSON.parse(payload);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsertText(c);
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

  const examples = useMemo(() => examplePool(lang), [lang]);

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
            <ExamplesCarousel items={examples} onPick={send} />
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              return (
                <div key={i} className="space-y-2">
                  {m.role === "assistant" && m.places && m.places.length > 0 && (
                    <PlacesStrip places={m.places} title={t("recommendedPlaces")} />
                  )}
                  <Bubble role={m.role} text={m.content} />
                  {m.role === "assistant" &&
                    m.followups &&
                    m.followups.length > 0 &&
                    !(isLast && loading) && (
                      <FollowupChips
                        title={t("followupTitle")}
                        items={m.followups}
                        onPick={(q) => send(q)}
                        disabled={loading}
                      />
                    )}
                </div>
              );
            })}
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
  if (!text && !isUser) return null;
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-soft",
          isUser
            ? "whitespace-pre-wrap rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-border bg-card",
        )}
      >
        {isUser ? text : <Markdown text={text} />}
      </div>
    </div>
  );
}

function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-2 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          h1: ({ children }) => (
            <h1 className="font-display text-base font-bold leading-snug">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-display text-sm font-semibold leading-snug">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-display text-sm font-semibold leading-snug">{children}</h3>
          ),
          ul: ({ children }) => <ul className="ml-5 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/40 pl-3 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-border" />,
          code: ({ className, children, ...props }) => (
            <code
              className={cn("rounded bg-secondary px-1 py-0.5 font-mono text-[0.85em]", className)}
              {...props}
            >
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg bg-secondary p-2.5 text-xs [&>code]:bg-transparent [&>code]:p-0">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-secondary">{children}</thead>,
          th: ({ children }) => (
            <th className="border border-border px-2 py-1 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function PlacesStrip({ places, title }: { places: Place[]; title: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
        {places.map((p) => (
          <div key={p.id} className="w-[200px] shrink-0 snap-start md:w-[220px]">
            <PlaceCard place={p} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ExamplesCarousel({
  items,
  onPick,
  perPage = 4,
  intervalMs = 3000,
}: {
  items: string[];
  onPick: (q: string) => void;
  perPage?: number;
  intervalMs?: number;
}) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const [pageIdx, setPageIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const visible = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < perPage; i++) {
      const idx = (pageIdx * perPage + i) % Math.max(items.length, 1);
      if (items[idx]) out.push(items[idx]);
    }
    return out;
  }, [items, pageIdx, perPage]);

  // Single setTimeout that resets whenever pageIdx changes (auto or manual click).
  useEffect(() => {
    if (paused || totalPages <= 1) return;
    const id = window.setTimeout(() => {
      setPageIdx((p) => (p + 1) % totalPages);
    }, intervalMs);
    return () => window.clearTimeout(id);
  }, [paused, totalPages, intervalMs, pageIdx]);

  const next = () => setPageIdx((p) => (p + 1) % totalPages);
  const prev = () => setPageIdx((p) => (p - 1 + totalPages) % totalPages);

  return (
    <div
      className="flex flex-col items-center gap-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="flex flex-wrap justify-center gap-2">
        {visible.map((q, i) => (
          <button
            key={`${pageIdx}-${i}-${q}`}
            type="button"
            onClick={() => onPick(q)}
            className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both rounded-full border border-border bg-card px-3.5 py-2 text-xs shadow-soft transition-colors duration-300 hover:bg-secondary"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            {q}
          </button>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous"
            className="grid h-7 w-7 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  i === pageIdx ? "bg-primary" : "bg-border",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            aria-label="Next"
            className="grid h-7 w-7 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function FollowupChips({
  title,
  items,
  onPick,
  disabled,
}: {
  title: string;
  items: string[];
  onPick: (q: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            disabled={disabled}
            className={cn(
              "rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-secondary",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
