import hashlib
import json
import os
import uuid
import math
import re
from pathlib import Path
import io
import zipfile
from flask import send_file
from typing import Dict, Any
import requests
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
    get_original_audio_url,
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
    search_rag_chunks_vector,
    update_audio_post,
    upload_storage_object,
    upsert_archive_metadata,
    upsert_archive_rights,
    delete_rag_chunks, delete_archive_files, delete_metadata,
    delete_rights, delete_audio_post, update_audio_post,
    get_audio_post_by_id
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
_openai_client = None
EMBEDDING_DIM = 1536
EMBEDDING_PROVIDER = (os.getenv("EMBEDDING_PROVIDER") or "local").strip().lower()
OPENAI_EMBEDDING_MODEL = (os.getenv("OPENAI_EMBEDDING_MODEL") or "text-embedding-3-small").strip()


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


def _local_embedding(text: str, dim: int = EMBEDDING_DIM) -> list[float]:
    """
    Free fallback embedding: hashed bag-of-words + bi-grams, L2-normalized.
    This is weaker than model embeddings but keeps vector search functional.
    """
    if not text:
        return [0.0] * dim

    vec = [0.0] * dim
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    if not tokens:
        return vec

    for i, tok in enumerate(tokens):
        idx = int(hashlib.sha256(f"u:{tok}".encode("utf-8")).hexdigest(), 16) % dim
        vec[idx] += 1.0
        if i < len(tokens) - 1:
            bigram = f"{tok}_{tokens[i+1]}"
            bidx = int(hashlib.sha256(f"b:{bigram}".encode("utf-8")).hexdigest(), 16) % dim
            vec[bidx] += 0.5

    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        vec = [v / norm for v in vec]
    return vec


def _openai_embedding(text: str) -> list[float] | None:
    global _openai_client
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        return None

    try:
        if _openai_client is None:
            from openai import OpenAI
            _openai_client = OpenAI(api_key=api_key)
        response = _openai_client.embeddings.create(
            model=OPENAI_EMBEDDING_MODEL,
            input=text,
        )
        return response.data[0].embedding
    except Exception:
        return None


def _embed_text(text: str) -> list[float]:
    if EMBEDDING_PROVIDER == "openai":
        emb = _openai_embedding(text)
        if emb:
            return emb
    return _local_embedding(text)


def _add_audio_url(post: Dict[str, Any]) -> Dict[str, Any]:
    """Add signed audio URL to post if ready"""
    if post.get("status") == "ready":
        try:
            audio_data = get_original_audio_url(post["post_id"], expires_in=3600)
            post["audio_url"] = audio_data["signed_url"]
        except:
            pass
    return post



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
                    "embedding": _embed_text(segment_text),
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
        query_embedding = _embed_text(query_text)
        rows = search_rag_chunks_vector(user_id=user_id, query_embedding=query_embedding, limit=limit)

        # Fallback in case vector path is unavailable or empty.
        mode = "vector"
        if not rows:
            rows = search_rag_chunks(user_id=user_id, query_text=query_text, page=page, limit=limit)
            mode = "text_fallback"

        return jsonify({
            "results": rows,
            "page": page,
            "limit": min(max(1, limit), 100),
            "mode": mode
        })
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
    current_user_id = request.args.get("current_user_id", type=int)  # NEW LINE

    try:
        rows = list_audio_posts(page=page, limit=limit, visibility=visibility)

        # NEW: Filter private posts
        if current_user_id:
            rows = [p for p in rows if p.get('visibility') == 'public' or p.get('user_id') == current_user_id]
        else:
            rows = [p for p in rows if p.get('visibility') == 'public']

        # NEW: Add audio URLs - CHANGE THIS LINE ONLY
        rows = [_add_audio_url(post) for post in rows]

        return jsonify({"posts": rows, "page": page, "limit": min(max(1, limit), 100)})
    except Exception as e:
        return _error(str(e), 500)



@api.get("/posts/<int:post_id>")
def api_get_post(post_id: int):
    row = get_audio_post_by_id(post_id)
    if not row:
        return _error("Post not found.", 404)

    # CRITICAL: Add audio URL to the response
    row = _add_audio_url(row)

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


@api.get("/posts/<int:post_id>/audio-url")
def api_post_audio_url(post_id: int):
    """
    Get signed URL for original audio/video so users can play it.
    Private posts require owner user_id in query params.
    """
    row = get_audio_post_by_id(post_id)
    if not row:
        return _error("Post not found.", 404)

    visibility = row.get("visibility")
    owner_id = row.get("user_id")
    requester_id = request.args.get("user_id", type=int)
    expires_in = request.args.get("expires_in", default=3600, type=int)
    expires_in = min(max(60, expires_in), 86400)

    if visibility == "private" and requester_id != owner_id:
        return _error("Not authorized to access this private audio.", 403)

    try:
        result = get_original_audio_url(post_id=post_id, expires_in=expires_in)
        return jsonify(result)
    except ValueError as e:
        return _error(str(e), 404)
    except Exception as e:
        return _error(str(e), 500)


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


@api.get("/posts/<int:post_id>/download")
def download_post(post_id: int):
    """
    Download post as a ZIP file containing:
    - Original audio file
    - Transcript as text
    - Metadata as JSON
    """
    try:
        # Get post data
        post = get_audio_post_by_id(post_id)
        if not post:
            return _error("Post not found", 404)

        # Get files and metadata
        files = list_archive_files(post_id)
        metadata_row = get_archive_metadata(post_id)

        # Create ZIP in memory
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
            # 1. Add metadata.json
            if metadata_row and metadata_row.get("metadata"):
                try:
                    metadata_dict = json.loads(metadata_row["metadata"]) if isinstance(metadata_row["metadata"], str) else metadata_row["metadata"]

                    # Extract clean transcript from prompt
                    transcript_text = ""
                    if "prompt" in metadata_dict:
                        prompt = metadata_dict["prompt"]
                        match = prompt.split("Transcript:\n")
                        if len(match) > 1:
                            transcript_text = match[1].split("\n\nAnswer user questions")[0].strip()

                    # Create a clean metadata file
                    clean_metadata = {
                        "title": post.get("title"),
                        "description": post.get("description"),
                        "language": metadata_dict.get("language", "en"),
                        "transcript_length": metadata_dict.get("transcript_length_chars"),
                        "created_at": post.get("created_at"),
                        "visibility": post.get("visibility"),
                    }

                    zipf.writestr("metadata.json", json.dumps(clean_metadata, indent=2))

                    # Add transcript as separate file
                    if transcript_text:
                        zipf.writestr("transcript.txt", transcript_text)

                except Exception as e:
                    print(f"Error adding metadata: {e}")

            # 2. Add original audio file
            for file_info in files:
                if file_info.get("role") == "original_audio":
                    try:
                        # Get signed URL for the audio
                        audio_url_data = get_original_audio_url(post_id, expires_in=300)  # 5 min expiry
                        signed_url = audio_url_data.get("signed_url")

                        if signed_url:
                            # Download the file from Supabase
                            response = requests.get(signed_url, timeout=30)

                            if response.status_code == 200:
                                # Get original filename
                                original_filename = file_info["path"].split("/")[-1]
                                zipf.writestr(f"audio/{original_filename}", response.content)
                            else:
                                print(f"Failed to download audio: HTTP {response.status_code}")
                    except Exception as e:
                        print(f"Error adding audio file: {e}")

            # 3. Add RAG chunks if available
            try:
                chunks = list_rag_chunks(post_id, page=1, limit=1000)
                if chunks:
                    chunks_text = "\n\n".join([
                        f"[{chunk['start_sec']:.2f}s - {chunk['end_sec']:.2f}s]\n{chunk['text']}"
                        for chunk in chunks
                    ])
                    zipf.writestr("transcript_timestamped.txt", chunks_text)
            except Exception as e:
                print(f"Error adding chunks: {e}")

        # Move to beginning of buffer
        zip_buffer.seek(0)

        # Generate safe filename
        safe_title = "".join(c for c in post.get("title", "archive") if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_title = safe_title.replace(' ', '_')[:50]  # Limit length

        return send_file(
            zip_buffer,
            mimetype="application/zip",
            as_attachment=True,
            download_name=f"{safe_title}_{post_id}.zip"
        )

    except Exception as e:
        print(f"Download error: {e}")
        import traceback
        traceback.print_exc()
        return _error(f"Failed to create download: {str(e)}", 500)


# @api.delete("/posts/<int:post_id>")
# def api_delete_post(post_id: int):
#     """
#     Permanently delete a post and all associated data.
#     Only the post owner can delete their posts.
#     """
#     user_id = request.args.get("user_id", type=int)
#
#     if not user_id:
#         return _error("'user_id' is required for authorization.", 400)
#
#     # Get the post
#     post = get_audio_post_by_id(post_id)
#     if not post:
#         return _error("Post not found.", 404)
#
#     # Check ownership
#     if post.get("user_id") != user_id:
#         return _error("You don't have permission to delete this post.", 403)
#
#     try:
#         # Delete associated data in order
#         # 1. Delete RAG chunks
#         supabase.table("rag_chunks").delete().eq("post_id", post_id).execute()
#
#         # 2. Delete archive files (and from storage if needed)
#         files = list_archive_files(post_id)
#         for file_info in files:
#             # Optionally delete from Supabase storage
#             try:
#                 bucket, object_path = _parse_bucket_path(file_info["path"])
#                 supabase.storage.from_(bucket).remove([object_path])
#             except:
#                 pass  # Continue even if storage delete fails
#
#         supabase.table("archive_files").delete().eq("post_id", post_id).execute()
#
#         # 3. Delete metadata
#         supabase.table("archive_metadata").delete().eq("post_id", post_id).execute()
#
#         # 4. Delete rights
#         supabase.table("archive_rights").delete().eq("post_id", post_id).execute()
#
#         # 5. Delete the post itself
#         supabase.table("audio_posts").delete().eq("post_id", post_id).execute()
#
#         # Log the deletion
#         add_audit_log({
#             "post_id": post_id,
#             "user_id": user_id,
#             "action": "post.deleted",
#             "details": json.dumps({"title": post.get("title")})
#         })
#
#         return jsonify({"message": "Post deleted successfully", "post_id": post_id})
#
#     except Exception as e:
#         return _error(f"Failed to delete post: {str(e)}", 500)
#
#
# # ==================== UPDATE POST (Edit) ====================
#
# @api.put("/posts/<int:post_id>/edit")
# def api_edit_post(post_id: int):
#     """
#     Update post title, description, and visibility.
#     Only the post owner can edit their posts.
#     """
#     payload = request.get_json(force=True, silent=False) or {}
#     user_id = payload.get("user_id")
#
#     if not user_id:
#         return _error("'user_id' is required for authorization.", 400)
#
#     # Get the post
#     post = get_audio_post_by_id(post_id)
#     if not post:
#         return _error("Post not found.", 404)
#
#     # Check ownership
#     if post.get("user_id") != user_id:
#         return _error("You don't have permission to edit this post.", 403)
#
#     # Prepare updates
#     updates = {}
#
#     if "title" in payload:
#         title = (payload["title"] or "").strip()
#         if not title:
#             return _error("Title cannot be empty.", 400)
#         updates["title"] = title
#
#     if "description" in payload:
#         updates["description"] = payload["description"]
#
#     if "visibility" in payload:
#         visibility = (payload["visibility"] or "").strip().lower()
#         if visibility not in {"private", "public"}:
#             return _error("'visibility' must be 'private' or 'public'.", 400)
#         updates["visibility"] = visibility
#
#     if not updates:
#         return _error("No valid fields to update.", 400)
#
#     try:
#         updated_post = update_audio_post(post_id, updates)
#
#         # Log the edit
#         add_audit_log({
#             "post_id": post_id,
#             "user_id": user_id,
#             "action": "post.edited",
#             "details": json.dumps({"changes": list(updates.keys())})
#         })
#
#         return jsonify(updated_post)
#
#     except Exception as e:
#         return _error(f"Failed to update post: {str(e)}", 500)
#
#
# # ==================== Helper function for _parse_bucket_path ====================
#
# def _parse_bucket_path(stored_path: str) -> tuple:
#     """
#     Parse stored path like 'archives/user/uuid/file.mp4'
#     Returns: ('archives', 'user/uuid/file.mp4')
#     """
#     parts = (stored_path or "").split("/", 1)
#     if len(parts) != 2:
#         raise ValueError(f"Invalid storage path: {stored_path}")
#     return parts[0], parts[1]

@api.delete("/posts/<int:post_id>")
def api_delete_post(post_id: int):
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return _error("'user_id' is required for authorization.", 400)

    post = get_audio_post_by_id(post_id)
    if not post:
        return _error("Post not found.", 404)
    if post.get("user_id") != user_id:
        return _error("You don't have permission to delete this post.", 403)

    try:
        add_audit_log({
            "user_id": user_id,
            "action": "post.deleted",
            "details": json.dumps({"deleted_post_id": post_id, "title": post.get("title")})
        })

        delete_rag_chunks(post_id)
        delete_archive_files(post_id)
        delete_metadata(post_id)
        delete_rights(post_id)
        delete_audio_post(post_id)

        return jsonify({"message": "Post deleted successfully", "post_id": post_id})

    except Exception as e:
        return _error(f"Failed to delete post: {str(e)}", 500)


@api.put("/posts/<int:post_id>/edit")
def api_edit_post(post_id: int):
    payload = request.get_json(force=True) or {}
    user_id = payload.get("user_id")
    if not user_id:
        return _error("'user_id' is required for authorization.", 400)

    post = get_audio_post_by_id(post_id)
    if not post:
        return _error("Post not found.", 404)
    if post.get("user_id") != user_id:
        return _error("You don't have permission to edit this post.", 403)

    updates = {}
    if "title" in payload:
        title = (payload["title"] or "").strip()
        if not title:
            return _error("Title cannot be empty.", 400)
        updates["title"] = title
    if "description" in payload:
        updates["description"] = payload["description"]
    if "visibility" in payload:
        visibility = (payload["visibility"] or "").strip().lower()
        if visibility not in {"private", "public"}:
            return _error("'visibility' must be 'private' or 'public'.", 400)
        updates["visibility"] = visibility
    if not updates:
        return _error("No valid fields to update.", 400)

    try:
        updated_post = update_audio_post(post_id, updates)
        add_audit_log({
            "post_id": post_id,
            "user_id": user_id,
            "action": "post.edited",
            "details": json.dumps({"changes": list(updates.keys())})
        })
        return jsonify(updated_post)
    except Exception as e:
        return _error(f"Failed to update post: {str(e)}", 500)
