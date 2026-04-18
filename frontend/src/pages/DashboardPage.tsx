import { Loader2, AlertCircle } from "lucide-react";
import ProfileCard from "../components/ProfileCard";
import KPIGrid from "../components/KPIGrid";
import PortfolioChart from "../components/PortfolioChart";
import ProductsList from "../components/ProductsList";
import ProjectsList from "../components/ProjectsList";
import EventsTimeline from "../components/EventsTimeline";
import RadarPanel from "../components/RadarPanel";
import { type Dashboard, type Radar } from "../api";

interface Props {
  dashboard: Dashboard | null;
  dashLoading: boolean;
  dashError: string | null;
  radar: Radar | null;
  radarLoading: boolean;
  radarError: string | null;
  onRefreshRadar: () => void;
  onAskInChat: (q: string) => void;
  hasClients: boolean;
}

export default function DashboardPage({
  dashboard,
  dashLoading,
  dashError,
  radar,
  radarLoading,
  radarError,
  onRefreshRadar,
  onAskInChat,
  hasClients,
}: Props) {
  if (dashLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Chargement du dossier client…</span>
      </div>
    );
  }
  if (dashError) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        {dashError}
      </div>
    );
  }
  if (!dashboard) {
    if (hasClients) {
      return (
        <div className="text-center py-20 text-slate-400">
          <p className="text-sm">
            Sélectionnez un client pour afficher son dossier.
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-6">
      <ProfileCard
        profile={dashboard.profile}
        healthScore={dashboard.health_score}
      />
      <KPIGrid kpis={dashboard.kpis} />
      <RadarPanel
        insights={radar?.insights ?? []}
        agenda={radar?.agenda ?? null}
        loading={radarLoading}
        error={radarError}
        onRefresh={onRefreshRadar}
        onAskQuestion={onAskInChat}
      />
      <PortfolioChart detail={dashboard.portfolio_detail} />
      <ProductsList
        contracts={dashboard.contracts}
        allocation={dashboard.allocation_by_asset_class}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectsList projects={dashboard.projects} />
        <EventsTimeline events={dashboard.events} />
      </div>
      <div className="h-4" />
    </div>
  );
}
