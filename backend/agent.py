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
