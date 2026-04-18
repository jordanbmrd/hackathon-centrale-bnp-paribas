import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  Flame,
  Snowflake,
} from "lucide-react";
import {
  type MarketContext,
  type SupportsPerformance,
  fetchMarketContext,
  fetchSupportsPerformance,
} from "../api";
import { formatMonthYear } from "../lib/format";

interface Props {
  clientId: string | null;
}

const TEXT_DARK = "#333333";

const INDEX_COLORS: Record<string, string> = {
  CAC40: "#009E60",
  MSCIWORLD: "#6366f1",
  EUROSTOXX50: "#0EA5E9",
  OBLIG_EUR: "#f59e0b",
  OR_EUR: "#ec4899",
};

const RANGES = [12, 24, 60];

export default function MarketPage({ clientId }: Props) {
  const [months, setMonths] = useState(24);
  const [market, setMarket] = useState<MarketContext | null>(null);
  const [supports, setSupports] = useState<SupportsPerformance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(
    new Set(["CAC40", "MSCIWORLD"])
  );

  useEffect(() => {
    setLoading(true);
    setError(null);
    const pMkt = fetchMarketContext(months);
    const pSupp = clientId
      ? fetchSupportsPerformance(clientId, months)
      : Promise.resolve(null);
    Promise.all([pMkt, pSupp])
      .then(([m, s]) => {
        setMarket(m);
        setSupports(s);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId, months]);

  const toggleCode = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl text-white flex items-center justify-center shadow-md"
            style={{
              background:
                "linear-gradient(135deg, #f59e0b 0%, #fb923c 50%, #ec4899 100%)",
            }}
          >
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1
              className="text-lg sm:text-xl font-bold leading-tight"
              style={{ color: TEXT_DARK }}
            >
              Contexte de marché
            </h1>
            <p className="text-xs text-slate-500 leading-tight">
              Indices de référence + performance des supports détenus
            </p>
          </div>
        </div>

        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
          {RANGES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMonths(m)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                months === m ? "bg-white shadow-sm" : "text-slate-500"
              }`}
              style={months === m ? { color: TEXT_DARK } : undefined}
            >
              {m >= 12 ? `${m / 12} an${m / 12 > 1 ? "s" : ""}` : `${m} mois`}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Chargement des indices…</span>
        </div>
      )}

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {market && (
        <>
          {/* Indices cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {market.summary.map((item) => {
              const positive = item.performance_pct >= 0;
              const active = selectedCodes.has(item.code);
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => toggleCode(item.code)}
                  className={`text-left p-3 rounded-2xl border transition-all ${
                    active
                      ? "bg-white shadow-md border-slate-300"
                      : "bg-slate-50 border-slate-200 hover:bg-white hover:shadow-sm opacity-60"
                  }`}
                  style={
                    active
                      ? {
                          borderLeftWidth: 4,
                          borderLeftColor:
                            INDEX_COLORS[item.code] ?? "#009E60",
                        }
                      : undefined
                  }
                >
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                    {item.code}
                  </p>
                  <p
                    className="text-xs font-semibold mt-0.5 truncate"
                    style={{ color: TEXT_DARK }}
                  >
                    {item.label}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold mt-1 ${
                      positive ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {positive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {positive ? "+" : ""}
                    {item.performance_pct.toFixed(1)} %
                  </span>
                </button>
              );
            })}
          </div>

          {/* Chart */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-baseline justify-between mb-3">
              <h3
                className="text-sm font-bold uppercase tracking-wider"
                style={{ color: TEXT_DARK }}
              >
                Évolution des indices (base 100)
              </h3>
              <span className="text-xs text-slate-400">
                Click sur un indice pour le masquer
              </span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={market.series}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickFormatter={formatMonthYear}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={40}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  width={45}
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
                />
                {market.summary
                  .filter((i) => selectedCodes.has(i.code))
                  .map((item) => (
                    <Line
                      key={item.code}
                      type="monotone"
                      dataKey={item.code}
                      name={item.label}
                      stroke={INDEX_COLORS[item.code] ?? "#009E60"}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </section>

          {/* Supports detenus */}
          {supports && supports.supports.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3
                className="text-sm font-bold uppercase tracking-wider mb-3"
                style={{ color: TEXT_DARK }}
              >
                Supports détenus par le client
              </h3>
              <div className="space-y-2">
                {supports.supports.map((s, i) => {
                  const positive = s.performance_pct >= 0;
                  const isBest = i === 0;
                  const isWorst = i === supports.supports.length - 1;
                  return (
                    <div
                      key={s.isin}
                      className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-white hover:shadow-sm rounded-xl border border-slate-100 transition-all"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0"
                        style={{
                          background: isBest
                            ? "linear-gradient(135deg, #10b981, #14b8a6)"
                            : isWorst
                            ? "linear-gradient(135deg, #ec4899, #f472b6)"
                            : "linear-gradient(135deg, #64748b, #94a3b8)",
                        }}
                      >
                        {isBest ? (
                          <Flame className="w-4 h-4" />
                        ) : isWorst ? (
                          <Snowflake className="w-4 h-4" />
                        ) : (
                          <Activity className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: TEXT_DARK }}
                        >
                          {s.libelle}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {s.isin} · VL {s.latest_vl.toFixed(2)} €
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-lg ${
                          positive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-rose-50 text-rose-700 border border-rose-100"
                        }`}
                      >
                        {positive ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        {positive ? "+" : ""}
                        {s.performance_pct.toFixed(1)} %
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
