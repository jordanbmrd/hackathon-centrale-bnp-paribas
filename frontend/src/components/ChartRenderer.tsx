import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { type ChartData } from "../api";

interface Props {
  chart: ChartData;
}

const PALETTE = ["#009E60", "#1a56db", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

const BAR_KEY_LABELS: Record<string, string> = {
  revenus_eur: "Revenus",
  depenses_eur: "Dépenses",
  epargne_nette_eur: "Épargne nette",
  total_eur: "Total",
  value: "Valeur",
};

function fmt(val: unknown): string {
  const n = Number(val);
  if (isNaN(n)) return String(val);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M€`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k€`;
  return `${n.toFixed(0)}€`;
}

export default function ChartRenderer({ chart }: Props) {
  const { type, title, data, dataKeys } = chart;

  return (
    <div className="mt-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</p>

      {type === "line" && (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data as Record<string, unknown>[]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#6b7280" }}
              tickFormatter={(v: string) => v.slice(0, 7)}
            />
            <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={fmt} width={56} />
            <Tooltip formatter={(v: unknown) => fmt(v)} labelFormatter={(l) => String(l)} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#009E60"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {type === "pie" && (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data as Record<string, unknown>[]}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, percent }: { name?: string; percent?: number }) =>
                `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {(data as Record<string, unknown>[]).map((_, idx) => (
                <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: unknown) => fmt(v)} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      )}

      {type === "bar" && (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data as Record<string, unknown>[]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#6b7280" }}
              tickFormatter={(v: string) => v.slice(0, 7)}
            />
            <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={fmt} width={56} />
            <Tooltip formatter={(v: unknown) => fmt(v)} />
            <Legend
              iconSize={10}
              wrapperStyle={{ fontSize: 11 }}
              formatter={(key: string) => BAR_KEY_LABELS[key] || key}
            />
            {(dataKeys || ["value"]).map((key, idx) => (
              <Bar key={key} dataKey={key} fill={PALETTE[idx % PALETTE.length]} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
