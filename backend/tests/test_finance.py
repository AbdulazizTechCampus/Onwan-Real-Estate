"""Onwan Finance / Rules Engine backend tests."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://onwan-subscriptions.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


# ---------------- helpers ----------------
def _login(phone: str, user_type: str = "individual_broker") -> str:
    r = requests.post(f"{API}/auth/send-otp", json={"phone_number": phone}, timeout=15)
    assert r.status_code == 200, f"send-otp failed: {r.status_code} {r.text}"
    otp = r.json().get("otp_code")
    assert otp, f"no otp_code returned (DEV_MODE off?): {r.text}"
    r = requests.post(
        f"{API}/auth/verify-otp",
        json={"phone_number": phone, "otp_code": otp, "user_type": user_type},
        timeout=15,
    )
    assert r.status_code == 200, f"verify-otp failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def broker_headers():
    tok = _login("0501234567", "individual_broker")
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_headers():
    # admin phone -- backend may treat 0500000000 as admin regardless of role passed
    tok = _login("0500000000", "individual_broker")
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ---------------- Public config ----------------
def test_config_broker_individual():
    r = requests.get(f"{API}/finance/config", params={"user_type": "broker_individual"}, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    plan_keys = {p["key"] for p in d["plans"]}
    assert {"partner", "silver", "growth", "professional"}.issubset(plan_keys)
    ad_keys = {p["key"] for p in d["ad_products"]}
    assert {"free", "standard", "featured", "featured_plus", "boost"}.issubset(ad_keys)
    models = d["engagement_models"]
    keys = {m["key"] for m in models}
    assert {"PARTNER", "SUBSCRIPTION"} == keys
    for m in models:
        assert m.get("name_ar")
    assert len(d["redeem_rules"]) >= 3


# ---------------- Promo validation ----------------
def test_promo_invalid_400():
    r = requests.post(f"{API}/finance/validate-promo",
                      json={"code": "NOPE_" + uuid.uuid4().hex[:6], "transaction_type": "SUBSCRIPTION_PAYMENT"},
                      timeout=15)
    assert r.status_code == 400


def test_promo_onwan50_fixed():
    r = requests.post(f"{API}/finance/validate-promo",
                      json={"code": "ONWAN50", "transaction_type": "SUBSCRIPTION_PAYMENT", "amount": 199},
                      timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["valid"] is True
    assert d["discount_type"] == "fixed"
    assert d["value"] == 50
    assert d["discount_amount"] == 50


def test_promo_wrong_transaction_type_400():
    r = requests.post(f"{API}/finance/validate-promo",
                      json={"code": "ONWAN50", "transaction_type": "SUCCESS_FEE", "amount": 100},
                      timeout=15)
    assert r.status_code == 400


# ---------------- Broker flows ----------------
def test_select_partner_model(broker_headers):
    r = requests.post(f"{API}/finance/select-model", json={"model": "PARTNER"},
                      headers=broker_headers, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["success"] is True
    assert d["billing"]["plan_key"] == "partner"


def test_success_fee_preview_partner_15pct(broker_headers):
    # ensure PARTNER active
    requests.post(f"{API}/finance/select-model", json={"model": "PARTNER"},
                  headers=broker_headers, timeout=15)
    r = requests.post(f"{API}/finance/success-fee/preview", json={"amount": 10000},
                     headers=broker_headers, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["percentage"] == 15.0
    assert d["platform_fee"] == 1500.0
    assert d["net_amount"] == 8500.0


def test_subscribe_growth_and_success_fee_75pct(broker_headers):
    # find growth plan_id
    cfg = requests.get(f"{API}/finance/config", params={"user_type": "broker_individual"}, timeout=15).json()
    growth = next(p for p in cfg["plans"] if p["key"] == "growth")
    price = growth.get("price") or 0
    # subscribe (WELCOME20 may be exhausted per E1 note; try without promo to be robust)
    r = requests.post(f"{API}/finance/subscribe",
                      json={"plan_id": growth["id"]},
                      headers=broker_headers, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["success"] is True
    assert d["transaction"]["gross_amount"] == price
    assert d["billing"]["plan_key"] == "growth"
    assert d["points_awarded"] == 100
    # Now fee preview must be 7.5%
    r = requests.post(f"{API}/finance/success-fee/preview", json={"amount": 10000},
                      headers=broker_headers, timeout=15)
    assert r.status_code == 200, r.text
    dd = r.json()
    assert dd["percentage"] == 7.5
    assert dd["platform_fee"] == 750.0


def test_pay_success_fee_awards_points_and_badge(broker_headers):
    # Get wallet before
    me1 = requests.get(f"{API}/finance/me", headers=broker_headers, timeout=15).json()
    p_before = me1["wallet"].get("total_points", 0)
    r = requests.post(f"{API}/finance/success-fee", json={"amount": 10000, "reference_id": "TEST-DEAL-" + uuid.uuid4().hex[:6]},
                      headers=broker_headers, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["transaction"]["transaction_type"] == "SUCCESS_FEE"
    assert d["points_awarded"] == 70  # 50 + 20
    me2 = requests.get(f"{API}/finance/me", headers=broker_headers, timeout=15).json()
    assert me2["wallet"]["total_points"] == p_before + 70
    # partner badge should exist (either newly awarded here or earlier)
    keys = {b["badge_key"] for b in me2["badges"]}
    assert "PARTNER" in keys


def test_redeem_listing_boost(broker_headers):
    me = requests.get(f"{API}/finance/me", headers=broker_headers, timeout=15).json()
    if me["wallet"]["available_points"] < 100:
        pytest.skip("insufficient points for redeem test")
    r = requests.post(f"{API}/finance/redeem-points", json={"service_key": "LISTING_BOOST"},
                      headers=broker_headers, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["points_used"] == 100
    assert d["remaining_points"] == me["wallet"]["available_points"] - 100


def test_redeem_insufficient_returns_400(broker_headers):
    # spend down until insufficient by attempting FEATURED_PLUS_AD (350 pts) if wallet <350
    me = requests.get(f"{API}/finance/me", headers=broker_headers, timeout=15).json()
    if me["wallet"]["available_points"] >= 350:
        pytest.skip("wallet has enough points for FEATURED_PLUS_AD, skipping insufficient case")
    r = requests.post(f"{API}/finance/redeem-points", json={"service_key": "FEATURED_PLUS_AD"},
                      headers=broker_headers, timeout=15)
    assert r.status_code == 400
    assert "غير كاف" in r.json().get("detail", "") or "غير كافٍ" in r.json().get("detail", "")


def test_me_endpoint_shape(broker_headers):
    r = requests.get(f"{API}/finance/me", headers=broker_headers, timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in ("billing", "wallet", "badges", "transactions", "commission", "engagement_models"):
        assert k in d


# ---------------- Admin CRUD ----------------
def _is_admin(headers):
    r = requests.get(f"{API}/admin/finance/plans", headers=headers, timeout=15)
    return r.status_code == 200


def test_non_admin_gets_403(broker_headers):
    r = requests.get(f"{API}/admin/finance/plans", headers=broker_headers, timeout=15)
    assert r.status_code == 403


def test_admin_list_all_collections(admin_headers):
    if not _is_admin(admin_headers):
        pytest.skip("0500000000 is not admin in this env")
    for col in ("plans", "ad-products", "commission-rules", "point-rules", "badges", "promo-codes", "transactions"):
        r = requests.get(f"{API}/admin/finance/{col}", headers=admin_headers, timeout=15)
        assert r.status_code == 200, f"{col}: {r.status_code} {r.text}"
        assert "items" in r.json()


def test_admin_crud_promo_code(admin_headers):
    if not _is_admin(admin_headers):
        pytest.skip("not admin")
    code = "TEST_" + uuid.uuid4().hex[:6].upper()
    # CREATE
    r = requests.post(f"{API}/admin/finance/promo-codes",
                      headers=admin_headers,
                      json={"code": code, "discount_type": "percentage", "value": 10,
                            "max_uses": 5, "applies_to": ["SUBSCRIPTION_PAYMENT"]},
                      timeout=15)
    assert r.status_code == 200, r.text
    item = r.json()["item"]
    pid = item["id"]
    assert item["code"] == code
    # VERIFY in list
    lst = requests.get(f"{API}/admin/finance/promo-codes", headers=admin_headers, timeout=15).json()["items"]
    assert any(x["id"] == pid for x in lst)
    # UPDATE
    r = requests.put(f"{API}/admin/finance/promo-codes/{pid}",
                     headers=admin_headers, json={"value": 15}, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["item"]["value"] == 15
    # DEACTIVATE
    r = requests.delete(f"{API}/admin/finance/promo-codes/{pid}", headers=admin_headers, timeout=15)
    assert r.status_code == 200
    lst = requests.get(f"{API}/admin/finance/promo-codes", headers=admin_headers, timeout=15).json()["items"]
    matched = next(x for x in lst if x["id"] == pid)
    assert matched["is_active"] is False


def test_configurability_growth_fee_edit_and_restore(admin_headers, broker_headers):
    """Admin edits growth success_fee 7.5 -> 6, broker preview reflects 6% immediately, restore."""
    if not _is_admin(admin_headers):
        pytest.skip("not admin")
    plans = requests.get(f"{API}/admin/finance/plans", headers=admin_headers, timeout=15).json()["items"]
    growth = next(p for p in plans if p["key"] == "growth")
    pid = growth["id"]
    original = growth["features"]["success_fee_percentage"]

    # Ensure broker is on growth plan
    cfg = requests.get(f"{API}/finance/config", params={"user_type": "broker_individual"}, timeout=15).json()
    growth_pub = next(p for p in cfg["plans"] if p["key"] == "growth")
    requests.post(f"{API}/finance/subscribe", json={"plan_id": growth_pub["id"]},
                  headers=broker_headers, timeout=20)

    try:
        new_features = dict(growth["features"])
        new_features["success_fee_percentage"] = 6.0
        r = requests.put(f"{API}/admin/finance/plans/{pid}",
                         headers=admin_headers, json={"features": new_features}, timeout=15)
        assert r.status_code == 200, r.text
        # broker preview should now be 6%
        r = requests.post(f"{API}/finance/success-fee/preview", json={"amount": 10000},
                          headers=broker_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["percentage"] == 6.0
        assert d["platform_fee"] == 600.0
    finally:
        # Restore original value
        new_features = dict(growth["features"])
        new_features["success_fee_percentage"] = original
        requests.put(f"{API}/admin/finance/plans/{pid}",
                     headers=admin_headers, json={"features": new_features}, timeout=15)


def test_admin_crud_plan_soft_delete_and_recreate(admin_headers):
    if not _is_admin(admin_headers):
        pytest.skip("not admin")
    key = "test_plan_" + uuid.uuid4().hex[:5]
    payload = {"key": key, "name": "Test", "name_ar": "اختبار",
               "user_types": ["broker_individual"], "billing": "monthly", "price": 10,
               "currency": "SAR", "sort_order": 99, "features": {"success_fee_percentage": 3.0}}
    r = requests.post(f"{API}/admin/finance/plans", headers=admin_headers, json=payload, timeout=15)
    assert r.status_code == 200
    pid = r.json()["item"]["id"]
    r = requests.put(f"{API}/admin/finance/plans/{pid}", headers=admin_headers, json={"price": 20}, timeout=15)
    assert r.status_code == 200
    assert r.json()["item"]["price"] == 20
    r = requests.delete(f"{API}/admin/finance/plans/{pid}", headers=admin_headers, timeout=15)
    assert r.status_code == 200
