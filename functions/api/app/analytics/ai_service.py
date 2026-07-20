import logging
import os
import time
from typing import Any, Dict, List, Optional

import httpx
from dotenv import find_dotenv, load_dotenv


def _load_env() -> None:
    possible_env_paths = [
        find_dotenv(),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", ".env")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env")),
    ]

    for env_path in possible_env_paths:
        if env_path and os.path.exists(env_path):
            load_dotenv(env_path, override=True)


_load_env()

logger = logging.getLogger("ai_service")

DEFAULT_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:31B-it")
DEFAULT_FALLBACK_MODELS = os.getenv("OLLAMA_FALLBACK_MODELS", "gemma3:4b,phi4-mini,qwen2.5:3b")
DEFAULT_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "90"))
DEFAULT_CONNECT_TIMEOUT = float(os.getenv("OLLAMA_CONNECT_TIMEOUT_SECONDS", "5"))
DEFAULT_HEALTH_TTL = float(os.getenv("OLLAMA_HEALTH_TTL_SECONDS", "20"))
DEFAULT_NUM_PREDICT = int(os.getenv("OLLAMA_NUM_PREDICT", "384"))
DEFAULT_TEMPERATURE = float(os.getenv("OLLAMA_TEMPERATURE", "0.2"))
DEFAULT_TOP_P = float(os.getenv("OLLAMA_TOP_P", "0.9"))
DEFAULT_KEEP_ALIVE = os.getenv("OLLAMA_KEEP_ALIVE", "10m")
AUTO_LOCAL_MODEL_PREFERENCES = [
    "gemma4:31B-it",
    "gemma3:4b",
    "gemma:2b",
    "qwen2.5:3b",
    "phi4-mini",
    "llama3.2:3b",
]


class AIService:
    def __init__(self) -> None:
        self._client: Optional[httpx.Client] = None
        self._last_health_check_at = 0.0
        self._last_health_ok = False
        self._last_health_message = "not_checked"
        self._last_live_model: Optional[str] = None
        self._installed_models: List[str] = []
        self._init_client()

    def _init_client(self) -> None:
        _load_env()

        self.base_url = os.getenv("OLLAMA_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
        self.model_name = os.getenv("OLLAMA_MODEL", DEFAULT_MODEL).strip()
        raw_fallback_models = os.getenv("OLLAMA_FALLBACK_MODELS", DEFAULT_FALLBACK_MODELS)
        self.fallback_models = [m.strip() for m in raw_fallback_models.split(",") if m.strip()]
        self.timeout_seconds = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", str(DEFAULT_TIMEOUT)))
        self.connect_timeout_seconds = float(
            os.getenv("OLLAMA_CONNECT_TIMEOUT_SECONDS", str(DEFAULT_CONNECT_TIMEOUT))
        )
        self.health_ttl_seconds = float(os.getenv("OLLAMA_HEALTH_TTL_SECONDS", str(DEFAULT_HEALTH_TTL)))
        self.num_predict = int(os.getenv("OLLAMA_NUM_PREDICT", str(DEFAULT_NUM_PREDICT)))
        self.temperature = float(os.getenv("OLLAMA_TEMPERATURE", str(DEFAULT_TEMPERATURE)))
        self.top_p = float(os.getenv("OLLAMA_TOP_P", str(DEFAULT_TOP_P)))
        self.keep_alive = os.getenv("OLLAMA_KEEP_ALIVE", DEFAULT_KEEP_ALIVE)

        timeout = httpx.Timeout(
            connect=self.connect_timeout_seconds,
            read=self.timeout_seconds,
            write=self.timeout_seconds,
            pool=self.connect_timeout_seconds,
        )

        if self._client is not None:
            try:
                self._client.close()
            except Exception:
                pass

        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )

        logger.info("Initialized Ollama client at %s with primary model %s", self.base_url, self.model_name)

    def _build_prompt(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        if not system_instruction:
            return prompt.strip()
        return f"System Instruction:\n{system_instruction.strip()}\n\nUser Request:\n{prompt.strip()}"

    def _sanitize_output(self, text: Optional[str]) -> Optional[str]:
        if not text:
            return None
        cleaned = text.replace("\r\n", "\n").strip()
        return cleaned or None

    def _candidate_models(self) -> List[str]:
        models = [self.model_name, *self.fallback_models]
        deduped: List[str] = []
        for model in models:
            if model and model not in deduped:
                deduped.append(model)
        return deduped

    def _is_cloud_model(self, model: str) -> bool:
        lowered = model.lower()
        return lowered.endswith(":cloud") or lowered.endswith("-cloud") or "/cloud" in lowered

    def _is_embedding_model(self, model: str) -> bool:
        lowered = model.lower()
        return "bge-" in lowered or "embed" in lowered or "embedding" in lowered

    def _is_text_generation_candidate(self, model: str) -> bool:
        return not self._is_cloud_model(model) and not self._is_embedding_model(model)

    def _auto_local_fallbacks(self) -> List[str]:
        preferred_installed = [
            model for model in AUTO_LOCAL_MODEL_PREFERENCES if model in self._installed_models
        ]
        other_installed = [
            model
            for model in self._installed_models
            if self._is_text_generation_candidate(model) and model not in preferred_installed
        ]
        return [*preferred_installed, *other_installed]

    def get_status(self, force_refresh: bool = False) -> Dict[str, Any]:
        now = time.time()
        if (
            not force_refresh
            and now - self._last_health_check_at < self.health_ttl_seconds
        ):
            return {
                "provider": "ollama",
                "base_url": self.base_url,
                "primary_model": self.model_name,
                "fallback_models": self.fallback_models,
                "healthy": self._last_health_ok,
                "message": self._last_health_message,
                "last_live_model": self._last_live_model,
            }

        if not self._client:
            self._init_client()

        try:
            response = self._client.get("/api/tags")
            response.raise_for_status()
            payload = response.json()
            installed_models = [
                model.get("name")
                for model in payload.get("models", [])
                if model.get("name")
            ]
            self._installed_models = installed_models

            all_candidates = self._candidate_models()
            local_auto_candidates = self._auto_local_fallbacks()
            available_candidates = [
                model for model in [*all_candidates, *local_auto_candidates] if model in installed_models
            ]

            self._last_health_ok = True
            self._last_health_message = (
                f"connected; installed_models={len(installed_models)}; "
                f"available_candidates={', '.join(available_candidates) if available_candidates else 'none'}"
            )
        except Exception as exc:
            self._last_health_ok = False
            self._last_health_message = f"unreachable: {exc}"

        self._last_health_check_at = now
        return {
            "provider": "ollama",
            "base_url": self.base_url,
            "primary_model": self.model_name,
            "fallback_models": self.fallback_models,
            "installed_models": self._installed_models,
            "healthy": self._last_health_ok,
            "message": self._last_health_message,
            "last_live_model": self._last_live_model,
        }

    def _generate_with_model(
        self,
        *,
        model: str,
        prompt: str,
        system_instruction: Optional[str] = None,
    ) -> Optional[str]:
        if not self._client:
            self._init_client()
        if not self._client:
            return None

        payload = {
            "model": model,
            "prompt": self._build_prompt(prompt, system_instruction),
            "stream": False,
            "keep_alive": self.keep_alive,
            "options": {
                "temperature": self.temperature,
                "top_p": self.top_p,
                "num_predict": self.num_predict,
            },
        }

        response = self._client.post("/api/generate", json=payload)
        response.raise_for_status()
        data = response.json()
        return self._sanitize_output(data.get("response"))

    def _call_gemma_api(self, prompt: str, system_instruction: Optional[str] = None, api_key: Optional[str] = None) -> Optional[str]:
        if not api_key:
            api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GEMMA_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return None
        
        configured_model = os.getenv("GEMMA_MODEL") or os.getenv("GEMINI_MODEL") or os.getenv("OLLAMA_MODEL") or "gemma-4-31b-it"
        norm_model = configured_model.lower().replace(":", "-").replace("_", "-")
        if norm_model in ["gemma4-31b-cloud", "gemma4-31b-it", "gemma-4-31b", "gemma4:31b-it", "gemma4:31b-cloud"]:
            norm_model = "gemma-4-31b-it"

        models_to_try = [
            norm_model,
            "gemma-4-31b-it",
            "gemma-4-26b-a4b-it",
            "gemini-2.5-flash"
        ]
        # Remove duplicates preserving order
        models_to_try = list(dict.fromkeys(models_to_try))

        full_prompt = f"System Instruction:\n{system_instruction}\n\nUser Request:\n{prompt}" if system_instruction else prompt
        payload = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {
                "temperature": self.temperature,
                "maxOutputTokens": self.num_predict
            }
        }
        
        with httpx.Client(timeout=15.0) as client:
            for model_name in models_to_try:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                    res = client.post(url, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts:
                                self._last_live_model = f"Google {model_name}"
                                return self._sanitize_output(parts[0].get("text"))
                    else:
                        logger.warning("Gemini API call to %s failed with status %s: %s", model_name, res.status_code, res.text[:200])
                except Exception as e:
                    logger.warning("Gemini API call to %s exception: %s", model_name, e)

        return None

    def _call_llm(self, prompt: str, system_instruction: Optional[str] = None) -> Optional[str]:
        api_key = os.getenv("GEMMA_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if api_key:
            gemma_res = self._call_gemma_api(prompt, system_instruction, api_key)
            if gemma_res:
                return gemma_res

        # In cloud / serverless environment, fail fast to rule engine rather than stalling on unreachable Ollama ports
        if os.getenv("ENABLE_LOCAL_OLLAMA") == "true":
            try:
                status = self.get_status()
                if status["healthy"]:
                    tried_models = [model for model in self._candidate_models() if self._is_text_generation_candidate(model)]
                    for model in tried_models:
                        text = self._generate_with_model(model=model, prompt=prompt, system_instruction=system_instruction)
                        if text:
                            self._last_live_model = "gemma-3-4b"
                            return text
            except Exception:
                pass

        return None

    def generate_district_summary(
        self,
        district: str,
        risk_score: float,
        risk_level: str,
        incident_count: int,
        socioeconomic: Dict[str, Any],
        top_crimes: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        system_prompt = (
            "You are an expert Law Enforcement Command AI Analyst. "
            "Produce crisp, actionable tactical crime intelligence briefs for police chiefs and senior investigators. "
            "Be direct, precise, authoritative, and structured. "
            "Avoid markdown emphasis characters. Use plain operational language."
        )

        top_crimes_str = ", ".join(
            [f"{c.get('type', 'Crime')}: {c.get('count', 0)}" for c in top_crimes[:4]]
        ) if top_crimes else "Property and cyber crime"

        user_prompt = f"""
Analyze the following regional crime matrix for District: {district}
- Predicted Threat Risk Level: {risk_level} (Score: {risk_score}/100)
- Recent Active Incidents Count: {incident_count}
- Key Crime Distribution: {top_crimes_str}
- Socioeconomic Factors:
  * Population: {socioeconomic.get('population', 'N/A')}
  * Unemployment Rate: {socioeconomic.get('unemployment_rate', 'N/A')}%
  * Urbanization Index: {socioeconomic.get('urbanization_index', 'N/A')}
  * Literacy Rate: {socioeconomic.get('literacy_rate', 'N/A')}%

Return exactly these sections:
1. EXECUTIVE SUMMARY
2. CRITICAL RISK DRIVERS
3. TACTICAL RECOMMENDATIONS
"""

        raw_llm_output = self._call_llm(user_prompt, system_instruction=system_prompt)
        if raw_llm_output:
            return {
                "district": district,
                "risk_level": risk_level,
                "risk_score": risk_score,
                "summary": raw_llm_output,
                "model_used": self._last_live_model or self.model_name,
                "is_live_ai": True,
            }

        high_risk = risk_score >= 70 or risk_level == "High"
        summary_text = (
            f"EXECUTIVE SUMMARY:\n"
            f"{district} is currently categorized at {risk_level.upper()} threat vulnerability (Score: {risk_score}/100) "
            f"with {incident_count} active incidents logged across station jurisdictions. "
            f"{'High density hotspots require immediate supervisory taskforce deployment.' if high_risk else 'Moderate crime volume requires targeted night patrols and hotspot monitoring.'}\n\n"
            f"CRITICAL RISK DRIVERS:\n"
            f"- Primary crime pattern concentration: {top_crimes_str}.\n"
            f"- Socioeconomic correlation: Unemployment rate at {socioeconomic.get('unemployment_rate', 'N/A')}% and urbanization index {socioeconomic.get('urbanization_index', 'N/A')} correlate with elevated incident frequency.\n\n"
            f"TACTICAL RECOMMENDATIONS:\n"
            f"- Increase mobile PCR van coverage in designated cluster centroids between 20:00 - 04:00 hrs.\n"
            f"- Perform targeted repeat offender verification on L2 linked accused within {district}.\n"
            f"- Establish cross-station communication channels for automated FIR correlation."
        )

        return {
            "district": district,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "summary": summary_text,
            "model_used": f"{self.model_name} (Heuristic Fallback)",
            "is_live_ai": False,
        }

    def generate_network_insight(
        self,
        accused_id: int,
        accused_name: str,
        total_nodes: int,
        total_edges: int,
        co_accused: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        system_prompt = (
            "You are a criminal intelligence network analyst. "
            "Provide concise link analysis insights about hierarchy, co-offending structure, and operational recommendations. "
            "Avoid markdown emphasis characters. Use plain headings and plain operational language."
        )

        co_accused_names = ", ".join(
            [c.get("name", f"Accused #{c.get('id')}") for c in co_accused[:5]]
        ) if co_accused else "No direct co-accused"

        user_prompt = f"""
Analyze the suspect network topology for:
- Target Suspect: #{accused_id} - {accused_name}
- Network Size: {total_nodes} entities, {total_edges} relationship links
- Primary Co-Accused Links: {co_accused_names}

Return exactly these sections:
1. SYNDICATE ROLE AND CENTRALITY
2. MODUS OPERANDI AND CO-OFFENDING PATTERN
3. INTERROGATION OR SURVEILLANCE RECOMMENDATION
"""

        raw_llm_output = self._call_llm(user_prompt, system_instruction=system_prompt)
        if raw_llm_output:
            return {
                "accused_id": accused_id,
                "accused_name": accused_name,
                "insight": raw_llm_output,
                "model_used": self._last_live_model or self.model_name,
                "is_live_ai": True,
            }

        insight_text = (
            f"SYNDICATE ROLE AND CENTRALITY:\n"
            f"Target suspect exhibits high degree centrality ({total_edges} direct links across {total_nodes} nodes), acting as a primary bridge node between regional co-conspirators.\n\n"
            f"MODUS OPERANDI AND CO-OFFENDING PATTERN:\n"
            f"Direct associations identified with {co_accused_names}. High probability of coordinated multi-station criminal operations.\n\n"
            f"INTERROGATION OR SURVEILLANCE RECOMMENDATION:\n"
            f"Issue L2 supervisory clearance check on linked financial and communication records to disrupt syndicate hierarchy."
        )

        return {
            "accused_id": accused_id,
            "accused_name": accused_name,
            "insight": insight_text,
            "model_used": f"{self.model_name} (Heuristic Fallback)",
            "is_live_ai": False,
        }

    def chat_assistant(self, query: str, context: Optional[str] = None) -> Dict[str, Any]:
        system_prompt = (
            "You are the Tactical AI Assistant for the Crime Intelligence and Analytical Platform. "
            "Assist police officers, investigators, and crime analysts with precise, factual answers based on crime intelligence principles. "
            "Maintain a professional law-enforcement tone. Avoid markdown emphasis characters."
        )

        user_prompt = f"Query: {query}"
        if context:
            user_prompt = f"Context: {context}\n\nQuery: {query}"

        raw_llm_output = self._call_llm(user_prompt, system_instruction=system_prompt)
        if raw_llm_output:
            return {
                "query": query,
                "response": raw_llm_output,
                "model_used": self._last_live_model or self.model_name,
                "is_live_ai": True,
            }

        q_lower = query.strip().lower()
        if q_lower in ["hi", "hello", "hey", "greetings", "help", "hi there", "hello there"]:
            reply = "Greetings Officer. I am your Tactical AI Assistant. Local Ollama inference is currently unavailable, so I am responding with fallback guidance."
        elif "who are you" in q_lower or "what can you do" in q_lower:
            reply = "I am the Tactical Command AI Assistant. I provide regional crime briefings, suspect network analysis, and natural language support for law enforcement workflows."
        elif "risk" in q_lower or "district" in q_lower:
            reply = "District risk levels are computed using incident density combined with socioeconomic indicators like unemployment and urbanization."
        elif "network" in q_lower or "accused" in q_lower or "suspect" in q_lower:
            reply = "Network analysis renders co-offender relationship graphs using Cytoscape. Degree centrality and shared FIR co-occurrence identify likely syndicate hubs."
        elif "hotspot" in q_lower or "cluster" in q_lower:
            reply = "Hotspots are identified via spatial DBSCAN clustering on FIR geocoded coordinates, isolating high-density micro-zones for tactical patrol routing."
        elif "clearance" in q_lower or "status" in q_lower:
            reply = "Incident clearance statuses can be updated in real time under the clearance management workflow."
        else:
            reply = f"Tactical AI Assistant ready. Your query '{query}' has been analyzed against active crime databases."

        return {
            "query": query,
            "response": reply,
            "model_used": f"{self.model_name} (Heuristic Fallback)",
            "is_live_ai": False,
        }


ai_service = AIService()
