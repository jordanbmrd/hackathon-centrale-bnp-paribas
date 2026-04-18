"""
AI Agent: uses Mistral API (mistral-large-latest) with tool calling to answer advisor questions
about banking clients. Returns a structured response with text + optional chart data.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any

from mistralai.client import Mistral

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


SYSTEM_PROMPT = """Tu es un assistant IA expert en gestion de patrimoine pour les conseillers BNP Paribas.

Ton rôle : répondre de manière ultra-concise et actionnable aux questions du conseiller.

RÈGLES DE RÉPONSE — STRICTES :
- Longueur totale : 80 mots maximum par défaut.
- Format obligatoire :
  1. Une réponse directe en 1 phrase (la conclusion d'abord).
  2. 2 à 4 puces factuelles, max 15 mots chacune, avec chiffres précis.
  3. Si pertinent, 1 ligne "→ Action :" avec une recommandation concrète.
- JAMAIS de phrases de remplissage ("Il est important de noter…", "En conclusion…", etc.).
- JAMAIS de paraphrase de la question ni de disclaimer.
- Interprète, ne liste pas les données brutes.
- Français, ton direct et professionnel.

Utilise les outils pour récupérer les données AVANT de répondre.

Si un graphique renforce la réponse (évolution, répartition, flux), ajoute un bloc JSON entre <chart> et </chart> :
- Courbe : {"type": "line", "title": "...", "data": [{"date": "YYYY-MM", "value": 1234}, ...]}
- Répartition : {"type": "pie", "title": "...", "data": [{"name": "...", "value": 1234}, ...]}
- Barres : {"type": "bar", "title": "...", "dataKeys": ["revenus_eur", "depenses_eur", "epargne_nette_eur"], "data": [{"date": "YYYY-MM", "revenus_eur": 1234, ...}, ...]}
N'ajoute un graphique que s'il apporte une vraie valeur, sinon omets-le.
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


RADAR_PROMPT = """Tu es un expert en conseil patrimonial BNP Paribas, spécialisé dans la détection de signaux faibles.

Données client :

{data}

Mission : produire un "radar conseil" ULTRA-CONCIS pour préparer le prochain RDV.

Retourne UNIQUEMENT un objet JSON valide (aucun texte autour, aucune balise markdown) :

{{
  "insights": [
    {{
      "id": "ins-1",
      "type": "opportunite" | "risque" | "incoherence" | "evenement",
      "priority": "haute" | "moyenne" | "basse",
      "title": "titre percutant, max 55 caractères",
      "diagnostic": "1 phrase factuelle avec chiffres (max 22 mots)",
      "suggested_action": "verbe d'action + objet, max 12 mots",
      "question_to_ask": "1 question ouverte, max 14 mots",
      "impact": "3 à 6 mots, style télégraphique"
    }}
  ],
  "agenda": {{
    "duration_min": 30,
    "objective": "1 phrase, max 18 mots",
    "opening_sentence": "phrase naturelle d'accroche, max 20 mots",
    "topics": [
      {{
        "title": "titre court",
        "duration_min": 10,
        "key_points": ["puce max 10 mots", "puce max 10 mots"]
      }}
    ],
    "documents_to_prepare": ["nom court"],
    "follow_up": "max 15 mots"
  }}
}}

RÈGLES STRICTES :
- Entre 3 et 5 insights, triés par priorité décroissante.
- Chaque insight DOIT citer un chiffre ou un produit précis du dossier.
- Priorités à privilégier : INCOHÉRENCES (profil vs allocation, horizon vs liquidité), ÉVÉNEMENTS récents, OPPORTUNITÉS fiscales, RISQUES.
- ZÉRO remplissage, vocabulaire métier, factuel.
- Max 3-4 topics dans l'agenda, max 2 key_points par topic.
- Français uniquement.
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
