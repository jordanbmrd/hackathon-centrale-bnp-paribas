import { Wallet, TrendingUp, TrendingDown, PiggyBank, Percent } from "lucide-react";
import { type Dashboard } from "../api";
import { formatEur, formatPct } from "../lib/format";

interface Props {
  kpis: Dashboard["kpis"];
}

export default function KPIGrid({ kpis }: Props) {
  const perfPositive = (kpis.performance_24m_pct ?? 0) >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KPI
        icon={<Wallet className="w-4 h-4" />}
        label="Patrimoine total"
        value={formatEur(kpis.patrimoine_total_eur)}
        hint="Encours cumulés"
        accent
      />
      <KPI
        icon={perfPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        label="Performance 24 mois"
        value={formatPct(kpis.performance_24m_pct, true)}
        hint="Évolution du patrimoine"
        tone={perfPositive ? "success" : "danger"}
      />
      <KPI
        icon={<PiggyBank className="w-4 h-4" />}
        label="Épargne 12 mois"
        value={formatEur(kpis.epargne_12m_eur)}
        hint={`sur ${formatEur(kpis.revenus_12m_eur)} de revenus`}
      />
      <KPI
        icon={<Percent className="w-4 h-4" />}
        label="Taux d'épargne"
        value={formatPct(kpis.taux_epargne_12m_pct)}
        hint="Sur les 12 derniers mois"
      />
    </div>
  );
}

interface KPIProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  tone?: "default" | "success" | "danger";
}

function KPI({ icon, label, value, hint, accent, tone = "default" }: KPIProps) {
  const toneClasses = {
    default: "text-slate-500",
    success: "text-emerald-600",
    danger: "text-rose-600",
  };

  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? "bg-[#009E60] border-[#009E60] text-white"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            accent ? "bg-white/15" : "bg-slate-50 text-slate-400"
          }`}
        >
          {icon}
        </div>
        <span
          className={`text-xs font-medium uppercase tracking-wide ${
            accent ? "text-white/80" : "text-slate-500"
          }`}
        >
          {label}
        </span>
      </div>
      <p
        className={`text-xl font-semibold leading-tight ${
          accent ? "text-white" : tone !== "default" ? toneClasses[tone] : "text-slate-900"
        }`}
      >
        {value}
      </p>
      {hint && (
        <p className={`text-xs mt-1 ${accent ? "text-white/70" : "text-slate-400"}`}>{hint}</p>
      )}
    </div>
  );
}
