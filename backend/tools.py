"""
Query tools that the AI agent can call.
Each function takes a client_id (and optional parameters), queries the DataStore,
and returns a JSON-serialisable dict.

The TOOL_DEFINITIONS list at the bottom contains the OpenAI function-calling schemas.
"""
from __future__ import annotations

import json
from typing import Any

import pandas as pd

from data_loader import DataStore


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ds() -> DataStore:
    return DataStore.instance()


def _rows(df: pd.DataFrame) -> list[dict]:
    return df.to_dict(orient="records")


def _client_rows(df: pd.DataFrame, client_id: str) -> list[dict]:
    return _rows(df[df["client_id"] == client_id])


# ---------------------------------------------------------------------------
# Tool functions
# ---------------------------------------------------------------------------

def get_client_profile(client_id: str) -> dict:
    """Return full 360° profile including household info."""
    ds = _ds()
    profil = ds["profil"][ds["profil"]["client_id"] == client_id]
    foyer = ds["foyer"][ds["foyer"]["client_id"] == client_id]
    if profil.empty:
        return {"error": f"Client {client_id} not found"}
    result = profil.to_dict(orient="records")[0]
    if not foyer.empty:
        result["foyer"] = foyer.to_dict(orient="records")[0]
    return result


def get_contracts(client_id: str) -> dict:
    """Return all active contracts/products with their detailed characteristics."""
    ds = _ds()
    contrats = ds["contrats"][ds["contrats"]["client_id"] == client_id]
    carac = ds["caracteristiques"][ds["caracteristiques"]["client_id"] == client_id]

    result = []
    for _, row in contrats.iterrows():
        c = row.to_dict()
        details = carac[carac["contrat_id"] == c["contrat_id"]]
        if not details.empty:
            c["details"] = details.to_dict(orient="records")[0]
        result.append(c)

    total = contrats["encours_eur"].sum() if not contrats.empty else 0
    return {"contracts": result, "total_encours_eur": round(total, 2)}


def get_portfolio_evolution(client_id: str, months: int = 24) -> dict:
    """Return monthly portfolio valuation history for the last N months, with total per date."""
    ds = _ds()
    df = ds["histo_valo"][ds["histo_valo"]["client_id"] == client_id].copy()
    df = df[df["encours_eur"].notna()]
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date")

    if months > 0:
        cutoff = df["date"].max() - pd.DateOffset(months=months)
        df = df[df["date"] >= cutoff]

    grouped = (
        df.groupby("date")["encours_eur"]
        .sum()
        .reset_index()
        .rename(columns={"encours_eur": "total_eur"})
    )
    grouped["date"] = grouped["date"].dt.strftime("%Y-%m-%d")

    series = grouped.to_dict(orient="records")

    perf = None
    if len(series) >= 2:
        v_start = series[0]["total_eur"]
        v_end = series[-1]["total_eur"]
        if v_start and v_start != 0:
            perf = round((v_end - v_start) / v_start * 100, 2)

    return {
        "series": series,
        "performance_pct": perf,
        "period_months": months,
    }


def get_financial_flows(client_id: str, year: int | None = None) -> dict:
    """Return monthly revenue / expenses / net savings, optionally filtered by year."""
    ds = _ds()
    df = ds["flux"][ds["flux"]["client_id"] == client_id].copy()
    df["date"] = pd.to_datetime(df["date"])

    if year:
        df = df[df["date"].dt.year == year]

    df = df.sort_values("date")
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")

    records = df.drop(columns=["client_id"]).to_dict(orient="records")
    totals: dict[str, Any] = {}
    if not df.empty:
        totals = {
            "total_revenus_eur": round(df["revenus_eur"].sum(), 2),
            "total_depenses_eur": round(df["depenses_eur"].sum(), 2),
            "total_epargne_nette_eur": round(df["epargne_nette_eur"].sum(), 2),
            "taux_epargne_moyen_pct": round(
                df["epargne_nette_eur"].sum() / df["revenus_eur"].sum() * 100, 2
            )
            if df["revenus_eur"].sum() != 0
            else None,
        }
    return {"flux": records, "totals": totals}


def get_projects(client_id: str) -> dict:
    """Return the client's declared financial projects and objectives."""
    ds = _ds()
    df = ds["projets"][ds["projets"]["client_id"] == client_id]
    return {
        "projects": _rows(df),
        "count": len(df),
        "total_montant_cible_eur": round(df["montant_cible_eur"].sum(), 2) if not df.empty else 0,
    }


def get_investment_positions(client_id: str) -> dict:
    """Return current investment positions (supports UC) with asset class breakdown."""
    ds = _ds()
    df = ds["supports"][ds["supports"]["client_id"] == client_id]
    if df.empty:
        return {"positions": [], "allocation_by_asset_class": []}

    by_class = (
        df.groupby("classe_actif")["valorisation_courante_eur"]
        .sum()
        .reset_index()
        .rename(columns={"valorisation_courante_eur": "total_eur"})
        .sort_values("total_eur", ascending=False)
    )
    by_class["total_eur"] = by_class["total_eur"].round(2)

    total = df["valorisation_courante_eur"].sum()
    by_class["pct"] = (by_class["total_eur"] / total * 100).round(1)

    return {
        "positions": _rows(df),
        "allocation_by_asset_class": by_class.to_dict(orient="records"),
        "total_valorisation_eur": round(total, 2),
    }


def get_events(client_id: str, recent_months: int = 18) -> dict:
    """Return life events and advisor interactions, most recent first."""
    ds = _ds()
    df = ds["evenements"][ds["evenements"]["client_id"] == client_id].copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date", ascending=False)

    if recent_months > 0:
        cutoff = df["date"].max() - pd.DateOffset(months=recent_months) if not df.empty else None
        if cutoff is not None:
            df = df[df["date"] >= cutoff]

    df["date"] = df["date"].dt.strftime("%Y-%m-%d")
    important = df[df["criticite"] == "Important"]
    return {
        "events": _rows(df),
        "important_events": _rows(important),
        "total_count": len(df),
    }


def get_market_context(months: int = 12) -> dict:
    """Return recent market index values for contextualising portfolio performance."""
    ds = _ds()
    df = ds["indices"].copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date")

    cutoff = df["date"].max() - pd.DateOffset(months=months)
    df = df[df["date"] >= cutoff]
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")

    by_index: dict[str, list] = {}
    for code, grp in df.groupby("code_indice"):
        by_index[code] = grp[["date", "valeur", "libelle_indice"]].to_dict(orient="records")

    # latest values
    latest = df.sort_values("date").groupby("code_indice").last().reset_index()
    perf: dict[str, Any] = {}
    for _, row in latest.iterrows():
        code = row["code_indice"]
        first = df[df["code_indice"] == code].iloc[0]["valeur"]
        last_val = row["valeur"]
        perf[code] = {
            "label": row["libelle_indice"],
            "latest": round(last_val, 2),
            "perf_pct": round((last_val - first) / first * 100, 2) if first else None,
        }

    return {"indices": by_index, "summary": perf}


# ---------------------------------------------------------------------------
# Tool dispatcher (called by agent.py)
# ---------------------------------------------------------------------------

TOOL_FUNCTIONS: dict[str, Any] = {
    "get_client_profile": get_client_profile,
    "get_contracts": get_contracts,
    "get_portfolio_evolution": get_portfolio_evolution,
    "get_financial_flows": get_financial_flows,
    "get_projects": get_projects,
    "get_investment_positions": get_investment_positions,
    "get_events": get_events,
    "get_market_context": get_market_context,
}


def call_tool(name: str, args: dict) -> str:
    fn = TOOL_FUNCTIONS.get(name)
    if fn is None:
        return json.dumps({"error": f"Unknown tool: {name}"})
    try:
        result = fn(**args)
        return json.dumps(result, ensure_ascii=False, default=str)
    except Exception as exc:  # noqa: BLE001
        return json.dumps({"error": str(exc)})


# ---------------------------------------------------------------------------
# OpenAI tool schemas
# ---------------------------------------------------------------------------

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_client_profile",
            "description": (
                "Retourne le profil complet 360° du client : données personnelles, "
                "CSP, revenus déclarés, profil de risque, situation familiale et logement."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "client_id": {"type": "string", "description": "Identifiant du client (ex: CLI00001)"}
                },
                "required": ["client_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_contracts",
            "description": (
                "Retourne tous les contrats et produits détenus par le client "
                "(compte courant, livrets, assurance-vie, PER, crédits…) "
                "avec les caractéristiques détaillées et l'encours total."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "client_id": {"type": "string", "description": "Identifiant du client"}
                },
                "required": ["client_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_portfolio_evolution",
            "description": (
                "Retourne l'historique mensuel de valorisation du patrimoine du client. "
                "Calcule aussi la performance sur la période. "
                "Utile pour répondre à 'le client a-t-il gagné de l\\'argent ?'"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "client_id": {"type": "string"},
                    "months": {
                        "type": "integer",
                        "description": "Nombre de mois d'historique à retourner (défaut: 24)",
                    },
                },
                "required": ["client_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_financial_flows",
            "description": (
                "Retourne les flux financiers mensuels du client : revenus, dépenses, épargne nette. "
                "Peut être filtré par année. Permet d'évaluer la capacité d'épargne."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "client_id": {"type": "string"},
                    "year": {
                        "type": "integer",
                        "description": "Année à filtrer (optionnel). Exemple: 2024",
                    },
                },
                "required": ["client_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_projects",
            "description": (
                "Retourne les projets et objectifs financiers déclarés par le client "
                "(achat immobilier, retraite, études des enfants…) avec horizon et montant cible."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "client_id": {"type": "string"}
                },
                "required": ["client_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_investment_positions",
            "description": (
                "Retourne les positions en supports d'investissement (UC, fonds, SCPI…) "
                "avec la répartition par classe d'actif et zone géographique."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "client_id": {"type": "string"}
                },
                "required": ["client_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_events",
            "description": (
                "Retourne les événements de vie récents et les interactions conseiller "
                "(changement d'emploi, mariage, réclamations, questions produits…). "
                "Les événements 'Important' sont mis en avant."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "client_id": {"type": "string"},
                    "recent_months": {
                        "type": "integer",
                        "description": "Nombre de mois en arrière (défaut: 18)",
                    },
                },
                "required": ["client_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_market_context",
            "description": (
                "Retourne les valeurs récentes des indices de marché (CAC 40, etc.) "
                "pour contextualiser la performance du portefeuille client."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "months": {
                        "type": "integer",
                        "description": "Nombre de mois d'historique marché (défaut: 12)",
                    }
                },
                "required": [],
            },
        },
    },
]
