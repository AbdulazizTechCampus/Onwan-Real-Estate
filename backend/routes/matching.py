# Matching and Recommendation Routes
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
import logging
import uuid

logger = logging.getLogger(__name__)

matching_router = APIRouter(prefix="/matching", tags=["Matching"])

def create_matching_routes(db, AuthService, User):
    """Factory function to create matching routes with dependencies"""
    
    # ==================== PROPERTY REQUESTS (User facing) ====================
    @matching_router.post("/property-requests")
    async def create_property_request(
        request_data: dict,
        current_user: User = Depends(AuthService.get_current_user)
    ):
        """Create a new property request"""
        try:
            property_request = {
                "id": str(uuid.uuid4()),
                "user_id": current_user.id,
                "user_phone": current_user.phone_number,
                "property_type": request_data.get("property_type"),
                "transaction_type": request_data.get("transaction_type"),
                "region": request_data.get("region"),
                "city": request_data.get("city"),
                "district": request_data.get("district"),
                "min_price": request_data.get("min_price"),
                "max_price": request_data.get("max_price"),
                "min_area": request_data.get("min_area"),
                "max_area": request_data.get("max_area"),
                "bedrooms": request_data.get("bedrooms"),
                "bathrooms": request_data.get("bathrooms"),
                "additional_requirements": request_data.get("additional_requirements"),
                "is_active": True,
                "created_at": datetime.utcnow(),
                "matched_properties": []
            }
            
            await db.property_requests.insert_one(property_request)
            property_request.pop("_id", None)
            
            # Trigger matching in background
            matches = await find_matching_properties(db, property_request)
            
            return {
                "success": True,
                "message": "تم إنشاء طلبك بنجاح",
                "request": property_request,
                "initial_matches": len(matches)
            }
        except Exception as e:
            logger.error(f"Error creating property request: {e}")
            raise HTTPException(status_code=500, detail="خطأ في إنشاء الطلب")
    
    @matching_router.get("/my-requests")
    async def get_my_requests(current_user: User = Depends(AuthService.get_current_user)):
        """Get user's property requests"""
        try:
            requests = await db.property_requests.find(
                {"user_id": current_user.id},
                {"_id": 0}
            ).sort("created_at", -1).to_list(length=50)
            
            return {"success": True, "requests": requests}
        except Exception as e:
            logger.error(f"Error getting user requests: {e}")
            raise HTTPException(status_code=500, detail="خطأ في جلب الطلبات")
    
    @matching_router.get("/my-matches")
    async def get_my_matches(current_user: User = Depends(AuthService.get_current_user)):
        """Get matched properties for user's requests"""
        try:
            matches = await db.property_matches.find(
                {"user_id": current_user.id},
                {"_id": 0}
            ).sort("match_score", -1).to_list(length=50)
            
            return {"success": True, "matches": matches}
        except Exception as e:
            logger.error(f"Error getting matches: {e}")
            raise HTTPException(status_code=500, detail="خطأ في جلب التطابقات")
    
    # ==================== USER INTERACTIONS ====================
    @matching_router.post("/interactions")
    async def record_interaction(
        interaction_data: dict,
        current_user: User = Depends(AuthService.get_current_user)
    ):
        """Record user interaction with a property"""
        try:
            interaction = {
                "id": str(uuid.uuid4()),
                "user_id": current_user.id,
                "property_id": interaction_data.get("property_id"),
                "interaction_type": interaction_data.get("interaction_type"),  # view, like, favorite, share
                "created_at": datetime.utcnow()
            }
            
            await db.user_interactions.insert_one(interaction)
            
            # Update user preferences based on interaction
            await update_user_preferences(db, current_user.id, interaction)
            
            return {"success": True, "message": "تم تسجيل التفاعل"}
        except Exception as e:
            logger.error(f"Error recording interaction: {e}")
            raise HTTPException(status_code=500, detail="خطأ في تسجيل التفاعل")
    
    # ==================== RECOMMENDATIONS ====================
    @matching_router.get("/recommendations")
    async def get_recommendations(
        limit: int = Query(10, ge=1, le=50),
        current_user: User = Depends(AuthService.get_current_user)
    ):
        """Get personalized property recommendations"""
        try:
            recommendations = await generate_recommendations(db, current_user.id, limit)
            return {"success": True, "recommendations": recommendations}
        except Exception as e:
            logger.error(f"Error getting recommendations: {e}")
            raise HTTPException(status_code=500, detail="خطأ في جلب التوصيات")
    
    @matching_router.get("/similar/{property_id}")
    async def get_similar_properties(
        property_id: str,
        limit: int = Query(6, ge=1, le=20)
    ):
        """Get similar properties"""
        try:
            similar = await find_similar_properties(db, property_id, limit)
            return {"success": True, "similar_properties": similar}
        except Exception as e:
            logger.error(f"Error getting similar properties: {e}")
            raise HTTPException(status_code=500, detail="خطأ في جلب العقارات المشابهة")
    
    # ==================== PUBLIC POPUP ENDPOINT ====================
    @matching_router.get("/popups/active")
    async def get_active_popups(
        user_type: str = "guest",
        is_new_visitor: bool = False
    ):
        """Get active popup messages for display"""
        try:
            now = datetime.utcnow()
            query = {
                "is_active": True,
                "$or": [
                    {"start_date": None},
                    {"start_date": {"$lte": now}}
                ]
            }
            
            # Filter by target audience
            target_filters = ["all"]
            if user_type == "guest":
                target_filters.append("guests")
            else:
                target_filters.append("registered")
            if is_new_visitor:
                target_filters.append("new_visitors")
            
            query["target_audience"] = {"$in": target_filters}
            
            popups = await db.popup_messages.find(
                query,
                {"_id": 0}
            ).sort("priority", -1).to_list(length=5)
            
            # Filter out expired popups
            active_popups = []
            for popup in popups:
                if popup.get("end_date") is None or popup.get("end_date") > now:
                    active_popups.append(popup)
            
            return {"success": True, "popups": active_popups}
        except Exception as e:
            logger.error(f"Error getting active popups: {e}")
            return {"success": True, "popups": []}
    
    return matching_router


# ==================== HELPER FUNCTIONS ====================

async def find_matching_properties(db, property_request: dict) -> List[dict]:
    """Find properties matching a request"""
    try:
        query = {
            "status": "approved",
            "property_type": property_request.get("property_type"),
            "transaction_type": property_request.get("transaction_type"),
            "region": property_request.get("region")
        }
        
        # Add optional filters
        if property_request.get("city"):
            query["city"] = property_request.get("city")
        
        if property_request.get("min_price") or property_request.get("max_price"):
            query["price"] = {}
            if property_request.get("min_price"):
                query["price"]["$gte"] = property_request.get("min_price")
            if property_request.get("max_price"):
                query["price"]["$lte"] = property_request.get("max_price")
        
        if property_request.get("bedrooms"):
            query["bedrooms"] = {"$gte": property_request.get("bedrooms")}
        
        properties = await db.properties.find(query, {"_id": 0}).limit(20).to_list(length=20)
        
        # Create matches
        matches = []
        for prop in properties:
            match_score = calculate_match_score(property_request, prop)
            match = {
                "id": str(uuid.uuid4()),
                "request_id": property_request.get("id"),
                "user_id": property_request.get("user_id"),
                "property_id": prop.get("id"),
                "match_score": match_score,
                "match_reasons": get_match_reasons(property_request, prop),
                "is_notified": False,
                "created_at": datetime.utcnow()
            }
            matches.append(match)
        
        if matches:
            await db.property_matches.insert_many(matches)
        
        return matches
    except Exception as e:
        logger.error(f"Error finding matches: {e}")
        return []


def calculate_match_score(request: dict, property: dict) -> float:
    """Calculate match score between request and property"""
    score = 0
    max_score = 0
    
    # Location match (30 points)
    max_score += 30
    if request.get("region") == property.get("region"):
        score += 15
    if request.get("city") == property.get("city"):
        score += 10
    if request.get("district") == property.get("district"):
        score += 5
    
    # Price match (25 points)
    max_score += 25
    price = property.get("price", 0)
    min_price = request.get("min_price", 0)
    max_price = request.get("max_price", float('inf'))
    if min_price <= price <= max_price:
        score += 25
    elif price < min_price:
        diff_percent = (min_price - price) / min_price * 100
        if diff_percent < 10:
            score += 20
        elif diff_percent < 20:
            score += 10
    
    # Area match (20 points)
    max_score += 20
    area = property.get("area", 0)
    min_area = request.get("min_area", 0)
    max_area = request.get("max_area", float('inf'))
    if min_area <= area <= max_area:
        score += 20
    
    # Bedrooms match (15 points)
    max_score += 15
    if request.get("bedrooms"):
        if property.get("bedrooms", 0) >= request.get("bedrooms"):
            score += 15
    else:
        score += 15
    
    # Bathrooms match (10 points)
    max_score += 10
    if request.get("bathrooms"):
        if property.get("bathrooms", 0) >= request.get("bathrooms"):
            score += 10
    else:
        score += 10
    
    return round((score / max_score) * 100, 1) if max_score > 0 else 0


def get_match_reasons(request: dict, property: dict) -> List[str]:
    """Get reasons why property matches request"""
    reasons = []
    
    if request.get("region") == property.get("region"):
        reasons.append("نفس المنطقة")
    if request.get("city") == property.get("city"):
        reasons.append("نفس المدينة")
    
    price = property.get("price", 0)
    min_price = request.get("min_price", 0)
    max_price = request.get("max_price", float('inf'))
    if min_price <= price <= max_price:
        reasons.append("ضمن نطاق السعر المطلوب")
    
    if request.get("bedrooms") and property.get("bedrooms", 0) >= request.get("bedrooms"):
        reasons.append(f"يحتوي على {property.get('bedrooms')} غرف أو أكثر")
    
    return reasons


async def update_user_preferences(db, user_id: str, interaction: dict):
    """Update user preferences based on interactions"""
    try:
        # Get property details
        property_id = interaction.get("property_id")
        property_data = await db.properties.find_one({"id": property_id}, {"_id": 0})
        
        if not property_data:
            return
        
        # Weight based on interaction type
        weights = {
            "view": 1,
            "like": 3,
            "favorite": 5,
            "share": 4,
            "contact": 5
        }
        weight = weights.get(interaction.get("interaction_type"), 1)
        
        # Update or create user preferences
        await db.user_preferences.update_one(
            {"user_id": user_id},
            {
                "$inc": {
                    f"regions.{property_data.get('region', 'unknown')}": weight,
                    f"cities.{property_data.get('city', 'unknown')}": weight,
                    f"property_types.{property_data.get('property_type', 'unknown')}": weight
                },
                "$set": {"updated_at": datetime.utcnow()}
            },
            upsert=True
        )
    except Exception as e:
        logger.error(f"Error updating preferences: {e}")


async def generate_recommendations(db, user_id: str, limit: int) -> List[dict]:
    """Generate personalized recommendations for user"""
    try:
        # Get user preferences
        preferences = await db.user_preferences.find_one({"user_id": user_id}, {"_id": 0})
        
        if not preferences:
            # Return popular/featured properties for new users
            properties = await db.properties.find(
                {"status": "approved", "featured": True},
                {"_id": 0}
            ).limit(limit).to_list(length=limit)
            return properties
        
        # Get top regions and property types
        regions = preferences.get("regions", {})
        property_types = preferences.get("property_types", {})
        
        top_regions = sorted(regions.items(), key=lambda x: x[1], reverse=True)[:3]
        top_types = sorted(property_types.items(), key=lambda x: x[1], reverse=True)[:3]
        
        # Build query
        query = {"status": "approved"}
        or_conditions = []
        
        if top_regions:
            or_conditions.append({"region": {"$in": [r[0] for r in top_regions]}})
        if top_types:
            or_conditions.append({"property_type": {"$in": [t[0] for t in top_types]}})
        
        if or_conditions:
            query["$or"] = or_conditions
        
        # Get viewed property IDs to exclude
        viewed = await db.user_interactions.find(
            {"user_id": user_id, "interaction_type": "view"},
            {"property_id": 1}
        ).to_list(length=100)
        viewed_ids = [v.get("property_id") for v in viewed]
        
        if viewed_ids:
            query["id"] = {"$nin": viewed_ids}
        
        properties = await db.properties.find(query, {"_id": 0}).limit(limit).to_list(length=limit)
        
        return properties
    except Exception as e:
        logger.error(f"Error generating recommendations: {e}")
        return []


async def find_similar_properties(db, property_id: str, limit: int) -> List[dict]:
    """Find similar properties"""
    try:
        # Get the source property
        source = await db.properties.find_one({"id": property_id}, {"_id": 0})
        
        if not source:
            return []
        
        # Find similar properties
        query = {
            "status": "approved",
            "id": {"$ne": property_id},
            "$or": [
                {"region": source.get("region"), "property_type": source.get("property_type")},
                {"city": source.get("city"), "property_type": source.get("property_type")}
            ]
        }
        
        # Price range (±30%)
        if source.get("price"):
            price = source.get("price")
            query["price"] = {"$gte": price * 0.7, "$lte": price * 1.3}
        
        properties = await db.properties.find(query, {"_id": 0}).limit(limit).to_list(length=limit)
        
        return properties
    except Exception as e:
        logger.error(f"Error finding similar properties: {e}")
        return []
