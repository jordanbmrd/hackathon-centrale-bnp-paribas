# BNP Paribas — Savings Agent Dashboard

Interface IA pour conseillers bancaires BNP Paribas. Permet d'interroger les données clients en langage naturel et d'obtenir des insights actionnables avant une réunion.

![BNP Paribas](assets/bnp-paribas.png)

![Centrale Nantes](assets/centrale-nantes.jpg)

## Prérequis

- Python 3.11+
- Node.js 18+
- Une clé API Mistral AI

## Démarrage rapide

### 1. Configurer la clé Mistral

```bash
# Copier et compléter le fichier d'environnement
cp backend/.env.example backend/.env
# Puis éditer backend/.env :
MISTRAL_API_KEY=votre-cle-mistral-ici
```

### 2. Démarrer le backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Le backend sera accessible sur http://localhost:8000
Documentation API : http://localhost:8000/docs

### 3. Démarrer le frontend

```bash
cd frontend
npm install
npm run dev
```

L'application sera accessible sur http://localhost:5173

### Démarrage via Docker

```bash
docker build -t bnp-savings-agent .
docker run -e MISTRAL_API_KEY=votre-cle-mistral-ici -p 8000:8000 bnp-savings-agent
```

## Architecture

```
backend/
  main.py          — API FastAPI
                     GET  /clients                         — liste des clients
                     GET  /clients/{id}                    — profil complet
                     GET  /clients/{id}/dashboard          — tableau de bord agrégé
                     GET  /clients/{id}/radar              — radar conseil + agenda RDV
                     GET  /clients/{id}/benchmark          — comparaison archétype
                     GET  /clients/{id}/supports-performance — performance des supports
                     GET  /market-context                  — indices de marché
                     POST /chat                            — agent conversationnel
                     POST /meeting-brief                   — fiche de préparation
  agent.py         — Orchestration multi-agents LangChain + Mistral Large
  tools.py         — Outils de requête pandas (profil, contrats, flux, positions…)
  data_loader.py   — Chargement Excel → DataFrames

frontend/src/
  App.tsx                        — Point d'entrée
  api.ts                         — Appels API
  components/
    Sidebar.tsx                  — Navigation latérale
    ClientSelector.tsx           — Sélecteur de client
    ChatPanel.tsx                — Interface de chat
    ChartRenderer.tsx            — Graphiques (line/pie/bar)
    KPIGrid.tsx                  — Indicateurs clés
    PortfolioChart.tsx           — Évolution du portefeuille
    ProfileCard.tsx              — Carte profil client
    ProductsList.tsx             — Liste des contrats
    ProjectsList.tsx             — Projets client
    EventsTimeline.tsx           — Timeline des événements de vie
    RadarPanel.tsx               — Radar conseil IA
    IntroSplash.tsx              — Écran d'accueil
  pages/
    DashboardPage.tsx            — Tableau de bord client
    BenchmarkPage.tsx            — Comparaison archétype
    MarketPage.tsx               — Contexte marché
    SimulatorPage.tsx            — Simulateur de produits

data/
  banking_customers.xlsx         — Données clients (11 feuilles, 10 clients)
```

## Fonctionnalités

- **Chat en langage naturel** : posez des questions sur n'importe quel client
- **Orchestration multi-agents** : agents spécialistes (profil, allocation, actions) en parallèle, synthétisés par Mistral Large
- **Tableau de bord client** : KPIs, score de santé financière, évolution du portefeuille, contrats, projets, événements
- **Radar conseil** : détection automatique d'insights (opportunités, risques, incohérences) et agenda de RDV prêt à l'emploi
- **Benchmark archétype** : comparaison du client avec ses pairs du même profil
- **Contexte marché** : suivi des indices de référence normalisés
- **Graphiques automatiques** : l'IA génère des visualisations quand c'est pertinent
- **Fiche de préparation** : brief complet pour préparer une réunion client

## Exemples de questions

- "Mon client a-t-il gagné de l'argent l'année dernière ?"
- "Quelle est la santé financière de ce client ?"
- "Quels sont les points clés à aborder en réunion ?"
- "La situation du client a-t-elle changé récemment ?"
- "Quel produit pourrait être pertinent à proposer ?"

<img width="1399" height="857" alt="image" src="https://github.com/user-attachments/assets/81ef7a99-2c15-4f3c-bd79-9f38a459493d" />
