# VoiceVault 

Schema-driven archival audio backend + frontend.

## What It Does

- Register / login users
- Upload original audio/video to Supabase Storage bucket (`archives`)
- Create `audio_posts` records in Postgres
- Transcribe media locally with `faster-whisper`
- Save transcript chunks to `rag_chunks` (with embeddings)
- Build prompt context and store in `archive_metadata`
- Search user chunks with RAG endpoint (vector mode or text fallback)

## Project Structure

- `backend/main.py` Flask app entry
- `backend/api_routes.py` API routes and upload/transcription flow
- `backend/db_queries.py` Supabase DB/storage helpers
- `schema.sql` database schema
- `frontend/` React app

## Environment (`backend/.env`)

Required:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (service role key, not publishable key)
- `SUPABASE_BUCKET=archives`

Optional:
- `BACKEND_UPLOAD_DIR=uploads`
- `WHISPER_MODEL=base`
- `WHISPER_DEVICE=cpu`
- `WHISPER_COMPUTE_TYPE=int8`

## Run Backend

```bash
cd backend
python main.py
```

Backend runs on `http://localhost:5000`.

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Set frontend API base to `http://127.0.0.1:5000/api` (or your backend host).

## Core API Endpoints

Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`

Upload + processing:
- `POST /api/posts/upload` (multipart form-data: `file`, `user_id`, `title`, `visibility`, optional metadata)

History + RAG:
- `GET /api/users/<user_id>/history`
- `GET /api/rag/search?user_id=<id>&q=<text>`
- `GET /api/rag/search?user_id=<id>&query_embedding=[...]`

Playback:
- `GET /api/posts/<post_id>/audio-url?user_id=<id>` (required for private posts)

Post data:
- `GET /api/posts`
- `GET /api/posts/<post_id>`
- `GET /api/posts/<post_id>/bundle`
- `GET /api/posts/<post_id>/files`
- `GET /api/posts/<post_id>/chunks`

## Notes

- Original media is stored in Supabase Storage; DB stores the object path in `archive_files` (`role=original_audio`).
- Transcript text/chunks/metadata/audit remain in Postgres tables.
- If storage upload fails with RLS errors, verify service-role key and bucket policies.
