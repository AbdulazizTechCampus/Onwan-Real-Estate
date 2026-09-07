"""Backend tests: favorites endpoints (like/interest toggle, get, sync)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://onwan-subscriptions.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def token():
    # send-otp
    r = requests.post(f"{API}/auth/send-otp", json={"phone_number": "0500000000"}, timeout=15)
    assert r.status_code == 200, r.text
    otp = r.json().get("otp_code")
    assert otp, f"OTP not surfaced in dev mode: {r.json()}"
    r2 = requests.post(
        f"{API}/auth/verify-otp",
        json={"phone_number": "0500000000", "otp_code": otp, "user_type": "individual_broker"},
        timeout=15,
    )
    assert r2.status_code == 200, r2.text
    tok = r2.json().get("access_token") or r2.json().get("token")
    assert tok, r2.json()
    return tok


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


class TestFavoritesAuth:
    def test_get_requires_auth(self):
        r = requests.get(f"{API}/favorites", timeout=10)
        assert r.status_code in (401, 403), r.status_code

    def test_toggle_requires_auth(self):
        r = requests.post(f"{API}/favorites/toggle", json={"property_id": 1, "favorite_type": "like"}, timeout=10)
        assert r.status_code in (401, 403)

    def test_sync_requires_auth(self):
        r = requests.post(f"{API}/favorites/sync", json={"likes": [1], "interests": []}, timeout=10)
        assert r.status_code in (401, 403)


class TestFavoritesFlow:
    def test_get_favorites_ok(self, auth_headers):
        r = requests.get(f"{API}/favorites", headers=auth_headers, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "likes" in data and "interests" in data
        assert isinstance(data["likes"], list) and isinstance(data["interests"], list)

    def test_toggle_like_on_then_off(self, auth_headers):
        pid = 9991
        # first toggle => active True
        r1 = requests.post(f"{API}/favorites/toggle", headers=auth_headers,
                           json={"property_id": pid, "favorite_type": "like"}, timeout=10)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1["active"] is True
        assert d1["property_id"] == pid
        # verify persisted
        g = requests.get(f"{API}/favorites", headers=auth_headers, timeout=10).json()
        assert pid in g["likes"]
        # toggle again => False
        r2 = requests.post(f"{API}/favorites/toggle", headers=auth_headers,
                           json={"property_id": pid, "favorite_type": "like"}, timeout=10)
        assert r2.status_code == 200
        assert r2.json()["active"] is False
        g2 = requests.get(f"{API}/favorites", headers=auth_headers, timeout=10).json()
        assert pid not in g2["likes"]

    def test_toggle_interest(self, auth_headers):
        pid = 9992
        r = requests.post(f"{API}/favorites/toggle", headers=auth_headers,
                          json={"property_id": pid, "favorite_type": "interest"}, timeout=10)
        assert r.status_code == 200
        assert r.json()["active"] is True
        g = requests.get(f"{API}/favorites", headers=auth_headers, timeout=10).json()
        assert pid in g["interests"]
        # cleanup
        requests.post(f"{API}/favorites/toggle", headers=auth_headers,
                      json={"property_id": pid, "favorite_type": "interest"}, timeout=10)

    def test_invalid_favorite_type(self, auth_headers):
        r = requests.post(f"{API}/favorites/toggle", headers=auth_headers,
                          json={"property_id": 1, "favorite_type": "bogus"}, timeout=10)
        assert r.status_code == 400, r.text

    def test_sync_merges_arrays(self, auth_headers):
        payload = {"likes": [7001, 7002], "interests": [7003]}
        r = requests.post(f"{API}/favorites/sync", headers=auth_headers, json=payload, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert 7001 in data["likes"] and 7002 in data["likes"]
        assert 7003 in data["interests"]
        # idempotent - resync same ids should not duplicate
        r2 = requests.post(f"{API}/favorites/sync", headers=auth_headers, json=payload, timeout=10).json()
        assert r2["likes"].count(7001) == 1
        # cleanup
        for pid in [7001, 7002]:
            requests.post(f"{API}/favorites/toggle", headers=auth_headers,
                          json={"property_id": pid, "favorite_type": "like"}, timeout=10)
        requests.post(f"{API}/favorites/toggle", headers=auth_headers,
                      json={"property_id": 7003, "favorite_type": "interest"}, timeout=10)

    def test_sync_empty_ok(self, auth_headers):
        r = requests.post(f"{API}/favorites/sync", headers=auth_headers, json={"likes": [], "interests": []}, timeout=10)
        assert r.status_code == 200
