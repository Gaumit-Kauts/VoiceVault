import os
from flask import Flask, request, jsonify
from openai import OpenAI

app = Flask(__name__)
client = OpenAI()  # reads OPENAI_API_KEY from env

def transcribe_with_timestamps(local_path: str):
    # Use whisper-1 for verbose_json + timestamp_granularities (segment/word)
    # timestamp_granularities requires response_format="verbose_json" :contentReference[oaicite:1]{index=1}
    with open(local_path, "rb") as f:
        tr = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )
    segments = []
    for seg in tr.segments:
        segments.append({
            "start_ms": int(seg["start"] * 1000),
            "end_ms": int(seg["end"] * 1000),
            "text": seg["text"].strip(),
        })
    return segments

@app.post("/upload-audio")
def upload_audio():
    file = request.files["file"]
    local_path = f"/tmp/{file.filename}"
    file.save(local_path)

    segments = transcribe_with_timestamps(local_path)

    # TODO: insert `segments` into transcript_segments table
    return jsonify({"segments": segments})
