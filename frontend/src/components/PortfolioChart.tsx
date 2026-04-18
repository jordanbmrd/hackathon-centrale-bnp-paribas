import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import { type PortfolioDetail } from "../api";
import { formatEur, formatMonthYear } from "../lib/format";

interface Props {
  detail: PortfolioDetail;
}

const RANGES = [
  { id: "1Y", label: "1 an", months: 12 },
  { id: "2Y", label: "2 ans", months: 24 },
  { id: "5Y", label: "5 ans", months: 60 },
  { id: "ALL", label: "Max", months: 0 },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

// Selectable views: total (aggregate) + one per active contract
const PALETTE = [
  { stroke: "#10b981", fill: "rgba(16, 185, 129, 0.18)" },
  { stroke: "#6366f1", fill: "rgba(99, 102, 241, 0.18)" },
  { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.18)" },
  { stroke: "#ec4899", fill: "rgba(236, 72, 153, 0.18)" },
  { stroke: "#0ea5e9", fill: "rgba(14, 165, 233, 0.18)" },
  { stroke: "#8b5cf6", fill: "rgba(139, 92, 246, 0.18)" },
];

const TEXT_DARK = "#333333";

export default function PortfolioChart({ detail }: Props) {
  const [range, setRange] = useState<RangeId>("2Y");
  const [selected, setSelected] = useState<string>("total_eur");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const series = detail?.series ?? [];
  const contractsMeta = detail?.contracts_meta ?? [];

  // Build list of selectable data keys (Total + each contract)
  const views = useMemo(() => {
    const list: {
      key: string;
      label: string;
      sublabel?: string;
      color: string;
      fill: string;
    }[] = [
      {
        key: "total_eur",
        label: "Patrimoine total",
        color: PALETTE[0].stroke,
        fill: PALETTE[0].fill,
      },
    ];
    contractsMeta.forEach((c, i) => {
      const color = PALETTE[(i + 1) % PALETTE.length];
      list.push({
        key: c.contrat_id,
        label: c.libelle,
        sublabel: c.famille,
        color: color.stroke,
        fill: color.fill,
      });
    });
    return list;
  }, [contractsMeta]);

  const activeView = views.find((v) => v.key === selected) ?? views[0];

  // Filter series by selected range
  const filteredSeries = useMemo(() => {
    if (!series.length) return [];
    const r = RANGES.find((x) => x.id === range);
    if (!r || r.months === 0) return series;
    const cutoff = series.length - r.months - 1;
    return cutoff > 0 ? series.slice(cutoff) : series;
  }, [series, range]);

  // Perf / variation for the selected view over the filtered range
  const stats = useMemo(() => {
    if (filteredSeries.length < 2)
      return { start: 0, end: 0, delta: 0, pct: 0 };
    const startVal = Number(filteredSeries[0][activeView.key] ?? 0);
    const endVal = Number(
      filteredSeries[filteredSeries.length - 1][activeView.key] ?? 0
    );
    const delta = endVal - startVal;
    const pct = startVal > 0 ? (delta / startVal) * 100 : 0;
    return { start: startVal, end: endVal, delta, pct };
  }, [filteredSeries, activeView]);

  if (!series || series.length === 0) {
    return (
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold" style={{ color: TEXT_DARK }}>
          Évolution du patrimoine
        </h2>
        <p className="text-sm text-slate-400 mt-3">Aucune donnée disponible.</p>
      </section>
    );
  }

  const isPositive = stats.delta >= 0;
  const chartId = `gradient-${activeView.key}`;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      {/* Header : title + selected value */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div className="min-w-0">
          <h2
            className="text-sm font-semibold uppercase tracking-wider text-slate-500"
          >
            Évolution
          </h2>
          <div className="flex items-baseline gap-3 mt-1 flex-wrap">
            <span
              className="text-2xl font-bold"
              style={{ color: TEXT_DARK }}
            >
              {formatEur(stats.end)}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                isPositive
                  ? "text-emerald-700 bg-emerald-50 border border-emerald-100"
                  : "text-rose-700 bg-rose-50 border border-rose-100"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {isPositive ? "+" : ""}
              {stats.pct.toFixed(1)} %
              <span className="text-slate-400 font-normal ml-1">
                · {isPositive ? "+" : ""}
                {formatEur(stats.delta)}
              </span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {activeView.label}
            {activeView.sublabel ? ` · ${activeView.sublabel}` : ""}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2 text-xs font-medium border border-slate-200 bg-white rounded-lg px-3 py-1.5 hover:border-slate-300 hover:shadow-sm transition-all"
              style={{ color: TEXT_DARK }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: activeView.color }}
              />
              <span className="max-w-[160px] truncate">{activeView.label}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
                  {views.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => {
                        setSelected(v.key);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${
                        v.key === selected ? "bg-slate-50" : ""
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: v.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: TEXT_DARK }}
                        >
                          {v.label}
                        </p>
                        {v.sublabel && (
                          <p className="text-[11px] text-slate-400 truncate">
                            {v.sublabel}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Range selector */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  range === r.id
                    ? "bg-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                style={range === r.id ? { color: TEXT_DARK } : undefined}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart
          data={filteredSeries}
          margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={chartId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={activeView.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={activeView.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickFormatter={formatMonthYear}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={40}
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
            labelFormatter={(l) => formatMonthYear(l as string)}
            formatter={(v: unknown) => [formatEur(Number(v)), activeView.label]}
          />
          <Area
            type="monotone"
            dataKey={activeView.key}
            stroke={activeView.color}
            strokeWidth={2.5}
            fill={`url(#${chartId})`}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "white" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}
