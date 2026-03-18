"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Save, RefreshCw, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  role:    "user" | "assistant";
  content: string;
}

interface NutritionChatProps {
  userId:       string;
  initialPlan?: {
    id:       string;
    messages: ChatMessage[] | null;
    response: { content: string };
  } | null;
}

const STARTER_PROMPTS = [
  "בנה לי תפריט שבועי מלא",
  "מה אוכלים לפני ואחרי אימון?",
  "בנה לי תפריט לצמחוני",
  "כמה חלבון אני צריך ביום?",
];

// Simple markdown renderer for chat bubbles
function MessageContent({ content }: { content: string }) {
  // Detect if content has markdown (headers, bold, bullets)
  const hasMarkdown = /[#*\-|]/.test(content);
  if (!hasMarkdown) return <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>;

  return (
    <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none
      prose-headings:text-brand-accent prose-headings:font-bold prose-headings:my-1
      prose-p:my-1 prose-ul:my-1 prose-li:my-0.5
      prose-strong:text-white prose-code:text-brand-accent prose-code:bg-black/30 prose-code:px-1 prose-code:rounded
      prose-table:text-xs prose-td:py-1 prose-th:py-1
    ">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

export function NutritionChat({ userId, initialPlan }: NutritionChatProps) {
  const getInitialMessages = (): ChatMessage[] => {
    if (initialPlan?.messages && Array.isArray(initialPlan.messages)) {
      return initialPlan.messages as ChatMessage[];
    }
    return [];
  };

  const [messages, setMessages]   = useState<ChatMessage[]>(getInitialMessages);
  const [input,    setInput]      = useState("");
  const [loading,  setLoading]    = useState(false);
  const [saving,   setSaving]     = useState(false);
  const [saved,    setSaved]      = useState(false);
  const [streaming, setStreaming] = useState("");
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    setStreaming("");

    try {
      const res = await fetch("/api/nutrition/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId, messages: next }),
      });

      if (!res.ok) throw new Error("שגיאה בשרת");
      if (!res.body) throw new Error("אין stream");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   partial = "";
      let   buffer  = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            partial += parsed.delta ?? "";
            setStreaming(partial);
          } catch { /* ignore parse errors */ }
        }
      }

      const assistantMsg: ChatMessage = { role: "assistant", content: partial };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreaming("");
    } catch (err) {
      const errMsg: ChatMessage = {
        role:    "assistant",
        content: "מצטער, אירעה שגיאה. נסה שוב.",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [messages, userId, loading]);

  async function savePlan() {
    if (messages.length === 0) return;
    setSaving(true);
    try {
      // Re-send last exchange with save=true
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      if (!lastUser) return;

      await fetch("/api/nutrition/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId, messages, save: true }),
      });
      // We don't need the response — just trigger the save
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const isEmpty = messages.length === 0 && !streaming;

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-h-[800px]">
      {/* Toolbar */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-brand-border bg-brand-elevated/50 flex-shrink-0">
          <span className="text-xs text-brand-text-dim">{messages.length} הודעות</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setMessages([]); setSaved(false); }}
              className="flex items-center gap-1 text-xs text-brand-text-dim hover:text-brand-error px-2 py-1 rounded-lg hover:bg-brand-error/10 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> שיחה חדשה
            </button>
            <button
              onClick={savePlan}
              disabled={saving || saved}
              className={cn(
                "flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-lg transition-colors",
                saved
                  ? "bg-brand-accent/10 text-brand-accent"
                  : "bg-brand-surface text-brand-text-muted hover:text-white border border-brand-border hover:border-brand-accent/40",
              )}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {saved ? "נשמר!" : "שמור תפריט"}
            </button>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div>
              <div className="text-4xl mb-3">🥗</div>
              <h3 className="font-semibold text-white mb-1">יועץ התזונה האישי שלך</h3>
              <p className="text-sm text-brand-text-muted max-w-xs">
                מבוסס על נוסחאות BMR/TDEE — אקבע תפריט מותאם אישית למטרות שלך
              </p>
            </div>

            {/* Starter prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-sm text-right px-4 py-2.5 bg-brand-elevated border border-brand-border rounded-xl hover:border-brand-accent/40 hover:bg-brand-accent/5 text-brand-text-muted hover:text-white transition-all"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3",
              msg.role === "user" ? "flex-row-reverse" : "flex-row",
            )}
          >
            {/* Avatar */}
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
              msg.role === "user"
                ? "bg-brand-accent text-black"
                : "bg-brand-elevated border border-brand-border text-brand-text-muted",
            )}>
              {msg.role === "user" ? "א" : "🥗"}
            </div>

            {/* Bubble */}
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-3",
              msg.role === "user"
                ? "bg-brand-accent/10 border border-brand-accent/20 text-white rounded-tr-sm"
                : "bg-brand-elevated border border-brand-border text-white rounded-tl-sm",
            )}>
              <MessageContent content={msg.content} />
            </div>
          </div>
        ))}

        {/* Streaming bubble */}
        {streaming && (
          <div className="flex gap-3 flex-row">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs bg-brand-elevated border border-brand-border text-brand-text-muted">
              🥗
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 bg-brand-elevated border border-brand-border text-white">
              <MessageContent content={streaming} />
              <span className="inline-block w-1 h-4 bg-brand-accent animate-pulse ml-0.5 rounded" />
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {loading && !streaming && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs bg-brand-elevated border border-brand-border">
              🥗
            </div>
            <div className="bg-brand-elevated border border-brand-border rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 p-4 border-t border-brand-border bg-brand-surface">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="שאל שאלה על תזונה או בקש תפריט..."
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-brand-elevated border border-brand-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-brand-text-dim focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors max-h-32 overflow-y-auto disabled:opacity-50"
            style={{ direction: "rtl" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-brand-accent text-black rounded-xl hover:bg-brand-accent-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </div>
        <p className="text-[10px] text-brand-text-dim mt-1.5 text-center">
          Enter לשליחה · Shift+Enter לשורה חדשה
        </p>
      </div>
    </div>
  );
}
