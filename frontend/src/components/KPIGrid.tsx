import { Wallet, TrendingUp, TrendingDown, PiggyBank, Percent } from "lucide-react";
import { type Dashboard } from "../api";
import { formatEur, formatPct } from "../lib/format";

interface Props {
  kpis: Dashboard["kpis"];
}

export default function KPIGrid({ kpis }: Props) {
  const perfPositive = (kpis.performance_24m_pct ?? 0) >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Hero card: patrimoine */}
      <div
        className="relative col-span-1 md:col-span-2 xl:col-span-1 rounded-2xl p-5 overflow-hidden text-white shadow-md"
        style={{
          background:
            "linear-gradient(135deg, #009E60 0%, #00B37A 50%, #14B8A6 100%)",
        }}
      >
        <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 w-36 h-36 rounded-full bg-cyan-200/20 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/25">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-white/90">
              Patrimoine total
            </span>
          </div>
          <p className="text-3xl font-bold leading-tight tabular-nums">
            {formatEur(kpis.patrimoine_total_eur)}
          </p>
          <p className="text-xs text-white/80 mt-1">Encours cumulés tous contrats</p>
        </div>
      </div>

      <KPI
        icon={perfPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        iconGradient={
          perfPositive
            ? "from-emerald-400 to-teal-500"
            : "from-amber-400 to-orange-500"
        }
        label="Performance 24 mois"
        value={formatPct(kpis.performance_24m_pct, true)}
        hint="Évolution du patrimoine"
        valueTone={perfPositive ? "text-emerald-600" : "text-amber-600"}
      />
      <KPI
        icon={<PiggyBank className="w-4 h-4" />}
        iconGradient="from-violet-400 to-indigo-500"
        label="Épargne 12 mois"
        value={formatEur(kpis.epargne_12m_eur)}
        hint={`sur ${formatEur(kpis.revenus_12m_eur)} de revenus`}
      />
      <KPI
        icon={<Percent className="w-4 h-4" />}
        iconGradient="from-cyan-400 to-sky-500"
        label="Taux d'épargne"
        value={formatPct(kpis.taux_epargne_12m_pct)}
        hint="Sur les 12 derniers mois"
      />
    </div>
  );
}

interface KPIProps {
  icon: React.ReactNode;
  iconGradient: string;
  label: string;
  value: string;
  hint?: string;
  valueTone?: string;
}

function KPI({ icon, iconGradient, label, value, hint, valueTone }: KPIProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2 mb-4">
        <div
          className={`w-8 h-8 rounded-lg bg-gradient-to-br ${iconGradient} text-white flex items-center justify-center shadow-sm`}
        >
          {icon}
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
      </div>
      <p
        className={`text-2xl font-bold leading-tight tabular-nums ${
          valueTone ?? "text-slate-900"
        }`}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
