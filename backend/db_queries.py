"""
Supabase data layer aligned with TitanForge/schema.sql.
"""

import os
import math
import json
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


def get_archive_file_by_role(post_id: int, role: str) -> Optional[Dict[str, Any]]:
    response = (
        supabase.table("archive_files")
        .select("*")
        .eq("post_id", post_id)
        .eq("role", role)
        .limit(1)
        .execute()
    )
    return _first(response)


def download_storage_object_by_stored_path(stored_path: str) -> bytes:
    """
    Download object bytes from a stored path like
    'archives/user/uuid/original/file.mp4'.
    """
    bucket, object_path = _parse_bucket_path(stored_path)
    content = supabase.storage.from_(bucket).download(object_path)
    if isinstance(content, (bytes, bytearray)):
        return bytes(content)
    raise RuntimeError("Failed to download storage object content.")


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
        embedding = c.get("embedding")
        if isinstance(embedding, list):
            embedding = "[" + ",".join(str(float(v)) for v in embedding) + "]"
        rows.append(
            {
                "post_id": post_id,
                "start_sec": c.get("start_sec"),
                "end_sec": c.get("end_sec"),
                "text": c.get("text"),
                "confidence": c.get("confidence"),
                "embedding": embedding,
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


def search_rag_chunks_vector(user_id: int, query_embedding: List[float], limit: int = 30) -> List[Dict[str, Any]]:
    """
    Vector search via SQL RPC function `match_rag_chunks` (pgvector).
    """
    vector_text = "[" + ",".join(str(float(v)) for v in query_embedding) + "]"
    safe_limit = min(max(1, limit), 100)

    try:
        response = supabase.rpc(
            "match_rag_chunks",
            {
                "p_user_id": user_id,
                "p_query_embedding": vector_text,
                "p_match_count": safe_limit,
            },
        ).execute()
        rows = _rows(response)
        if rows:
            return rows
    except Exception:
        pass

    # Fallback: pull candidate chunks and rank with cosine similarity in Python.
    response = (
        supabase.table("rag_chunks")
        .select(
            "chunk_id, post_id, start_sec, end_sec, text, confidence, created_at, embedding, "
            "audio_posts!inner(post_id, user_id, title, visibility, created_at)"
        )
        .eq("audio_posts.user_id", user_id)
        .limit(3000)
        .execute()
    )
    candidates = _rows(response)
    if not candidates:
        return []

    q = _normalize_vec(query_embedding)
    ranked = []
    for row in candidates:
        emb = _parse_embedding(row.get("embedding"))
        if not emb:
            continue
        score = _cosine_similarity(q, emb)
        if score is None:
            continue
        out = dict(row)
        out["similarity"] = score
        out.pop("embedding", None)
        ranked.append(out)

    ranked.sort(key=lambda r: r.get("similarity", 0.0), reverse=True)
    return ranked[:safe_limit]


def _parse_embedding(value: Any) -> Optional[List[float]]:
    if value is None:
        return None
    if isinstance(value, list):
        try:
            return [float(v) for v in value]
        except Exception:
            return None
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            if text.startswith("[") and text.endswith("]"):
                return [float(v) for v in text[1:-1].split(",") if v.strip()]
            parsed = json.loads(text)
            if isinstance(parsed, list):
                return [float(v) for v in parsed]
        except Exception:
            return None
    return None


def _normalize_vec(vec: List[float]) -> List[float]:
    if not vec:
        return []
    norm = math.sqrt(sum(float(v) * float(v) for v in vec))
    if norm <= 0:
        return [0.0 for _ in vec]
    return [float(v) / norm for v in vec]


def _cosine_similarity(a: List[float], b: List[float]) -> Optional[float]:
    if not a or not b:
        return None
    n = min(len(a), len(b))
    if n == 0:
        return None
    dot = 0.0
    bnorm = 0.0
    for i in range(n):
        av = float(a[i])
        bv = float(b[i])
        dot += av * bv
        bnorm += bv * bv
    if bnorm <= 0:
        return None
    return dot / math.sqrt(bnorm)


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


def delete_rag_chunks(post_id: int):
    supabase.table("rag_chunks").delete().eq("post_id", post_id).execute()

def delete_archive_files(post_id: int):
    files = list_archive_files(post_id)
    for file_info in files:
        try:
            bucket, object_path = _parse_bucket_path(file_info["path"])
            supabase.storage.from_(bucket).remove([object_path])
        except:
            pass
    supabase.table("archive_files").delete().eq("post_id", post_id).execute()

def delete_metadata(post_id: int):
    supabase.table("archive_metadata").delete().eq("post_id", post_id).execute()

def delete_rights(post_id: int):
    supabase.table("archive_rights").delete().eq("post_id", post_id).execute()

def delete_audio_post(post_id: int):
    supabase.table("audio_posts").delete().eq("post_id", post_id).execute()

def update_audio_post(post_id: int, updates: dict):
    supabase.table("audio_posts").update(updates).eq("post_id", post_id).execute()
    return get_audio_post_by_id(post_id)

def get_audio_post_by_id(post_id: int):
    result = supabase.table("audio_posts").select("*").eq("post_id", post_id).single().execute()
    return result.data if result.data else None
