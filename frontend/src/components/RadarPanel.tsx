import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Loader2,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Target,
  Clock,
  FileText,
  ChevronDown,
  CalendarCheck,
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
  { label: string; icon: React.ReactNode; tone: string }
> = {
  incoherence: {
    label: "Incohérence",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    tone: "bg-amber-50 text-amber-700 border-amber-200",
  },
  risque: {
    label: "Risque",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    tone: "bg-rose-50 text-rose-700 border-rose-200",
  },
  opportunite: {
    label: "Opportunité",
    icon: <Lightbulb className="w-3.5 h-3.5" />,
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  evenement: {
    label: "Événement",
    icon: <Sparkles className="w-3.5 h-3.5" />,
    tone: "bg-sky-50 text-sky-700 border-sky-200",
  },
};

const PRIORITY_DOT: Record<InsightPriority, string> = {
  haute: "bg-rose-500",
  moyenne: "bg-amber-500",
  basse: "bg-slate-300",
};

export default function RadarPanel({
  insights,
  agenda,
  loading,
  error,
  onRefresh,
  onAskQuestion,
}: Props) {
  const [agendaOpen, setAgendaOpen] = useState(true);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#009E60] to-[#007a4c] flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-slate-900 leading-tight">
            Radar Conseil
          </h2>
          <p className="text-xs text-slate-500 leading-tight">
            Analyse proactive du dossier par l'IA
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 disabled:opacity-40 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-50"
          title="Relancer l'analyse"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Analyse…" : "Actualiser"}
        </button>
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
              className="h-20 rounded-xl bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-6 text-sm text-rose-700 bg-rose-50 border-t border-rose-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Impossible de générer le radar : {error}</span>
        </div>
      )}

      {/* Content */}
      {!loading && !error && insights.length > 0 && (
        <div>
          {/* Insights grid */}
          <div className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-3">
            {insights.map((ins) => (
              <InsightCard key={ins.id} insight={ins} onAsk={onAskQuestion} />
            ))}
          </div>

          {/* Agenda */}
          {agenda && (
            <div className="border-t border-slate-100">
              <button
                onClick={() => setAgendaOpen(!agendaOpen)}
                className="w-full flex items-center gap-3 px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-[#009E60]/10 flex items-center justify-center">
                  <CalendarCheck className="w-4 h-4 text-[#009E60]" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-slate-900 leading-tight">
                    Agenda RDV prêt à l'emploi
                  </p>
                  <p className="text-xs text-slate-500 leading-tight">
                    {agenda.duration_min} min · {agenda.topics?.length ?? 0} sujets
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

function InsightCard({
  insight,
  onAsk,
}: {
  insight: Insight;
  onAsk: (q: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[insight.type] ?? TYPE_META.opportunite;

  return (
    <div className="group relative flex flex-col gap-2 p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all">
      <div className="flex items-start gap-2">
        <span
          className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[insight.priority]}`}
          title={`Priorité ${insight.priority}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded border ${meta.tone}`}
            >
              {meta.icon}
              {meta.label}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-slate-900 leading-snug">
            {insight.title}
          </h3>
        </div>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed pl-4">{insight.diagnostic}</p>

      {expanded && (
        <div className="pl-4 space-y-2 mt-1">
          <DetailRow icon={<Target className="w-3 h-3" />} label="Action suggérée">
            {insight.suggested_action}
          </DetailRow>
          <DetailRow icon={<MessageCircle className="w-3 h-3" />} label="Question à poser">
            <span className="italic">« {insight.question_to_ask} »</span>
          </DetailRow>
          {insight.impact && (
            <DetailRow icon={<Sparkles className="w-3 h-3" />} label="Impact">
              {insight.impact}
            </DetailRow>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pl-4 mt-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          {expanded ? "Réduire" : "Voir l'action & la question"}
        </button>
        <button
          onClick={() => onAsk(`À propos de « ${insight.title} » : ${insight.question_to_ask}`)}
          className="text-xs font-medium text-[#009E60] hover:text-[#007a4c] inline-flex items-center gap-1 transition-colors"
        >
          Approfondir
          <MessageCircle className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2 text-xs">
      <div className="flex items-center gap-1 text-slate-400 min-w-[110px] flex-shrink-0">
        {icon}
        <span className="font-medium uppercase tracking-wide text-[10px]">{label}</span>
      </div>
      <div className="text-slate-700 leading-relaxed">{children}</div>
    </div>
  );
}

function AgendaView({ agenda }: { agenda: Agenda }) {
  return (
    <div className="px-6 pb-6 space-y-4">
      {agenda.objective && (
        <div className="p-3 bg-[#009E60]/5 border border-[#009E60]/10 rounded-lg">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-[#009E60] mb-1">
            Objectif
          </p>
          <p className="text-sm text-slate-800">{agenda.objective}</p>
        </div>
      )}

      {agenda.opening_sentence && (
        <div>
          <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-1">
            Phrase d'accroche
          </p>
          <p className="text-sm text-slate-700 italic border-l-2 border-slate-200 pl-3">
            « {agenda.opening_sentence} »
          </p>
        </div>
      )}

      {agenda.topics && agenda.topics.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-2">
            Déroulé
          </p>
          <ol className="space-y-2">
            {agenda.topics.map((topic, i) => (
              <li
                key={i}
                className="flex gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{topic.title}</p>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {topic.duration_min} min
                    </span>
                  </div>
                  {topic.key_points && topic.key_points.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {topic.key_points.map((kp, j) => (
                        <li key={j} className="text-xs text-slate-600 flex gap-1.5">
                          <span className="text-slate-300 mt-1">•</span>
                          <span>{kp}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {agenda.documents_to_prepare && agenda.documents_to_prepare.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
              <FileText className="w-3 h-3" />À préparer
            </p>
            <ul className="space-y-1">
              {agenda.documents_to_prepare.map((d, i) => (
                <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                  <span className="text-slate-300">•</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}
        {agenda.follow_up && (
          <div>
            <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-1.5">
              Suivi
            </p>
            <p className="text-xs text-slate-600">{agenda.follow_up}</p>
          </div>
        )}
      </div>
    </div>
  );
}
