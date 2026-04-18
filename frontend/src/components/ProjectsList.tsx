import { Target, Clock } from "lucide-react";
import { type Project } from "../api";
import { formatEur } from "../lib/format";

interface Props {
  projects: Project[];
}

const PRIORITY_STYLES: Record<string, string> = {
  Haute: "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent",
  Moyenne: "bg-gradient-to-r from-sky-400 to-cyan-400 text-white border-transparent",
  Basse: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function ProjectsList({ projects }: Props) {
  if (!projects || projects.length === 0) {
    return (
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Projets & objectifs</h2>
        <p className="text-sm text-slate-400">Aucun projet déclaré.</p>
      </section>
    );
  }

  const sorted = [...projects].sort((a, b) => {
    const order = { Haute: 0, Moyenne: 1, Basse: 2 };
    return (order[a.priorite as keyof typeof order] ?? 3) - (order[b.priorite as keyof typeof order] ?? 3);
  });

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-sm font-semibold text-slate-700">Projets & objectifs</h2>
        <span className="text-xs text-slate-400">{projects.length} projet(s)</span>
      </div>

      <div className="space-y-3">
        {sorted.map((p, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#009E60] to-teal-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Target className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-900">{p.projet}</p>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                    PRIORITY_STYLES[p.priorite] ?? PRIORITY_STYLES.Basse
                  }`}
                >
                  {p.priorite}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{formatEur(p.montant_cible_eur)}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Horizon {p.horizon_annees} an{p.horizon_annees > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
