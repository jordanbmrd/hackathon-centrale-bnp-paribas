"""
AI Agent with LangChain multi-agent orchestration.
Specialists run in parallel, then a synthesizer returns concise advisor guidance
with optional chart data.
"""
from __future__ import annotations

import json
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from langchain_core.prompts import ChatPromptTemplate
from langchain_mistralai import ChatMistralAI

from tools import (
    get_client_profile,
    get_contracts,
    get_events,
    get_financial_flows,
    get_investment_positions,
    get_market_context,
    get_portfolio_evolution,
    get_projects,
)


def _llm(temperature: float = 0.2) -> ChatMistralAI:
    return ChatMistralAI(
        model="mistral-large-latest",
        api_key=os.environ["MISTRAL_API_KEY"],
        temperature=temperature,
        timeout=120,
    )


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
- Courbe : {{"type": "line", "title": "...", "data": [{{"date": "YYYY-MM", "value": 1234}}, ...]}}
- Répartition : {{"type": "pie", "title": "...", "data": [{{"name": "...", "value": 1234}}, ...]}}
- Barres : {{"type": "bar", "title": "...", "dataKeys": ["revenus_eur", "depenses_eur", "epargne_nette_eur"], "data": [{{"date": "YYYY-MM", "revenus_eur": 1234, ...}}, ...]}}
N'ajoute un graphique que s'il apporte une vraie valeur, sinon omets-le.

BOUTONS D'ACTION — proactifs :
Lorsque ta réponse évoque une opportunité concrète (projet de financement, ouverture de produit, RDV, rééquilibrage, document à envoyer, simulation, proposition), ajoute un bloc JSON entre <actions> et </actions> listant 1 à 3 boutons d'action contextuels :
<actions>
[
  {{"label": "Simuler un crédit immobilier", "type": "simulate_loan", "icon": "calculator"}},
  {{"label": "Proposer une assurance-vie", "type": "open_product", "icon": "shield", "product": "Assurance-vie"}},
  {{"label": "Planifier un RDV", "type": "schedule_meeting", "icon": "calendar"}}
]
</actions>
Types autorisés (choisis le plus pertinent) :
- simulate_loan (icon: calculator) — simuler un prêt / financement
- open_product (icon: shield | piggy-bank | trending-up) — proposer l'ouverture d'un produit (inclure un champ "product")
- schedule_meeting (icon: calendar) — planifier un rendez-vous
- send_document (icon: file-text) — envoyer un document / une plaquette
- generate_proposition (icon: sparkles) — générer une proposition d'investissement
- contact_client (icon: mail | phone) — contacter le client
- rebalance_portfolio (icon: refresh-cw) — rééquilibrer l'allocation
- update_risk_profile (icon: sliders) — mettre à jour le profil de risque
Règles :
- N'ajoute des boutons QUE si ta réponse crée clairement une opportunité d'action (sinon omets le bloc).
- Max 3 boutons, le plus actionnable en premier.
- Les libellés sont courts (max 32 caractères), à l'impératif ou à l'infinitif.
- JAMAIS d'action inventée ou hors contexte BNP.
"""

SPECIALIST_PROMPTS = {
    "profil": (
        "Tu es l'agent spécialiste PROFIL CLIENT. "
        "Tu analyses situation familiale, revenus, patrimoine, objectifs, événements. "
        "Retourne 3 puces max, orientées diagnostic utile au conseiller."
    ),
    "allocation": (
        "Tu es l'agent spécialiste ALLOCATION/INVESTISSEMENT. "
        "Tu analyses contrats, positions, diversification, performance, risques de concentration. "
        "Retourne 3 puces max avec chiffres précis."
    ),
    "actions": (
        "Tu es l'agent spécialiste ACTIONS COMMERCIALES. "
        "Tu proposes les meilleures actions de RDV: opportunités, vigilance, next step concret. "
        "Retourne 3 puces max et 1 action recommandée."
    ),
}


def _serialize_messages(messages: list[dict]) -> str:
    lines: list[str] = []
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        lines.append(f"{role.upper()}: {content}")
    return "\n".join(lines).strip()


def _build_client_context(client_id: str) -> tuple[dict[str, Any], list[str]]:
    context = {
        "profile": get_client_profile(client_id),
        "contracts": get_contracts(client_id),
        "portfolio_evolution": get_portfolio_evolution(client_id, months=24),
        "flows_last_24m": get_financial_flows(client_id),
        "projects": get_projects(client_id),
        "positions": get_investment_positions(client_id),
        "events_last_24m": get_events(client_id, recent_months=24),
        "market_context": get_market_context(months=12),
    }
    tool_calls = list(context.keys())
    return context, tool_calls


def _run_specialist(
    specialist_name: str,
    specialist_prompt: str,
    conversation_text: str,
    client_context_json: str,
) -> str:
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", specialist_prompt),
            (
                "user",
                "Conversation conseiller:\n{conversation_text}\n\n"
                "Données client (JSON):\n{client_context_json}\n\n"
                "Réponds en puces courtes et chiffrées.",
            ),
        ]
    )
    chain = prompt | _llm(temperature=0.1)
    out = chain.invoke(
        {
            "conversation_text": conversation_text,
            "client_context_json": client_context_json,
        }
    )
    content = getattr(out, "content", "")
    return f"[{specialist_name}] {content}".strip()


def run_agent(
    messages: list[dict],
    client_id: str | None = None,
) -> dict[str, Any]:
    """
    Run a LangChain multi-agent flow:
    - Load client context via internal tools
    - Execute specialist agents in parallel
    - Synthesize a final concise advisor answer

    Args:
        messages: Full conversation history in chat format.
        client_id: Currently selected client (injected into system context).

    Returns:
        dict with keys:
            - text: str — the assistant's text response
            - chart: dict | None — parsed chart data if present
            - tool_calls_made: list[str] — internal data calls made
    """
    conversation_text = _serialize_messages(messages)

    context: dict[str, Any] = {}
    tool_calls_made: list[str] = []
    if client_id:
        context, tool_calls_made = _build_client_context(client_id)
        if "error" in (context.get("profile") or {}):
            return {
                "text": context["profile"]["error"],
                "chart": None,
                "tool_calls_made": tool_calls_made,
            }

    context_json = json.dumps(context, ensure_ascii=False, default=str)

    specialist_outputs: list[str] = []
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = [
            pool.submit(
                _run_specialist,
                name,
                prompt,
                conversation_text,
                context_json,
            )
            for name, prompt in SPECIALIST_PROMPTS.items()
        ]
        for future in as_completed(futures):
            try:
                specialist_outputs.append(future.result())
            except Exception as exc:  # noqa: BLE001
                specialist_outputs.append(f"[specialist-error] {exc}")

    synth_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", SYSTEM_PROMPT),
            (
                "user",
                "Conversation conseiller:\n{conversation_text}\n\n"
                "Client actuellement sélectionné : {client_id}\n\n"
                "Analyses des agents spécialistes:\n{specialist_outputs}\n\n"
                "Contexte client JSON:\n{context_json}\n\n"
                "Produis la réponse finale selon les règles de format.",
            ),
        ]
    )
    chain = synth_prompt | _llm(temperature=0.2)
    msg = chain.invoke(
        {
            "conversation_text": conversation_text,
            "client_id": client_id or "Aucun",
            "specialist_outputs": "\n".join(specialist_outputs),
            "context_json": context_json,
        }
    )
    text = getattr(msg, "content", "") or ""
    chart = _extract_chart(text)
    actions = _extract_actions(text)
    clean_text = _remove_chart_block(text)
    clean_text = _remove_actions_block(clean_text)
    return {
        "text": clean_text,
        "chart": chart,
        "actions": actions,
        "tool_calls_made": tool_calls_made + ["multi_agent_orchestration"],
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


_ALLOWED_ACTION_TYPES = {
    "simulate_loan",
    "open_product",
    "schedule_meeting",
    "send_document",
    "generate_proposition",
    "contact_client",
    "rebalance_portfolio",
    "update_risk_profile",
}


def _extract_actions(text: str) -> list[dict] | None:
    """Parse JSON list of suggested action buttons from <actions>...</actions>."""
    match = re.search(r"<actions>(.*?)</actions>", text, re.DOTALL)
    if not match:
        return None
    try:
        data = json.loads(match.group(1).strip())
    except json.JSONDecodeError:
        return None
    if not isinstance(data, list):
        return None
    cleaned: list[dict] = []
    for item in data[:3]:
        if not isinstance(item, dict):
            continue
        action_type = item.get("type")
        label = (item.get("label") or "").strip()
        if not label or action_type not in _ALLOWED_ACTION_TYPES:
            continue
        cleaned.append(
            {
                "label": label[:40],
                "type": action_type,
                "icon": item.get("icon") or None,
                "product": item.get("product") or None,
            }
        )
    return cleaned or None


def _remove_actions_block(text: str) -> str:
    """Remove <actions>...</actions> blocks from the text response."""
    return re.sub(r"\s*<actions>.*?</actions>\s*", "", text, flags=re.DOTALL).strip()


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

    prompt = RADAR_PROMPT.format(data=json.dumps(data, ensure_ascii=False, default=str))
    response = _llm(temperature=0.4).invoke(prompt)
    raw = getattr(response, "content", "") or "{}"
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
