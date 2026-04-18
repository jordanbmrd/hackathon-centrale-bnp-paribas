import { useMemo, useState, useEffect } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendingUp,
  PiggyBank,
  Calendar,
  Percent,
  Gauge,
  Target,
  Sparkles,
} from "lucide-react";
import { type Dashboard } from "../api";
import { formatEur } from "../lib/format";

interface Props {
  dashboard: Dashboard | null;
}

const TEXT_DARK = "#333333";

export default function SimulatorPage({ dashboard }: Props) {
  const currentWealth = dashboard?.kpis.patrimoine_total_eur ?? 0;
  // Monthly savings averaged from last 12m
  const avgMonthlySavings = useMemo(() => {
    const flows = dashboard?.recent_flows ?? [];
    if (flows.length === 0) return 500;
    const total = flows.reduce((s, f) => s + (f.epargne_nette_eur ?? 0), 0);
    return Math.max(0, Math.round(total / flows.length));
  }, [dashboard]);

  // Suggest a reasonable return based on risk profile
  const suggestedReturn = useMemo(() => {
    const profile = dashboard?.profile.profil_risque?.toLowerCase() ?? "";
    if (profile.includes("prudent")) return 2.5;
    if (profile.includes("équilibré") || profile.includes("equilibre"))
      return 4.5;
    if (profile.includes("dynamique")) return 6.5;
    if (profile.includes("offensif")) return 8.0;
    return 4.0;
  }, [dashboard]);

  const [initialWealth, setInitialWealth] = useState(currentWealth);
  const [monthlySavings, setMonthlySavings] = useState(avgMonthlySavings);
  const [annualReturn, setAnnualReturn] = useState(suggestedReturn);
  const [horizonYears, setHorizonYears] = useState(10);
  const [targetAmount, setTargetAmount] = useState(250000);

  useEffect(() => {
    setInitialWealth(currentWealth);
    setMonthlySavings(avgMonthlySavings);
    setAnnualReturn(suggestedReturn);
  }, [currentWealth, avgMonthlySavings, suggestedReturn]);

  const scenarios = useMemo(() => {
    const months = horizonYears * 12;
    const simulate = (annualPct: number) => {
      const monthlyRate = annualPct / 100 / 12;
      const series: {
        month: number;
        year: number;
        value: number;
        deposits: number;
      }[] = [];
      let value = initialWealth;
      let deposits = initialWealth;
      for (let m = 0; m <= months; m++) {
        if (m > 0) {
          value = value * (1 + monthlyRate) + monthlySavings;
          deposits += monthlySavings;
        }
        series.push({
          month: m,
          year: m / 12,
          value: Math.round(value),
          deposits: Math.round(deposits),
        });
      }
      return series;
    };

    const pessimistic = simulate(Math.max(0, annualReturn - 2));
    const base = simulate(annualReturn);
    const optimistic = simulate(annualReturn + 2);

    const merged = base.map((pt, i) => ({
      year: pt.year,
      label:
        pt.month % 12 === 0
          ? `${pt.month / 12} an${pt.month / 12 > 1 ? "s" : ""}`
          : "",
      pessimistic: pessimistic[i].value,
      base: pt.value,
      optimistic: optimistic[i].value,
      deposits: pt.deposits,
    }));

    return {
      merged,
      final: {
        pessimistic: pessimistic[pessimistic.length - 1].value,
        base: base[base.length - 1].value,
        optimistic: optimistic[optimistic.length - 1].value,
        totalDeposits: base[base.length - 1].deposits,
      },
    };
  }, [initialWealth, monthlySavings, annualReturn, horizonYears]);

  const interests = scenarios.final.base - scenarios.final.totalDeposits;
  const yearsToTarget = useMemo(() => {
    if (targetAmount <= initialWealth) return 0;
    const monthlyRate = annualReturn / 100 / 12;
    let value = initialWealth;
    for (let m = 1; m <= 50 * 12; m++) {
      value = value * (1 + monthlyRate) + monthlySavings;
      if (value >= targetAmount) return Math.round((m / 12) * 10) / 10;
    }
    return null;
  }, [initialWealth, monthlySavings, annualReturn, targetAmount]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-2xl text-white flex items-center justify-center shadow-md"
          style={{
            background:
              "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)",
          }}
        >
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <h1
            className="text-xl font-bold leading-tight"
            style={{ color: TEXT_DARK }}
          >
            Simulateur d'évolution du patrimoine
          </h1>
          <p className="text-xs text-slate-500 leading-tight">
            Projetez le patrimoine de {dashboard?.profile.prenom}{" "}
            {dashboard?.profile.nom} selon différents scénarios
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs panel */}
        <section className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
          <h2
            className="text-sm font-bold uppercase tracking-wider"
            style={{ color: TEXT_DARK }}
          >
            Paramètres
          </h2>

          <SliderInput
            icon={<PiggyBank className="w-4 h-4" />}
            label="Capital de départ"
            value={initialWealth}
            min={0}
            max={Math.max(1_000_000, currentWealth * 3)}
            step={1000}
            format={(v) => formatEur(v)}
            onChange={setInitialWealth}
            gradient="from-emerald-500 to-teal-500"
          />
          <SliderInput
            icon={<Calendar className="w-4 h-4" />}
            label="Versement mensuel"
            value={monthlySavings}
            min={0}
            max={5000}
            step={50}
            format={(v) => formatEur(v) + "/mois"}
            onChange={setMonthlySavings}
            gradient="from-sky-500 to-cyan-500"
          />
          <SliderInput
            icon={<Percent className="w-4 h-4" />}
            label="Rendement annuel moyen"
            value={annualReturn}
            min={0}
            max={12}
            step={0.1}
            format={(v) => `${v.toFixed(1)} %`}
            onChange={setAnnualReturn}
            gradient="from-violet-500 to-indigo-500"
          />
          <SliderInput
            icon={<Gauge className="w-4 h-4" />}
            label="Horizon"
            value={horizonYears}
            min={1}
            max={30}
            step={1}
            format={(v) => `${v} an${v > 1 ? "s" : ""}`}
            onChange={setHorizonYears}
            gradient="from-amber-500 to-orange-500"
          />
          <SliderInput
            icon={<Target className="w-4 h-4" />}
            label="Objectif patrimoine"
            value={targetAmount}
            min={10_000}
            max={2_000_000}
            step={5000}
            format={(v) => formatEur(v)}
            onChange={setTargetAmount}
            gradient="from-rose-500 to-pink-500"
          />

          <div
            className="rounded-xl border border-violet-100 p-3 bg-gradient-to-br from-violet-50 to-indigo-50"
            style={{ color: TEXT_DARK }}
          >
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-violet-600 mb-1">
              <Sparkles className="w-3 h-3" />
              Objectif atteint en
            </div>
            <p className="text-xl font-extrabold">
              {yearsToTarget == null
                ? "> 50 ans"
                : yearsToTarget === 0
                ? "Déjà atteint"
                : `${yearsToTarget} ans`}
            </p>
          </div>
        </section>

        {/* Chart + stats */}
        <section className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ResultCard
              label="Scénario pessimiste"
              value={scenarios.final.pessimistic}
              sub={`-2 % / an`}
              color="from-rose-50 to-pink-50"
              border="border-rose-100"
              text="text-rose-700"
            />
            <ResultCard
              label="Scénario central"
              value={scenarios.final.base}
              sub={`${annualReturn.toFixed(1)} % / an`}
              color="from-emerald-50 to-teal-50"
              border="border-emerald-100"
              text="text-emerald-700"
              highlight
            />
            <ResultCard
              label="Scénario optimiste"
              value={scenarios.final.optimistic}
              sub={`+2 % / an`}
              color="from-violet-50 to-indigo-50"
              border="border-violet-100"
              text="text-violet-700"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-baseline justify-between mb-4">
              <h3
                className="text-sm font-bold uppercase tracking-wider"
                style={{ color: TEXT_DARK }}
              >
                Projection sur {horizonYears} ans
              </h3>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <LegendDot color="#6366f1" label="Central" />
                <LegendDot color="#ec4899" label="Pessimiste" dashed />
                <LegendDot color="#10b981" label="Optimiste" dashed />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={scenarios.merged}>
                <defs>
                  <linearGradient id="simBase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickFormatter={(v) => `${v.toFixed(0)} an`}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickFormatter={(v) => formatEur(v as number)}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: 12,
                    padding: "8px 10px",
                  }}
                  labelFormatter={(l) =>
                    `Année ${Number(l).toFixed(1)}`
                  }
                  formatter={(v: unknown, name: string) => {
                    const labels: Record<string, string> = {
                      base: "Central",
                      pessimistic: "Pessimiste",
                      optimistic: "Optimiste",
                      deposits: "Cumul versements",
                    };
                    return [formatEur(Number(v)), labels[name] ?? name];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="base"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#simBase)"
                />
                <Area
                  type="monotone"
                  dataKey="pessimistic"
                  stroke="#ec4899"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="transparent"
                />
                <Area
                  type="monotone"
                  dataKey="optimistic"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3
              className="text-sm font-bold uppercase tracking-wider mb-4"
              style={{ color: TEXT_DARK }}
            >
              Répartition capital vs intérêts (scénario central)
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={scenarios.merged}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickFormatter={(v) => `${v.toFixed(0)} an`}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickFormatter={(v) => formatEur(v as number)}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: 12,
                    padding: "8px 10px",
                  }}
                  labelFormatter={(l) => `Année ${Number(l).toFixed(1)}`}
                  formatter={(v: unknown, name: string) => {
                    const labels: Record<string, string> = {
                      base: "Valeur totale",
                      deposits: "Cumul versé",
                    };
                    return [formatEur(Number(v)), labels[name] ?? name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="deposits"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  name="Cumul versé"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="base"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  name="Valeur totale"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
              <MiniStat
                label="Versé au total"
                value={formatEur(scenarios.final.totalDeposits)}
              />
              <MiniStat
                label="Intérêts générés"
                value={formatEur(interests)}
                hint={`+${((interests / scenarios.final.totalDeposits) * 100).toFixed(0)} %`}
              />
              <MiniStat
                label="Patrimoine final"
                value={formatEur(scenarios.final.base)}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function SliderInput({
  icon,
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  gradient: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-md bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-sm`}
          >
            {icon}
          </span>
          <span
            className="text-xs font-semibold"
            style={{ color: TEXT_DARK }}
          >
            {label}
          </span>
        </div>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color: TEXT_DARK }}
        >
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#009E60]"
      />
    </div>
  );
}

function ResultCard({
  label,
  value,
  sub,
  color,
  border,
  text,
  highlight,
}: {
  label: string;
  value: number;
  sub: string;
  color: string;
  border: string;
  text: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border ${border} p-4 bg-gradient-to-br ${color} ${
        highlight ? "shadow-md" : "shadow-sm"
      }`}
    >
      <p className={`text-[10px] uppercase tracking-wider font-bold ${text}`}>
        {label}
      </p>
      <p
        className="text-xl font-extrabold mt-1"
        style={{ color: TEXT_DARK }}
      >
        {formatEur(value)}
      </p>
      <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
    </div>
  );
}

function LegendDot({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-5 h-[2px]"
        style={{
          background: color,
          borderStyle: dashed ? "dashed" : "solid",
          borderTop: dashed ? `2px dashed ${color}` : undefined,
          backgroundColor: dashed ? "transparent" : color,
        }}
      />
      <span>{label}</span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
        {label}
      </p>
      <p className="text-base font-bold mt-0.5" style={{ color: TEXT_DARK }}>
        {value}
      </p>
      {hint && (
        <p className="text-[10px] font-semibold text-emerald-600">{hint}</p>
      )}
    </div>
  );
}
