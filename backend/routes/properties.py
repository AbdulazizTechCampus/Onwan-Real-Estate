# Properties - real database CRUD with plan limits enforcement
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Union, Any
from datetime import datetime
import uuid
import logging
from routes.audit import log_audit

logger = logging.getLogger(__name__)

properties_router = APIRouter(prefix="/properties", tags=["Properties"])

now_iso = lambda: datetime.utcnow().isoformat()

CITY_COORDS = {
    "الرياض": [24.7136, 46.6753],
    "جدة": [21.4858, 39.1925],
    "الدمام": [26.4207, 50.0888],
    "مكة المكرمة": [21.3891, 39.8579],
    "المدينة المنورة": [24.5247, 39.5692],
    "الخبر": [26.2172, 50.1971],
}


class PropertyCreate(BaseModel):
    title: str
    status: str  # للبيع | للإيجار
    type: str = "apartment"
    category: str = "residential"
    price: Union[int, float, str]
    city: str = "الرياض"
    district: Optional[str] = None
    area: Union[int, float, str]
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    age: Optional[int] = 0
    image: Optional[str] = None
    description: Optional[str] = None


class StatusUpdate(BaseModel):
    is_completed: bool


def create_properties_routes(db, AuthService, User):

    async def get_plan_limit(user) -> Optional[int]:
        billing = await db.user_billing.find_one({"user_id": user.id}, {"_id": 0}) or {}
        if billing.get("plan_key"):
            plan = await db.plans.find_one({"key": billing["plan_key"]}, {"_id": 0})
            if plan:
                return plan.get("features", {}).get("max_listings")
        return None  # no plan -> no enforced limit (free listing)

    @properties_router.get("")
    async def list_properties():
        docs = await db.properties.find({"is_active": {"$ne": False}}, {"_id": 0}).to_list(500)
        return {"properties": docs, "total": len(docs)}

    @properties_router.get("/mine")
    async def my_properties(current_user: User = Depends(AuthService.get_current_user)):
        docs = await db.properties.find(
            {"owner_id": current_user.id, "is_active": {"$ne": False}}, {"_id": 0}
        ).to_list(200)
        limit = await get_plan_limit(current_user)
        return {"properties": docs, "total": len(docs), "max_listings": limit}

    @properties_router.post("")
    async def create_property(payload: PropertyCreate,
                              current_user: User = Depends(AuthService.get_current_user)):
        if payload.status not in ("للبيع", "للإيجار"):
            raise HTTPException(status_code=400, detail="حالة الإعلان يجب أن تكون للبيع أو للإيجار")
        limit = await get_plan_limit(current_user)
        owned = await db.properties.count_documents(
            {"owner_id": current_user.id, "is_active": {"$ne": False}})
        if limit is not None and owned >= limit:
            raise HTTPException(
                status_code=400,
                detail=f"وصلت للحد الأقصى لعدد الإعلانات في باقتك ({limit}). قم بترقية باقتك لنشر المزيد")
        price_str = f"{int(float(str(payload.price).replace(',', ''))):,}"
        location = f"{('حي ' + payload.district + '، ') if payload.district else ''}{payload.city}"
        doc = {
            "id": str(uuid.uuid4()),
            "owner_id": current_user.id,
            "title": payload.title,
            "price": price_str,
            "location": location,
            "city": payload.city,
            "district": payload.district,
            "area": str(payload.area),
            "bedrooms": payload.bedrooms,
            "bathrooms": payload.bathrooms,
            "age": payload.age or 0,
            "type": payload.type,
            "category": payload.category,
            "image": payload.image or "https://images.unsplash.com/photo-1560518883-ce09059eeffa?crop=entropy&cs=srgb&fm=jpg&q=85",
            "description": payload.description,
            "status": payload.status,
            "featured": False,
            "featured_type": "standard",
            "is_completed": False,
            "views": 0,
            "publishDate": datetime.utcnow().strftime("%Y-%m-%d"),
            "coordinates": CITY_COORDS.get(payload.city, CITY_COORDS["الرياض"]),
            "agent": {
                "name": current_user.full_name_arabic or current_user.phone_number,
                "phone": current_user.phone_number,
                "image": f"https://api.dicebear.com/7.x/avataaars/svg?seed={current_user.id[:8]}"
            },
            "is_active": True,
            "created_at": now_iso(),
        }
        await db.properties.insert_one({**doc})
        await log_audit(db, current_user, "PROPERTY_CREATE", "property", doc["id"],
                        {"title": doc["title"], "city": doc["city"], "status": doc["status"]})
        return {"success": True, "property": doc, "used": owned + 1, "max_listings": limit}

    @properties_router.post("/{property_id}/status")
    async def update_property_status(property_id: str, payload: StatusUpdate,
                                     current_user: User = Depends(AuthService.get_current_user)):
        ids: List[Any] = [property_id]
        if property_id.isdigit():
            ids.append(int(property_id))
        doc = await db.properties.find_one({"id": {"$in": ids}}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="الإعلان غير موجود")
        owner = doc.get("owner_id")
        if owner and owner != current_user.id and current_user.user_type != "admin":
            raise HTTPException(status_code=403, detail="لا تملك صلاحية تعديل هذا الإعلان")
        await db.properties.update_one(
            {"id": doc["id"]},
            {"$set": {"is_completed": payload.is_completed, "status_updated_at": now_iso(),
                      "status_updated_by": current_user.id}})
        await log_audit(db, current_user, "PROPERTY_STATUS_CHANGE", "property", doc["id"],
                        {"is_completed": payload.is_completed, "owner_id": owner})
        return {"success": True, "property_id": doc["id"], "is_completed": payload.is_completed}

    @properties_router.post("/seed")
    async def seed_properties(payload: List[dict],
                              current_user: User = Depends(AuthService.get_current_user)):
        if current_user.user_type != "admin":
            raise HTTPException(status_code=403, detail="صلاحيات المسؤول مطلوبة")
        if await db.properties.count_documents({}) > 0:
            return {"success": True, "seeded": 0, "note": "already seeded"}
        for p in payload:
            p.pop("_id", None)
            p.setdefault("owner_id", None)
            p.setdefault("is_active", True)
            p.setdefault("is_completed", False)
            p.setdefault("created_at", now_iso())
        if payload:
            await db.properties.insert_many([{**p} for p in payload])
        return {"success": True, "seeded": len(payload)}

    return properties_router
