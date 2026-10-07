import logging
from pymongo import ASCENDING, DESCENDING, IndexModel

logger = logging.getLogger(__name__)

INDEXES = {
    "users": [
        IndexModel([("id", ASCENDING)], unique=True, name="uq_id"),
        IndexModel([("phone_number", ASCENDING)], unique=True, name="uq_phone"),
        IndexModel([("user_type", ASCENDING), ("is_nafath_verified", ASCENDING)], name="type_verified"),
        IndexModel([("created_at", DESCENDING)], name="created_desc"),
    ],
    "properties": [
        IndexModel([("id", ASCENDING)], unique=True, name="uq_id"),
        IndexModel([("owner_id", ASCENDING), ("is_active", ASCENDING)], name="owner_active"),
        IndexModel([("is_active", ASCENDING), ("is_completed", ASCENDING), ("featured_type", ASCENDING)], name="list_order"),
        IndexModel([("city", ASCENDING), ("status", ASCENDING), ("type", ASCENDING)], name="city_status_type"),
        IndexModel([("created_at", DESCENDING)], name="created_desc"),
    ],
    "favorites": [IndexModel([("user_id", ASCENDING)], unique=True, name="uq_user")],
    "user_billing": [IndexModel([("user_id", ASCENDING)], unique=True, name="uq_user")],
    "points_wallets": [IndexModel([("user_id", ASCENDING)], unique=True, name="uq_user")],
    "point_transactions": [IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)], name="user_created")],
    "financial_transactions": [
        IndexModel([("id", ASCENDING)], unique=True, name="uq_id"),
        IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)], name="user_created"),
        IndexModel([("created_at", DESCENDING)], name="created_desc"),
        IndexModel([("transaction_type", ASCENDING), ("status", ASCENDING)], name="type_status"),
    ],
    "ad_purchases": [
        IndexModel([("property_id", ASCENDING), ("status", ASCENDING)], name="property_status"),
        IndexModel([("user_id", ASCENDING)], name="user"),
    ],
    "plans": [IndexModel([("key", ASCENDING)], unique=True, name="uq_key"),
              IndexModel([("is_active", ASCENDING), ("user_types", ASCENDING), ("sort_order", ASCENDING)], name="active_types")],
    "ad_products": [IndexModel([("key", ASCENDING)], unique=True, name="uq_key")],
    "commission_rules": [IndexModel([("key", ASCENDING)], unique=True, name="uq_key"),
                         IndexModel([("is_active", ASCENDING), ("user_types", ASCENDING)], name="active_types")],
    "point_rules": [IndexModel([("key", ASCENDING), ("rule_type", ASCENDING)], unique=True, name="uq_key_type")],
    "badges": [IndexModel([("key", ASCENDING)], unique=True, name="uq_key")],
    "user_badges": [IndexModel([("user_id", ASCENDING), ("badge_key", ASCENDING)], unique=True, name="uq_user_badge")],
    "promo_codes": [IndexModel([("code", ASCENDING)], unique=True, name="uq_code")],
    "popup_messages": [IndexModel([("is_active", ASCENDING), ("created_at", DESCENDING)], name="active_created")],
    "property_requests": [IndexModel([("is_active", ASCENDING), ("created_at", DESCENDING)], name="active_created")],
    "photography_requests": [IndexModel([("created_at", DESCENDING)], name="created_desc")],
    "property_status": [IndexModel([("property_id", ASCENDING)], unique=True, name="uq_property")],
    "audit_logs": [
        IndexModel([("created_at", DESCENDING)], name="created_desc"),
        IndexModel([("actor_id", ASCENDING), ("created_at", DESCENDING)], name="actor_created"),
        IndexModel([("entity_type", ASCENDING), ("entity_id", ASCENDING)], name="entity"),
        IndexModel([("action", ASCENDING)], name="action"),
    ],
}


async def ensure_indexes(db):
    created = 0
    for collection, models in INDEXES.items():
        try:
            await db[collection].create_indexes(models)
            created += len(models)
        except Exception as e:
            logger.error(f"Index creation failed for {collection}: {e}")
    logger.info(f"MongoDB indexes ensured: {created} across {len(INDEXES)} collections")
