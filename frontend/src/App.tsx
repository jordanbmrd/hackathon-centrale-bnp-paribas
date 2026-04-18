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
import ChatPanel from "./components/ChatPanel";
import Sidebar, { type PageId, SIDEBAR_ITEMS } from "./components/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import SimulatorPage from "./pages/SimulatorPage";
import BenchmarkPage from "./pages/BenchmarkPage";
import MarketPage from "./pages/MarketPage";
import { AlertCircle, Upload, MessageSquare, X, Sparkles } from "lucide-react";

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
  const [chatOpen, setChatOpen] = useState(false);

  const [activePage, setActivePage] = useState<PageId>("dashboard");

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
    setChatOpen(true);
  };

  const currentPageMeta = SIDEBAR_ITEMS.find((p) => p.id === activePage);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 50%, #eef2f7 100%)",
      }}
    >
      {/* Sidebar */}
      <Sidebar active={activePage} onChange={setActivePage} />

      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="relative flex items-center justify-between gap-2 px-3 sm:px-6 py-2.5 sm:py-3 bg-white/80 backdrop-blur-md border-b border-slate-200 flex-shrink-0 z-10">
          <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
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
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-slate-900 leading-tight">
                  Savings Agent
                </h1>
                <p className="text-[11px] text-slate-500 leading-tight truncate">
                  {currentPageMeta?.description ?? "Dashboard conseiller"}
                </p>
              </div>
            </div>

            <div className="hidden sm:block h-7 w-px bg-slate-200" />

            <div className="min-w-0 flex-1">
              <ClientSelector
                clients={clients}
                selectedId={selectedClientId}
                onSelect={setSelectedClientId}
                loading={clientsLoading}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <button
              type="button"
              title="Importer un CSV"
              className="group flex items-center gap-2 text-xs font-semibold px-2.5 sm:px-3 py-2 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all text-slate-600 hover:text-slate-800"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#009E60]" />
              <span className="hidden sm:inline">Importer CSV</span>
            </button>

            {selectedClient && (
              <div className="hidden lg:flex items-center gap-4 text-xs text-slate-500">
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
                  <p className="font-semibold text-slate-700">
                    {selectedClient.agence}
                  </p>
                </div>
              </div>
            )}
          </div>
        </header>

        {clientsError && (
          <div className="bg-amber-50 border-b border-amber-100 px-4 sm:px-6 py-2 text-xs sm:text-sm text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="min-w-0">{clientsError}. Vérifiez que le backend tourne sur http://127.0.0.1:8000.</span>
          </div>
        )}

        {/* Main layout */}
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-y-auto scrollbar-thin min-w-0">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-24 md:pb-8">
              {activePage === "dashboard" && (
                <DashboardPage
                  dashboard={dashboard}
                  dashLoading={dashLoading}
                  dashError={dashError}
                  radar={radar}
                  radarLoading={radarLoading}
                  radarError={radarError}
                  onRefreshRadar={() => setRadarNonce((n) => n + 1)}
                  onAskInChat={handleAskInChat}
                  hasClients={clients.length > 0}
                />
              )}
              {activePage === "simulator" && (
                <SimulatorPage dashboard={dashboard} />
              )}
              {activePage === "benchmark" && (
                <BenchmarkPage clientId={selectedClientId} />
              )}
              {activePage === "market" && (
                <MarketPage clientId={selectedClientId} />
              )}
            </div>
          </main>

          {/* Chat panel - desktop (lg+): always visible as column; smaller: drawer */}
          <div className="hidden lg:block w-[400px] flex-shrink-0 shadow-[-8px_0_24px_-12px_rgba(15,23,42,0.08)]">
            <ChatPanel
              clientId={selectedClientId}
              clientName={
                selectedClient
                  ? `${selectedClient.prenom} ${selectedClient.nom}`
                  : undefined
              }
              onSend={handleChat}
              onBrief={handleBrief}
              seed={chatSeed}
            />
          </div>

          {/* Chat drawer - mobile/tablet overlay */}
          {chatOpen && (
            <>
              <div
                className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
                onClick={() => setChatOpen(false)}
              />
              <div className="lg:hidden fixed inset-y-0 right-0 w-full sm:w-[420px] max-w-full z-50 shadow-2xl animate-[slideIn_200ms_ease-out]">
                <div className="relative h-full">
                  <button
                    type="button"
                    onClick={() => setChatOpen(false)}
                    title="Fermer"
                    className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <ChatPanel
                    clientId={selectedClientId}
                    clientName={
                      selectedClient
                        ? `${selectedClient.prenom} ${selectedClient.nom}`
                        : undefined
                    }
                    onSend={handleChat}
                    onBrief={handleBrief}
                    seed={chatSeed}
                  />
                </div>
              </div>
            </>
          )}

          {/* Floating chat FAB - only when drawer is closed and on small screens */}
          {!chatOpen && (
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              title="Ouvrir l'assistant IA"
              className="lg:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform"
              style={{
                background:
                  "linear-gradient(135deg, #009E60 0%, #0EA5E9 50%, #7C3AED 100%)",
              }}
            >
              <Sparkles className="w-5 h-5 absolute opacity-60" />
              <MessageSquare className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
