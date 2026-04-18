import { type Contract, type Allocation } from "../api";
import { formatDate, formatEur } from "../lib/format";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  contracts: Contract[];
  allocation: Allocation[];
}

const PALETTE = ["#009E60", "#1e40af", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#ef4444"];

export default function ProductsList({ contracts, allocation }: Props) {
  const grouped = contracts.reduce<Record<string, Contract[]>>((acc, c) => {
    (acc[c.famille_produit] ??= []).push(c);
    return acc;
  }, {});

  const families = Object.entries(grouped).sort(
    ([, a], [, b]) =>
      b.reduce((s, c) => s + (c.encours_eur || 0), 0) -
      a.reduce((s, c) => s + (c.encours_eur || 0), 0)
  );

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-sm font-semibold text-slate-700">Produits détenus</h2>
        <span className="text-xs text-slate-400">
          {contracts.length} contrat{contracts.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6">
        <div className="space-y-5">
          {families.map(([family, items]) => {
            const total = items.reduce((s, c) => s + (c.encours_eur || 0), 0);
            return (
              <div key={family}>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {family}
                  </h3>
                  <span className="text-xs text-slate-400">{formatEur(total)}</span>
                </div>
                <div className="space-y-1.5">
                  {items.map((c) => (
                    <div
                      key={c.contrat_id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-800 font-medium truncate">
                          {c.libelle_produit}
                        </p>
                        <p className="text-xs text-slate-400">
                          Ouvert le {formatDate(c.date_ouverture)} · {c.statut}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 ml-4 flex-shrink-0">
                        {formatEur(c.encours_eur)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {allocation.length > 0 && (
          <div className="lg:border-l lg:border-slate-100 lg:pl-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Allocation
            </h3>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocation}
                    dataKey="total_eur"
                    nameKey="classe_actif"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={2}
                  >
                    {allocation.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    formatter={(v: unknown) => formatEur(Number(v))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {allocation.map((a, i) => (
                <div key={a.classe_actif} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                  />
                  <span className="text-slate-600 flex-1 truncate">{a.classe_actif}</span>
                  <span className="text-slate-400">{a.pct.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
