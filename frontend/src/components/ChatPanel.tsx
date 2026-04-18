import { useEffect, useRef, useState } from "react";
import {
  Send,
  Sparkles,
  User,
  Trash2,
  Loader2,
  FileText,
  Calculator,
  Shield,
  Calendar,
  Mail,
  Phone,
  RefreshCw,
  Sliders,
  PiggyBank,
  TrendingUp,
  Check,
  ArrowRight,
} from "lucide-react";
import { type Message, type ChatResponse, type ChatAction } from "../api";
import ChartRenderer from "./ChartRenderer";

interface ChatMessage extends Message {
  id: string;
  chart?: ChatResponse["chart"];
  actions?: ChatAction[] | null;
  toolCalls?: string[];
  error?: boolean;
}

interface Props {
  clientId: string | null;
  clientName?: string;
  onSend: (messages: Message[], clientId: string | null) => Promise<ChatResponse>;
  onBrief: (clientId: string) => Promise<ChatResponse>;
  seed?: { text: string; nonce: number } | null;
}

const SUGGESTIONS = [
  "A-t-il gagné de l'argent l'année dernière ?",
  "Quels sont les points clés à aborder ?",
  "Quel produit lui proposer ?",
  "La situation a-t-elle changé récemment ?",
];

export default function ChatPanel({ clientId, clientName, onSend, onBrief, seed }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastSeedNonce = useRef<number | null>(null);

  useEffect(() => {
    setMessages([]);
  }, [clientId]);

  useEffect(() => {
    if (!seed || seed.nonce === lastSeedNonce.current) return;
    lastSeedNonce.current = seed.nonce;
    void sendMessage(seed.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?.nonce]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading || !clientId) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const apiMsgs: Message[] = updated.map((m) => ({ role: m.role, content: m.content }));
      const res = await onSend(apiMsgs, clientId);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.text,
          chart: res.chart ?? undefined,
          actions: res.actions ?? null,
          toolCalls: res.tool_calls_made,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: err instanceof Error ? err.message : "Une erreur est survenue.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const runBrief = async () => {
    if (!clientId || loading) return;
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: "Préparer la fiche de réunion",
      },
    ]);
    try {
      const res = await onBrief(clientId);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.text,
          chart: res.chart ?? undefined,
          actions: res.actions ?? null,
          toolCalls: res.tool_calls_made,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: err instanceof Error ? err.message : "Erreur lors de la génération",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <aside className="flex flex-col h-full bg-white border-l border-slate-200">
      {/* Gradient header */}
      <header
        className="relative px-5 py-4 flex items-center gap-3 text-white overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #009E60 0%, #0EA5E9 50%, #7C3AED 100%)",
        }}
      >
        <div className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-8 w-32 h-32 rounded-full bg-violet-300/20 blur-2xl" />
        <div className="relative w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="relative flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold leading-tight">Assistant IA</h2>
            <span className="text-[9px] uppercase tracking-wider font-bold bg-white/20 ring-1 ring-white/30 px-1.5 py-0.5 rounded-full">
              Mistral
            </span>
          </div>
          <p className="text-xs text-white/85 truncate">
            {clientName ? `Analyse ${clientName}` : "Sélectionnez un client"}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="relative w-8 h-8 rounded-lg hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center transition-colors"
            title="Effacer la conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </header>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-4"
        style={{
          background:
            "linear-gradient(180deg, #f8fafc 0%, #ffffff 30%, #ffffff 100%)",
        }}
      >
        {messages.length === 0 && (
          <div className="pt-2">
            {clientId && (
              <button
                onClick={runBrief}
                disabled={loading}
                className="group relative w-full flex items-center gap-2 text-white px-4 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 mb-4 shadow-sm hover:shadow-md overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, #009E60 0%, #14B8A6 100%)",
                }}
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <FileText className="relative w-4 h-4" />
                <span className="relative">Préparer la fiche de réunion</span>
              </button>
            )}
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
              Questions fréquentes
            </p>
            <div className="space-y-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  disabled={!clientId}
                  className="w-full text-left text-sm text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#009E60]/30 rounded-xl px-3 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div
              className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm"
              style={{
                background:
                  "linear-gradient(135deg, #009E60 0%, #0EA5E9 50%, #7C3AED 100%)",
              }}
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-[#009E60] animate-spin" />
                <span className="text-xs text-slate-400">L'IA analyse…</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 p-3 bg-white">
        <div className="relative flex items-end bg-slate-50 rounded-2xl border border-transparent focus-within:border-[#009E60]/30 focus-within:bg-white focus-within:shadow-sm transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={clientId ? "Posez votre question…" : "Sélectionnez un client"}
            disabled={!clientId || loading}
            rows={1}
            className="flex-1 resize-none bg-transparent px-4 py-3 text-sm placeholder-slate-400 focus:outline-none disabled:opacity-50 max-h-32"
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 128) + "px";
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!clientId || !input.trim() || loading}
            className="m-1.5 w-9 h-9 text-white rounded-xl flex items-center justify-center transition-transform hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0 shadow-sm"
            style={{
              background:
                "linear-gradient(135deg, #009E60 0%, #14B8A6 100%)",
            }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 shadow-sm ${
          isUser ? "bg-slate-200" : ""
        }`}
        style={
          !isUser
            ? {
                background:
                  "linear-gradient(135deg, #009E60 0%, #0EA5E9 50%, #7C3AED 100%)",
              }
            : undefined
        }
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-slate-500" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-white" />
        )}
      </div>
      <div className={`flex flex-col max-w-[85%] min-w-0 ${isUser ? "items-end" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
            isUser
              ? "text-white rounded-tr-sm"
              : msg.error
              ? "bg-amber-50 text-amber-800 border border-amber-200 rounded-tl-sm"
              : "bg-white text-slate-800 border border-slate-100 rounded-tl-sm"
          }`}
          style={
            isUser
              ? {
                  background:
                    "linear-gradient(135deg, #009E60 0%, #14B8A6 100%)",
                }
              : undefined
          }
        >
          <MarkdownText text={msg.content} />
        </div>
        {msg.chart && <ChartRenderer chart={msg.chart} />}
        {!isUser && msg.actions && msg.actions.length > 0 && (
          <ActionButtons actions={msg.actions} />
        )}
      </div>
    </div>
  );
}

/* ---------- Proactive action buttons ---------- */

const ACTION_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  calculator: Calculator,
  shield: Shield,
  calendar: Calendar,
  "file-text": FileText,
  sparkles: Sparkles,
  mail: Mail,
  phone: Phone,
  "refresh-cw": RefreshCw,
  sliders: Sliders,
  "piggy-bank": PiggyBank,
  "trending-up": TrendingUp,
};

const ACTION_STYLE: Record<
  ChatAction["type"],
  { icon: React.ComponentType<{ className?: string }>; gradient: string }
> = {
  simulate_loan: {
    icon: Calculator,
    gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
  },
  open_product: {
    icon: PiggyBank,
    gradient: "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)",
  },
  schedule_meeting: {
    icon: Calendar,
    gradient: "linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)",
  },
  send_document: {
    icon: FileText,
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #22d3ee 100%)",
  },
  generate_proposition: {
    icon: Sparkles,
    gradient: "linear-gradient(135deg, #009E60 0%, #14b8a6 100%)",
  },
  contact_client: {
    icon: Mail,
    gradient: "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)",
  },
  rebalance_portfolio: {
    icon: RefreshCw,
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)",
  },
  update_risk_profile: {
    icon: Sliders,
    gradient: "linear-gradient(135deg, #64748b 0%, #94a3b8 100%)",
  },
};

function ActionButtons({ actions }: { actions: ChatAction[] }) {
  const [clicked, setClicked] = useState<Set<number>>(new Set());

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {actions.map((action, i) => {
        const style = ACTION_STYLE[action.type];
        const Icon =
          (action.icon && ACTION_ICON_MAP[action.icon]) ||
          style?.icon ||
          ArrowRight;
        const gradient =
          style?.gradient || "linear-gradient(135deg, #009E60, #14b8a6)";
        const isClicked = clicked.has(i);

        return (
          <button
            key={`${action.type}-${i}`}
            type="button"
            onClick={() =>
              setClicked((prev) => {
                const next = new Set(prev);
                next.add(i);
                return next;
              })
            }
            className="group relative overflow-hidden flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl bg-white border border-slate-200 hover:border-transparent hover:shadow-md transition-all text-left"
          >
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-sm"
              style={{ background: gradient }}
            >
              {isClicked ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-semibold text-slate-800 leading-tight truncate">
                {action.label}
              </span>
              {action.product && (
                <span className="block text-[10px] text-slate-400 leading-tight truncate">
                  {action.product}
                </span>
              )}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("### "))
          return (
            <p key={i} className="font-semibold mt-2 first:mt-0">
              {line.slice(4)}
            </p>
          );
        if (line.startsWith("## ") || line.startsWith("# ")) {
          const level = line.startsWith("## ") ? 3 : 2;
          return (
            <p key={i} className="font-bold mt-3 first:mt-0">
              {line.slice(level + 1)}
            </p>
          );
        }
        if (line.match(/^[-*] /)) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-current opacity-50 flex-shrink-0" />
              <span>{renderInline(line.slice(2))}</span>
            </div>
          );
        }
        if (line === "") return <div key={i} className="h-1" />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
