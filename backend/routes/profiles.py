# User-facing profile: brokers / photographers / owners fill location, specialization and licensing data
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
import re
from routes.audit import log_audit

profile_router = APIRouter(prefix="/profile", tags=["Profile"])

BROKER_SPECIALIZATIONS = {
    "residential_sale": "بيع سكني", "residential_rent": "تأجير سكني", "commercial": "تجاري",
    "land": "أراضٍ", "projects": "مشاريع على الخارطة", "management": "إدارة أملاك",
}
PHOTOGRAPHER_SPECIALIZATIONS = {
    "photo": "تصوير فوتوغرافي", "video": "فيديو", "drone": "تصوير جوي (درون)",
    "virtual_tour": "جولة افتراضية 360", "staging": "تجهيز وتنسيق العقار",
}

PROFILE_FIELDS = ["full_name_arabic", "full_name_english", "email", "region", "city", "districts",
                  "specializations", "fal_license", "experience_years", "company_name",
                  "commercial_register", "bio", "portfolio_url"]


class ProfileUpdate(BaseModel):
    full_name_arabic: Optional[str] = Field(None, max_length=120)
    full_name_english: Optional[str] = Field(None, max_length=120)
    email: Optional[str] = Field(None, max_length=160)
    region: Optional[str] = Field(None, max_length=40)
    city: Optional[str] = Field(None, max_length=60)
    districts: Optional[List[str]] = None
    specializations: Optional[List[str]] = None
    fal_license: Optional[str] = Field(None, max_length=40)
    experience_years: Optional[int] = Field(None, ge=0, le=60)
    company_name: Optional[str] = Field(None, max_length=160)
    commercial_register: Optional[str] = Field(None, max_length=20)
    bio: Optional[str] = Field(None, max_length=600)
    portfolio_url: Optional[str] = Field(None, max_length=300)

    @validator("email")
    def _email(cls, v):
        if v and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("البريد الإلكتروني غير صحيح")
        return v

    @validator("districts", "specializations")
    def _limit_list(cls, v):
        if v is not None and len(v) > 20:
            raise ValueError("الحد الأقصى 20 عنصراً")
        return v


def public_profile(doc: dict) -> dict:
    return {k: doc.get(k) for k in ["id", "phone_number", "user_type", "is_phone_verified", "avatar_url",
                                     "is_nafath_verified", "is_active", "created_at", "last_login"] + PROFILE_FIELDS}


def create_profile_routes(db, AuthService, User):

    @profile_router.get("/me")
    async def get_my_profile(current_user: User = Depends(AuthService.get_current_user)):
        doc = await db.users.find_one({"id": current_user.id}, {"_id": 0})
        return {"profile": public_profile(doc), "options": {
            "broker_specializations": BROKER_SPECIALIZATIONS,
            "photographer_specializations": PHOTOGRAPHER_SPECIALIZATIONS}}

    @profile_router.put("/me")
    async def update_my_profile(payload: ProfileUpdate,
                                current_user: User = Depends(AuthService.get_current_user)):
        updates = {k: v for k, v in payload.dict().items() if v is not None}
        if not updates:
            raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث")
        allowed_specs = BROKER_SPECIALIZATIONS if current_user.user_type.startswith("broker") else PHOTOGRAPHER_SPECIALIZATIONS
        if "specializations" in updates:
            bad = [s for s in updates["specializations"] if s not in allowed_specs]
            if bad:
                raise HTTPException(status_code=400, detail=f"تخصص غير معروف: {', '.join(bad)}")
        if "email" in updates:
            dup = await db.users.find_one({"email": updates["email"], "id": {"$ne": current_user.id}})
            if dup:
                raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم في حساب آخر")
        updates["profile_updated_at"] = datetime.utcnow().isoformat()
        await db.users.update_one({"id": current_user.id}, {"$set": updates})
        await log_audit(db, current_user, "PROFILE_UPDATE", "user", current_user.id,
                        {k: v for k, v in updates.items() if k != "profile_updated_at"})
        doc = await db.users.find_one({"id": current_user.id}, {"_id": 0})
        return {"success": True, "profile": public_profile(doc)}

    return profile_router
