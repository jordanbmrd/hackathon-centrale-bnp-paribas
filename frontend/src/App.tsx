import { useEffect, useState } from "react";
import {
  type ClientSummary,
  type Dashboard,
  type Message,
  type ChatResponse,
  fetchClients,
  fetchDashboard,
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
import { Loader2, AlertCircle } from "lucide-react";

export default function App() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError] = useState<string | null>(null);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashError, setDashError] = useState<string | null>(null);

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
      return;
    }
    setDashLoading(true);
    setDashError(null);
    fetchDashboard(selectedClientId)
      .then(setDashboard)
      .catch((e) => setDashError(e.message))
      .finally(() => setDashLoading(false));
  }, [selectedClientId]);

  const selectedClient = clients.find((c) => c.client_id === selectedClientId) ?? null;

  const handleChat = async (messages: Message[], clientId: string | null): Promise<ChatResponse> =>
    sendChat(messages, clientId);
  const handleBrief = async (clientId: string): Promise<ChatResponse> => generateBrief(clientId);

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#009E60] rounded-lg flex items-center justify-center">
              <span className="text-white text-[10px] font-bold tracking-tight">BNP</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900 leading-tight">Savings Agent</h1>
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
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Conseiller</p>
              <p className="font-medium text-slate-700">{selectedClient.conseiller_attitre}</p>
            </div>
            <div className="h-7 w-px bg-slate-200" />
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Agence</p>
              <p className="font-medium text-slate-700">{selectedClient.agence}</p>
            </div>
          </div>
        )}
      </header>

      {clientsError && (
        <div className="bg-rose-50 border-b border-rose-100 px-6 py-2 text-sm text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {clientsError}. Vérifiez que le backend tourne sur http://127.0.0.1:8000.
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Dashboard area */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-[1100px] mx-auto px-6 py-6">
            {dashLoading && (
              <div className="flex items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Chargement du dossier client…</span>
              </div>
            )}

            {dashError && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-sm text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {dashError}
              </div>
            )}

            {!dashLoading && !dashError && dashboard && (
              <div className="space-y-5">
                <ProfileCard profile={dashboard.profile} />
                <KPIGrid kpis={dashboard.kpis} />
                <PortfolioChart data={dashboard.portfolio_evolution} />
                <ProductsList
                  contracts={dashboard.contracts}
                  allocation={dashboard.allocation_by_asset_class}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <ProjectsList projects={dashboard.projects} />
                  <EventsTimeline events={dashboard.events} />
                </div>
              </div>
            )}

            {!dashLoading && !dashboard && !dashError && clients.length > 0 && (
              <div className="text-center py-20 text-slate-400">
                <p className="text-sm">Sélectionnez un client pour afficher son dossier.</p>
              </div>
            )}
          </div>
        </main>

        {/* Chat panel */}
        <div className="w-[380px] flex-shrink-0">
          <ChatPanel
            clientId={selectedClientId}
            clientName={selectedClient ? `${selectedClient.prenom} ${selectedClient.nom}` : undefined}
            onSend={handleChat}
            onBrief={handleBrief}
          />
        </div>
      </div>
    </div>
  );
}
