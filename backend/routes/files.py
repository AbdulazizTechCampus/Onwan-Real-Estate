# Avatar/logo upload via Emergent Object Storage + public file serving
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import Response
from datetime import datetime
import uuid
import asyncio
import logging
from storage import put_object, get_object
from routes.audit import log_audit

logger = logging.getLogger(__name__)
files_router = APIRouter(tags=["Files"])

ALLOWED = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
MAX_AVATAR_BYTES = 3 * 1024 * 1024


def create_files_routes(db, AuthService, User):

    @files_router.post("/profile/avatar")
    async def upload_avatar(file: UploadFile = File(...),
                            current_user: User = Depends(AuthService.get_current_user)):
        ext = ALLOWED.get(file.content_type)
        if not ext:
            raise HTTPException(status_code=400, detail="الصيغ المسموحة: JPG أو PNG أو WEBP")
        data = await file.read()
        if len(data) > MAX_AVATAR_BYTES:
            raise HTTPException(status_code=400, detail="حجم الصورة يجب ألا يتجاوز 3 ميجابايت")
        path = f"onwan/avatars/{current_user.id}/{uuid.uuid4()}.{ext}"
        try:
            result = await asyncio.to_thread(put_object, path, data, file.content_type)
        except Exception as e:
            logger.error(f"avatar upload failed: {e}")
            raise HTTPException(status_code=502, detail="تعذر رفع الصورة حالياً، حاول مرة أخرى")
        await db.files.update_many({"owner_id": current_user.id, "kind": "avatar", "is_deleted": False},
                                   {"$set": {"is_deleted": True}})
        await db.files.insert_one({
            "id": str(uuid.uuid4()), "owner_id": current_user.id, "kind": "avatar", "is_public": True,
            "storage_path": result["path"], "original_filename": file.filename,
            "content_type": file.content_type, "size": result["size"], "is_deleted": False,
            "created_at": datetime.utcnow().isoformat()})
        avatar_url = f"/api/files/{result['path']}"
        await db.users.update_one({"id": current_user.id}, {"$set": {"avatar_url": avatar_url}})
        await db.properties.update_many({"owner_id": current_user.id}, {"$set": {"agent.image": avatar_url}})
        await log_audit(db, current_user, "AVATAR_UPLOAD", "user", current_user.id, {"size": result["size"]})
        return {"success": True, "avatar_url": avatar_url}

    @files_router.get("/files/{path:path}")
    async def serve_file(path: str):
        record = await db.files.find_one({"storage_path": path, "is_deleted": False, "is_public": True})
        if not record:
            raise HTTPException(status_code=404, detail="الملف غير موجود")
        try:
            data, content_type = await asyncio.to_thread(get_object, path)
        except Exception as e:
            logger.error(f"file fetch failed: {e}")
            raise HTTPException(status_code=502, detail="تعذر جلب الملف")
        return Response(content=data, media_type=record.get("content_type", content_type),
                        headers={"Cache-Control": "public, max-age=86400"})

    return files_router
