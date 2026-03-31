import io
import time
import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api import data_routes
from app.services.analyzer import DataAnalyzer
from app.services.ai_assistant import AIAssistant


@pytest.fixture(autouse=True)
def reset_in_memory_state():
    """Isolate tests by clearing process-local file/job/cache state."""
    data_routes.uploaded_data.clear()
    data_routes.clean_counters.clear()
    yield
    data_routes.uploaded_data.clear()
    data_routes.clean_counters.clear()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def _upload_csv(client: TestClient, csv_text: str, filename: str | None = None) -> str:
    file_name = filename or f"test_{uuid.uuid4().hex[:8]}.csv"
    files = {"file": (file_name, io.BytesIO(csv_text.encode("utf-8")), "text/csv")}
    response = client.post("/api/data/upload", files=files)
    assert response.status_code == 200, response.text
    return response.json()["file_id"]


def test_analyze_response_is_cached(client, monkeypatch):
    file_id = _upload_csv(client, "a,b\n1,2\n3,4\n")

    calls = {"count": 0}
    original = DataAnalyzer.get_basic_stats

    def wrapped(df):
        calls["count"] += 1
        return original(df)

    monkeypatch.setattr(DataAnalyzer, "get_basic_stats", wrapped)

    r1 = client.get(f"/api/data/analyze/{file_id}")
    assert r1.status_code == 200
    r2 = client.get(f"/api/data/analyze/{file_id}")
    assert r2.status_code == 200

    assert calls["count"] == 1


def test_stats_response_is_cached(client, monkeypatch):
    file_id = _upload_csv(client, "a,b\n1,2\n3,4\n")

    calls = {"count": 0}
    original = DataAnalyzer.get_advanced_stats

    def wrapped(df):
        calls["count"] += 1
        return original(df)

    monkeypatch.setattr(DataAnalyzer, "get_advanced_stats", wrapped)

    r1 = client.get(f"/api/data/stats/{file_id}")
    assert r1.status_code == 200
    r2 = client.get(f"/api/data/stats/{file_id}")
    assert r2.status_code == 200

    assert calls["count"] == 1


def test_async_clean_job_flow_reaches_completed(client):
    file_id = _upload_csv(client, "a,b\n1,2\n1,2\n")

    submit = client.post(f"/api/data/clean/{file_id}?run_async=true", json={"remove_duplicates": True})
    assert submit.status_code == 200, submit.text
    body = submit.json()
    assert body["status"] == "pending"
    job_id = body["job_id"]

    final = None
    for _ in range(50):
        final = client.get(f"/api/jobs/{job_id}")
        assert final.status_code == 200
        status = final.json()["status"]
        if status in ("completed", "failed"):
            break
        time.sleep(0.05)

    assert final is not None
    assert final.json()["status"] == "completed", final.json()
    assert "cleaned_file_id" in final.json()["result"]


def test_async_ai_job_flow_reaches_completed(client, monkeypatch):
    file_id = _upload_csv(client, "a,b\n1,2\n3,4\n")

    def fake_insights(file_id, df, analysis, question):
        return {
            "file_id": file_id,
            "executive_summary": "ok",
            "question": question,
            "cleaning_steps": [],
            "data_quality_risks": [],
            "analysis_ideas": [],
            "next_best_action": "none",
        }

    monkeypatch.setattr(AIAssistant, "generate_insights", fake_insights)

    submit = client.post(
        f"/api/data/ai/insights/{file_id}?run_async=true",
        json={"question": "what next?"},
    )
    assert submit.status_code == 200, submit.text
    body = submit.json()
    assert body["status"] == "pending"
    job_id = body["job_id"]

    final = None
    for _ in range(50):
        final = client.get(f"/api/jobs/{job_id}")
        assert final.status_code == 200
        status = final.json()["status"]
        if status in ("completed", "failed"):
            break
        time.sleep(0.05)

    assert final is not None
    assert final.json()["status"] == "completed", final.json()
    assert final.json()["result"]["executive_summary"] == "ok"


def test_unknown_job_returns_404(client):
    response = client.get("/api/jobs/no-such-job")
    assert response.status_code == 404


def test_preview_sanitizes_nan_and_inf_values(client):
    # Blank cell -> NaN; string 'inf' parses to floating infinity in numeric context.
    file_id = _upload_csv(client, "x,y\n1,2\n,inf\n")

    response = client.get(f"/api/data/preview/{file_id}")
    assert response.status_code == 200, response.text

    data = response.json()["data"]
    assert isinstance(data, list) and len(data) >= 2

    row_with_missing = data[1]
    assert row_with_missing["x"] is None
    assert row_with_missing["y"] is None


def test_preview_repeated_calls_remain_successful(client):
    file_id = _upload_csv(client, "a,b\n1,2\n3,4\n")

    for _ in range(5):
        response = client.get(f"/api/data/preview/{file_id}")
        assert response.status_code == 200, response.text
