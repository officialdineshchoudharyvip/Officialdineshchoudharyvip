"""InstaBloom backend API tests"""
import os
import base64
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://insta-bloom-creator.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Tiny 1x1 PNG image
TINY_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAfbLI3wAAAABJRU5ErkJggg=="
)


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- Health ----------
class TestHealth:
    def test_root(self, s):
        r = s.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert "message" in r.json()


# ---------- Templates ----------
class TestTemplates:
    def test_list_templates(self, s):
        r = s.get(f"{API}/templates", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 4
        for t in data:
            assert set(["id", "url", "title"]).issubset(t.keys())


# ---------- Creations CRUD ----------
class TestCreationsCRUD:
    created_ids = []

    def test_create_ai(self, s):
        payload = {"type": "ai", "image_base64": TINY_PNG_B64, "prompt": "TEST_ai flower"}
        r = s.post(f"{API}/creations", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["id"] and d["type"] == "ai"
        assert d["prompt"] == "TEST_ai flower"
        assert "created_at" in d
        assert "_id" not in d
        TestCreationsCRUD.created_ids.append(d["id"])

    def test_create_edited(self, s):
        payload = {"type": "edited", "image_base64": TINY_PNG_B64, "prompt": "TEST_edited"}
        r = s.post(f"{API}/creations", json=payload, timeout=15)
        assert r.status_code == 200
        TestCreationsCRUD.created_ids.append(r.json()["id"])

    def test_list_all(self, s):
        r = s.get(f"{API}/creations", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        ids = [x["id"] for x in data]
        for cid in TestCreationsCRUD.created_ids:
            assert cid in ids
        # ordering desc by created_at
        ts = [x["created_at"] for x in data]
        assert ts == sorted(ts, reverse=True)
        # no _id leak
        for x in data:
            assert "_id" not in x

    def test_list_filter_ai(self, s):
        r = s.get(f"{API}/creations?type=ai", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert all(x["type"] == "ai" for x in data)

    def test_list_filter_edited(self, s):
        r = s.get(f"{API}/creations?type=edited", timeout=15)
        assert r.status_code == 200
        assert all(x["type"] == "edited" for x in r.json())

    def test_delete_404(self, s):
        r = s.delete(f"{API}/creations/does-not-exist-xyz", timeout=15)
        assert r.status_code == 404

    def test_delete_success(self, s):
        assert TestCreationsCRUD.created_ids, "no ids"
        for cid in TestCreationsCRUD.created_ids:
            r = s.delete(f"{API}/creations/{cid}", timeout=15)
            assert r.status_code == 200
            assert r.json().get("success") is True
        # verify
        r = s.get(f"{API}/creations", timeout=15)
        remaining = [x["id"] for x in r.json()]
        for cid in TestCreationsCRUD.created_ids:
            assert cid not in remaining


# ---------- AI endpoints (slow) ----------
class TestAI:
    def test_generate_empty_prompt(self, s):
        r = s.post(f"{API}/ai/generate", json={"prompt": "", "style": "dreamy"}, timeout=30)
        assert r.status_code == 400

    def test_generate_success(self, s):
        r = s.post(
            f"{API}/ai/generate",
            json={"prompt": "a single pink peony on white background", "style": "minimal"},
            timeout=120,
        )
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        assert d.get("image_base64")
        # ensure valid base64
        try:
            raw = base64.b64decode(d["image_base64"], validate=False)
            assert len(raw) > 500  # non-trivial image
        except Exception as e:
            pytest.fail(f"invalid base64: {e}")

    def test_edit_empty_image(self, s):
        r = s.post(f"{API}/ai/edit", json={"image_base64": "", "prompt": "add flowers"}, timeout=30)
        assert r.status_code == 400

    def test_edit_success(self, s):
        r = s.post(
            f"{API}/ai/edit",
            json={"image_base64": TINY_PNG_B64, "prompt": "surround with pink roses"},
            timeout=120,
        )
        # allow 502 if provider fails but prefer 200
        assert r.status_code in (200, 502), r.text[:400]
        if r.status_code == 200:
            d = r.json()
            assert d.get("image_base64")
