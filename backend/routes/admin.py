# Admin Dashboard Routes
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

admin_router = APIRouter(prefix="/admin", tags=["Admin"])

# Import will be done in server.py to access db and auth

from routes.audit import log_audit

def create_admin_routes(db, AuthService, User):
    """Factory function to create admin routes with dependencies"""
    
    # Admin check middleware
    async def require_admin(current_user: User = Depends(AuthService.get_current_user)):
        if current_user.user_type != "admin":
            raise HTTPException(status_code=403, detail="صلاحيات المسؤول مطلوبة")
        return current_user
    
    # ==================== DASHBOARD STATS ====================
    @admin_router.get("/stats")
    async def get_dashboard_stats(admin: User = Depends(require_admin)):
        """Get dashboard statistics"""
        try:
            today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            week_ago = today - timedelta(days=7)
            
            stats = {
                "total_users": await db.users.count_documents({}),
                "total_properties": await db.properties.count_documents({}),
                "total_brokers": await db.users.count_documents({"user_type": {"$in": ["broker_individual", "broker_company"]}, "is_nafath_verified": True}),
                "total_photographers": await db.users.count_documents({"user_type": "photographer", "is_nafath_verified": True}),
                "pending_properties": await db.properties.count_documents({"status": "pending"}),
                "active_requests": await db.property_requests.count_documents({"is_active": True}),
                "total_matches": await db.property_matches.count_documents({}),
                "new_users_today": await db.users.count_documents({"created_at": {"$gte": today}}),
                "new_users_week": await db.users.count_documents({"created_at": {"$gte": week_ago}}),
                "active_popups": await db.popup_messages.count_documents({"is_active": True})
            }
            
            return {"success": True, "stats": stats}
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            raise HTTPException(status_code=500, detail="خطأ في جلب الإحصائيات")
    
    # ==================== USERS MANAGEMENT ====================
    @admin_router.get("/users")
    async def get_users(
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
        user_type: Optional[str] = None,
        search: Optional[str] = None,
        admin: User = Depends(require_admin)
    ):
        """Get all users with pagination and filters"""
        try:
            query = {}
            if user_type:
                query["user_type"] = user_type
            if search:
                query["$or"] = [
                    {"phone_number": {"$regex": search, "$options": "i"}},
                    {"full_name_arabic": {"$regex": search, "$options": "i"}}
                ]
            
            total = await db.users.count_documents(query)
            users = await db.users.find(query, {"_id": 0}).skip((page - 1) * limit).limit(limit).to_list(length=limit)
            
            return {
                "success": True,
                "users": users,
                "total": total,
                "page": page,
                "pages": (total + limit - 1) // limit
            }
        except Exception as e:
            logger.error(f"Error getting users: {e}")
            raise HTTPException(status_code=500, detail="خطأ في جلب المستخدمين")
    
    @admin_router.put("/users/{user_id}")
    async def update_user(user_id: str, updates: dict, admin: User = Depends(require_admin)):
        """Update user data"""
        try:
            allowed_fields = ["user_type", "is_active", "is_nafath_verified"]
            filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
            
            result = await db.users.update_one({"id": user_id}, {"$set": filtered_updates})
            if result.modified_count == 0:
                raise HTTPException(status_code=404, detail="المستخدم غير موجود")
            await log_audit(db, admin, "USER_UPDATE", "user", user_id, filtered_updates)
            
            return {"success": True, "message": "تم تحديث المستخدم بنجاح"}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating user: {e}")
            raise HTTPException(status_code=500, detail="خطأ في تحديث المستخدم")
    
    @admin_router.delete("/users/{user_id}")
    async def delete_user(user_id: str, admin: User = Depends(require_admin)):
        """Delete a user"""
        try:
            result = await db.users.delete_one({"id": user_id})
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="المستخدم غير موجود")
            await log_audit(db, admin, "USER_DELETE", "user", user_id)
            
            return {"success": True, "message": "تم حذف المستخدم بنجاح"}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            raise HTTPException(status_code=500, detail="خطأ في حذف المستخدم")
    
    # ==================== BROKERS MANAGEMENT ====================
    @admin_router.get("/brokers")
    async def get_brokers(
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
        verified_only: bool = True,
        admin: User = Depends(require_admin)
    ):
        """Get all brokers"""
        try:
            query = {"user_type": {"$in": ["broker_individual", "broker_company"]}}
            if verified_only:
                query["is_nafath_verified"] = True
            
            total = await db.users.count_documents(query)
            brokers = await db.users.find(query, {"_id": 0}).skip((page - 1) * limit).limit(limit).to_list(length=limit)
            
            return {
                "success": True,
                "brokers": brokers,
                "total": total,
                "page": page,
                "pages": (total + limit - 1) // limit
            }
        except Exception as e:
            logger.error(f"Error getting brokers: {e}")
            raise HTTPException(status_code=500, detail="خطأ في جلب الوسطاء")
    
    # ==================== PHOTOGRAPHERS MANAGEMENT ====================
    @admin_router.get("/photographers")
    async def get_photographers(
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
        admin: User = Depends(require_admin)
    ):
        """Get all photographers"""
        try:
            query = {"user_type": "photographer"}
            
            total = await db.users.count_documents(query)
            photographers = await db.users.find(query, {"_id": 0}).skip((page - 1) * limit).limit(limit).to_list(length=limit)
            
            return {
                "success": True,
                "photographers": photographers,
                "total": total,
                "page": page,
                "pages": (total + limit - 1) // limit
            }
        except Exception as e:
            logger.error(f"Error getting photographers: {e}")
            raise HTTPException(status_code=500, detail="خطأ في جلب المصورين")
    
    # ==================== POPUP MESSAGES ====================
    @admin_router.get("/popups")
    async def get_popups(
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
        active_only: bool = False,
        admin: User = Depends(require_admin)
    ):
        """Get all popup messages"""
        try:
            query = {}
            if active_only:
                query["is_active"] = True
            
            total = await db.popup_messages.count_documents(query)
            popups = await db.popup_messages.find(query, {"_id": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(length=limit)
            
            return {
                "success": True,
                "popups": popups,
                "total": total,
                "page": page,
                "pages": (total + limit - 1) // limit
            }
        except Exception as e:
            logger.error(f"Error getting popups: {e}")
            raise HTTPException(status_code=500, detail="خطأ في جلب الرسائل")
    
    @admin_router.post("/popups")
    async def create_popup(popup_data: dict, admin: User = Depends(require_admin)):
        """Create a new popup message"""
        try:
            import uuid
            popup = {
                "id": str(uuid.uuid4()),
                "title": popup_data.get("title"),
                "content": popup_data.get("content"),
                "popup_type": popup_data.get("popup_type", "announcement"),
                "target_audience": popup_data.get("target_audience", "all"),
                "image_url": popup_data.get("image_url"),
                "button_text": popup_data.get("button_text"),
                "button_link": popup_data.get("button_link"),
                "is_active": popup_data.get("is_active", True),
                "start_date": popup_data.get("start_date"),
                "end_date": popup_data.get("end_date"),
                "display_frequency": popup_data.get("display_frequency", "once"),
                "priority": popup_data.get("priority", 0),
                "created_at": datetime.utcnow(),
                "created_by": admin.id
            }
            
            await db.popup_messages.insert_one(popup)
            popup.pop("_id", None)
            await log_audit(db, admin, "POPUP_CREATE", "popup", popup["id"], {"title": popup["title"]})
            
            return {"success": True, "message": "تم إنشاء الرسالة بنجاح", "popup": popup}
        except Exception as e:
            logger.error(f"Error creating popup: {e}")
            raise HTTPException(status_code=500, detail="خطأ في إنشاء الرسالة")
    
    @admin_router.put("/popups/{popup_id}")
    async def update_popup(popup_id: str, updates: dict, admin: User = Depends(require_admin)):
        """Update a popup message"""
        try:
            updates.pop("id", None)
            updates.pop("created_at", None)
            updates.pop("created_by", None)
            
            result = await db.popup_messages.update_one({"id": popup_id}, {"$set": updates})
            if result.modified_count == 0:
                raise HTTPException(status_code=404, detail="الرسالة غير موجودة")
            await log_audit(db, admin, "POPUP_UPDATE", "popup", popup_id, updates)
            
            return {"success": True, "message": "تم تحديث الرسالة بنجاح"}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating popup: {e}")
            raise HTTPException(status_code=500, detail="خطأ في تحديث الرسالة")
    
    @admin_router.delete("/popups/{popup_id}")
    async def delete_popup(popup_id: str, admin: User = Depends(require_admin)):
        """Delete a popup message"""
        try:
            result = await db.popup_messages.delete_one({"id": popup_id})
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="الرسالة غير موجودة")
            await log_audit(db, admin, "POPUP_DELETE", "popup", popup_id)
            
            return {"success": True, "message": "تم حذف الرسالة بنجاح"}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting popup: {e}")
            raise HTTPException(status_code=500, detail="خطأ في حذف الرسالة")
    
    # ==================== PROPERTY REQUESTS ====================
    @admin_router.get("/property-requests")
    async def get_property_requests(
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
        active_only: bool = True,
        admin: User = Depends(require_admin)
    ):
        """Get all property requests"""
        try:
            query = {}
            if active_only:
                query["is_active"] = True
            
            total = await db.property_requests.count_documents(query)
            requests = await db.property_requests.find(query, {"_id": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(length=limit)
            
            return {
                "success": True,
                "requests": requests,
                "total": total,
                "page": page,
                "pages": (total + limit - 1) // limit
            }
        except Exception as e:
            logger.error(f"Error getting requests: {e}")
            raise HTTPException(status_code=500, detail="خطأ في جلب الطلبات")
    
    # ==================== PHOTOGRAPHY REQUESTS ====================
    @admin_router.get("/photography-requests")
    async def get_photography_requests(
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
        status: Optional[str] = None,
        admin: User = Depends(require_admin)
    ):
        """Get all photography requests"""
        try:
            query = {}
            if status:
                query["status"] = status
            
            total = await db.photography_requests.count_documents(query)
            requests = await db.photography_requests.find(query, {"_id": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(length=limit)
            
            return {
                "success": True,
                "requests": requests,
                "total": total,
                "page": page,
                "pages": (total + limit - 1) // limit
            }
        except Exception as e:
            logger.error(f"Error getting photography requests: {e}")
            raise HTTPException(status_code=500, detail="خطأ في جلب طلبات التصوير")
    
    return admin_router
