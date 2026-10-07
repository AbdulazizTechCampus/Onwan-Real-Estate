# Audit log: who did what, when, on which entity (compliance / PDPL traceability)
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import Optional, Any
from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)

audit_router = APIRouter(prefix="/admin/audit-logs", tags=["Audit"])

SENSITIVE_KEYS = {"password", "otp", "otp_code", "token", "access_token", "national_id", "nafath_id"}


def _redact(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: ("***" if k.lower() in SENSITIVE_KEYS else _redact(v)) for k, v in value.items()}
    if isinstance(value, list):
        return [_redact(v) for v in value]
    return value


async def log_audit(db, actor, action: str, entity_type: str, entity_id: Optional[str] = None,
                    details: Optional[dict] = None, request: Optional[Request] = None):
    try:
        await db.audit_logs.insert_one({
            "id": str(uuid.uuid4()),
            "actor_id": getattr(actor, "id", None),
            "actor_type": getattr(actor, "user_type", None),
            "actor_phone": getattr(actor, "phone_number", None),
            "action": action,
            "entity_type": entity_type,
            "entity_id": str(entity_id) if entity_id is not None else None,
            "details": _redact(details or {}),
            "ip": request.client.host if request and request.client else None,
            "created_at": datetime.utcnow().isoformat(),
        })
    except Exception as e:
        logger.error(f"Audit log failed ({action}): {e}")


def create_audit_routes(db, AuthService, User):

    async def require_admin(current_user: User = Depends(AuthService.get_current_user)):
        if current_user.user_type != "admin":
            raise HTTPException(status_code=403, detail="صلاحيات المسؤول مطلوبة")
        return current_user

    @audit_router.get("")
    async def list_audit_logs(
        page: int = Query(1, ge=1),
        limit: int = Query(25, ge=1, le=100),
        action: Optional[str] = None,
        entity_type: Optional[str] = None,
        actor_id: Optional[str] = None,
        admin: User = Depends(require_admin),
    ):
        query = {}
        if action:
            query["action"] = action
        if entity_type:
            query["entity_type"] = entity_type
        if actor_id:
            query["actor_id"] = actor_id
        total = await db.audit_logs.count_documents(query)
        items = await db.audit_logs.find(query, {"_id": 0}).sort("created_at", -1) \
            .skip((page - 1) * limit).limit(limit).to_list(length=limit)
        actions = await db.audit_logs.distinct("action")
        entity_types = await db.audit_logs.distinct("entity_type")
        return {"items": items, "total": total, "page": page,
                "pages": max(1, -(-total // limit)),
                "actions": sorted(actions), "entity_types": sorted(entity_types)}

    return audit_router
