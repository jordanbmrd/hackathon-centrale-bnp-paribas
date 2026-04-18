import { Mail, Phone, MapPin, Briefcase, Home, Users } from "lucide-react";
import { type ClientProfile } from "../api";
import { formatDate, formatEur, getInitials } from "../lib/format";

interface Props {
  profile: ClientProfile;
}

export default function ProfileCard({ profile }: Props) {
  const foyer = profile.foyer;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-start gap-5">
        <div
          className="w-14 h-14 rounded-2xl text-white flex items-center justify-center text-lg font-bold flex-shrink-0 shadow-md"
          style={{
            background:
              "linear-gradient(135deg, #009E60 0%, #14B8A6 100%)",
          }}
        >
          {getInitials(profile.prenom, profile.nom)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-slate-900 leading-tight">
              {profile.civilite} {profile.prenom} {profile.nom}
            </h1>
            <span className="text-sm text-slate-500">{profile.age} ans</span>
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className="inline-flex items-center text-xs font-semibold text-white px-2.5 py-0.5 rounded-full shadow-sm"
              style={{
                background:
                  "linear-gradient(135deg, #009E60 0%, #14B8A6 100%)",
              }}
            >
              {profile.archetype}
            </span>
            <span className="inline-flex items-center text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {profile.etape_vie}
            </span>
            <span className="inline-flex items-center text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {profile.segmentation}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 mt-6 pt-6 border-t border-slate-100">
        <Info icon={<Briefcase className="w-3.5 h-3.5" />} label="CSP" value={profile.csp} />
        <Info icon={<MapPin className="w-3.5 h-3.5" />} label="Ville" value={`${profile.ville} (${profile.code_postal})`} />
        <Info icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={profile.email} />
        <Info icon={<Phone className="w-3.5 h-3.5" />} label="Téléphone" value={profile.telephone} />
        <Info
          icon={<Home className="w-3.5 h-3.5" />}
          label="Logement"
          value={foyer?.type_logement ?? "—"}
        />
        <Info
          icon={<Users className="w-3.5 h-3.5" />}
          label="Foyer"
          value={
            foyer
              ? `${foyer.situation_familiale}${foyer.nb_enfants > 0 ? ` · ${foyer.nb_enfants} enfant(s)` : ""}`
              : "—"
          }
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
        <Metric label="Revenus déclarés" value={formatEur(profile.revenus_annuels_declares) + "/an"} />
        <Metric label="TMI" value={`${profile.tmi_pct} %`} />
        <Metric label="Profil de risque" value={profile.profil_risque} />
        <Metric label="Client depuis" value={formatDate(profile.date_entree_banque)} />
      </div>

      {foyer?.valeur_estimee_residence_eur && (
        <div className="mt-4 p-3 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
          <span className="text-slate-500">Résidence principale estimée</span>
          <span className="font-semibold text-slate-900">
            {formatEur(foyer.valeur_estimee_residence_eur)}
          </span>
        </div>
      )}
    </section>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
        {icon}
        <span className="text-xs uppercase tracking-wide font-medium">{label}</span>
      </div>
      <p className="text-sm text-slate-700 truncate" title={value}>
        {value}
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
