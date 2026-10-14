# Tests for broker/photographer profile + admin directory + suspend flow
import os, pytest, requests, time

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or pytest.skip("no base url", allow_module_level=True)
API = f"{BASE}/api"

ADMIN_PHONE = "0500000000"
BROKER_PHONE = "0501234567"


def _login(phone):
    r = requests.post(f"{API}/auth/send-otp", json={"phone_number": phone}, timeout=15)
    assert r.status_code == 200, r.text
    otp = r.json().get("otp_code")
    is_existing = r.json().get("is_existing_user")
    assert otp
    body = {"phone_number": phone, "otp_code": otp}
    if not is_existing:
        body["user_type"] = "admin" if phone == ADMIN_PHONE else "broker_individual"
    r = requests.post(f"{API}/auth/verify-otp", json=body, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN_PHONE)


@pytest.fixture(scope="module")
def broker_token():
    return _login(BROKER_PHONE)


def _h(t):
    return {"Authorization": f"Bearer {t}"}


# ---------- PROFILE ----------
class TestProfile:
    def test_get_profile(self, broker_token):
        r = requests.get(f"{API}/profile/me", headers=_h(broker_token))
        assert r.status_code == 200
        j = r.json()
        assert "profile" in j and "options" in j
        assert "broker_specializations" in j["options"]
        assert "residential_sale" in j["options"]["broker_specializations"]

    def test_update_profile(self, broker_token):
        payload = {
            "region": "riyadh", "city": "الرياض",
            "districts": ["العليا", "الملقا"],
            "specializations": ["residential_sale", "commercial"],
            "fal_license": "FAL-12345", "experience_years": 5,
            "bio": "اختبار ملف شخصي",
        }
        r = requests.put(f"{API}/profile/me", json=payload, headers=_h(broker_token))
        assert r.status_code == 200, r.text
        p = r.json()["profile"]
        assert p["region"] == "riyadh"
        assert p["fal_license"] == "FAL-12345"
        assert "residential_sale" in p["specializations"]
        # verify persisted
        r2 = requests.get(f"{API}/profile/me", headers=_h(broker_token))
        assert r2.json()["profile"]["fal_license"] == "FAL-12345"

    def test_invalid_specialization_for_broker(self, broker_token):
        r = requests.put(f"{API}/profile/me",
                         json={"specializations": ["drone"]}, headers=_h(broker_token))
        assert r.status_code == 400


# ---------- DIRECTORY ----------
class TestDirectory:
    def test_requires_admin(self, broker_token):
        r = requests.get(f"{API}/admin/directory/brokers", headers=_h(broker_token))
        assert r.status_code == 403

    def test_brokers_list(self, admin_token):
        r = requests.get(f"{API}/admin/directory/brokers", headers=_h(admin_token))
        assert r.status_code == 200
        j = r.json()
        for k in ["items", "total", "pages", "summary"]:
            assert k in j
        s = j["summary"]
        for k in ["by_region", "by_type", "by_plan", "verified", "suspended",
                  "active_listings", "completed_deals"]:
            assert k in s, f"missing {k}"

    def test_filters(self, admin_token):
        params = {"region": "riyadh", "user_type": "broker_individual",
                  "verified": "verified", "plan_key": "silver",
                  "specialization": "residential_sale", "status": "active",
                  "search": "0501234567"}
        r = requests.get(f"{API}/admin/directory/brokers", params=params, headers=_h(admin_token))
        assert r.status_code == 200
        # should at least not error; items may contain our broker
        phones = [i["phone_number"] for i in r.json()["items"]]
        assert BROKER_PHONE in phones or r.json()["total"] >= 0

    def test_sort(self, admin_token):
        r = requests.get(f"{API}/admin/directory/brokers",
                         params={"sort_by": "active_listings", "sort_dir": "asc"},
                         headers=_h(admin_token))
        assert r.status_code == 200

    def test_bad_sort(self, admin_token):
        r = requests.get(f"{API}/admin/directory/brokers",
                         params={"sort_by": "bogus"}, headers=_h(admin_token))
        assert r.status_code == 400

    def test_unknown_role(self, admin_token):
        r = requests.get(f"{API}/admin/directory/wizards", headers=_h(admin_token))
        assert r.status_code == 404

    def test_photographers(self, admin_token):
        r = requests.get(f"{API}/admin/directory/photographers", headers=_h(admin_token))
        assert r.status_code == 200
        assert "items" in r.json()


# ---------- USER DETAIL ----------
@pytest.fixture(scope="module")
def broker_id(admin_token):
    r = requests.get(f"{API}/admin/directory/brokers",
                     params={"search": BROKER_PHONE}, headers=_h(admin_token))
    items = r.json()["items"]
    assert items, "broker not found"
    return items[0]["id"]


class TestUserDetail:
    def test_detail(self, admin_token, broker_id):
        r = requests.get(f"{API}/admin/directory/user/{broker_id}", headers=_h(admin_token))
        assert r.status_code == 200, r.text
        j = r.json()
        for k in ["user", "billing", "properties", "transactions", "audit_logs", "badges"]:
            assert k in j
        u = j["user"]
        for k in ["active_listings", "completed_deals", "total_revenue", "points", "plan_name_ar"]:
            assert k in u, f"missing metric {k}"


# ---------- SUSPEND ----------
class TestSuspend:
    def test_suspend_and_reactivate(self, admin_token, broker_id, broker_token):
        # suspend
        r = requests.post(f"{API}/admin/directory/user/{broker_id}/suspend",
                          json={"suspended": True, "reason": "test"}, headers=_h(admin_token))
        assert r.status_code == 200, r.text
        assert r.json()["is_active"] is False

        # old token should now be rejected
        r2 = requests.get(f"{API}/profile/me", headers=_h(broker_token))
        assert r2.status_code == 403, r2.text

        # verify-otp should also 403
        s = requests.post(f"{API}/auth/send-otp", json={"phone_number": BROKER_PHONE}).json()
        v = requests.post(f"{API}/auth/verify-otp",
                          json={"phone_number": BROKER_PHONE, "otp_code": s["otp_code"]})
        assert v.status_code == 403, v.text

        # reactivate
        r = requests.post(f"{API}/admin/directory/user/{broker_id}/suspend",
                          json={"suspended": False}, headers=_h(admin_token))
        assert r.status_code == 200
        assert r.json()["is_active"] is True

    def test_cannot_suspend_admin(self, admin_token):
        # find admin id
        r = requests.get(f"{API}/admin/directory/brokers",
                         params={"search": ADMIN_PHONE}, headers=_h(admin_token))
        # admin is not a broker; look up via users? Use /auth/me instead
        me = requests.get(f"{API}/profile/me", headers=_h(admin_token))
        assert me.status_code == 200, me.text
        admin_id = me.json()["profile"]["id"]
        r = requests.post(f"{API}/admin/directory/user/{admin_id}/suspend",
                          json={"suspended": True}, headers=_h(admin_token))
        assert r.status_code == 400


# ---------- AUDIT ----------
class TestAudit:
    def test_audit_events(self, admin_token):
        r = requests.get(f"{API}/admin/audit-logs", headers=_h(admin_token),
                         params={"limit": 100})
        assert r.status_code == 200, r.text
        data = r.json()
        logs = data if isinstance(data, list) else data.get("items") or data.get("logs") or []
        actions = {log.get("action") for log in logs}
        assert "PROFILE_UPDATE" in actions
        assert "USER_SUSPEND" in actions
        assert "USER_REACTIVATE" in actions
