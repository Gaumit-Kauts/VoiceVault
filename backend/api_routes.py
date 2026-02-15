"""
Flask API routes aligned with TitanForge/schema.sql.
Includes auth, upload+transcription, history, and RAG search workflow.
"""

import hashlib
import json
import os
import uuid
from pathlib import Path

from dotenv import load_dotenv
from faster_whisper import WhisperModel
from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

from db_queries import (
    add_archive_file,
    add_audit_log,
    add_rag_chunks,
    create_audio_post,
    create_user,
    get_archive_metadata,
    get_archive_rights,
    get_audio_post_by_id,
    get_post_bundle,
    get_user_by_email,
    get_user_by_id,
    list_archive_files,
    list_audio_posts,
    list_audit_logs,
    list_rag_chunks,
    list_user_history,
    search_rag_chunks,
    update_audio_post,
    upload_storage_object,
    upsert_archive_metadata,
    upsert_archive_rights,
)

load_dotenv()

api = Blueprint("api", __name__, url_prefix="/api")

UPLOAD_DIR = Path(os.getenv("BACKEND_UPLOAD_DIR", "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_MEDIA_EXTENSIONS = {"mp4", "mov", "mkv", "webm", "m4a", "mp3", "wav", "ogg", "flac"}
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
ARCHIVE_BUCKET = os.getenv("SUPABASE_BUCKET", os.getenv("SUPABASE_ARCHIVE_BUCKET", "archives"))

_whisper_model: WhisperModel | None = None


def _model() -> WhisperModel:
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = WhisperModel(
            WHISPER_MODEL,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE_TYPE,
        )
    return _whisper_model


def _error(message: str, status: int = 400):
    return jsonify({"error": message}), status


def _allowed_file(filename: str) -> bool:
    if "." not in filename:
        return False
    return filename.rsplit(".", 1)[1].lower() in ALLOWED_MEDIA_EXTENSIONS


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def _build_prompt(transcript_text: str, title: str) -> str:
    return (
        "You are an archive assistant. Use the following transcribed audio as source context. "
        f"Post title: {title}.\n\n"
        "Transcript:\n"
        f"{transcript_text}\n\n"
        "Answer user questions grounded in this transcript."
    )


@api.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "whisper_model": WHISPER_MODEL,
        "whisper_device": WHISPER_DEVICE,
        "whisper_compute_type": WHISPER_COMPUTE_TYPE,
    })


# ==================== Auth ====================

@api.post("/auth/register")
def api_register():
    payload = request.get_json(force=True, silent=False) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not email or not password:
        return _error("'email' and 'password' are required.", 400)

    existing = get_user_by_email(email)
    if existing:
        return _error("User already exists for this email.", 409)

    try:
        user = create_user(
            {
                "email": email,
                "password_hash": generate_password_hash(password),
                "display_name": payload.get("display_name"),
                "avatar_url": payload.get("avatar_url"),
                "bio": payload.get("bio"),
            }
        )
        add_audit_log({"user_id": user["user_id"], "action": "user.register", "details": json.dumps({"email": email})})
        return jsonify({
            "user": {
                "user_id": user["user_id"],
                "email": user["email"],
                "display_name": user.get("display_name"),
            }
        }), 201
    except Exception as e:
        return _error(str(e), 500)


@api.post("/auth/login")
def api_login():
    payload = request.get_json(force=True, silent=False) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not email or not password:
        return _error("'email' and 'password' are required.", 400)

    user = get_user_by_email(email)
    if not user:
        return _error("Invalid credentials.", 401)

    if not check_password_hash(user["password_hash"], password):
        return _error("Invalid credentials.", 401)

    add_audit_log({"user_id": user["user_id"], "action": "user.login", "details": json.dumps({"email": email})})

    return jsonify(
        {
            "user": {
                "user_id": user["user_id"],
                "email": user["email"],
                "display_name": user.get("display_name"),
                "avatar_url": user.get("avatar_url"),
                "bio": user.get("bio"),
            }
        }
    )


# ==================== Upload + Prompt ====================

@api.post("/posts/upload")
def api_upload_post():
    if "file" not in request.files:
        return _error("Missing 'file' in form-data.", 400)

    media = request.files["file"]
    if not media.filename:
        return _error("Filename is empty.", 400)
    if not _allowed_file(media.filename):
        return _error("Unsupported media extension.", 400)

    user_id_raw = request.form.get("user_id")
    title = (request.form.get("title") or "Untitled recording").strip()
    description = request.form.get("description")
    visibility = (request.form.get("visibility") or "private").strip().lower()
    language = (request.form.get("language") or "en").strip().lower()

    if visibility not in {"private", "public"}:
        return _error("'visibility' must be 'private' or 'public'.", 400)

    try:
        user_id = int(user_id_raw)
    except (TypeError, ValueError):
        return _error("'user_id' is required and must be an integer.", 400)

    user = get_user_by_id(user_id)
    if not user:
        return _error("User not found.", 404)

    post_uuid = str(uuid.uuid4())
    safe_name = secure_filename(media.filename)
    storage_prefix = f"archive/{user_id}/{post_uuid}"
    storage_object_path = f"{user_id}/{post_uuid}/original/{safe_name}"
    saved_path = UPLOAD_DIR / f"{post_uuid}_{safe_name}"
    media.save(saved_path)

    created_post = None
    try:
        created_post = create_audio_post(
            {
                "user_id": user_id,
                "title": title,
                "description": description,
                "visibility": visibility,
                "status": "processing",
                "language": language,
                "storage_prefix": storage_prefix,
            }
        )

        post_id = int(created_post["post_id"])
        media_sha = _sha256(saved_path)
        with saved_path.open("rb") as media_file:
            upload_storage_object(
                bucket=ARCHIVE_BUCKET,
                object_path=storage_object_path,
                content=media_file.read(),
                content_type=media.mimetype or "application/octet-stream",
                upsert=False,
            )

        add_archive_file(
            post_id,
            {
                "role": "original_audio",
                "path": f"{ARCHIVE_BUCKET}/{storage_object_path}",
                "content_type": media.mimetype,
                "size_bytes": saved_path.stat().st_size,
                "sha256": media_sha,
            },
        )

        segments, _info = _model().transcribe(str(saved_path))
        rag_rows = []
        transcript_parts = []
        for seg in segments:
            segment_text = seg.text.strip()
            if not segment_text:
                continue
            transcript_parts.append(segment_text)
            rag_rows.append(
                {
                    "start_sec": float(seg.start),
                    "end_sec": float(seg.end),
                    "text": segment_text,
                    "confidence": float(seg.avg_logprob) if seg.avg_logprob is not None else None,
                    "embedding": None,
                }
            )

        transcript_text = " ".join(transcript_parts).strip()
        prompt_text = _build_prompt(transcript_text, title)

        if rag_rows:
            add_rag_chunks(post_id, rag_rows)

        upsert_archive_metadata(
            post_id,
            json.dumps(
                {
                    "prompt": prompt_text,
                    "transcript_length_chars": len(transcript_text),
                    "source_file": safe_name,
                    "language": language,
                }
            ),
        )

        add_archive_file(
            post_id,
            {
                "role": "transcript_txt",
                "path": f"{storage_prefix}/transcript.txt",
                "content_type": "text/plain",
                "size_bytes": len(transcript_text.encode("utf-8")),
                "sha256": hashlib.sha256(transcript_text.encode("utf-8")).hexdigest(),
            },
        )

        update_audio_post(post_id, {"status": "ready"})
        add_audit_log(
            {
                "post_id": post_id,
                "user_id": user_id,
                "action": "post.upload.transcribed",
                "details": json.dumps({"visibility": visibility, "storage_prefix": storage_prefix}),
            }
        )

        return jsonify(
            {
                "post_id": post_id,
                "visibility": visibility,
                "status": "ready",
                "audio_path": f"{ARCHIVE_BUCKET}/{storage_object_path}",
                "transcript_text": transcript_text,
                "prompt": prompt_text,
                "rag_chunk_count": len(rag_rows),
            }
        ), 201
    except Exception as e:
        if created_post and created_post.get("post_id"):
            update_audio_post(int(created_post["post_id"]), {"status": "failed"})
            add_audit_log(
                {
                    "post_id": int(created_post["post_id"]),
                    "user_id": user_id,
                    "action": "post.upload.failed",
                    "details": json.dumps({"error": str(e)}),
                }
            )
        return _error(f"Upload/transcription failed: {e}", 500)


# ==================== History + RAG Search ====================

@api.get("/users/<int:user_id>/history")
def api_user_history(user_id: int):
    page = request.args.get("page", default=1, type=int)
    limit = request.args.get("limit", default=20, type=int)

    try:
        posts = list_user_history(user_id, page=page, limit=limit)
        return jsonify({"history": posts, "page": page, "limit": min(max(1, limit), 100)})
    except Exception as e:
        return _error(str(e), 500)


@api.get("/rag/search")
def api_rag_search():
    query_text = (request.args.get("q") or "").strip()
    user_id = request.args.get("user_id", type=int)
    page = request.args.get("page", default=1, type=int)
    limit = request.args.get("limit", default=30, type=int)

    if not user_id:
        return _error("'user_id' is required.", 400)
    if not query_text:
        return _error("'q' is required.", 400)

    try:
        rows = search_rag_chunks(user_id=user_id, query_text=query_text, page=page, limit=limit)
        return jsonify({"results": rows, "page": page, "limit": min(max(1, limit), 100)})
    except Exception as e:
        return _error(str(e), 500)


# ==================== Existing CRUD Routes ====================

@api.post("/users")
def api_create_user():
    payload = request.get_json(force=True, silent=False) or {}
    try:
        return jsonify(create_user(payload)), 201
    except ValueError as e:
        return _error(str(e), 400)
    except Exception as e:
        return _error(str(e), 500)


@api.get("/users/<int:user_id>")
def api_get_user(user_id: int):
    user = get_user_by_id(user_id)
    if not user:
        return _error("User not found.", 404)
    return jsonify(user)


@api.post("/posts")
def api_create_post():
    payload = request.get_json(force=True, silent=False) or {}
    try:
        return jsonify(create_audio_post(payload)), 201
    except ValueError as e:
        return _error(str(e), 400)
    except Exception as e:
        return _error(str(e), 500)


@api.get("/posts")
def api_list_posts():
    page = request.args.get("page", default=1, type=int)
    limit = request.args.get("limit", default=20, type=int)
    visibility = request.args.get("visibility")
    user_id = request.args.get("user_id", type=int)

    try:
        rows = list_audio_posts(page=page, limit=limit, visibility=visibility, user_id=user_id)
        return jsonify({"posts": rows, "page": page, "limit": min(max(1, limit), 100)})
    except Exception as e:
        return _error(str(e), 500)


@api.get("/posts/<int:post_id>")
def api_get_post(post_id: int):
    row = get_audio_post_by_id(post_id)
    if not row:
        return _error("Post not found.", 404)
    return jsonify(row)


@api.patch("/posts/<int:post_id>")
def api_patch_post(post_id: int):
    payload = request.get_json(force=True, silent=False) or {}
    try:
        row = update_audio_post(post_id, payload)
        if not row:
            return _error("Post not found.", 404)
        return jsonify(row)
    except Exception as e:
        return _error(str(e), 500)


@api.get("/posts/<int:post_id>/bundle")
def api_post_bundle(post_id: int):
    bundle = get_post_bundle(post_id)
    if not bundle:
        return _error("Post not found.", 404)
    return jsonify(bundle)


@api.post("/posts/<int:post_id>/files")
def api_add_file(post_id: int):
    payload = request.get_json(force=True, silent=False) or {}
    try:
        return jsonify(add_archive_file(post_id, payload)), 201
    except ValueError as e:
        return _error(str(e), 400)
    except Exception as e:
        return _error(str(e), 500)


@api.get("/posts/<int:post_id>/files")
def api_list_files(post_id: int):
    try:
        return jsonify({"files": list_archive_files(post_id)})
    except Exception as e:
        return _error(str(e), 500)


@api.put("/posts/<int:post_id>/metadata")
def api_put_metadata(post_id: int):
    payload = request.get_json(force=True, silent=False) or {}
    metadata = payload.get("metadata")
    if metadata is None:
        return _error("'metadata' is required.", 400)

    try:
        return jsonify(upsert_archive_metadata(post_id, metadata))
    except Exception as e:
        return _error(str(e), 500)


@api.get("/posts/<int:post_id>/metadata")
def api_get_metadata(post_id: int):
    row = get_archive_metadata(post_id)
    if not row:
        return _error("Metadata not found.", 404)
    return jsonify(row)


@api.put("/posts/<int:post_id>/rights")
def api_put_rights(post_id: int):
    payload = request.get_json(force=True, silent=False) or {}
    try:
        return jsonify(upsert_archive_rights(post_id, payload))
    except Exception as e:
        return _error(str(e), 500)


@api.get("/posts/<int:post_id>/rights")
def api_get_rights(post_id: int):
    row = get_archive_rights(post_id)
    if not row:
        return _error("Rights not found.", 404)
    return jsonify(row)


@api.post("/posts/<int:post_id>/chunks")
def api_add_chunks(post_id: int):
    payload = request.get_json(force=True, silent=False) or {}
    chunks = payload.get("chunks")

    if not isinstance(chunks, list):
        return _error("'chunks' must be a list.", 400)

    try:
        rows = add_rag_chunks(post_id, chunks)
        return jsonify({"inserted": len(rows), "chunks": rows}), 201
    except Exception as e:
        return _error(str(e), 500)


@api.get("/posts/<int:post_id>/chunks")
def api_get_chunks(post_id: int):
    page = request.args.get("page", default=1, type=int)
    limit = request.args.get("limit", default=200, type=int)

    try:
        return jsonify({"chunks": list_rag_chunks(post_id, page=page, limit=limit)})
    except Exception as e:
        return _error(str(e), 500)


@api.post("/audit")
def api_create_audit():
    payload = request.get_json(force=True, silent=False) or {}
    try:
        return jsonify(add_audit_log(payload)), 201
    except ValueError as e:
        return _error(str(e), 400)
    except Exception as e:
        return _error(str(e), 500)


@api.get("/audit")
def api_list_audit():
    post_id = request.args.get("post_id", type=int)
    user_id = request.args.get("user_id", type=int)
    page = request.args.get("page", default=1, type=int)
    limit = request.args.get("limit", default=100, type=int)

    try:
        return jsonify({"logs": list_audit_logs(post_id=post_id, user_id=user_id, page=page, limit=limit)})
    except Exception as e:
        return _error(str(e), 500)


@api.get("/posts/<int:post_id>/audit")
def api_post_audit(post_id: int):
    page = request.args.get("page", default=1, type=int)
    limit = request.args.get("limit", default=100, type=int)

    try:
        return jsonify({"logs": list_audit_logs(post_id=post_id, page=page, limit=limit)})
    except Exception as e:
        return _error(str(e), 500)
