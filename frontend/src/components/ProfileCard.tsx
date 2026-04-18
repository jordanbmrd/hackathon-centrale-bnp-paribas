import { useEffect, useRef, useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Home,
  Users,
  Wallet,
  Percent,
  Shield,
  CalendarClock,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { type ClientProfile, type HealthScore } from "../api";
import { formatDate, formatEur, getInitials } from "../lib/format";

interface Props {
  profile: ClientProfile;
  healthScore?: HealthScore;
}

const TEXT_DARK = "#333333";

export default function ProfileCard({ profile, healthScore }: Props) {
  const foyer = profile.foyer;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      {/* Top row : identity + health score */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex items-start gap-5 min-w-0 flex-1">
          <div
            className="w-16 h-16 rounded-2xl text-white flex items-center justify-center text-xl font-bold flex-shrink-0 shadow-md"
            style={{
              background: "linear-gradient(135deg, #009E60 0%, #14B8A6 100%)",
            }}
          >
            {getInitials(profile.prenom, profile.nom)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1
                className="text-xl font-semibold leading-tight"
                style={{ color: TEXT_DARK }}
              >
                {profile.civilite} {profile.prenom} {profile.nom}
              </h1>
              <span className="text-sm text-slate-500">{profile.age} ans</span>
            </div>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className="inline-flex items-center text-xs font-semibold text-white px-2.5 py-1 rounded-full shadow-sm"
                style={{
                  background:
                    "linear-gradient(135deg, #009E60 0%, #14B8A6 100%)",
                }}
              >
                {profile.archetype}
              </span>
              <span className="inline-flex items-center text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                {profile.etape_vie}
              </span>
              <span className="inline-flex items-center text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                {profile.segmentation}
              </span>
            </div>
          </div>
        </div>

        {healthScore && <HealthScoreCard data={healthScore} />}
      </div>

      {/* Personal info mini-cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
        <InfoCard
          icon={<Briefcase className="w-4 h-4" />}
          label="CSP"
          value={profile.csp}
          iconBg="from-violet-500 to-indigo-500"
        />
        <InfoCard
          icon={<MapPin className="w-4 h-4" />}
          label="Ville"
          value={`${profile.ville} (${profile.code_postal})`}
          iconBg="from-sky-500 to-cyan-500"
        />
        <InfoCard
          icon={<Mail className="w-4 h-4" />}
          label="Email"
          value={profile.email}
          iconBg="from-emerald-500 to-teal-500"
        />
        <InfoCard
          icon={<Phone className="w-4 h-4" />}
          label="Téléphone"
          value={profile.telephone}
          iconBg="from-fuchsia-500 to-pink-500"
        />
        <InfoCard
          icon={<Home className="w-4 h-4" />}
          label="Logement"
          value={foyer?.type_logement ?? "—"}
          iconBg="from-amber-500 to-orange-500"
        />
        <InfoCard
          icon={<Users className="w-4 h-4" />}
          label="Foyer"
          value={
            foyer
              ? `${foyer.situation_familiale}${
                  foyer.nb_enfants > 0 ? ` · ${foyer.nb_enfants} enf.` : ""
                }`
              : "—"
          }
          iconBg="from-teal-500 to-emerald-500"
        />
      </div>

      {/* Financial mini-cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
        <MetricCard
          icon={<Wallet className="w-4 h-4" />}
          label="Revenus déclarés"
          value={`${formatEur(profile.revenus_annuels_declares)}/an`}
          gradient="from-emerald-50 to-teal-50"
          border="border-emerald-100"
        />
        <MetricCard
          icon={<Percent className="w-4 h-4" />}
          label="TMI"
          value={`${profile.tmi_pct} %`}
          gradient="from-violet-50 to-indigo-50"
          border="border-violet-100"
        />
        <MetricCard
          icon={<Shield className="w-4 h-4" />}
          label="Profil de risque"
          value={profile.profil_risque}
          gradient="from-sky-50 to-cyan-50"
          border="border-sky-100"
        />
        <MetricCard
          icon={<CalendarClock className="w-4 h-4" />}
          label="Client depuis"
          value={formatDate(profile.date_entree_banque)}
          gradient="from-amber-50 to-orange-50"
          border="border-amber-100"
        />
      </div>
    </section>
  );
}

/* ---------- Health score card ---------- */

const SCORE_GRADIENTS: Record<string, string> = {
  green: "linear-gradient(135deg, #059669 0%, #10b981 55%, #14b8a6 100%)",
  amber: "linear-gradient(135deg, #d97706 0%, #f59e0b 55%, #fb923c 100%)",
  red: "linear-gradient(135deg, #dc2626 0%, #ef4444 55%, #f87171 100%)",
};

const SCORE_RING: Record<string, string> = {
  green: "ring-emerald-200",
  amber: "ring-amber-200",
  red: "ring-rose-200",
};

const SCORE_LABEL: Record<string, string> = {
  green: "Excellent",
  amber: "À surveiller",
  red: "Point d'attention",
};

function HealthScoreCard({ data }: { data: HealthScore }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gradient = SCORE_GRADIENTS[data.color] ?? SCORE_GRADIENTS.green;
  const ring = SCORE_RING[data.color] ?? "ring-slate-200";
  const label = SCORE_LABEL[data.color] ?? "Score";

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`group relative overflow-hidden rounded-xl px-3 py-2 text-left text-white shadow-md ring-2 ${ring} transition-all hover:shadow-lg`}
        style={{ background: gradient, minWidth: 240 }}
        title="Cliquez pour voir le détail"
      >
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/20 blur-2xl" />

        <div className="relative flex items-center gap-2.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/25 backdrop-blur-sm border border-white/30 shadow-inner flex-shrink-0">
            <span className="text-xl font-black leading-none">
              {data.grade}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/85">
                <Sparkles className="w-3 h-3" />
                Santé financière
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-white/80 transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </div>
            <div className="flex items-baseline justify-between gap-2 mt-0.5">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-extrabold leading-none">
                  {data.score}
                </span>
                <span className="text-[11px] text-white/75 font-medium">
                  / 100
                </span>
              </div>
              <span className="text-[10px] text-white/90 font-semibold">
                {label}
              </span>
            </div>
            <div className="mt-1 h-1 bg-white/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${Math.min(100, data.score)}%` }}
              />
            </div>
          </div>
        </div>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl p-3 shadow-xl space-y-2.5 z-30">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: TEXT_DARK }}
            >
              Détail du score
            </span>
            <span
              className="text-[10px] font-medium text-slate-400"
            >
              /100
            </span>
          </div>
          {data.dimensions.map((dim) => (
            <DimensionRow key={dim.name} dim={dim} color={data.color} />
          ))}
        </div>
      )}
    </div>
  );
}

const DIM_BAR_COLOR: Record<string, string> = {
  green: "bg-gradient-to-r from-emerald-400 to-teal-500",
  amber: "bg-gradient-to-r from-amber-400 to-orange-500",
  red: "bg-gradient-to-r from-rose-400 to-red-500",
};

function DimensionRow({
  dim,
  color,
}: {
  dim: HealthScore["dimensions"][number];
  color: string;
}) {
  const pct = (dim.score / dim.max) * 100;
  const barColor =
    pct >= 80
      ? DIM_BAR_COLOR.green
      : pct >= 40
      ? DIM_BAR_COLOR.amber
      : DIM_BAR_COLOR.red;

  void color;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span
          className="text-xs font-semibold"
          style={{ color: TEXT_DARK }}
        >
          {dim.name}
        </span>
        <span className="text-[11px] text-slate-500">
          {dim.value} <span className="text-slate-400">· cible {dim.target}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          className="text-[11px] font-bold tabular-nums"
          style={{ color: TEXT_DARK }}
        >
          {dim.score}
          <span className="text-slate-400 font-medium">/{dim.max}</span>
        </span>
      </div>
    </div>
  );
}

/* ---------- Reusable mini cards ---------- */

function InfoCard({
  icon,
  label,
  value,
  iconBg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconBg: string;
}) {
  return (
    <div className="group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all min-w-0">
      <div
        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${iconBg} text-white flex items-center justify-center shadow-sm flex-shrink-0`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
          {label}
        </p>
        <p
          className="text-sm font-medium truncate"
          style={{ color: TEXT_DARK }}
          title={value}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  gradient,
  border,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  gradient: string;
  border: string;
}) {
  return (
    <div
      className={`p-3 rounded-xl border ${border} bg-gradient-to-br ${gradient}`}
    >
      <div className="flex items-center gap-1.5 text-slate-500 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-semibold">
          {label}
        </span>
      </div>
      <p className="text-sm font-bold" style={{ color: TEXT_DARK }}>
        {value}
      </p>
    </div>
  );
}
