import { type Event } from "../api";
import { formatDate } from "../lib/format";
import { AlertTriangle, CircleDot, MessageSquare, Sparkles } from "lucide-react";

interface Props {
  events: Event[];
}

const CRITICITE_STYLES: Record<string, string> = {
  Important: "text-rose-600 bg-rose-50",
  Info: "text-slate-500 bg-slate-50",
};

function getIcon(type: string, criticite: string) {
  if (criticite === "Important") return <AlertTriangle className="w-3.5 h-3.5" />;
  if (type === "Événement de vie") return <Sparkles className="w-3.5 h-3.5" />;
  if (type === "Interaction conseiller") return <MessageSquare className="w-3.5 h-3.5" />;
  return <CircleDot className="w-3.5 h-3.5" />;
}

export default function EventsTimeline({ events }: Props) {
  if (!events || events.length === 0) {
    return (
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Événements récents</h2>
        <p className="text-sm text-slate-400">Aucun événement récent.</p>
      </section>
    );
  }

  const recent = events.slice(0, 8);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-sm font-semibold text-slate-700">Événements récents</h2>
        <span className="text-xs text-slate-400">{events.length} au total</span>
      </div>

      <ol className="relative space-y-4 before:absolute before:left-[13px] before:top-1 before:bottom-1 before:w-px before:bg-slate-100">
        {recent.map((e, i) => {
          const toneCls = CRITICITE_STYLES[e.criticite] ?? CRITICITE_STYLES.Info;
          return (
            <li key={i} className="relative flex gap-3 pl-0">
              <div
                className={`relative z-10 w-[27px] h-[27px] rounded-full flex items-center justify-center ${toneCls}`}
              >
                {getIcon(e.type, e.criticite)}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm text-slate-800 truncate">{e.description}</p>
                  <span className="text-xs text-slate-400 flex-shrink-0">{formatDate(e.date)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {e.categorie}
                  {e.canal ? ` · ${e.canal}` : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
