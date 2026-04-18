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


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "clients_loaded": len(DataStore.instance().client_ids())}
