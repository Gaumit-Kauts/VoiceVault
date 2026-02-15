import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

@app.get("/")
def health_check():
    return jsonify({
        "status": "running",
        "service": "VoiceVault API"
    })

# Import and register blueprint
from api_routes import api
app.register_blueprint(api)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
