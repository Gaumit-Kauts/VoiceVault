import os
import uuid
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from faster_whisper import WhisperModel
from supabase import Client, create_client
from werkzeug.utils import secure_filename

load_dotenv()

app = Flask(__name__)

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {"mp3", "wav", "m4a", "ogg", "webm", "flac", "mp4"}
WHISPER_MODEL_NAME = os.getenv("WHISPER_MODEL", "base")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").strip()
SUPABASE_SERVICE_ROLE_KEY = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
supabase: Client | None = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

_model: WhisperModel | None = None


def get_whisper_model() -> WhisperModel:
    global _model
    if _model is None:
        _model = WhisperModel(
            WHISPER_MODEL_NAME,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE_TYPE,
        )
    return _model


def allowed_file(filename: str) -> bool:
    if "." not in filename:
        return False
    extension = filename.rsplit(".", 1)[1].lower()
    return extension in ALLOWED_EXTENSIONS


def parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def parse_category_ids(value: str | None) -> list[int]:
    if not value:
        return []
    ids: list[int] = []
    for item in value.split(","):
        candidate = item.strip()
        if not candidate:
            continue
        ids.append(int(candidate))
    return ids


def transcribe_audio(local_path: Path) -> str:
    model = get_whisper_model()
    segments, _info = model.transcribe(str(local_path))
    text = " ".join(segment.text.strip() for segment in segments).strip()
    return text


def verify_supabase_connection() -> None:
    if not supabase:
        raise RuntimeError("Supabase is not configured.")
    supabase.table("categories").select("category_id").limit(1).execute()


def insert_post(
    *,
    user_id: int,
    title: str | None,
    transcribed_text: str,
    audio_url: str,
    is_private: bool,
    image_url: str | None,
    category_ids: list[int],
) -> int:
    if not supabase:
        raise RuntimeError("Supabase is not configured.")

    post_payload = {
        "user_id": user_id,
        "title": title,
        "transcribed_text": transcribed_text,
        "audio_url": audio_url,
        "is_private": is_private,
        "image_url": image_url,
    }

    post_response = supabase.table("posts").insert(post_payload).execute()
    post_rows = getattr(post_response, "data", None) or []
    if not post_rows:
        raise RuntimeError("Supabase insert failed for posts table.")

    post_id = int(post_rows[0]["post_id"])

    if category_ids:
        category_rows = [
            {"post_id": post_id, "category_id": category_id}
            for category_id in category_ids
        ]
        supabase.table("post_categories").insert(category_rows).execute()

    return post_id


@app.get("/health")
def health_check():
    return jsonify({
        "status": "ok",
        "whisper_model": WHISPER_MODEL_NAME,
        "whisper_device": WHISPER_DEVICE,
        "whisper_compute_type": WHISPER_COMPUTE_TYPE,
    })


@app.get("/")
def demo_frontend():
    return render_template("index.html")


@app.get("/health/db")
def db_health_check():
    try:
        verify_supabase_connection()
        return jsonify({"status": "ok", "database": "supabase"})
    except Exception as error:
        return jsonify({"status": "error", "details": str(error)}), 500


@app.post("/upload-audio")
def upload_audio():
    if "file" not in request.files:
        return jsonify({"error": "Missing 'file' in form-data."}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "Filename is empty."}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Unsupported file extension."}), 400

    user_id_raw = request.form.get("user_id")
    user_id: int | None = None
    if user_id_raw:
        try:
            user_id = int(user_id_raw)
        except ValueError:
            return jsonify({"error": "'user_id' must be an integer."}), 400

    try:
        category_ids = parse_category_ids(request.form.get("category_ids"))
    except ValueError:
        return jsonify(
            {"error": "'category_ids' must be a comma-separated list of integers."}
        ), 400

    title = request.form.get("title")
    image_url = request.form.get("image_url")
    is_private = parse_bool(request.form.get("is_private"), default=False)

    safe_name = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4()}_{safe_name}"
    local_path = UPLOAD_DIR / unique_name
    file.save(local_path)

    try:
        transcript_text = transcribe_audio(local_path)
    except Exception as error:
        return jsonify({"error": "Transcription failed", "details": str(error)}), 500

    post_id: int | None = None
    db_warning: str | None = None
    if supabase:
        if user_id is None:
            db_warning = "Transcribed successfully. Skipped Supabase save because 'user_id' was not provided."
        else:
            try:
                post_id = insert_post(
                    user_id=user_id,
                    title=title,
                    transcribed_text=transcript_text,
                    audio_url=str(local_path).replace("\\", "/"),
                    is_private=is_private,
                    image_url=image_url,
                    category_ids=category_ids,
                )
            except Exception as error:
                db_warning = f"Transcribed successfully, but Supabase save failed: {error}"

    return jsonify(
        {
            "message": "Audio uploaded and transcribed (local whisper).",
            "post_id": post_id,
            "transcribed_text": transcript_text,
            "audio_url": str(local_path).replace("\\", "/"),
            "db_warning": db_warning,
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)
