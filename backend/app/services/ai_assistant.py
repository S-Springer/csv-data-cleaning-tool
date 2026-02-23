import json
import os
import importlib
from typing import Any, Dict, Optional

from fastapi import HTTPException


class AIAssistant:
    @staticmethod
    def _build_dataset_context(file_id: str, df, analysis: Dict[str, Any]) -> Dict[str, Any]:
        numeric_columns = df.select_dtypes(include=['number']).columns.tolist()
        text_columns = df.select_dtypes(include=['object', 'string']).columns.tolist()

        return {
            "file_id": file_id,
            "shape": {
                "rows": int(len(df)),
                "columns": int(len(df.columns))
            },
            "column_names": [str(column) for column in df.columns.tolist()],
            "numeric_columns": numeric_columns,
            "text_columns": text_columns,
            "quality_score": analysis.get("quality_score", {}),
            "missing_values": analysis.get("missing_values", {}),
            "duplicates": analysis.get("duplicates", {}),
            "basic_stats": analysis.get("basic_stats", {}),
        }

    @staticmethod
    def _get_client() -> Any:
        try:
            openai_module = importlib.import_module("openai")
            OpenAI = getattr(openai_module, "OpenAI")
        except Exception:
            raise HTTPException(
                status_code=500,
                detail="OpenAI SDK is not installed. Install backend dependencies and try again."
            )

        api_key = os.getenv("AI_API_KEY") or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=503,
                detail="AI is not configured. Set AI_API_KEY (or OPENAI_API_KEY) in backend environment."
            )

        base_url = os.getenv("AI_BASE_URL")
        if base_url:
            return OpenAI(api_key=api_key, base_url=base_url)
        return OpenAI(api_key=api_key)

    @staticmethod
    def _build_prompt(dataset_context: Dict[str, Any], user_question: Optional[str] = None) -> str:
        question = user_question.strip() if user_question else ""
        question_block = f"User question: {question}" if question else "User question: Not provided"

        return (
            "You are a senior data engineer assistant. "
            "Given the dataset profile, return practical cleaning advice and analysis ideas.\n\n"
            f"{question_block}\n\n"
            "Dataset profile (JSON):\n"
            f"{json.dumps(dataset_context, default=str)}\n\n"
            "Return ONLY valid JSON with this exact structure:\n"
            "{\n"
            "  \"executive_summary\": \"string\",\n"
            "  \"recommended_cleaning_steps\": [\"string\"],\n"
            "  \"data_quality_risks\": [\"string\"],\n"
            "  \"analysis_ideas\": [\"string\"],\n"
            "  \"next_best_action\": \"string\"\n"
            "}"
        )

    @staticmethod
    def generate_insights(file_id: str, df, analysis: Dict[str, Any], question: Optional[str] = None) -> Dict[str, Any]:
        client = AIAssistant._get_client()
        model = os.getenv("AI_MODEL", "gpt-4o-mini")

        dataset_context = AIAssistant._build_dataset_context(file_id=file_id, df=df, analysis=analysis)
        prompt = AIAssistant._build_prompt(dataset_context=dataset_context, user_question=question)

        try:
            completion = client.chat.completions.create(
                model=model,
                temperature=0.2,
                messages=[
                    {"role": "system", "content": "You provide structured, concise data engineering advice."},
                    {"role": "user", "content": prompt},
                ],
            )
            raw_text = completion.choices[0].message.content.strip() if completion.choices else ""
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"AI request failed: {str(exc)}") from exc

        try:
            parsed = json.loads(raw_text)
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"AI response was not valid JSON: {str(exc)}"
            ) from exc

        return {
            "model": model,
            "insights": parsed,
            "context": {
                "file_id": dataset_context["file_id"],
                "rows": dataset_context["shape"]["rows"],
                "columns": dataset_context["shape"]["columns"],
            }
        }
