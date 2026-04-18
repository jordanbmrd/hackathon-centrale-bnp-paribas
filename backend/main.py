"""
FastAPI backend for BNP Paribas Savings Agent Dashboard.
Endpoints:
  GET  /clients                    — list of all clients with name + archetype
  GET  /clients/{id}/dashboard     — aggregated dashboard
  GET  /clients/{id}/radar         — AI-generated advisor radar + meeting agenda
  POST /chat                       — send a message, get AI response + optional chart data
  POST /meeting-brief              — generate a full meeting preparation brief
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

# Override DATA_PATH to absolute path relative to this file's location
_here = Path(__file__).parent
os.environ.setdefault("DATA_PATH", str(_here.parent / "data" / "banking_customers.xlsx"))

from agent import build_meeting_brief_prompt, generate_client_radar, run_agent  # noqa: E402
from data_loader import DataStore  # noqa: E402
import pandas as pd  # noqa: E402


def _build_portfolio_detail(client_id: str) -> dict:
    """
    Return a richer portfolio series used by the dashboard chart :
      - full monthly history (up to ~5 years)
      - total + per-contract columns on each row
      - metadata for each contract (label, family, color)
    """
    ds = DataStore.instance()

    histo = ds["histo_valo"][ds["histo_valo"]["client_id"] == client_id].copy()
    histo = histo[histo["encours_eur"].notna()]
    if histo.empty:
        return {"series": [], "contracts_meta": []}

    histo["date"] = pd.to_datetime(histo["date"])
    histo = histo.sort_values("date")

    # Keep at most last 60 months (5 years)
    cutoff = histo["date"].max() - pd.DateOffset(months=60)
    histo = histo[histo["date"] >= cutoff]

    contrats = ds["contrats"][ds["contrats"]["client_id"] == client_id]
    meta_map = {
        row["contrat_id"]: {
            "contrat_id": row["contrat_id"],
            "libelle": row.get("libelle_produit") or row["contrat_id"],
            "famille": row.get("famille_produit") or "",
            "code_produit": row.get("code_produit") or "",
        }
        for _, row in contrats.iterrows()
    }

    # Pivot : one column per contrat_id
    pivot = histo.pivot_table(
        index="date", columns="contrat_id", values="encours_eur", aggfunc="sum"
    ).sort_index()
    pivot = pivot.fillna(0.0)
    pivot["total_eur"] = pivot.sum(axis=1)

    series = []
    for date, row in pivot.iterrows():
        point = {"date": date.strftime("%Y-%m-%d")}
        for col, val in row.items():
            point[str(col)] = round(float(val), 2)
        series.append(point)

    # Only expose contracts that actually have data in the window
    active_ids = [cid for cid in pivot.columns if cid != "total_eur"]
    contracts_meta = [
        meta_map.get(cid, {"contrat_id": cid, "libelle": cid, "famille": ""})
        for cid in active_ids
    ]

    return {"series": series, "contracts_meta": contracts_meta}

app = FastAPI(title="BNP Savings Agent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Startup: pre-load data
# ---------------------------------------------------------------------------


@app.on_event("startup")
async def startup_event() -> None:
    DataStore.instance()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class Message(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    client_id: str | None = None
    messages: list[Message]


class BriefRequest(BaseModel):
    client_id: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/clients")
def list_clients() -> list[dict]:
    """Return all clients with their full name and archetype."""
    ds = DataStore.instance()
    return ds.clients_summary()


@app.get("/clients/{client_id}")
def get_client(client_id: str) -> dict:
    """Return a single client's full profile."""
    from tools import get_client_profile

    result = get_client_profile(client_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@app.get("/clients/{client_id}/dashboard")
def get_dashboard(client_id: str) -> dict:
    """
    Return a full aggregated dashboard for one client :
    profile, KPIs, contracts, portfolio evolution, projects, events.
    """
    from tools import (
        get_client_profile,
        get_contracts,
        get_portfolio_evolution,
        get_financial_flows,
        get_projects,
        get_investment_positions,
        get_events,
    )

    profile = get_client_profile(client_id)
    if "error" in profile:
        raise HTTPException(status_code=404, detail=profile["error"])

    contracts = get_contracts(client_id)
    portfolio = get_portfolio_evolution(client_id, months=24)
    portfolio_detail = _build_portfolio_detail(client_id)
    flows = get_financial_flows(client_id)
    projects = get_projects(client_id)
    positions = get_investment_positions(client_id)
    events = get_events(client_id, recent_months=24)

    # Compute a rolling 12-month savings rate from the most recent flows
    recent_flows = flows.get("flux", [])[-12:]
    recent_revenus = sum((f.get("revenus_eur") or 0) for f in recent_flows)
    recent_epargne = sum((f.get("epargne_nette_eur") or 0) for f in recent_flows)
    taux_epargne_12m = (
        round(recent_epargne / recent_revenus * 100, 1) if recent_revenus else None
    )

    # Compute health score (0 - 100) across 4 dimensions
    contracts_list = contracts.get("contracts", [])

    # Épargne (max 25) : taux d'épargne >= 20% = 25
    score_epargne = min(25.0, max(0.0, (taux_epargne_12m or 0) / 20.0 * 25.0))

    # Performance sur 12 derniers mois (max 25) : rendement >= 7.5% = 25
    series = portfolio.get("series", [])
    last_12 = series[-13:] if len(series) >= 13 else series
    perf_12m_pct = 0.0
    if len(last_12) >= 2 and last_12[0].get("total_eur"):
        perf_12m_pct = (
            (last_12[-1]["total_eur"] / last_12[0]["total_eur"]) - 1
        ) * 100
    score_performance = min(25.0, max(0.0, perf_12m_pct / 7.5 * 25.0))

    # Endettement (max 25) : 0% dette = 25 pts
    debt_keywords = ("crédit", "credit", "prêt", "pret", "dette", "emprunt")
    has_debt = any(
        any(k in (c.get("famille_produit") or "").lower() for k in debt_keywords)
        for c in contracts_list
    )
    score_endettement = 25.0 if not has_debt else 10.0

    # Diversification (max 25) : 5+ contrats actifs = 25 pts
    nb_contracts = sum(
        1 for c in contracts_list if (c.get("statut") or "").lower() in ("actif", "ouvert", "en cours")
    )
    if nb_contracts == 0:
        nb_contracts = len(contracts_list)
    score_diversification = min(25.0, nb_contracts / 5.0 * 25.0)

    total_score = round(
        score_epargne + score_performance + score_endettement + score_diversification
    )

    if total_score >= 85:
        grade, color = "A", "green"
    elif total_score >= 70:
        grade, color = "B", "green"
    elif total_score >= 55:
        grade, color = "C", "amber"
    elif total_score >= 40:
        grade, color = "D", "amber"
    elif total_score >= 25:
        grade, color = "E", "red"
    else:
        grade, color = "F", "red"

    health_score = {
        "score": total_score,
        "grade": grade,
        "color": color,
        "dimensions": [
            {
                "name": "Épargne",
                "score": round(score_epargne),
                "max": 25,
                "value": f"{taux_epargne_12m:.1f} %" if taux_epargne_12m is not None else "—",
                "target": "≥ 20 %",
            },
            {
                "name": "Performance",
                "score": round(score_performance),
                "max": 25,
                "value": f"{perf_12m_pct:+.1f} %",
                "target": "≥ 7,5 %",
            },
            {
                "name": "Endettement",
                "score": round(score_endettement),
                "max": 25,
                "value": "Aucun crédit" if not has_debt else "Crédit actif",
                "target": "0 % de dette",
            },
            {
                "name": "Diversification",
                "score": round(score_diversification),
                "max": 25,
                "value": f"{nb_contracts} contrat{'s' if nb_contracts > 1 else ''}",
                "target": "≥ 5 contrats",
            },
        ],
    }

    return {
        "profile": profile,
        "kpis": {
            "patrimoine_total_eur": contracts.get("total_encours_eur", 0),
            "performance_24m_pct": portfolio.get("performance_pct"),
            "revenus_12m_eur": round(recent_revenus, 2) if recent_revenus else 0,
            "epargne_12m_eur": round(recent_epargne, 2) if recent_epargne else 0,
            "taux_epargne_12m_pct": taux_epargne_12m,
        },
        "health_score": health_score,
        "portfolio_detail": portfolio_detail,
        "contracts": contracts_list,
        "portfolio_evolution": series,
        "projects": projects.get("projects", []),
        "positions": positions.get("positions", []),
        "allocation_by_asset_class": positions.get("allocation_by_asset_class", []),
        "events": events.get("events", []),
        "recent_flows": recent_flows,
    }


@app.get("/clients/{client_id}/radar")
def get_radar(client_id: str) -> dict:
    """
    Run the proactive advisor radar (insights + suggested meeting agenda) for one client.
    """
    if not os.environ.get("MISTRAL_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="MISTRAL_API_KEY not configured. Please add it to backend/.env",
        )

    result = generate_client_radar(client_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@app.post("/chat")
def chat(request: ChatRequest) -> dict:
    """
    Run the AI agent for a given conversation.
    Returns: { text, chart, tool_calls_made }
    """
    import traceback

    print(f"[CHAT] request received: client_id={request.client_id}, msgs={len(request.messages)}", flush=True)

    if not os.environ.get("MISTRAL_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="MISTRAL_API_KEY not configured. Please add it to backend/.env",
        )

    messages = [m.model_dump() for m in request.messages]
    try:
        result = run_agent(messages, client_id=request.client_id)
        print(f"[CHAT] response ok: tool_calls={result.get('tool_calls_made')}", flush=True)
        return result
    except Exception as exc:
        print(f"[CHAT] ERROR: {type(exc).__name__}: {exc}", flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")


@app.post("/meeting-brief")
def meeting_brief(request: BriefRequest) -> dict:
    """
    Generate a full meeting preparation brief for a client.
    Returns: { text, chart, tool_calls_made }
    """
    if not os.environ.get("MISTRAL_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="MISTRAL_API_KEY not configured. Please add it to backend/.env",
        )

    messages = build_meeting_brief_prompt(request.client_id)
    result = run_agent(messages, client_id=request.client_id)
    return result


@app.get("/clients/{client_id}/benchmark")
def get_benchmark(client_id: str) -> dict:
    """
    Compare a client's key metrics with the average of their archetype peers.
    Returns deltas for: savings rate, wealth, performance, diversification, score.
    """
    ds = DataStore.instance()
    profil_df = ds["profil"]
    if client_id not in profil_df["client_id"].values:
        raise HTTPException(status_code=404, detail=f"Client {client_id} not found")

    row = profil_df[profil_df["client_id"] == client_id].iloc[0]
    archetype = row["archetype"]
    archetype_peers = profil_df[profil_df["archetype"] == archetype]["client_id"].tolist()
    # If too few same-archetype peers, fall back to the full client base
    if len([p for p in archetype_peers if p != client_id]) < 2:
        peers_ids = profil_df["client_id"].tolist()
        peer_scope = "tous les clients"
    else:
        peers_ids = archetype_peers
        peer_scope = f"archétype '{archetype}'"

    def _metrics_for(cid: str) -> dict:
        contrats = ds["contrats"][ds["contrats"]["client_id"] == cid]
        wealth = float(contrats["encours_eur"].fillna(0).sum())
        nb_contracts = int(len(contrats))

        flux = ds["flux"][ds["flux"]["client_id"] == cid].copy()
        if flux.empty:
            savings_rate = 0.0
        else:
            flux["date"] = pd.to_datetime(flux["date"])
            flux = flux.sort_values("date").tail(12)
            rev = float(flux["revenus_eur"].fillna(0).sum())
            epg = float(flux["epargne_nette_eur"].fillna(0).sum())
            savings_rate = (epg / rev * 100) if rev else 0.0

        histo = ds["histo_valo"][ds["histo_valo"]["client_id"] == cid].copy()
        histo = histo[histo["encours_eur"].notna()]
        perf_12m = 0.0
        if not histo.empty:
            histo["date"] = pd.to_datetime(histo["date"])
            grp = histo.groupby("date")["encours_eur"].sum().sort_index()
            if len(grp) >= 13:
                first = grp.iloc[-13]
                last = grp.iloc[-1]
                perf_12m = ((last / first) - 1) * 100 if first else 0.0

        return {
            "wealth": wealth,
            "savings_rate": savings_rate,
            "perf_12m": perf_12m,
            "nb_contracts": nb_contracts,
        }

    client_metrics = _metrics_for(client_id)
    peer_metrics_list = [
        _metrics_for(pid) for pid in peers_ids if pid != client_id
    ]

    def _avg(key: str) -> float:
        vals = [m[key] for m in peer_metrics_list if m[key] is not None]
        return round(sum(vals) / len(vals), 2) if vals else 0.0

    peer_avg = {
        "wealth": _avg("wealth"),
        "savings_rate": _avg("savings_rate"),
        "perf_12m": _avg("perf_12m"),
        "nb_contracts": _avg("nb_contracts"),
    }

    def _delta(client_val: float, peer_val: float) -> float:
        if peer_val == 0:
            return 0.0
        return round((client_val - peer_val) / abs(peer_val) * 100, 1)

    dimensions = [
        {
            "key": "wealth",
            "label": "Patrimoine total",
            "unit": "€",
            "client_value": round(client_metrics["wealth"], 2),
            "peer_avg": round(peer_avg["wealth"], 2),
            "delta_pct": _delta(client_metrics["wealth"], peer_avg["wealth"]),
        },
        {
            "key": "savings_rate",
            "label": "Taux d'épargne",
            "unit": "%",
            "client_value": round(client_metrics["savings_rate"], 1),
            "peer_avg": round(peer_avg["savings_rate"], 1),
            "delta_pct": _delta(
                client_metrics["savings_rate"], peer_avg["savings_rate"]
            ),
        },
        {
            "key": "perf_12m",
            "label": "Performance 12 mois",
            "unit": "%",
            "client_value": round(client_metrics["perf_12m"], 1),
            "peer_avg": round(peer_avg["perf_12m"], 1),
            "delta_pct": _delta(client_metrics["perf_12m"], peer_avg["perf_12m"]),
        },
        {
            "key": "nb_contracts",
            "label": "Nombre de contrats",
            "unit": "",
            "client_value": client_metrics["nb_contracts"],
            "peer_avg": round(peer_avg["nb_contracts"], 1),
            "delta_pct": _delta(
                client_metrics["nb_contracts"], peer_avg["nb_contracts"]
            ),
        },
    ]

    return {
        "archetype": archetype,
        "peer_scope": peer_scope,
        "peers_count": len([p for p in peers_ids if p != client_id]),
        "dimensions": dimensions,
    }


@app.get("/market-context")
def market_context(months: int = 24) -> dict:
    """
    Return full market-index time series + latest performance summary.
    Used by the Market page to overlay with client portfolio.
    """
    ds = DataStore.instance()
    df = ds["indices"].copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date")

    cutoff = df["date"].max() - pd.DateOffset(months=months)
    df = df[df["date"] >= cutoff]

    # Build merged series keyed by date with one column per index
    pivot = df.pivot_table(
        index="date", columns="code_indice", values="valeur", aggfunc="last"
    ).sort_index()
    # Normalize indices to base 100 for easy visual comparison
    first = pivot.iloc[0]
    normalized = pivot.divide(first).multiply(100)

    series = []
    for date, row in normalized.iterrows():
        point = {"date": date.strftime("%Y-%m-%d")}
        for col, val in row.items():
            if pd.notna(val):
                point[str(col)] = round(float(val), 2)
        series.append(point)

    # Latest value + 12m perf for each index
    summary = []
    labels_map = dict(zip(df["code_indice"], df["libelle_indice"]))
    for code in pivot.columns:
        col_series = pivot[code].dropna()
        if len(col_series) < 2:
            continue
        last = col_series.iloc[-1]
        first_val = col_series.iloc[0]
        perf = ((last / first_val) - 1) * 100 if first_val else 0.0
        summary.append(
            {
                "code": str(code),
                "label": labels_map.get(code, str(code)),
                "latest": round(float(last), 2),
                "performance_pct": round(float(perf), 2),
            }
        )

    return {"series": series, "summary": summary, "period_months": months}


@app.get("/clients/{client_id}/supports-performance")
def get_supports_performance(client_id: str, months: int = 24) -> dict:
    """
    Return time series + perf metrics for the investment supports (funds) held
    by the given client, derived from sheets 06_Supports_Detenus and 08_Histo_VL_Supports.
    """
    ds = DataStore.instance()
    if client_id not in ds["profil"]["client_id"].values:
        raise HTTPException(status_code=404, detail=f"Client {client_id} not found")

    supports = ds["supports"]
    held = supports[supports["client_id"] == client_id] if "client_id" in supports.columns else supports
    isins = held["isin"].dropna().unique().tolist() if "isin" in held.columns else []

    vl = ds["histo_vl"].copy()
    vl["date"] = pd.to_datetime(vl["date"])

    cutoff = vl["date"].max() - pd.DateOffset(months=months)
    vl = vl[vl["date"] >= cutoff]
    if isins:
        vl = vl[vl["isin"].isin(isins)]

    perfs = []
    series_by_isin: dict[str, list] = {}
    for isin, grp in vl.groupby("isin"):
        grp = grp.sort_values("date")
        if len(grp) < 2:
            continue
        first = float(grp.iloc[0]["vl_eur"])
        last = float(grp.iloc[-1]["vl_eur"])
        perf_pct = ((last / first) - 1) * 100 if first else 0.0
        libelle = grp.iloc[-1]["libelle"]
        perfs.append(
            {
                "isin": isin,
                "libelle": libelle,
                "latest_vl": round(last, 2),
                "performance_pct": round(perf_pct, 2),
            }
        )
        series_by_isin[isin] = [
            {
                "date": r["date"].strftime("%Y-%m-%d"),
                "vl": round(float(r["vl_eur"]), 2),
            }
            for _, r in grp.iterrows()
        ]

    perfs.sort(key=lambda p: p["performance_pct"], reverse=True)
    return {
        "period_months": months,
        "supports": perfs,
        "series_by_isin": series_by_isin,
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "clients_loaded": len(DataStore.instance().client_ids())}
