const API_BASE = "http://127.0.0.1:8000";

export interface ClientSummary {
  client_id: string;
  prenom: string;
  nom: string;
  archetype: string;
  conseiller_attitre: string;
  agence: string;
}

export interface ClientProfile {
  client_id: string;
  prenom: string;
  nom: string;
  civilite?: string;
  archetype: string;
  age: number;
  sexe: string;
  email: string;
  telephone: string;
  adresse: string;
  code_postal: string;
  ville: string;
  csp: string;
  etape_vie: string;
  revenus_annuels_declares: number;
  tmi_pct: number;
  profil_risque: string;
  sensibilite_marche: string;
  anciennete_banque_annees: number;
  date_entree_banque: string;
  conseiller_attitre: string;
  agence: string;
  canal_prefere: string;
  segmentation: string;
  score_equipement: number;
  foyer?: {
    situation_familiale: string;
    regime_matrimonial?: string;
    conjoint_prenom?: string;
    conjoint_nom?: string;
    conjoint_age?: number;
    nb_enfants: number;
    ages_enfants?: string;
    personnes_a_charge: number;
    type_logement: string;
    annee_acquisition_residence?: number;
    valeur_estimee_residence_eur?: number;
  };
}

export interface Contract {
  client_id: string;
  contrat_id: string;
  code_produit: string;
  libelle_produit: string;
  famille_produit: string;
  date_ouverture: string;
  statut: string;
  encours_eur: number;
  devise: string;
  details?: Record<string, unknown>;
}

export interface PortfolioPoint {
  date: string;
  total_eur: number;
}

export interface Project {
  projet: string;
  horizon_annees: number;
  montant_cible_eur: number;
  priorite: string;
  date_declaration: string;
}

export interface Position {
  contrat_id: string;
  libelle: string;
  classe_actif: string;
  zone_geo: string;
  valorisation_courante_eur: number;
  poids_dans_contrat_pct: number;
}

export interface Allocation {
  classe_actif: string;
  total_eur: number;
  pct: number;
}

export interface Event {
  date: string;
  type: string;
  categorie: string;
  description: string;
  canal: string;
  criticite: string;
}

export interface FlowPoint {
  date: string;
  revenus_eur: number;
  depenses_eur: number;
  epargne_nette_eur: number;
}

export interface Dashboard {
  profile: ClientProfile;
  kpis: {
    patrimoine_total_eur: number;
    performance_24m_pct: number | null;
    revenus_12m_eur: number;
    epargne_12m_eur: number;
    taux_epargne_12m_pct: number | null;
  };
  contracts: Contract[];
  portfolio_evolution: PortfolioPoint[];
  projects: Project[];
  positions: Position[];
  allocation_by_asset_class: Allocation[];
  events: Event[];
  recent_flows: FlowPoint[];
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  text: string;
  chart: ChartData | null;
  tool_calls_made: string[];
}

export interface ChartData {
  type: "line" | "pie" | "bar";
  title: string;
  data: Record<string, unknown>[];
  dataKeys?: string[];
}

export async function fetchClients(): Promise<ClientSummary[]> {
  const res = await fetch(`${API_BASE}/clients`);
  if (!res.ok) throw new Error("Failed to fetch clients");
  return res.json();
}

export async function fetchDashboard(clientId: string): Promise<Dashboard> {
  const res = await fetch(`${API_BASE}/clients/${clientId}/dashboard`);
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}

export async function sendChat(
  messages: Message[],
  clientId: string | null
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, client_id: clientId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || "Chat request failed");
  }
  return res.json();
}

export async function generateBrief(clientId: string): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/meeting-brief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || "Brief generation failed");
  }
  return res.json();
}
