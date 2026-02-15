"""
Supabase data layer aligned with TitanForge/schema.sql.
"""

import os
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").strip()
SUPABASE_SERVICE_ROLE_KEY = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _rows(response: Any) -> List[Dict[str, Any]]:
    return getattr(response, "data", None) or []


def _first(response: Any) -> Optional[Dict[str, Any]]:
    data = _rows(response)
    return data[0] if data else None


def _paginate(page: int, limit: int) -> tuple[int, int]:
    page = max(1, page)
    limit = min(max(1, limit), 100)
    start = (page - 1) * limit
    end = start + limit - 1
    return start, end


def _parse_bucket_path(stored_path: str) -> Tuple[str, str]:
    """
    Convert stored path like 'archives/user/uuid/original/file.mp4'
    into ('archives', 'user/uuid/original/file.mp4').
    """
    parts = (stored_path or "").split("/", 1)
    if len(parts) != 2 or not parts[0] or not parts[1]:
        raise ValueError(f"Invalid storage path format: {stored_path}")
    return parts[0], parts[1]


def upload_storage_object(
    bucket: str,
    object_path: str,
    content: bytes,
    content_type: str = "application/octet-stream",
    upsert: bool = False,
) -> Dict[str, Any]:
    """
    Upload bytes to Supabase Storage and return upload response data.
    """
    return (
        supabase.storage.from_(bucket)
        .upload(
            object_path,
            content,
            {"content-type": content_type, "upsert": str(upsert).lower()},
        )
    )


def get_original_audio_url(post_id: int, expires_in: int = 3600) -> Dict[str, Any]:
    """
    Return a signed URL for the original audio/video archive file.
    """
    response = (
        supabase.table("archive_files")
        .select("path, content_type")
        .eq("post_id", post_id)
        .eq("role", "original_audio")
        .limit(1)
        .execute()
    )
    row = _first(response)
    if not row:
        raise ValueError("Original audio file not found for this post.")

    bucket, object_path = _parse_bucket_path(row["path"])

    signed = supabase.storage.from_(bucket).create_signed_url(object_path, expires_in)

    # Supabase python client can return dict or object with .get depending on version.
    if isinstance(signed, dict):
        signed_url = (
            signed.get("signedURL")
            or signed.get("signedUrl")
            or signed.get("data", {}).get("signedUrl")
            or signed.get("data", {}).get("signedURL")
        )
    else:
        signed_url = None

    if not signed_url:
        raise RuntimeError("Failed to create signed URL for original audio.")

    return {
        "post_id": post_id,
        "bucket": bucket,
        "object_path": object_path,
        "content_type": row.get("content_type"),
        "signed_url": signed_url,
        "expires_in": expires_in,
    }


# ==================== Users ====================

def create_user(payload: Dict[str, Any]) -> Dict[str, Any]:
    required = ["email", "password_hash"]
    for field in required:
        if not payload.get(field):
            raise ValueError(f"'{field}' is required.")

    data = {
        "email": payload["email"],
        "password_hash": payload["password_hash"],
        "display_name": payload.get("display_name"),
        "avatar_url": payload.get("avatar_url"),
        "bio": payload.get("bio"),
    }

    response = supabase.table("users").insert(data).execute()
    created = _first(response)
    if not created:
        raise RuntimeError("Failed to create user.")
    return created


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    return _first(supabase.table("users").select("*").eq("user_id", user_id).limit(1).execute())


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    return _first(supabase.table("users").select("*").eq("email", email).limit(1).execute())


# ==================== Audio Posts ====================

def create_audio_post(payload: Dict[str, Any]) -> Dict[str, Any]:
    required = ["user_id", "title", "storage_prefix"]
    for field in required:
        if payload.get(field) in (None, ""):
            raise ValueError(f"'{field}' is required.")

    data = {
        "user_id": payload["user_id"],
        "title": payload["title"],
        "description": payload.get("description"),
        "visibility": payload.get("visibility", "private"),
        "status": payload.get("status", "uploaded"),
        "recorded_date": payload.get("recorded_date"),
        "language": payload.get("language", "en"),
        "storage_prefix": payload["storage_prefix"],
        "manifest_sha256": payload.get("manifest_sha256"),
        "bundle_sha256": payload.get("bundle_sha256"),
        "published_at": payload.get("published_at"),
    }

    response = supabase.table("audio_posts").insert(data).execute()
    created = _first(response)
    if not created:
        raise RuntimeError("Failed to create audio post.")
    return created


def get_audio_post_by_id(post_id: int) -> Optional[Dict[str, Any]]:
    query = (
        supabase.table("audio_posts")
        .select("*, users(user_id, email, display_name, avatar_url)")
        .eq("post_id", post_id)
        .limit(1)
    )
    return _first(query.execute())


def list_user_history(user_id: int, page: int = 1, limit: int = 20) -> List[Dict[str, Any]]:
    return list_audio_posts(page=page, limit=limit, user_id=user_id)


def list_audio_posts(page: int = 1, limit: int = 20, visibility: Optional[str] = None, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
    start, end = _paginate(page, limit)
    query = supabase.table("audio_posts").select("*, users(user_id, email, display_name, avatar_url)")

    if visibility:
        query = query.eq("visibility", visibility)
    if user_id:
        query = query.eq("user_id", user_id)

    response = query.order("created_at", desc=True).range(start, end).execute()
    return _rows(response)


def update_audio_post(post_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not updates:
        return get_audio_post_by_id(post_id)

    allowed = {
        "title",
        "description",
        "visibility",
        "status",
        "recorded_date",
        "language",
        "storage_prefix",
        "manifest_sha256",
        "bundle_sha256",
        "published_at",
    }
    clean = {k: v for k, v in updates.items() if k in allowed}
    if not clean:
        return get_audio_post_by_id(post_id)

    response = (
        supabase.table("audio_posts")
        .update(clean)
        .eq("post_id", post_id)
        .execute()
    )
    return _first(response)


# ==================== Archive Files ====================

def add_archive_file(post_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    required = ["role", "path", "sha256"]
    for field in required:
        if not payload.get(field):
            raise ValueError(f"'{field}' is required.")

    data = {
        "post_id": post_id,
        "role": payload["role"],
        "path": payload["path"],
        "content_type": payload.get("content_type"),
        "size_bytes": payload.get("size_bytes"),
        "sha256": payload["sha256"],
    }

    response = supabase.table("archive_files").insert(data).execute()
    created = _first(response)
    if not created:
        raise RuntimeError("Failed to add archive file.")
    return created


def list_archive_files(post_id: int) -> List[Dict[str, Any]]:
    response = (
        supabase.table("archive_files")
        .select("*")
        .eq("post_id", post_id)
        .order("created_at", desc=False)
        .execute()
    )
    return _rows(response)


# ==================== Metadata / Rights ====================

def upsert_archive_metadata(post_id: int, metadata: str) -> Dict[str, Any]:
    data = {"post_id": post_id, "metadata": metadata}

    existing = _first(supabase.table("archive_metadata").select("post_id").eq("post_id", post_id).limit(1).execute())
    if existing:
        response = supabase.table("archive_metadata").update({"metadata": metadata}).eq("post_id", post_id).execute()
    else:
        response = supabase.table("archive_metadata").insert(data).execute()

    row = _first(response)
    if not row:
        raise RuntimeError("Failed to upsert archive metadata.")
    return row


def get_archive_metadata(post_id: int) -> Optional[Dict[str, Any]]:
    return _first(supabase.table("archive_metadata").select("*").eq("post_id", post_id).limit(1).execute())


def upsert_archive_rights(post_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    data = {
        "post_id": post_id,
        "has_speaker_consent": payload.get("has_speaker_consent", False),
        "license": payload.get("license"),
        "consent_notes": payload.get("consent_notes"),
        "allowed_use": payload.get("allowed_use"),
        "restrictions": payload.get("restrictions"),
    }

    existing = _first(supabase.table("archive_rights").select("post_id").eq("post_id", post_id).limit(1).execute())
    if existing:
        response = (
            supabase.table("archive_rights")
            .update({k: v for k, v in data.items() if k != "post_id"})
            .eq("post_id", post_id)
            .execute()
        )
    else:
        response = supabase.table("archive_rights").insert(data).execute()

    row = _first(response)
    if not row:
        raise RuntimeError("Failed to upsert archive rights.")
    return row


def get_archive_rights(post_id: int) -> Optional[Dict[str, Any]]:
    return _first(supabase.table("archive_rights").select("*").eq("post_id", post_id).limit(1).execute())


# ==================== RAG Chunks ====================

def add_rag_chunks(post_id: int, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not chunks:
        return []

    rows = []
    for c in chunks:
        rows.append(
            {
                "post_id": post_id,
                "start_sec": c.get("start_sec"),
                "end_sec": c.get("end_sec"),
                "text": c.get("text"),
                "confidence": c.get("confidence"),
                "embedding": c.get("embedding"),
            }
        )

    response = supabase.table("rag_chunks").insert(rows).execute()
    return _rows(response)


def list_rag_chunks(post_id: int, page: int = 1, limit: int = 200) -> List[Dict[str, Any]]:
    start, end = _paginate(page, limit)
    response = (
        supabase.table("rag_chunks")
        .select("*")
        .eq("post_id", post_id)
        .order("start_sec", desc=False)
        .range(start, end)
        .execute()
    )
    return _rows(response)


def search_rag_chunks(user_id: int, query_text: str, page: int = 1, limit: int = 30) -> List[Dict[str, Any]]:
    start, end = _paginate(page, limit)
    response = (
        supabase.table("rag_chunks")
        .select(
            "chunk_id, post_id, start_sec, end_sec, text, confidence, created_at, "
            "audio_posts!inner(post_id, user_id, title, visibility, created_at)"
        )
        .eq("audio_posts.user_id", user_id)
        .ilike("text", f"%{query_text}%")
        .order("created_at", desc=True)
        .range(start, end)
        .execute()
    )
    return _rows(response)


# ==================== Audit Log ====================

def add_audit_log(payload: Dict[str, Any]) -> Dict[str, Any]:
    if not payload.get("action"):
        raise ValueError("'action' is required.")

    data = {
        "post_id": payload.get("post_id"),
        "user_id": payload.get("user_id"),
        "action": payload["action"],
        "details": payload.get("details"),
    }

    response = supabase.table("audit_log").insert(data).execute()
    row = _first(response)
    if not row:
        raise RuntimeError("Failed to create audit log.")
    return row


def list_audit_logs(post_id: Optional[int] = None, user_id: Optional[int] = None, page: int = 1, limit: int = 100) -> List[Dict[str, Any]]:
    start, end = _paginate(page, limit)
    query = supabase.table("audit_log").select("*")

    if post_id is not None:
        query = query.eq("post_id", post_id)
    if user_id is not None:
        query = query.eq("user_id", user_id)

    response = query.order("created_at", desc=True).range(start, end).execute()
    return _rows(response)


# ==================== Aggregate View ====================

def get_post_bundle(post_id: int) -> Dict[str, Any]:
    post = get_audio_post_by_id(post_id)
    if not post:
        return {}

    return {
        "post": post,
        "files": list_archive_files(post_id),
        "metadata": get_archive_metadata(post_id),
        "rights": get_archive_rights(post_id),
        "rag_chunks": list_rag_chunks(post_id, page=1, limit=1000),
        "audit_log": list_audit_logs(post_id=post_id, page=1, limit=200),
    }
