import { useEffect, useState } from "react";
import {
  type ClientSummary,
  type Dashboard,
  type Message,
  type ChatResponse,
  type Radar,
  fetchClients,
  fetchDashboard,
  fetchRadar,
  sendChat,
  generateBrief,
} from "./api";
import ClientSelector from "./components/ClientSelector";
import ProfileCard from "./components/ProfileCard";
import KPIGrid from "./components/KPIGrid";
import PortfolioChart from "./components/PortfolioChart";
import ProductsList from "./components/ProductsList";
import ProjectsList from "./components/ProjectsList";
import EventsTimeline from "./components/EventsTimeline";
import ChatPanel from "./components/ChatPanel";
import RadarPanel from "./components/RadarPanel";
import { Loader2, AlertCircle } from "lucide-react";

export default function App() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError] = useState<string | null>(null);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashError, setDashError] = useState<string | null>(null);

  const [radar, setRadar] = useState<Radar | null>(null);
  const [radarLoading, setRadarLoading] = useState(false);
  const [radarError, setRadarError] = useState<string | null>(null);
  const [radarNonce, setRadarNonce] = useState(0);

  const [chatSeed, setChatSeed] = useState<{ text: string; nonce: number } | null>(null);

  useEffect(() => {
    fetchClients()
      .then((list) => {
        setClients(list);
        if (list.length > 0) setSelectedClientId(list[0].client_id);
      })
      .catch((e) => setClientsError(e.message))
      .finally(() => setClientsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedClientId) {
      setDashboard(null);
      setRadar(null);
      return;
    }
    setDashLoading(true);
    setDashError(null);
    fetchDashboard(selectedClientId)
      .then(setDashboard)
      .catch((e) => setDashError(e.message))
      .finally(() => setDashLoading(false));
  }, [selectedClientId]);

  useEffect(() => {
    if (!selectedClientId) {
      setRadar(null);
      return;
    }
    setRadar(null);
    setRadarLoading(true);
    setRadarError(null);
    fetchRadar(selectedClientId)
      .then(setRadar)
      .catch((e) => setRadarError(e.message))
      .finally(() => setRadarLoading(false));
  }, [selectedClientId, radarNonce]);

  const selectedClient = clients.find((c) => c.client_id === selectedClientId) ?? null;

  const handleChat = async (messages: Message[], clientId: string | null): Promise<ChatResponse> =>
    sendChat(messages, clientId);
  const handleBrief = async (clientId: string): Promise<ChatResponse> => generateBrief(clientId);
  const handleAskInChat = (question: string) => {
    setChatSeed({ text: question, nonce: Date.now() });
  };

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 50%, #eef2f7 100%)",
      }}
    >
      {/* Top bar */}
      <header className="relative flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200 flex-shrink-0 z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
              style={{
                background:
                  "linear-gradient(135deg, #009E60 0%, #14B8A6 100%)",
              }}
            >
              <span className="text-white text-[11px] font-bold tracking-tight">
                BNP
              </span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">
                Savings Agent
              </h1>
              <p className="text-[11px] text-slate-500 leading-tight">
                Dashboard conseiller
              </p>
            </div>
          </div>

          <div className="h-7 w-px bg-slate-200" />

          <ClientSelector
            clients={clients}
            selectedId={selectedClientId}
            onSelect={setSelectedClientId}
            loading={clientsLoading}
          />
        </div>

        {selectedClient && (
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Conseiller
              </p>
              <p className="font-semibold text-slate-700">
                {selectedClient.conseiller_attitre}
              </p>
            </div>
            <div className="h-7 w-px bg-slate-200" />
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Agence
              </p>
              <p className="font-semibold text-slate-700">{selectedClient.agence}</p>
            </div>
          </div>
        )}
      </header>

      {clientsError && (
        <div className="bg-amber-50 border-b border-amber-100 px-6 py-2 text-sm text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {clientsError}. Vérifiez que le backend tourne sur http://127.0.0.1:8000.
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Dashboard area */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-[1200px] mx-auto px-8 py-8">
            {dashLoading && (
              <div className="flex items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Chargement du dossier client…</span>
              </div>
            )}

            {dashError && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {dashError}
              </div>
            )}

            {!dashLoading && !dashError && dashboard && (
              <div className="space-y-6">
                <ProfileCard profile={dashboard.profile} />
                <KPIGrid kpis={dashboard.kpis} />
                <RadarPanel
                  insights={radar?.insights ?? []}
                  agenda={radar?.agenda ?? null}
                  loading={radarLoading}
                  error={radarError}
                  onRefresh={() => setRadarNonce((n) => n + 1)}
                  onAskQuestion={handleAskInChat}
                />
                <PortfolioChart data={dashboard.portfolio_evolution} />
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
            )}

            {!dashLoading && !dashboard && !dashError && clients.length > 0 && (
              <div className="text-center py-20 text-slate-400">
                <p className="text-sm">
                  Sélectionnez un client pour afficher son dossier.
                </p>
              </div>
            )}
          </div>
        </main>

        {/* Chat panel */}
        <div className="w-[400px] flex-shrink-0 shadow-[-8px_0_24px_-12px_rgba(15,23,42,0.08)]">
          <ChatPanel
            clientId={selectedClientId}
            clientName={
              selectedClient ? `${selectedClient.prenom} ${selectedClient.nom}` : undefined
            }
            onSend={handleChat}
            onBrief={handleBrief}
            seed={chatSeed}
          />
        </div>
      </div>
    </div>
  );
}
