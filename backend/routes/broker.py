# Broker dashboard: KPIs, 30-day views series, leads, finance, points, alerts
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta

broker_router = APIRouter(prefix="/broker", tags=["Broker"])
BROKER_TYPES = {"broker_individual", "broker_company", "property_owner", "photographer"}


def create_broker_routes(db, AuthService, User):

    @broker_router.get("/dashboard")
    async def dashboard(current_user: User = Depends(AuthService.get_current_user)):
        if current_user.user_type not in BROKER_TYPES:
            raise HTTPException(status_code=403, detail="هذه اللوحة مخصصة للوسطاء والملاك")
        uid = current_user.id
        props = await db.properties.find({"owner_id": uid, "is_active": {"$ne": False}}, {"_id": 0}) \
            .sort("created_at", -1).to_list(300)
        prop_ids = [p["id"] for p in props]
        by_id = {p["id"]: p for p in props}

        # Leads: users who marked interest / like on my listings
        favs = await db.favorites.find({"$or": [{"interests": {"$in": prop_ids}}, {"likes": {"$in": prop_ids}}]},
                                       {"_id": 0}).to_list(2000) if prop_ids else []
        lead_user_ids = list({f["user_id"] for f in favs})
        users = {u["id"]: u for u in await db.users.find({"id": {"$in": lead_user_ids}},
                 {"_id": 0, "id": 1, "full_name_arabic": 1, "phone_number": 1, "user_type": 1, "city": 1}).to_list(2000)}
        leads, likes_count = [], {}
        for f in favs:
            for pid in f.get("likes", []):
                if pid in by_id:
                    likes_count[pid] = likes_count.get(pid, 0) + 1
            for pid in f.get("interests", []):
                if pid in by_id:
                    u = users.get(f["user_id"], {})
                    leads.append({"property_id": pid, "property_title": by_id[pid]["title"],
                                  "user_name": u.get("full_name_arabic") or "مستخدم", "phone": u.get("phone_number"),
                                  "user_type": u.get("user_type"), "city": u.get("city"), "since": f.get("updated_at")})
        leads.sort(key=lambda l: l["since"] or "", reverse=True)

        # Views series (last 30 days)
        since = (datetime.utcnow() - timedelta(days=29)).strftime("%Y-%m-%d")
        daily = await db.property_views_daily.aggregate([
            {"$match": {"owner_id": uid, "date": {"$gte": since}}},
            {"$group": {"_id": "$date", "n": {"$sum": "$count"}}}]).to_list(40)
        daily_map = {d["_id"]: d["n"] for d in daily}
        series = [{"date": (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")} for i in range(29, -1, -1)]
        for s in series:
            s["views"] = daily_map.get(s["date"], 0)
        per_listing_views = await db.property_views_daily.aggregate([
            {"$match": {"owner_id": uid, "date": {"$gte": since}}},
            {"$group": {"_id": "$property_id", "n": {"$sum": "$count"}}}]).to_list(300)
        views30 = {v["_id"]: v["n"] for v in per_listing_views}

        # Plan & billing
        billing = await db.user_billing.find_one({"user_id": uid}, {"_id": 0}) or {}
        plan = await db.plans.find_one({"key": billing["plan_key"]}, {"_id": 0}) if billing.get("plan_key") else None
        max_listings = (plan or {}).get("features", {}).get("max_listings")

        wallet = await db.points_wallets.find_one({"user_id": uid}, {"_id": 0}) or {}
        user_badges = await db.user_badges.find({"user_id": uid}, {"_id": 0}).to_list(20)
        catalog = {b["key"]: b for b in await db.badges.find({}, {"_id": 0}).to_list(50)}
        badges = [{**catalog.get(b["badge_key"], {"key": b["badge_key"], "name_ar": b["badge_key"]}),
                   "earned_at": b.get("earned_at") or b.get("awarded_at")} for b in user_badges]
        point_txns = await db.point_transactions.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(20)
        transactions = await db.financial_transactions.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(30)
        ad_purchases = await db.ad_purchases.find({"user_id": uid, "status": "active"}, {"_id": 0}).to_list(50)

        active = [p for p in props if not p.get("is_completed")]
        completed = [p for p in props if p.get("is_completed")]
        total_views = sum(int(p.get("views") or 0) for p in props)

        # Alerts
        alerts = []
        udoc = await db.users.find_one({"id": uid}, {"_id": 0, "region": 1, "city": 1, "fal_license": 1}) or {}
        missing = [l for k, l in [("region", "المنطقة"), ("city", "المدينة"), ("fal_license", "رخصة فال")] if not udoc.get(k)]
        if missing and current_user.user_type.startswith("broker"):
            alerts.append({"type": "profile", "level": "warn", "text": f"ملفك المهني ناقص: {'، '.join(missing)}", "action": "profile"})
        if billing.get("expires_at"):
            try:
                days = (datetime.fromisoformat(billing["expires_at"].replace("Z", "")) - datetime.utcnow()).days
                if days <= 7:
                    alerts.append({"type": "plan", "level": "danger" if days <= 2 else "warn",
                                   "text": f"باقتك {(plan or {}).get('name_ar', '')} " + ("تنتهي اليوم" if days <= 0 else f"تنتهي خلال {days} يوم"), "action": "subscriptions"})
            except ValueError:
                pass
        if max_listings and len(props) >= max_listings * 0.8:
            alerts.append({"type": "limit", "level": "warn" if len(props) < max_listings else "danger",
                           "text": f"استخدمت {len(props)} من {max_listings} إعلاناً في باقتك", "action": "subscriptions"})
        for ap in ad_purchases:
            try:
                days = (datetime.fromisoformat(ap["expires_at"]) - datetime.utcnow()).days
                if days <= 3 and ap["property_id"] in by_id:
                    alerts.append({"type": "featured", "level": "warn",
                                   "text": f"تمييز إعلان «{by_id[ap['property_id']]['title']}» ينتهي خلال {max(days, 0)} يوم",
                                   "action": "subscriptions", "property_id": ap["property_id"]})
            except (ValueError, KeyError):
                pass
        if not alerts and active:
            no_views = [p for p in active if int(p.get("views") or 0) == 0]
            if no_views:
                alerts.append({"type": "tip", "level": "info", "text": f"{len(no_views)} من إعلاناتك بلا مشاهدات بعد — جرّب ترقيتها إلى مميز", "action": "subscriptions"})

        return {
            "kpis": {"active_listings": len(active), "completed_deals": len(completed),
                     "featured_listings": sum(1 for p in props if p.get("featured_type", "standard") != "standard"),
                     "total_views": total_views, "views_30d": sum(s["views"] for s in series),
                     "leads": len(leads), "likes": sum(likes_count.values()),
                     "points": wallet.get("available_points", 0)},
            "plan": {"key": billing.get("plan_key"), "name_ar": (plan or {}).get("name_ar"),
                     "engagement_model": billing.get("engagement_model"), "status": billing.get("status"),
                     "expires_at": billing.get("expires_at"), "max_listings": max_listings, "used": len(props),
                     "success_fee_percentage": (plan or {}).get("features", {}).get("success_fee_percentage")},
            "listings": [{**p, "likes": likes_count.get(p["id"], 0), "views_30d": views30.get(p["id"], 0),
                          "interested": sum(1 for l in leads if l["property_id"] == p["id"])} for p in props],
            "leads": leads, "views_series": series, "alerts": alerts,
            "wallet": wallet, "badges": badges, "point_transactions": point_txns,
            "transactions": transactions, "ad_purchases": ad_purchases,
        }

    return broker_router
