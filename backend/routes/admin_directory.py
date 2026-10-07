# Admin directory: filterable/sortable broker & photographer tables with platform-derived metrics
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from routes.audit import log_audit
from routes.profiles import PROFILE_FIELDS

directory_router = APIRouter(prefix="/admin/directory", tags=["Admin Directory"])

ROLE_TYPES = {
    "brokers": ["broker_individual", "broker_company"],
    "photographers": ["photographer"],
    "owners": ["property_owner"],
}
SORT_FIELDS = {"created_at", "last_login", "active_listings", "completed_deals", "full_name_arabic", "total_revenue"}

USER_PROJECTION = {k: 1 for k in ["id", "phone_number", "user_type", "is_nafath_verified", "is_active",
                                  "created_at", "last_login", "suspension_reason"] + PROFILE_FIELDS}
USER_PROJECTION["_id"] = 0


class SuspendRequest(BaseModel):
    suspended: bool
    reason: Optional[str] = Field(None, max_length=300)


def metrics_stages():
    return [
        {"$lookup": {"from": "properties", "let": {"uid": "$id"},
                     "pipeline": [{"$match": {"$expr": {"$and": [
                         {"$eq": ["$owner_id", "$$uid"]}, {"$ne": ["$is_active", False]}]}}},
                         {"$project": {"is_completed": 1, "featured_type": 1}}],
                     "as": "_props"}},
        {"$lookup": {"from": "user_billing", "localField": "id", "foreignField": "user_id", "as": "_billing"}},
        {"$lookup": {"from": "points_wallets", "localField": "id", "foreignField": "user_id", "as": "_wallet"}},
        {"$lookup": {"from": "financial_transactions", "let": {"uid": "$id"},
                     "pipeline": [{"$match": {"$expr": {"$and": [
                         {"$eq": ["$user_id", "$$uid"]}, {"$eq": ["$payment_status", "paid"]}]}}},
                         {"$group": {"_id": None, "count": {"$sum": 1}, "total": {"$sum": {"$cond": [
                             {"$in": ["$transaction_type", ["SUCCESS_FEE", "PHOTOGRAPHY_COMMISSION"]]},
                             "$platform_fee", "$net_amount"]}}}}],
                     "as": "_txn"}},
        {"$addFields": {
            "total_listings": {"$size": "$_props"},
            "completed_deals": {"$size": {"$filter": {"input": "$_props", "cond": {"$eq": ["$$this.is_completed", True]}}}},
            "featured_listings": {"$size": {"$filter": {"input": "$_props", "cond": {"$ne": ["$$this.featured_type", "standard"]}}}},
            "plan_key": {"$ifNull": [{"$arrayElemAt": ["$_billing.plan_key", 0]}, None]},
            "plan_name_ar": {"$ifNull": [{"$arrayElemAt": ["$_billing.plan_name_ar", 0]}, None]},
            "engagement_model": {"$ifNull": [{"$arrayElemAt": ["$_billing.engagement_model", 0]}, None]},
            "points": {"$ifNull": [{"$arrayElemAt": ["$_wallet.available_points", 0]}, 0]},
            "total_revenue": {"$ifNull": [{"$arrayElemAt": ["$_txn.total", 0]}, 0]},
            "transactions_count": {"$ifNull": [{"$arrayElemAt": ["$_txn.count", 0]}, 0]},
        }},
        {"$addFields": {"active_listings": {"$subtract": ["$total_listings", "$completed_deals"]}}},
        {"$project": {"_props": 0, "_billing": 0, "_wallet": 0, "_txn": 0}},
    ]


def create_directory_routes(db, AuthService, User):

    async def require_admin(current_user: User = Depends(AuthService.get_current_user)):
        if current_user.user_type != "admin":
            raise HTTPException(status_code=403, detail="صلاحيات المسؤول مطلوبة")
        return current_user

    @directory_router.get("/{role}")
    async def list_directory(
        role: str,
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
        region: Optional[str] = None,
        city: Optional[str] = None,
        user_type: Optional[str] = None,
        verified: Optional[str] = Query(None, pattern="^(verified|unverified)$"),
        status: Optional[str] = Query(None, pattern="^(active|suspended)$"),
        plan_key: Optional[str] = None,
        specialization: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
        admin: User = Depends(require_admin),
    ):
        types = ROLE_TYPES.get(role)
        if not types:
            raise HTTPException(status_code=404, detail="نوع الدليل غير موجود")
        if sort_by not in SORT_FIELDS:
            raise HTTPException(status_code=400, detail="حقل الفرز غير مدعوم")

        match = {"user_type": {"$in": [user_type] if user_type in types else types}}
        if region:
            match["region"] = region
        if city:
            match["city"] = city
        if verified:
            match["is_nafath_verified"] = verified == "verified"
        if status:
            match["is_active"] = status == "active"
        if specialization:
            match["specializations"] = specialization
        if search:
            rx = {"$regex": search.strip(), "$options": "i"}
            match["$or"] = [{"phone_number": rx}, {"full_name_arabic": rx}, {"company_name": rx},
                            {"fal_license": rx}, {"email": rx}]

        post_match = {"plan_key": plan_key} if plan_key else {}
        pipeline = [{"$match": match}, {"$project": USER_PROJECTION}, *metrics_stages()]
        if post_match:
            pipeline.append({"$match": post_match})
        pipeline.append({"$facet": {
            "items": [{"$sort": {sort_by: 1 if sort_dir == "asc" else -1, "id": 1}},
                      {"$skip": (page - 1) * limit}, {"$limit": limit}],
            "total": [{"$count": "n"}],
            "by_region": [{"$group": {"_id": {"$ifNull": ["$region", "unset"]}, "n": {"$sum": 1}}}],
            "by_type": [{"$group": {"_id": "$user_type", "n": {"$sum": 1}}}],
            "by_plan": [{"$group": {"_id": {"$ifNull": ["$plan_key", "none"]}, "n": {"$sum": 1}}}],
            "verified": [{"$match": {"is_nafath_verified": True}}, {"$count": "n"}],
            "suspended": [{"$match": {"is_active": False}}, {"$count": "n"}],
            "listings": [{"$group": {"_id": None, "active": {"$sum": "$active_listings"},
                                     "completed": {"$sum": "$completed_deals"}}}],
        }})
        res = (await db.users.aggregate(pipeline).to_list(1))[0]
        total = res["total"][0]["n"] if res["total"] else 0
        listings = res["listings"][0] if res["listings"] else {"active": 0, "completed": 0}
        return {
            "items": res["items"], "total": total, "page": page, "pages": max(1, -(-total // limit)),
            "summary": {
                "total": total,
                "verified": res["verified"][0]["n"] if res["verified"] else 0,
                "suspended": res["suspended"][0]["n"] if res["suspended"] else 0,
                "active_listings": listings["active"], "completed_deals": listings["completed"],
                "by_region": {r["_id"]: r["n"] for r in res["by_region"]},
                "by_type": {r["_id"]: r["n"] for r in res["by_type"]},
                "by_plan": {r["_id"]: r["n"] for r in res["by_plan"]},
            },
        }

    @directory_router.get("/user/{user_id}")
    async def user_detail(user_id: str, admin: User = Depends(require_admin)):
        rows = await db.users.aggregate([{"$match": {"id": user_id}}, {"$project": USER_PROJECTION},
                                         *metrics_stages()]).to_list(1)
        if not rows:
            raise HTTPException(status_code=404, detail="المستخدم غير موجود")
        user = rows[0]
        billing = await db.user_billing.find_one({"user_id": user_id}, {"_id": 0})
        properties = await db.properties.find({"owner_id": user_id, "is_active": {"$ne": False}}, {
            "_id": 0, "id": 1, "title": 1, "price": 1, "city": 1, "status": 1, "is_completed": 1,
            "featured_type": 1, "views": 1, "publishDate": 1, "created_at": 1}).sort("created_at", -1).to_list(100)
        transactions = await db.financial_transactions.find({"user_id": user_id}, {"_id": 0}) \
            .sort("created_at", -1).to_list(50)
        audit = await db.audit_logs.find({"$or": [{"actor_id": user_id}, {"entity_id": user_id}]}, {"_id": 0}) \
            .sort("created_at", -1).to_list(50)
        badges = await db.user_badges.find({"user_id": user_id}, {"_id": 0}).to_list(20)
        return {"user": user, "billing": billing, "properties": properties,
                "transactions": transactions, "audit_logs": audit, "badges": badges}

    @directory_router.post("/user/{user_id}/suspend")
    async def suspend_user(user_id: str, payload: SuspendRequest, admin: User = Depends(require_admin)):
        target = await db.users.find_one({"id": user_id}, {"_id": 0, "user_type": 1})
        if not target:
            raise HTTPException(status_code=404, detail="المستخدم غير موجود")
        if target["user_type"] == "admin":
            raise HTTPException(status_code=400, detail="لا يمكن إيقاف حساب مسؤول")
        updates = {"is_active": not payload.suspended,
                   "suspension_reason": payload.reason if payload.suspended else None,
                   "suspended_at": datetime.utcnow().isoformat() if payload.suspended else None,
                   "suspended_by": admin.id if payload.suspended else None}
        await db.users.update_one({"id": user_id}, {"$set": updates})
        await log_audit(db, admin, "USER_SUSPEND" if payload.suspended else "USER_REACTIVATE", "user",
                        user_id, {"reason": payload.reason})
        return {"success": True, "is_active": not payload.suspended}

    return directory_router
