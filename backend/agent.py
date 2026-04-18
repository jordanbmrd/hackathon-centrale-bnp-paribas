"""
AI Agent: uses Mistral API (mistral-large-latest) with tool calling to answer advisor questions
about banking clients. Returns a structured response with text + optional chart data.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any

from mistralai import Mistral

from tools import TOOL_DEFINITIONS, call_tool

_client: Mistral | None = None


def _mistral() -> Mistral:
    global _client
    if _client is None:
        _client = Mistral(
            api_key=os.environ["MISTRAL_API_KEY"],
            timeout_ms=120_000,  # 2 minutes — LLM responses can be slow
        )
    return _client


SYSTEM_PROMPT = """Tu es un assistant IA expert en gestion de patrimoine pour les conseillers bancaires de BNP Paribas.

Ton rôle est d'aider les conseillers à préparer leurs réunions client en analysant les données financières disponibles.

Pour chaque question, tu dois :
1. Utiliser les outils disponibles pour récupérer les données pertinentes
2. Analyser et croiser les informations
3. Fournir une réponse **actionnable** et **concise**, orientée métier
4. Mettre en avant : faits notables, signaux faibles, tendances, opportunités, alertes et pistes de recommandation

Format de réponse :
- Commence par une synthèse courte (2-3 phrases max)
- Développe avec des points clés structurés (utilise des tirets ou sections)
- Termine par des recommandations concrètes si pertinent

Langue : français, ton professionnel mais accessible.
Ne liste pas les données brutes : interprète et contextualise.

Lorsque ta réponse contient des données chiffrées pour lesquelles un graphique serait utile (évolution du patrimoine, répartition des produits, flux financiers), inclus dans ta réponse un bloc JSON entre les balises <chart> et </chart> avec le format suivant :
- Pour une courbe d'évolution : {"type": "line", "title": "...", "data": [{"date": "YYYY-MM", "value": 1234}, ...]}
- Pour une répartition : {"type": "pie", "title": "...", "data": [{"name": "...", "value": 1234}, ...]}
- Pour des barres mensuelles : {"type": "bar", "title": "...", "dataKeys": ["revenus_eur", "depenses_eur", "epargne_nette_eur"], "data": [{"date": "YYYY-MM", "revenus_eur": 1234, ...}, ...]}
"""


def run_agent(
    messages: list[dict],
    client_id: str | None = None,
) -> dict[str, Any]:
    """
    Run the agent loop with tool calling.

    Args:
        messages: Full conversation history in chat format.
        client_id: Currently selected client (injected into system context).

    Returns:
        dict with keys:
            - text: str — the assistant's text response
            - chart: dict | None — parsed chart data if present
            - tool_calls_made: list[str] — names of tools called
    """
    mistral = _mistral()

    system_content = SYSTEM_PROMPT
    if client_id:
        system_content += f"\n\nClient actuellement sélectionné : {client_id}"

    full_messages: list[dict] = [{"role": "system", "content": system_content}] + messages

    tool_calls_made: list[str] = []
    max_iterations = 6

    for _ in range(max_iterations):
        response = mistral.chat.complete(
            model="mistral-large-latest",
            messages=full_messages,
            tools=TOOL_DEFINITIONS,
            tool_choice="auto",
        )

        msg = response.choices[0].message

        if msg.tool_calls:
            # Add the assistant message with tool calls to history
            full_messages.append({
                "role": "assistant",
                "content": msg.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in msg.tool_calls
                ],
            })

            for tc in msg.tool_calls:
                tool_name = tc.function.name
                tool_args = json.loads(tc.function.arguments)
                tool_calls_made.append(tool_name)

                result = call_tool(tool_name, tool_args)

                full_messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })
        else:
            # Final answer
            text = msg.content or ""
            chart = _extract_chart(text)
            clean_text = _remove_chart_block(text)
            return {
                "text": clean_text,
                "chart": chart,
                "tool_calls_made": tool_calls_made,
            }

    return {
        "text": "Je n'ai pas pu obtenir une réponse complète après plusieurs tentatives.",
        "chart": None,
        "tool_calls_made": tool_calls_made,
    }


def _extract_chart(text: str) -> dict | None:
    """Parse JSON chart data from <chart>...</chart> tags."""
    match = re.search(r"<chart>(.*?)</chart>", text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(1).strip())
    except json.JSONDecodeError:
        return None


def _remove_chart_block(text: str) -> str:
    """Remove <chart>...</chart> blocks from the text response."""
    return re.sub(r"\s*<chart>.*?</chart>\s*", "", text, flags=re.DOTALL).strip()


RADAR_PROMPT = """Tu es un expert en conseil patrimonial pour BNP Paribas, avec un œil aiguisé pour détecter ce que les conseillers ne voient pas au premier regard.

Voici les données complètes du client :

{data}

Ta mission : analyser de manière PROACTIVE ce dossier et produire un "radar conseil" qui aide le conseiller à préparer son prochain rendez-vous.

Retourne UNIQUEMENT un objet JSON valide (sans texte autour, sans balises markdown) avec EXACTEMENT cette structure :

{{
  "insights": [
    {{
      "id": "ins-1",
      "type": "opportunite" | "risque" | "incoherence" | "evenement",
      "priority": "haute" | "moyenne" | "basse",
      "title": "titre court et percutant (max 70 caractères)",
      "diagnostic": "1 à 2 phrases factuelles citant des chiffres précis ou des produits du dossier",
      "suggested_action": "action concrète que le conseiller peut engager",
      "question_to_ask": "question ouverte à poser au client pour qualifier le besoin",
      "impact": "bénéfice attendu (patrimonial, fiscal, de risque, relationnel...)"
    }}
  ],
  "agenda": {{
    "duration_min": 30,
    "objective": "phrase courte résumant l'objectif principal du RDV",
    "opening_sentence": "phrase d'accroche naturelle pour démarrer le RDV",
    "topics": [
      {{
        "title": "titre du sujet",
        "duration_min": 10,
        "key_points": ["point clé 1", "point clé 2"]
      }}
    ],
    "documents_to_prepare": ["document ou support à préparer"],
    "follow_up": "prochaine échéance ou action post-RDV"
  }}
}}

RÈGLES STRICTES :
- Entre 3 et 5 insights, triés par priorité décroissante.
- Privilégie par ordre d'intérêt : les INCOHÉRENCES (ex : profil prudent + forte exposition actions, projet court terme + faible liquidité, concentration excessive d'un produit), les ÉVÉNEMENTS DE VIE récents, les OPPORTUNITÉS fiscales/patrimoniales, les RISQUES.
- Chaque insight DOIT citer des données précises du dossier (montants, pourcentages, noms de produits, dates).
- L'agenda tient en 30 minutes max, 3 à 4 sujets maximum.
- Tout en français.
- Ne renvoie RIEN d'autre que le JSON.
"""


def generate_client_radar(client_id: str) -> dict[str, Any]:
    """
    Generate a proactive 'advisor radar' for one client:
    auto-detected insights + ready-to-use meeting agenda.
    """
    from tools import (
        get_client_profile,
        get_contracts,
        get_events,
        get_financial_flows,
        get_investment_positions,
        get_portfolio_evolution,
        get_projects,
    )

    profile = get_client_profile(client_id)
    if "error" in profile:
        return {"error": profile["error"]}

    data = {
        "profile": profile,
        "contracts": get_contracts(client_id),
        "portfolio_evolution": get_portfolio_evolution(client_id, months=24),
        "flows_last_24m": get_financial_flows(client_id),
        "projects": get_projects(client_id),
        "positions": get_investment_positions(client_id),
        "events_last_24m": get_events(client_id, recent_months=24),
    }

    mistral = _mistral()
    prompt = RADAR_PROMPT.format(data=json.dumps(data, ensure_ascii=False, default=str))

    response = mistral.chat.complete(
        model="mistral-large-latest",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.4,
    )

    raw = response.choices[0].message.content or "{}"
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: try to extract a JSON object from the text
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        parsed = json.loads(match.group(0)) if match else {"insights": [], "agenda": None}

    # Normalize & cap
    insights = parsed.get("insights") or []
    if isinstance(insights, list):
        insights = insights[:5]
    parsed["insights"] = insights
    parsed.setdefault("agenda", None)
    return parsed


def build_meeting_brief_prompt(client_id: str) -> list[dict]:
    """Return messages that instruct the agent to produce a full meeting brief."""
    return [
        {
            "role": "user",
            "content": (
                f"Prépare une fiche de préparation complète pour ma réunion avec le client {client_id}. "
                "La fiche doit couvrir :\n"
                "1. Situation financière globale (patrimoine, produits clés, encours)\n"
                "2. Santé financière (revenus, capacité d'épargne, taux d'endettement si applicable)\n"
                "3. Projets et objectifs déclarés\n"
                "4. Changements récents et événements de vie notables\n"
                "5. Alertes et points de vigilance\n"
                "6. Opportunités produits à évoquer lors de la réunion\n"
                "Sois concis et actionnable."
            ),
        }
    ]
