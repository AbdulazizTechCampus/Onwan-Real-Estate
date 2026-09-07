# Onwan Financial System - Configurable Rules Engine
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid
import logging

logger = logging.getLogger(__name__)

finance_router = APIRouter(prefix="/finance", tags=["Finance"])
admin_finance_router = APIRouter(prefix="/admin/finance", tags=["Admin Finance"])

now_iso = lambda: datetime.utcnow().isoformat()

# ==================== Payment Provider Adapter ====================
# Unified interface: swap MockPaymentProvider with RAED / Moyasar / HyperPay later
class MockPaymentProvider:
    name = "MOCK_GATEWAY"

    async def charge(self, amount: float, currency: str, description: str) -> dict:
        return {"status": "paid", "provider": self.name, "provider_ref": f"MOCK-{uuid.uuid4().hex[:10].upper()}"}

PAYMENT_PROVIDER = MockPaymentProvider()

ENGAGEMENT_MODELS = {
    "broker_individual": ["PARTNER", "SUBSCRIPTION"],
    "broker_company": ["PARTNER", "SUBSCRIPTION"],
    "photographer": ["PARTNER", "SUBSCRIPTION"],
    "property_owner": ["FREE_LISTING", "PAY_PER_AD", "BROKERAGE_CONTRACT", "MARKETING_CONTRACT"],
    "property_seeker": ["FREE_LISTING", "PAY_PER_AD"],
}

MODEL_LABELS = {
    "PARTNER": {"name_ar": "شريك عنوان", "description_ar": "بدون اشتراك شهري — رسوم فقط عند نجاح الصفقة"},
    "SUBSCRIPTION": {"name_ar": "اشتراك شهري", "description_ar": "باقة شهرية بمزايا أعلى وعمولة أقل"},
    "FREE_LISTING": {"name_ar": "نشر مجاني", "description_ar": "انشر إعلانك مجاناً — عمولة عند إتمام الصفقة عبر المنصة"},
    "PAY_PER_AD": {"name_ar": "الدفع لكل إعلان", "description_ar": "ادفع لكل إعلان أو ترقية حسب الحاجة"},
    "BROKERAGE_CONTRACT": {"name_ar": "عقد وساطة", "description_ar": "تعاقد مع وسيط معتمد (قريباً)", "coming_soon": True},
    "MARKETING_CONTRACT": {"name_ar": "عقد تسويق", "description_ar": "باقة تسويق متكاملة لعقارك (قريباً)", "coming_soon": True},
}


# ==================== Seed default configuration (idempotent) ====================
async def seed_finance_defaults(db):
    if await db.plans.count_documents({}) == 0:
        plans = [
            {"id": str(uuid.uuid4()), "key": "partner", "name": "Partner", "name_ar": "شريك",
             "user_types": ["broker_individual", "broker_company", "photographer"],
             "billing": "success_fee", "price": 0, "currency": "SAR", "sort_order": 1, "is_active": True,
             "features": {"max_listings": 10, "featured_listings": 0, "premium_listings": 0,
                          "success_fee_percentage": 15.0, "monthly_points": 0, "analytics_access": "basic",
                          "crm_access": False, "team_members": 1, "priority_support": False}},
            {"id": str(uuid.uuid4()), "key": "silver", "name": "Silver", "name_ar": "الفضية",
             "user_types": ["broker_individual", "broker_company", "photographer"],
             "billing": "monthly", "price": 99, "currency": "SAR", "sort_order": 2, "is_active": True,
             "features": {"max_listings": 20, "featured_listings": 1, "premium_listings": 0,
                          "success_fee_percentage": 10.0, "monthly_points": 50, "analytics_access": "basic",
                          "crm_access": False, "team_members": 1, "priority_support": False}},
            {"id": str(uuid.uuid4()), "key": "growth", "name": "Growth", "name_ar": "النمو",
             "user_types": ["broker_individual", "broker_company", "photographer"],
             "billing": "monthly", "price": 199, "currency": "SAR", "sort_order": 3, "is_active": True,
             "features": {"max_listings": 50, "featured_listings": 2, "premium_listings": 0,
                          "success_fee_percentage": 7.5, "monthly_points": 100, "analytics_access": "advanced",
                          "crm_access": True, "team_members": 2, "priority_support": False}},
            {"id": str(uuid.uuid4()), "key": "professional", "name": "Professional", "name_ar": "الاحترافية",
             "user_types": ["broker_individual", "broker_company", "photographer"],
             "billing": "monthly", "price": 399, "currency": "SAR", "sort_order": 4, "is_active": True,
             "features": {"max_listings": 200, "featured_listings": 5, "premium_listings": 2,
                          "success_fee_percentage": 5.0, "monthly_points": 250, "analytics_access": "advanced",
                          "crm_access": True, "team_members": 5, "priority_support": True}},
            {"id": str(uuid.uuid4()), "key": "business", "name": "Business", "name_ar": "الأعمال",
             "user_types": ["broker_company"],
             "billing": "custom", "price": None, "currency": "SAR", "sort_order": 5, "is_active": True,
             "features": {"max_listings": None, "featured_listings": None, "premium_listings": None,
                          "success_fee_percentage": None, "monthly_points": None, "analytics_access": "enterprise",
                          "crm_access": True, "team_members": None, "priority_support": True}},
        ]
        await db.plans.insert_many(plans)

    if await db.ad_products.count_documents({}) == 0:
        products = [
            {"id": str(uuid.uuid4()), "key": "free", "name_ar": "مجاني", "price": 0, "duration_days": 30,
             "priority_level": 0, "homepage_visibility": False, "search_boost": False, "analytics_level": "none", "is_active": True},
            {"id": str(uuid.uuid4()), "key": "standard", "name_ar": "قياسي", "price": 79, "duration_days": 30,
             "priority_level": 1, "homepage_visibility": False, "search_boost": False, "analytics_level": "basic", "is_active": True},
            {"id": str(uuid.uuid4()), "key": "featured", "name_ar": "مميز", "price": 149, "duration_days": 30,
             "priority_level": 2, "homepage_visibility": True, "search_boost": True, "analytics_level": "basic", "is_active": True},
            {"id": str(uuid.uuid4()), "key": "featured_plus", "name_ar": "مميز بلس", "price": 249, "duration_days": 30,
             "priority_level": 3, "homepage_visibility": True, "search_boost": True, "analytics_level": "advanced", "is_active": True},
            {"id": str(uuid.uuid4()), "key": "boost", "name_ar": "تعزيز مؤقت", "price": 49, "duration_days": 7,
             "priority_level": 2, "homepage_visibility": True, "search_boost": True, "analytics_level": "basic", "is_active": True},
        ]
        await db.ad_products.insert_many(products)

    if await db.commission_rules.count_documents({}) == 0:
        rules = [
            {"id": str(uuid.uuid4()), "key": "broker_success", "name_ar": "عمولة نجاح الوسيط (شريك)",
             "user_types": ["broker_individual", "broker_company"], "transaction_type": "SUCCESS_FEE",
             "percentage": 15.0, "min_fee": 0, "max_fee": None, "is_active": True},
            {"id": str(uuid.uuid4()), "key": "owner_success", "name_ar": "عمولة نجاح المالك",
             "user_types": ["property_owner", "property_seeker"], "transaction_type": "SUCCESS_FEE",
             "percentage": 1.0, "min_fee": 0, "max_fee": 25000, "is_active": True},
            {"id": str(uuid.uuid4()), "key": "photographer_success", "name_ar": "عمولة المصور الشريك",
             "user_types": ["photographer"], "transaction_type": "PHOTOGRAPHY_COMMISSION",
             "percentage": 10.0, "min_fee": 0, "max_fee": None, "is_active": True},
        ]
        await db.commission_rules.insert_many(rules)

    if await db.point_rules.count_documents({}) == 0:
        rules = [
            {"id": str(uuid.uuid4()), "key": "COMPLETED_TRANSACTION", "name_ar": "إتمام صفقة", "rule_type": "earn", "points": 50, "is_active": True},
            {"id": str(uuid.uuid4()), "key": "PAID_PLATFORM_FEE", "name_ar": "سداد رسوم المنصة", "rule_type": "earn", "points": 20, "is_active": True},
            {"id": str(uuid.uuid4()), "key": "POSITIVE_REVIEW", "name_ar": "تقييم إيجابي", "rule_type": "earn", "points": 10, "is_active": True},
            {"id": str(uuid.uuid4()), "key": "MONTHLY_SUBSCRIPTION_REWARD", "name_ar": "مكافأة الاشتراك الشهري", "rule_type": "earn", "points": 0, "is_active": True},
            {"id": str(uuid.uuid4()), "key": "PROMOTIONAL_BONUS", "name_ar": "مكافأة ترويجية", "rule_type": "earn", "points": 25, "is_active": True},
            {"id": str(uuid.uuid4()), "key": "FEATURED_AD", "name_ar": "إعلان مميز بالنقاط", "rule_type": "redeem", "points": 200, "is_active": True},
            {"id": str(uuid.uuid4()), "key": "FEATURED_PLUS_AD", "name_ar": "إعلان مميز بلس بالنقاط", "rule_type": "redeem", "points": 350, "is_active": True},
            {"id": str(uuid.uuid4()), "key": "LISTING_BOOST", "name_ar": "تعزيز إعلان بالنقاط", "rule_type": "redeem", "points": 100, "is_active": True},
            {"id": str(uuid.uuid4()), "key": "PROFILE_BOOST", "name_ar": "تعزيز الملف الشخصي", "rule_type": "redeem", "points": 150, "is_active": True},
        ]
        await db.point_rules.insert_many(rules)

    if await db.badges.count_documents({}) == 0:
        badges = [
            {"id": str(uuid.uuid4()), "key": "PARTNER", "name_ar": "شريك", "icon": "handshake",
             "requirements": {"min_transactions": 1, "fees_paid": True, "verified": False}, "is_active": True},
            {"id": str(uuid.uuid4()), "key": "VERIFIED_PARTNER", "name_ar": "شريك موثّق", "icon": "shield-check",
             "requirements": {"min_transactions": 3, "fees_paid": True, "verified": True}, "is_active": True},
            {"id": str(uuid.uuid4()), "key": "PROFESSIONAL_PARTNER", "name_ar": "شريك محترف", "icon": "award",
             "requirements": {"min_transactions": 10, "fees_paid": True, "verified": True}, "is_active": True},
            {"id": str(uuid.uuid4()), "key": "ELITE_PARTNER", "name_ar": "شريك النخبة", "icon": "crown",
             "requirements": {"min_transactions": 25, "fees_paid": True, "verified": True}, "is_active": True},
        ]
        await db.badges.insert_many(badges)

    if await db.promo_codes.count_documents({}) == 0:
        promos = [
            {"id": str(uuid.uuid4()), "code": "WELCOME20", "discount_type": "percentage", "value": 20,
             "max_uses": 100, "used_count": 0, "expires_at": (datetime.utcnow() + timedelta(days=90)).isoformat(),
             "applies_to": ["SUBSCRIPTION_PAYMENT", "LISTING_PAYMENT"], "is_active": True},
            {"id": str(uuid.uuid4()), "code": "ONWAN50", "discount_type": "fixed", "value": 50,
             "max_uses": 50, "used_count": 0, "expires_at": (datetime.utcnow() + timedelta(days=90)).isoformat(),
             "applies_to": ["SUBSCRIPTION_PAYMENT"], "is_active": True},
        ]
        await db.promo_codes.insert_many(promos)


# ==================== Request models ====================
class SelectModelRequest(BaseModel):
    model: str

class SubscribeRequest(BaseModel):
    plan_id: str
    promo_code: Optional[str] = None

class PurchaseAdRequest(BaseModel):
    product_key: str
    property_id: Optional[int] = None
    promo_code: Optional[str] = None

class ValidatePromoRequest(BaseModel):
    code: str
    transaction_type: str = "SUBSCRIPTION_PAYMENT"
    amount: Optional[float] = None

class RedeemPointsRequest(BaseModel):
    service_key: str
    property_id: Optional[int] = None

class SuccessFeeRequest(BaseModel):
    amount: float
    reference_id: Optional[str] = None


def create_finance_routes(db, AuthService, User):

    # ---------- Rules Engine helpers ----------
    async def get_billing(user_id: str) -> dict:
        doc = await db.user_billing.find_one({"user_id": user_id}, {"_id": 0})
        return doc or {}

    async def get_plan(plan_id: str = None, plan_key: str = None) -> Optional[dict]:
        q = {"id": plan_id} if plan_id else {"key": plan_key}
        return await db.plans.find_one(q, {"_id": 0})

    async def resolve_commission(user) -> dict:
        """Rules Engine: plan feature first, then commission_rules fallback."""
        billing = await get_billing(user.id)
        if billing.get("plan_key"):
            plan = await get_plan(plan_key=billing["plan_key"])
            fee = (plan or {}).get("features", {}).get("success_fee_percentage")
            if fee is not None:
                return {"percentage": fee, "min_fee": 0, "max_fee": None, "source": f"plan:{plan['key']}"}
        rule = await db.commission_rules.find_one(
            {"user_types": user.user_type, "is_active": True}, {"_id": 0})
        if rule:
            return {"percentage": rule["percentage"], "min_fee": rule.get("min_fee") or 0,
                    "max_fee": rule.get("max_fee"), "source": f"rule:{rule['key']}"}
        return {"percentage": 0, "min_fee": 0, "max_fee": None, "source": "none"}

    async def validate_promo(code: str, transaction_type: str) -> Optional[dict]:
        if not code:
            return None
        promo = await db.promo_codes.find_one({"code": code.upper().strip(), "is_active": True}, {"_id": 0})
        if not promo:
            raise HTTPException(status_code=400, detail="كود الخصم غير صحيح")
        if promo.get("expires_at") and promo["expires_at"] < now_iso():
            raise HTTPException(status_code=400, detail="كود الخصم منتهي الصلاحية")
        if promo.get("max_uses") is not None and promo.get("used_count", 0) >= promo["max_uses"]:
            raise HTTPException(status_code=400, detail="تم استنفاد عدد استخدامات هذا الكود")
        if transaction_type not in (promo.get("applies_to") or []):
            raise HTTPException(status_code=400, detail="كود الخصم لا ينطبق على هذه الخدمة")
        return promo

    def apply_discount(amount: float, promo: Optional[dict]) -> float:
        if not promo:
            return 0.0
        if promo["discount_type"] == "percentage":
            return round(amount * promo["value"] / 100, 2)
        return round(min(promo["value"], amount), 2)

    async def award_points(user_id: str, rule_key: str, reference_id: str = None, override_points: int = None):
        rule = await db.point_rules.find_one({"key": rule_key, "rule_type": "earn", "is_active": True}, {"_id": 0})
        points = override_points if override_points is not None else (rule or {}).get("points", 0)
        if not points:
            return 0
        await db.points_wallets.update_one(
            {"user_id": user_id},
            {"$inc": {"total_points": points, "available_points": points},
             "$set": {"updated_at": now_iso()}},
            upsert=True)
        await db.point_transactions.insert_one({
            "id": str(uuid.uuid4()), "user_id": user_id, "type": "earn",
            "points": points, "reason": rule_key, "reference_id": reference_id, "created_at": now_iso()})
        return points

    async def check_badges(user) -> List[dict]:
        """Evaluate configurable badge requirements, award new badges."""
        tx_count = await db.financial_transactions.count_documents(
            {"user_id": user.id, "transaction_type": {"$in": ["SUCCESS_FEE", "PHOTOGRAPHY_COMMISSION", "BROKERAGE_FEE"]},
             "payment_status": "paid"})
        fees_paid = tx_count > 0
        verified = bool(getattr(user, "is_nafath_verified", False))
        earned = []
        badges = await db.badges.find({"is_active": True}, {"_id": 0}).to_list(100)
        for badge in badges:
            req = badge.get("requirements", {})
            if tx_count < req.get("min_transactions", 0):
                continue
            if req.get("fees_paid") and not fees_paid:
                continue
            if req.get("verified") and not verified:
                continue
            existing = await db.user_badges.find_one({"user_id": user.id, "badge_key": badge["key"]})
            if not existing:
                await db.user_badges.insert_one({
                    "id": str(uuid.uuid4()), "user_id": user.id, "badge_key": badge["key"],
                    "badge_name_ar": badge["name_ar"], "awarded_at": now_iso()})
                earned.append({"key": badge["key"], "name_ar": badge["name_ar"]})
        return earned

    async def execute_transaction(user, transaction_type: str, gross_amount: float,
                                  platform_fee: float = 0.0, promo: Optional[dict] = None,
                                  reference_type: str = None, reference_id: str = None,
                                  description: str = "") -> dict:
        """Unified Financial Transaction Engine - every money flow passes here."""
        discount = apply_discount(gross_amount, promo)
        net_amount = round(gross_amount - discount, 2)
        payment = {"status": "paid", "provider": "internal", "provider_ref": None}
        if net_amount > 0:
            payment = await PAYMENT_PROVIDER.charge(net_amount, "SAR", description)
        txn = {
            "id": str(uuid.uuid4()),
            "user_id": user.id,
            "user_type": user.user_type,
            "transaction_type": transaction_type,
            "gross_amount": gross_amount,
            "platform_fee": platform_fee,
            "discount": discount,
            "net_amount": net_amount,
            "currency": "SAR",
            "payment_status": payment["status"],
            "payment_method": payment.get("provider"),
            "payment_reference": payment.get("provider_ref"),
            "promo_code": promo["code"] if promo else None,
            "reference_type": reference_type,
            "reference_id": reference_id,
            "description": description,
            "created_at": now_iso(),
        }
        await db.financial_transactions.insert_one({**txn})
        if promo:
            await db.promo_codes.update_one({"id": promo["id"]}, {"$inc": {"used_count": 1}})
        return txn

    # ==================== Public config endpoints ====================
    @finance_router.get("/config")
    async def get_finance_config(user_type: Optional[str] = None):
        plan_q = {"is_active": True}
        if user_type:
            plan_q["user_types"] = user_type
        plans = await db.plans.find(plan_q, {"_id": 0}).sort("sort_order", 1).to_list(50)
        products = await db.ad_products.find({"is_active": True}, {"_id": 0}).sort("priority_level", 1).to_list(50)
        models = ENGAGEMENT_MODELS.get(user_type, []) if user_type else ENGAGEMENT_MODELS
        model_details = None
        if user_type:
            model_details = [{"key": m, **MODEL_LABELS.get(m, {})} for m in models]
        redeem_rules = await db.point_rules.find({"rule_type": "redeem", "is_active": True}, {"_id": 0}).to_list(50)
        return {"plans": plans, "ad_products": products,
                "engagement_models": model_details or models, "redeem_rules": redeem_rules}

    @finance_router.post("/validate-promo")
    async def validate_promo_endpoint(payload: ValidatePromoRequest):
        promo = await validate_promo(payload.code, payload.transaction_type)
        discount = apply_discount(payload.amount, promo) if payload.amount else None
        return {"valid": True, "code": promo["code"], "discount_type": promo["discount_type"],
                "value": promo["value"], "discount_amount": discount}

    # ==================== User billing flows ====================
    @finance_router.post("/select-model")
    async def select_model(payload: SelectModelRequest,
                           current_user: User = Depends(AuthService.get_current_user)):
        allowed = ENGAGEMENT_MODELS.get(current_user.user_type, [])
        if payload.model not in allowed:
            raise HTTPException(status_code=400, detail="نموذج التعامل غير متاح لنوع حسابك")
        if MODEL_LABELS.get(payload.model, {}).get("coming_soon"):
            raise HTTPException(status_code=400, detail="هذا النموذج سيتوفر قريباً")
        update = {"engagement_model": payload.model, "updated_at": now_iso()}
        if payload.model == "PARTNER":
            partner = await get_plan(plan_key="partner")
            update.update({"plan_id": partner["id"], "plan_key": "partner",
                           "plan_name_ar": partner["name_ar"], "status": "active",
                           "subscribed_at": now_iso(), "expires_at": None})
        elif payload.model in ("FREE_LISTING", "PAY_PER_AD"):
            update.update({"plan_id": None, "plan_key": None, "plan_name_ar": None, "status": "active"})
        await db.user_billing.update_one({"user_id": current_user.id}, {"$set": update}, upsert=True)
        return {"success": True, "billing": await get_billing(current_user.id)}

    @finance_router.post("/subscribe")
    async def subscribe(payload: SubscribeRequest,
                        current_user: User = Depends(AuthService.get_current_user)):
        plan = await get_plan(plan_id=payload.plan_id)
        if not plan or not plan.get("is_active"):
            raise HTTPException(status_code=404, detail="الباقة غير موجودة")
        if current_user.user_type not in plan.get("user_types", []):
            raise HTTPException(status_code=400, detail="هذه الباقة غير متاحة لنوع حسابك")
        if plan.get("billing") == "custom":
            raise HTTPException(status_code=400, detail="باقة الأعمال تتطلب التواصل مع فريق المبيعات")
        promo = await validate_promo(payload.promo_code, "SUBSCRIPTION_PAYMENT") if payload.promo_code else None
        price = plan.get("price") or 0
        txn = await execute_transaction(
            current_user, "SUBSCRIPTION_PAYMENT", price, promo=promo,
            reference_type="plan", reference_id=plan["id"],
            description=f"اشتراك باقة {plan['name_ar']}")
        expires = (datetime.utcnow() + timedelta(days=30)).isoformat()
        await db.user_billing.update_one(
            {"user_id": current_user.id},
            {"$set": {"engagement_model": "SUBSCRIPTION" if price > 0 else "PARTNER",
                      "plan_id": plan["id"], "plan_key": plan["key"], "plan_name_ar": plan["name_ar"],
                      "status": "active", "subscribed_at": now_iso(),
                      "expires_at": expires if plan.get("billing") == "monthly" else None,
                      "updated_at": now_iso()}},
            upsert=True)
        monthly_points = plan.get("features", {}).get("monthly_points") or 0
        points = await award_points(current_user.id, "MONTHLY_SUBSCRIPTION_REWARD",
                                    reference_id=txn["id"], override_points=monthly_points)
        return {"success": True, "transaction": txn, "points_awarded": points,
                "billing": await get_billing(current_user.id)}

    @finance_router.post("/purchase-ad")
    async def purchase_ad(payload: PurchaseAdRequest,
                          current_user: User = Depends(AuthService.get_current_user)):
        product = await db.ad_products.find_one({"key": payload.product_key, "is_active": True}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail="منتج الإعلان غير موجود")
        promo = await validate_promo(payload.promo_code, "LISTING_PAYMENT") if payload.promo_code else None
        txn = await execute_transaction(
            current_user, "LISTING_PAYMENT", product.get("price") or 0, promo=promo,
            reference_type="ad_product", reference_id=str(payload.property_id or product["id"]),
            description=f"إعلان {product['name_ar']}")
        expires = (datetime.utcnow() + timedelta(days=product.get("duration_days") or 30)).isoformat()
        await db.ad_purchases.insert_one({
            "id": str(uuid.uuid4()), "user_id": current_user.id, "product_key": product["key"],
            "property_id": payload.property_id, "transaction_id": txn["id"],
            "activated_at": now_iso(), "expires_at": expires, "status": "active"})
        return {"success": True, "transaction": txn, "expires_at": expires}

    @finance_router.post("/success-fee/preview")
    async def success_fee_preview(payload: SuccessFeeRequest,
                                  current_user: User = Depends(AuthService.get_current_user)):
        rule = await resolve_commission(current_user)
        fee = round(payload.amount * rule["percentage"] / 100, 2)
        if rule.get("max_fee"):
            fee = min(fee, rule["max_fee"])
        fee = max(fee, rule.get("min_fee") or 0)
        return {"amount": payload.amount, "percentage": rule["percentage"],
                "platform_fee": fee, "net_amount": round(payload.amount - fee, 2),
                "rule_source": rule["source"]}

    @finance_router.post("/success-fee")
    async def pay_success_fee(payload: SuccessFeeRequest,
                              current_user: User = Depends(AuthService.get_current_user)):
        rule = await resolve_commission(current_user)
        fee = round(payload.amount * rule["percentage"] / 100, 2)
        if rule.get("max_fee"):
            fee = min(fee, rule["max_fee"])
        fee = max(fee, rule.get("min_fee") or 0)
        txn_type = "PHOTOGRAPHY_COMMISSION" if current_user.user_type == "photographer" else "SUCCESS_FEE"
        txn = await execute_transaction(
            current_user, txn_type, payload.amount, platform_fee=fee,
            reference_type="deal", reference_id=payload.reference_id,
            description=f"رسوم نجاح صفقة ({rule['percentage']}%)")
        p1 = await award_points(current_user.id, "COMPLETED_TRANSACTION", reference_id=txn["id"])
        p2 = await award_points(current_user.id, "PAID_PLATFORM_FEE", reference_id=txn["id"])
        new_badges = await check_badges(current_user)
        return {"success": True, "transaction": txn, "platform_fee": fee,
                "net_amount": round(payload.amount - fee, 2),
                "points_awarded": p1 + p2, "new_badges": new_badges}

    @finance_router.post("/redeem-points")
    async def redeem_points(payload: RedeemPointsRequest,
                            current_user: User = Depends(AuthService.get_current_user)):
        rule = await db.point_rules.find_one({"key": payload.service_key, "rule_type": "redeem", "is_active": True}, {"_id": 0})
        if not rule:
            raise HTTPException(status_code=404, detail="خدمة الاستبدال غير موجودة")
        wallet = await db.points_wallets.find_one({"user_id": current_user.id}, {"_id": 0}) or {}
        available = wallet.get("available_points", 0)
        if available < rule["points"]:
            raise HTTPException(status_code=400, detail=f"رصيد النقاط غير كافٍ (المطلوب {rule['points']} نقطة)")
        await db.points_wallets.update_one(
            {"user_id": current_user.id},
            {"$inc": {"available_points": -rule["points"], "used_points": rule["points"]},
             "$set": {"updated_at": now_iso()}})
        await db.point_transactions.insert_one({
            "id": str(uuid.uuid4()), "user_id": current_user.id, "type": "redeem",
            "points": -rule["points"], "reason": payload.service_key,
            "reference_id": str(payload.property_id) if payload.property_id else None,
            "created_at": now_iso()})
        return {"success": True, "service": rule["name_ar"], "points_used": rule["points"],
                "remaining_points": available - rule["points"]}

    @finance_router.get("/me")
    async def my_finance(current_user: User = Depends(AuthService.get_current_user)):
        billing = await get_billing(current_user.id)
        plan = await get_plan(plan_key=billing["plan_key"]) if billing.get("plan_key") else None
        wallet = await db.points_wallets.find_one({"user_id": current_user.id}, {"_id": 0}) or \
            {"total_points": 0, "available_points": 0, "used_points": 0}
        badges = await db.user_badges.find({"user_id": current_user.id}, {"_id": 0}).to_list(50)
        txns = await db.financial_transactions.find(
            {"user_id": current_user.id}, {"_id": 0}).sort("created_at", -1).to_list(20)
        commission = await resolve_commission(current_user)
        return {"billing": billing, "plan": plan, "wallet": wallet,
                "badges": badges, "transactions": txns, "commission": commission,
                "engagement_models": [{"key": m, **MODEL_LABELS.get(m, {})}
                                      for m in ENGAGEMENT_MODELS.get(current_user.user_type, [])]}

    # ==================== Admin: configurable rules management ====================
    async def require_admin(current_user: User = Depends(AuthService.get_current_user)):
        if current_user.user_type != "admin":
            raise HTTPException(status_code=403, detail="صلاحيات المسؤول مطلوبة")
        return current_user

    CONFIG_COLLECTIONS = {
        "plans": db.plans,
        "ad-products": db.ad_products,
        "commission-rules": db.commission_rules,
        "point-rules": db.point_rules,
        "badges": db.badges,
        "promo-codes": db.promo_codes,
    }

    REQUIRED_FIELDS = {
        "plans": ["key", "name_ar", "user_types"],
        "ad-products": ["key", "name_ar", "price"],
        "commission-rules": ["key", "name_ar", "user_types", "percentage"],
        "point-rules": ["key", "name_ar", "rule_type", "points"],
        "badges": ["key", "name_ar"],
        "promo-codes": ["code", "discount_type", "value"],
    }

    def validate_config_payload(collection: str, payload: dict, partial: bool = False):
        required = REQUIRED_FIELDS.get(collection, [])
        for field in required:
            if partial and field not in payload:
                continue
            val = payload.get(field)
            if val is None or val == "" or val == []:
                raise HTTPException(status_code=400, detail=f"الحقل '{field}' مطلوب ولا يمكن تركه فارغاً")
        if "discount_type" in payload and payload["discount_type"] not in ("percentage", "fixed"):
            raise HTTPException(status_code=400, detail="نوع الخصم يجب أن يكون percentage أو fixed")
        if "rule_type" in payload and payload["rule_type"] not in ("earn", "redeem"):
            raise HTTPException(status_code=400, detail="نوع القاعدة يجب أن يكون earn أو redeem")

    @admin_finance_router.get("/{collection}")
    async def admin_list_config(collection: str, admin: User = Depends(require_admin)):
        if collection == "transactions":
            txns = await db.financial_transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
            return {"items": txns}
        col = CONFIG_COLLECTIONS.get(collection)
        if col is None:
            raise HTTPException(status_code=404, detail="نوع الإعدادات غير موجود")
        items = await col.find({}, {"_id": 0}).to_list(200)
        return {"items": items}

    @admin_finance_router.post("/{collection}")
    async def admin_create_config(collection: str, payload: Dict[str, Any],
                                  admin: User = Depends(require_admin)):
        col = CONFIG_COLLECTIONS.get(collection)
        if col is None:
            raise HTTPException(status_code=404, detail="نوع الإعدادات غير موجود")
        payload.pop("_id", None)
        validate_config_payload(collection, payload)
        payload["id"] = str(uuid.uuid4())
        payload.setdefault("is_active", True)
        if collection == "promo-codes":
            payload["code"] = str(payload.get("code", "")).upper().strip()
            payload.setdefault("used_count", 0)
        payload["created_at"] = now_iso()
        await col.insert_one({**payload})
        return {"success": True, "item": payload}

    @admin_finance_router.put("/{collection}/{item_id}")
    async def admin_update_config(collection: str, item_id: str, payload: Dict[str, Any],
                                  admin: User = Depends(require_admin)):
        col = CONFIG_COLLECTIONS.get(collection)
        if col is None:
            raise HTTPException(status_code=404, detail="نوع الإعدادات غير موجود")
        payload.pop("_id", None)
        payload.pop("id", None)
        validate_config_payload(collection, payload, partial=True)
        payload["updated_at"] = now_iso()
        result = await col.update_one({"id": item_id}, {"$set": payload})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="العنصر غير موجود")
        item = await col.find_one({"id": item_id}, {"_id": 0})
        return {"success": True, "item": item}

    @admin_finance_router.delete("/{collection}/{item_id}")
    async def admin_deactivate_config(collection: str, item_id: str,
                                      admin: User = Depends(require_admin)):
        col = CONFIG_COLLECTIONS.get(collection)
        if col is None:
            raise HTTPException(status_code=404, detail="نوع الإعدادات غير موجود")
        result = await col.update_one({"id": item_id}, {"$set": {"is_active": False, "updated_at": now_iso()}})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="العنصر غير موجود")
        return {"success": True, "deactivated": item_id}

    return finance_router, admin_finance_router
