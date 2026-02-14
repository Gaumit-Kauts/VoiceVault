import os
import uuid
from pathlib import Path

from flask import Flask, jsonify, request
from openai import OpenAI
from supabase import Client, create_client
from werkzeug.utils import secure_filename

app = Flask(__name__)

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {"mp3", "wav", "m4a", "ogg", "webm", "flac", "mp4"}
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


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
    with local_path.open("rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="text",
        )

    if isinstance(transcript, str):
        return transcript.strip()

    text_value = getattr(transcript, "text", "")
    return str(text_value).strip()


def verify_supabase_connection() -> None:
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
    return jsonify({"status": "ok"})


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
    if not user_id_raw:
        return jsonify({"error": "'user_id' is required in form-data."}), 400

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
        return jsonify({"error": "Failed to process audio", "details": str(error)}), 500

    return jsonify(
        {
            "message": "Audio uploaded, transcribed, and saved to Supabase.",
            "post_id": post_id,
            "transcribed_text": transcript_text,
            "audio_url": str(local_path).replace("\\", "/"),
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)
