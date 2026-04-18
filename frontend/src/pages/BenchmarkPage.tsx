import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  type Benchmark,
  type BenchmarkDimension,
  fetchBenchmark,
} from "../api";
import { formatEur } from "../lib/format";

interface Props {
  clientId: string | null;
}

const TEXT_DARK = "#333333";

export default function BenchmarkPage({ clientId }: Props) {
  const [data, setData] = useState<Benchmark | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    fetchBenchmark(clientId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-2xl text-white flex items-center justify-center shadow-md"
          style={{
            background:
              "linear-gradient(135deg, #0EA5E9 0%, #06B6D4 50%, #14B8A6 100%)",
          }}
        >
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h1
            className="text-lg sm:text-xl font-bold leading-tight"
            style={{ color: TEXT_DARK }}
          >
            Positionnement du client
          </h1>
          <p className="text-xs text-slate-500 leading-tight">
            Comparaison avec les autres clients du portefeuille
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Calcul des moyennes…</span>
        </div>
      )}

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Peer info banner */}
          <div className="bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-100 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-sky-600">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-sky-600">
                Groupe de comparaison
              </p>
              <p className="text-sm font-semibold" style={{ color: TEXT_DARK }}>
                {data.peer_scope} · {data.peers_count} pair
                {data.peers_count > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Dimensions grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.dimensions.map((dim) => (
              <DimensionCard key={dim.key} dim={dim} />
            ))}
          </div>

          {/* Combined bar chart */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3
              className="text-sm font-bold uppercase tracking-wider mb-4"
              style={{ color: TEXT_DARK }}
            >
              Vue d'ensemble
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={data.dimensions.map((d) => ({
                  name: d.label,
                  client: d.client_value,
                  pairs: d.peer_avg,
                  unit: d.unit,
                }))}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
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
                />
                <Bar
                  dataKey="client"
                  name="Client"
                  radius={[6, 6, 0, 0]}
                  fill="#009E60"
                />
                <Bar
                  dataKey="pairs"
                  name="Moyenne pairs"
                  radius={[6, 6, 0, 0]}
                  fill="#cbd5e1"
                >
                  {data.dimensions.map((_, i) => (
                    <Cell key={i} fill="#cbd5e1" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>
        </>
      )}
    </div>
  );
}

function DimensionCard({ dim }: { dim: BenchmarkDimension }) {
  const isPositive = dim.delta_pct >= 0;
  const isWealth = dim.key === "wealth";
  const fmt = (v: number) => {
    if (isWealth) return formatEur(v);
    if (dim.unit === "%") return `${v.toFixed(1)} %`;
    return v.toFixed(dim.unit === "" ? 1 : 2);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {dim.label}
        </p>
        <span
          className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
            isPositive
              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
              : "bg-rose-50 text-rose-700 border border-rose-100"
          }`}
        >
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {isPositive ? "+" : ""}
          {dim.delta_pct.toFixed(1)} %
        </span>
      </div>

      <div className="mt-3 flex items-end gap-4">
        <div className="flex-1">
          <p className="text-[10px] uppercase font-semibold text-slate-400">
            Client
          </p>
          <p
            className="text-2xl font-extrabold"
            style={{ color: TEXT_DARK }}
          >
            {fmt(dim.client_value)}
          </p>
        </div>
        <div className="flex-1 pl-4 border-l border-slate-100">
          <p className="text-[10px] uppercase font-semibold text-slate-400">
            Moyenne pairs
          </p>
          <p className="text-lg font-semibold text-slate-500">
            {fmt(dim.peer_avg)}
          </p>
        </div>
      </div>

      {/* Horizontal comparison bar */}
      <div className="mt-3">
        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
          {(() => {
            const max = Math.max(dim.client_value, dim.peer_avg, 1);
            const wClient = (dim.client_value / max) * 100;
            const wPeers = (dim.peer_avg / max) * 100;
            return (
              <>
                <div
                  className="absolute top-0 left-0 h-full rounded-full"
                  style={{
                    width: `${wPeers}%`,
                    background: "#cbd5e1",
                  }}
                />
                <div
                  className="absolute top-0 left-0 h-full rounded-full"
                  style={{
                    width: `${wClient}%`,
                    background:
                      "linear-gradient(90deg, #009E60 0%, #14B8A6 100%)",
                  }}
                />
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
