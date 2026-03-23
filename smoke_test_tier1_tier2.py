import base64
import os
import pathlib
import sys

import httpx

BASE = os.environ.get("SMOKE_BASE_URL", "http://127.0.0.1:8000")
ROOT = pathlib.Path(__file__).resolve().parent
CSV_PATH = ROOT / "tier1_tier2_test_dataset.csv"
OUT_JSON = ROOT / "smoke_export.json"
OUT_XLSX = ROOT / "smoke_export.xlsx"

results = []


def check(name, condition, detail=""):
    results.append((name, bool(condition), detail))


try:
    with httpx.Client(timeout=30.0) as client:
        r = client.get(f"{BASE}/health")
        check("health", r.status_code == 200 and r.json().get("status") == "healthy", f"status={r.status_code}")

        root = client.get(f"{BASE}/")
        check("root", root.status_code == 200, f"status={root.status_code}")

        with CSV_PATH.open("rb") as f:
            upload = client.post(f"{BASE}/api/data/upload", files={"file": (CSV_PATH.name, f, "text/csv")})
        check("upload_csv", upload.status_code == 200, f"status={upload.status_code}")
        if upload.status_code != 200:
            raise RuntimeError(f"upload failed: {upload.text[:200]}")

        file_id = upload.json()["file_id"]

        preview_statuses = []
        preview_ok = True
        for _ in range(5):
            p = client.get(f"{BASE}/api/data/preview/{file_id}", params={"rows": 5})
            preview_statuses.append(p.status_code)
            if p.status_code != 200:
                preview_ok = False
        check("preview_repeated", preview_ok, f"statuses={preview_statuses}")

        analyze = client.get(f"{BASE}/api/data/analyze/{file_id}")
        analyze_json = analyze.json() if analyze.status_code == 200 else {}
        has_corr = isinstance(analyze_json.get("correlation_matrix"), dict) and "columns" in analyze_json.get("correlation_matrix", {})
        check("analyze_with_correlation", analyze.status_code == 200 and has_corr, f"status={analyze.status_code}")

        stats = client.get(f"{BASE}/api/data/stats/{file_id}")
        stats_json = stats.json() if stats.status_code == 200 else {}
        adv = stats_json.get("advanced_stats", {})
        has_adv = isinstance(adv.get("columns"), dict) and len(adv.get("columns", {})) > 0
        check("advanced_stats", stats.status_code == 200 and has_adv, f"status={stats.status_code}")

        clean_payload = {
            "remove_duplicates": True,
            "fill_missing": "mean",
            "clean_strings": True,
            "standardize_data": None,
            "remove_outliers": True,
            "columns_to_drop": [],
        }
        clean = client.post(f"{BASE}/api/data/clean/{file_id}", json=clean_payload)
        check("clean", clean.status_code == 200, f"status={clean.status_code}")
        if clean.status_code != 200:
            raise RuntimeError(f"clean failed: {clean.text[:200]}")

        cleaned_id = clean.json()["cleaned_file_id"]

        dl_csv = client.get(f"{BASE}/api/data/download/{cleaned_id}", params={"format": "csv"})
        dl_csv_json = dl_csv.json() if dl_csv.status_code == 200 else {}
        csv_ok = (
            dl_csv.status_code == 200
            and dl_csv_json.get("format") == "csv"
            and dl_csv_json.get("encoding") == "utf-8"
            and isinstance(dl_csv_json.get("content"), str)
        )
        check("download_csv", csv_ok, f"status={dl_csv.status_code}")

        dl_json = client.get(f"{BASE}/api/data/download/{cleaned_id}", params={"format": "json"})
        dl_json_json = dl_json.json() if dl_json.status_code == 200 else {}
        json_ok = (
            dl_json.status_code == 200
            and dl_json_json.get("format") == "json"
            and dl_json_json.get("encoding") == "utf-8"
        )
        check("download_json", json_ok, f"status={dl_json.status_code}")
        if json_ok:
            OUT_JSON.write_text(dl_json_json["content"], encoding="utf-8")

        dl_xlsx = client.get(f"{BASE}/api/data/download/{cleaned_id}", params={"format": "xlsx"})
        dl_xlsx_json = dl_xlsx.json() if dl_xlsx.status_code == 200 else {}
        xlsx_ok = (
            dl_xlsx.status_code == 200
            and dl_xlsx_json.get("format") == "xlsx"
            and dl_xlsx_json.get("encoding") == "base64"
        )
        check("download_xlsx", xlsx_ok, f"status={dl_xlsx.status_code}")
        if xlsx_ok:
            OUT_XLSX.write_bytes(base64.b64decode(dl_xlsx_json["content"]))

        if OUT_JSON.exists():
            with OUT_JSON.open("rb") as f:
                up_json = client.post(f"{BASE}/api/data/upload", files={"file": (OUT_JSON.name, f, "application/json")})
            check("reupload_json", up_json.status_code == 200, f"status={up_json.status_code}")

        if OUT_XLSX.exists():
            with OUT_XLSX.open("rb") as f:
                up_xlsx = client.post(
                    f"{BASE}/api/data/upload",
                    files={"file": (OUT_XLSX.name, f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
                )
            check("reupload_xlsx", up_xlsx.status_code == 200, f"status={up_xlsx.status_code}")

except Exception as exc:
    check("smoke_script_exception", False, str(exc))

print("SMOKE TEST RESULTS")
for name, ok, detail in results:
    mark = "PASS" if ok else "FAIL"
    suffix = f" - {detail}" if detail else ""
    print(f"- {mark}: {name}{suffix}")

passed = [name for name, ok, _ in results if ok]
failed = [name for name, ok, _ in results if not ok]
print(f"\nSummary: {len(passed)} passed, {len(failed)} failed")

if failed:
    sys.exit(1)
