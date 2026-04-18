import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type PortfolioPoint } from "../api";
import { formatEur, formatMonthYear } from "../lib/format";

interface Props {
  data: PortfolioPoint[];
}

export default function PortfolioChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">Évolution du patrimoine</h2>
        <p className="text-sm text-slate-400 mt-3">Aucune donnée disponible.</p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-sm font-semibold text-slate-700">Évolution du patrimoine</h2>
        <span className="text-xs text-slate-400">24 derniers mois</span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#009E60" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#009E60" stopOpacity={0} />
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
            formatter={(v: unknown) => [formatEur(Number(v)), "Encours"]}
          />
          <Area
            type="monotone"
            dataKey="total_eur"
            stroke="#009E60"
            strokeWidth={2}
            fill="url(#portfolioGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}
