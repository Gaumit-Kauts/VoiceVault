# VoiceVault

VoiceVault is an archival audio app where users upload recordings, get speech-to-text transcripts, and search their archive with RAG-ready chunks.

## What The App Does

- User registration and login
- Upload audio/video recordings (private or public)
- Store original media in Supabase Storage bucket (`archives`)
- Transcribe media locally with `faster-whisper`
- Save transcript chunks to `rag_chunks`
- Save prompt/context metadata to `archive_metadata`
- View feed/history, open full post detail, play original audio
- Edit and delete your own posts
- Download a post as a ZIP bundle
- Search transcript chunks for RAG use

## Tech Stack

- Backend: Flask (`backend/main.py`, `backend/api_routes.py`)
- Data + storage: Supabase Postgres + Supabase Storage (`backend/db_queries.py`)
- Frontend: React + Vite (`frontend/`)
- Transcription: `faster-whisper` (local inference)

## Project Structure

- `schema.sql`: DB schema
- `backend/main.py`: Flask app entrypoint
- `backend/api_routes.py`: API routes and orchestration
- `backend/db_queries.py`: Supabase table/storage functions
- `frontend/src/App.jsx`: main app shell/navigation
- `frontend/src/pages/`: Feed, Create, History, Search, Post detail, Settings

## Backend Environment

Create `backend/.env`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_BUCKET=archives

# Optional
BACKEND_UPLOAD_DIR=uploads
WHISPER_MODEL=base
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
```

Notes:
- Use `SUPABASE_SERVICE_ROLE_KEY`, not publishable/anon key.
- Ensure bucket name matches exactly (`archives`).

## How To Start

### 1. Setup database

1. Open Supabase SQL editor.
2. Run `schema.sql`.
3. Confirm tables and storage bucket are created.

### 2. Start backend

```bash
cd TitanForge/backend
pip install -r ../requirements.txt
python main.py
```

Backend runs at `http://localhost:5000`.

### 3. Start frontend

```bash
cd TitanForge/frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` (default Vite).

## How To Use The App

1. Register or log in from the landing screen.
2. Go to `Make an Archive Post`.
3. Fill title/description, choose visibility, upload an audio/video file.
4. Wait for transcription to finish.
5. Open `My Feed` or `History` to view the post.
6. Click `View Post` to:
- Play original audio
- Read full transcript
- See timestamped chunks
- Download ZIP archive
7. In `History`, use edit/delete actions for your own posts.
8. Use `Search Archives` to query transcript chunks.

## Main API Endpoints

Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`

Upload and processing:
- `POST /api/posts/upload`

Posts and history:
- `GET /api/posts`
- `GET /api/posts/<post_id>`
- `PUT /api/posts/<post_id>/edit`
- `DELETE /api/posts/<post_id>?user_id=<id>`
- `GET /api/users/<user_id>/history`

Playback and download:
- `GET /api/posts/<post_id>/audio-url?user_id=<id>&expires_in=3600`
- `GET /api/posts/<post_id>/download`

RAG:
- `GET /api/posts/<post_id>/chunks`
- `GET /api/rag/search?user_id=<id>&q=<query>`

## Common Issues

- `403 / RLS` during upload:
  - Usually wrong key type. Use service role key in backend `.env`.
- Audio not playing:
  - Verify `archive_files.role='original_audio'` exists for that post.
  - Verify bucket is `archives`.
  - Restart backend after `.env` changes.
- Whisper slow on CPU:
  - Use a smaller model or faster machine/GPU settings.
