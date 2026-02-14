
## Backend (Audio -> Whisper -> Supabase)

This backend:
1. accepts an audio file,
2. transcribes it with OpenAI Whisper (`whisper-1`),
3. stores transcript text in Supabase `posts.transcribed_text`,
4. links categories in `post_categories`.

## Install
```bash
pip install -r requirements.txt
```

## Environment variables
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (use service-role key on backend only)
- `UPLOAD_DIR` (default: `uploads`)
- `PORT` (default: `5000`)

## Run
```bash
python speech_to_text.py
```

## Endpoints
- `GET /health`
- `GET /health/db`
- `POST /upload-audio`

## Upload example
```bash
curl -X POST http://localhost:5000/upload-audio \
  -F "file=@sample.mp3" \
  -F "user_id=1" \
  -F "title=My oral history" \
  -F "category_ids=1,4" \
  -F "is_private=false"
```

## Required tables in Supabase
Your Supabase Postgres project should already contain:
- `users`
- `posts`
- `post_categories`
- `categories`

Note: `user_id` must exist in `users` before upload.
