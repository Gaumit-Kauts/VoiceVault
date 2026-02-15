"""
Flask API routes aligned with TitanForge/schema.sql.
"""

from flask import Blueprint, jsonify, request

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
    get_user_by_id,
    list_archive_files,
    list_audio_posts,
    list_audit_logs,
    list_rag_chunks,
    update_audio_post,
    upsert_archive_metadata,
    upsert_archive_rights,
)

api = Blueprint("api", __name__, url_prefix="/api")


def _error(message: str, status: int = 400):
    return jsonify({"error": message}), status


@api.get("/health")
def health():
    return jsonify({"status": "ok"})


# ==================== Users ====================

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


# ==================== Audio Posts ====================

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


# ==================== Archive Files ====================

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


# ==================== Metadata ====================

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


# ==================== Rights ====================

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


# ==================== RAG Chunks ====================

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


# ==================== Audit Log ====================

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
