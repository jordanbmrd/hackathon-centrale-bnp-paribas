import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  Clock,
  FileText,
  ChevronDown,
  CalendarCheck,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { type Insight, type Agenda, type InsightType, type InsightPriority } from "../api";

interface Props {
  insights: Insight[];
  agenda: Agenda | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onAskQuestion: (question: string) => void;
}

const TYPE_META: Record<
  InsightType,
  { label: string; icon: React.ReactNode; chip: string; bar: string }
> = {
  opportunite: {
    label: "Opportunité",
    icon: <Lightbulb className="w-3 h-3" />,
    chip: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white",
    bar: "bg-gradient-to-b from-emerald-400 to-teal-500",
  },
  incoherence: {
    label: "Incohérence",
    icon: <AlertTriangle className="w-3 h-3" />,
    chip: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
    bar: "bg-gradient-to-b from-amber-400 to-orange-500",
  },
  risque: {
    label: "Point d'attention",
    icon: <AlertTriangle className="w-3 h-3" />,
    chip: "bg-gradient-to-r from-orange-500 to-pink-500 text-white",
    bar: "bg-gradient-to-b from-orange-400 to-pink-500",
  },
  evenement: {
    label: "Événement",
    icon: <Sparkles className="w-3 h-3" />,
    chip: "bg-gradient-to-r from-violet-500 to-indigo-500 text-white",
    bar: "bg-gradient-to-b from-violet-400 to-indigo-500",
  },
};

const PRIORITY_META: Record<InsightPriority, { dot: string; label: string }> = {
  haute: { dot: "bg-amber-500 ring-amber-200", label: "Haute" },
  moyenne: { dot: "bg-sky-500 ring-sky-200", label: "Moyenne" },
  basse: { dot: "bg-slate-300 ring-slate-100", label: "Basse" },
};

export default function RadarPanel({
  insights,
  agenda,
  loading,
  error,
  onRefresh,
  onAskQuestion,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [agendaOpen, setAgendaOpen] = useState(true);

  const counts = insights.reduce(
    (acc, i) => {
      acc[i.priority] = (acc[i.priority] ?? 0) + 1;
      return acc;
    },
    {} as Record<InsightPriority, number>
  );

  return (
    <section className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
      {/* Gradient header */}
      <header
        className="relative px-6 py-5 overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #009E60 0%, #00B37A 45%, #14B8A6 100%)",
        }}
      >
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -top-12 -right-8 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-cyan-300/20 blur-2xl" />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white leading-tight">
                Radar Conseil
              </h2>
              <span className="text-[10px] uppercase tracking-wider font-bold text-white/80 bg-white/15 px-2 py-0.5 rounded-full">
                IA
              </span>
            </div>
            <p className="text-xs text-white/80 leading-tight mt-0.5">
              Analyse proactive du dossier client
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-white/90 hover:text-white disabled:opacity-50 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/15"
              title="Relancer l'analyse"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{loading ? "Analyse…" : "Actualiser"}</span>
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs text-white/90 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/15"
              title={expanded ? "Réduire" : "Agrandir"}
            >
              {expanded ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{expanded ? "Réduire" : "Agrandir"}</span>
            </button>
          </div>
        </div>

        {/* Summary bar (always visible) */}
        {!loading && !error && insights.length > 0 && (
          <div className="relative mt-4 flex flex-wrap items-center gap-2">
            <Chip
              value={insights.length}
              label={insights.length > 1 ? "insights" : "insight"}
            />
            {counts.haute > 0 && (
              <Chip value={counts.haute} label="prioritaire(s)" accent="amber" />
            )}
            {agenda && (
              <Chip
                value={`${agenda.duration_min} min`}
                label="agenda prêt"
                accent="teal"
              />
            )}
          </div>
        )}
      </header>

      {/* Loading skeleton */}
      {loading && (
        <div className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#009E60]" />
            L'IA analyse le dossier, détecte les signaux faibles et prépare l'agenda…
          </div>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-6 text-sm text-amber-800 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Impossible de générer le radar : {error}</span>
        </div>
      )}

      {/* Content (only when expanded) */}
      {!loading && !error && insights.length > 0 && expanded && (
        <div>
          <div className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
            {insights.map((ins) => (
              <InsightCard key={ins.id} insight={ins} onAsk={onAskQuestion} />
            ))}
          </div>

          {agenda && (
            <div className="border-t border-slate-100">
              <button
                onClick={() => setAgendaOpen(!agendaOpen)}
                className="w-full flex items-center gap-3 px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#009E60] to-teal-500 flex items-center justify-center shadow-sm">
                  <CalendarCheck className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-slate-900 leading-tight">
                    Agenda RDV prêt à l'emploi
                  </p>
                  <p className="text-xs text-slate-500 leading-tight">
                    {agenda.duration_min} min · {agenda.topics?.length ?? 0} sujets ·{" "}
                    {agenda.documents_to_prepare?.length ?? 0} document(s)
                  </p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    agendaOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {agendaOpen && <AgendaView agenda={agenda} />}
            </div>
          )}
        </div>
      )}

      {/* Collapsed compact preview */}
      {!loading && !error && insights.length > 0 && !expanded && (
        <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
          {insights.slice(0, 3).map((ins) => {
            const meta = TYPE_META[ins.type] ?? TYPE_META.opportunite;
            return (
              <span
                key={ins.id}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${meta.chip}`}
                title={ins.title}
              >
                {meta.icon}
                <span className="max-w-[200px] truncate">{ins.title}</span>
              </span>
            );
          })}
          {insights.length > 3 && (
            <span className="text-xs text-slate-400">+{insights.length - 3} autres</span>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && insights.length === 0 && (
        <div className="p-10 text-center text-sm text-slate-400">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          Aucun insight remonté pour ce client.
        </div>
      )}
    </section>
  );
}

function Chip({
  value,
  label,
  accent = "default",
}: {
  value: string | number;
  label: string;
  accent?: "default" | "amber" | "teal";
}) {
  const base = "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ring-1 backdrop-blur-sm";
  const accents: Record<string, string> = {
    default: "bg-white/20 text-white ring-white/30",
    amber: "bg-amber-300/25 text-white ring-amber-200/50",
    teal: "bg-cyan-200/25 text-white ring-cyan-100/50",
  };
  return (
    <span className={`${base} ${accents[accent]}`}>
      <span className="font-bold">{value}</span>
      <span className="opacity-90">{label}</span>
    </span>
  );
}

function InsightCard({
  insight,
  onAsk,
}: {
  insight: Insight;
  onAsk: (q: string) => void;
}) {
  const meta = TYPE_META[insight.type] ?? TYPE_META.opportunite;
  const prio = PRIORITY_META[insight.priority] ?? PRIORITY_META.basse;

  return (
    <div className="group relative flex gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${meta.bar}`} />

      <div className="flex-1 min-w-0 pl-1.5">
        {/* Badge + priority dot on one line */}
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded ${meta.chip}`}
          >
            {meta.icon}
            {meta.label}
          </span>
          <span
            className={`w-2 h-2 rounded-full ring-2 flex-shrink-0 ${prio.dot}`}
            title={`Priorité ${prio.label}`}
          />
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-slate-900 leading-snug mb-1.5">
          {insight.title}
        </h3>

        {/* Diagnostic */}
        <p className="text-xs text-slate-600 leading-relaxed mb-2.5">
          {insight.diagnostic}
        </p>

        {/* Action + question inline, compact */}
        <div className="space-y-1 text-xs border-t border-slate-100 pt-2">
          <div className="flex gap-1.5">
            <span className="text-[#009E60] font-bold flex-shrink-0">→</span>
            <span className="text-slate-700 font-medium">{insight.suggested_action}</span>
          </div>
          <div className="flex gap-1.5">
            <span className="text-slate-400 flex-shrink-0">?</span>
            <span className="text-slate-500 italic">{insight.question_to_ask}</span>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-2 flex justify-end">
          <button
            onClick={() =>
              onAsk(`À propos de « ${insight.title} » : ${insight.question_to_ask}`)
            }
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#009E60] hover:text-[#007a4c] transition-colors"
          >
            Approfondir
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AgendaView({ agenda }: { agenda: Agenda }) {
  return (
    <div className="px-6 pb-6 space-y-3">
      {agenda.objective && (
        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-100">
          <p className="text-sm text-slate-800 font-semibold leading-snug">
            {agenda.objective}
          </p>
          {agenda.opening_sentence && (
            <p className="text-xs text-slate-600 italic mt-1">
              « {agenda.opening_sentence} »
            </p>
          )}
        </div>
      )}

      {agenda.topics && agenda.topics.length > 0 && (
        <ol className="space-y-1.5">
          {agenda.topics.map((topic, i) => (
            <li
              key={i}
              className="flex gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-[#009E60] to-teal-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 leading-tight">
                    {topic.title}
                  </p>
                  <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-400 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {topic.duration_min}′
                  </span>
                </div>
                {topic.key_points && topic.key_points.length > 0 && (
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                    {topic.key_points.join(" · ")}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {(agenda.documents_to_prepare?.length || agenda.follow_up) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
          {agenda.documents_to_prepare && agenda.documents_to_prepare.length > 0 && (
            <div className="flex items-start gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-500">À préparer : </span>
                <span className="text-slate-600">
                  {agenda.documents_to_prepare.join(", ")}
                </span>
              </div>
            </div>
          )}
          {agenda.follow_up && (
            <div className="flex items-start gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-500">Suivi : </span>
                <span className="text-slate-600">{agenda.follow_up}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
