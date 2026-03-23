"""Quick verification of Tier 3 features: Redis caching and async job queue."""
import requests
import time

BASE = "http://127.0.0.1:8020"

errors = []

# --- upload ---
with open("tier1_tier2_test_dataset.csv", "rb") as f:
    r = requests.post(f"{BASE}/api/data/upload", files={"file": ("test.csv", f, "text/csv")})
assert r.status_code == 200, f"upload failed: {r.status_code}"
fid = r.json()["file_id"]
print(f"[OK] upload: {fid}")

# --- Redis caching: analyze twice ---
r1 = requests.get(f"{BASE}/api/data/analyze/{fid}")
assert r1.status_code == 200, f"analyze1 failed: {r1.status_code}"
print("[OK] analyze (cache miss)")

r2 = requests.get(f"{BASE}/api/data/analyze/{fid}")
assert r2.status_code == 200, f"analyze2 failed: {r2.status_code}"
print("[OK] analyze (cache hit)")

# --- Redis caching: stats twice ---
r1 = requests.get(f"{BASE}/api/data/stats/{fid}")
assert r1.status_code == 200, f"stats1 failed: {r1.status_code}"
r2 = requests.get(f"{BASE}/api/data/stats/{fid}")
assert r2.status_code == 200, f"stats2 failed: {r2.status_code}"
print("[OK] stats caching")

# --- Async clean ---
r = requests.post(f"{BASE}/api/data/clean/{fid}?run_async=true", json={"remove_duplicates": True})
assert r.status_code == 200, f"async clean submit failed: {r.status_code} {r.text}"
body = r.json()
assert body.get("status") == "pending", f"unexpected status: {body}"
job_id = body["job_id"]
print(f"[OK] async clean submitted: job_id={job_id[:8]}...")

# --- Poll job ---
final_status = None
for _ in range(20):
    time.sleep(0.3)
    jr = requests.get(f"{BASE}/api/jobs/{job_id}")
    assert jr.status_code == 200, f"job poll failed: {jr.status_code}"
    final_status = jr.json()["status"]
    if final_status in ("completed", "failed"):
        break

assert final_status == "completed", f"job ended in: {final_status}\nerror: {jr.json().get('error')}"
result = jr.json()["result"]
assert "cleaned_file_id" in result, f"result missing cleaned_file_id: {result}"
print(f"[OK] async clean job completed: cleaned_file_id={result['cleaned_file_id']}")

# --- Job 404 ---
r404 = requests.get(f"{BASE}/api/jobs/no-such-job")
assert r404.status_code == 404, f"expected 404 for unknown job, got {r404.status_code}"
print("[OK] unknown job returns 404")

print("\n=== All Tier 3 checks PASSED ===")
