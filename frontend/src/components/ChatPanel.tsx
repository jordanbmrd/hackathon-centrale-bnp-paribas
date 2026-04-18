import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, User, Trash2, Loader2, FileText } from "lucide-react";
import { type Message, type ChatResponse } from "../api";
import ChartRenderer from "./ChartRenderer";

interface ChatMessage extends Message {
  id: string;
  chart?: ChatResponse["chart"];
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
      {/* Header */}
      <header className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#009E60] flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 leading-tight">Assistant IA</h2>
          <p className="text-xs text-slate-500 truncate">
            {clientName ? `Analyse ${clientName}` : "Sélectionnez un client"}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
            title="Effacer la conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="pt-4">
            {clientId && (
              <button
                onClick={runBrief}
                disabled={loading}
                className="w-full flex items-center gap-2 bg-gradient-to-br from-[#009E60] to-[#007a4c] text-white px-3.5 py-2.5 rounded-xl text-sm font-medium hover:opacity-95 transition-opacity disabled:opacity-60 mb-4"
              >
                <FileText className="w-4 h-4" />
                Préparer la fiche de réunion
              </button>
            )}
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
              Questions fréquentes
            </p>
            <div className="space-y-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  disabled={!clientId}
                  className="w-full text-left text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-lg px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="w-7 h-7 rounded-full bg-[#009E60]/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-[#009E60]" />
            </div>
            <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 p-3">
        <div className="relative flex items-end bg-slate-50 rounded-2xl border border-transparent focus-within:border-slate-200 focus-within:bg-white transition-colors">
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
            className="m-1.5 w-9 h-9 bg-[#009E60] text-white rounded-xl flex items-center justify-center hover:bg-[#007a4c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
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
        className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${
          isUser ? "bg-slate-200" : "bg-[#009E60]/10"
        }`}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-slate-500" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-[#009E60]" />
        )}
      </div>
      <div className={`flex flex-col max-w-[85%] min-w-0 ${isUser ? "items-end" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-[#009E60] text-white rounded-tr-sm"
              : msg.error
              ? "bg-rose-50 text-rose-700 border border-rose-100 rounded-tl-sm"
              : "bg-slate-50 text-slate-800 rounded-tl-sm"
          }`}
        >
          <MarkdownText text={msg.content} />
        </div>
        {msg.chart && <ChartRenderer chart={msg.chart} />}
      </div>
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
