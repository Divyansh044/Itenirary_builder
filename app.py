from google import genai
import os
import sqlite3
import json
from flask import Flask, jsonify, render_template, request, redirect, url_for
from dotenv import load_dotenv
from datetime import datetime
import re
import requests
import traceback
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    handlers=[logging.FileHandler("app.log"), logging.StreamHandler()])
logger = logging.getLogger(__name__)

load_dotenv()
app = Flask(__name__)

# Check if API key is available
if not os.getenv("GEMINI_API_KEY"):
    logger.error("GEMINI_API_KEY not found in environment variables!")

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY")
if not UNSPLASH_ACCESS_KEY:
    logger.warning("UNSPLASH_ACCESS_KEY not found in environment variables")

@app.route('/api/unsplash')
def unsplash_proxy():
    query = request.args.get('query', 'travel')
    per_page = request.args.get('per_page', 1)
    orientation = request.args.get('orientation', 'landscape')
    url = "https://api.unsplash.com/search/photos"
    params = {
        "query": query,
        "client_id": UNSPLASH_ACCESS_KEY,
        "per_page": per_page,
        "orientation": orientation
    }
    resp = requests.get(url, params=params)
    return jsonify(resp.json()), resp.status_code

# Initialize SQLite DB
def init_db():
    try:
        conn = sqlite3.connect("cache.db")
        c = conn.cursor()
        c.execute('''
        CREATE TABLE IF NOT EXISTS cache (
            key TEXT PRIMARY KEY,
            destination TEXT,
            days INTEGER,
            budget TEXT,
            theme TEXT,
            response TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
        conn.commit()
        conn.close()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        raise

init_db()

# Helpers
def generate_cache_key(destination, days, budget, theme):
    return f"{destination}_{days}_{budget}_{theme}".lower()

def fetch_from_cache(key):
    try:
        conn = sqlite3.connect("cache.db")
        c = conn.cursor()
        c.execute("SELECT response FROM cache WHERE key = ?", (key,))
        row = c.fetchone()

        # Update last accessed time
        if row:
            c.execute("UPDATE cache SET last_accessed = CURRENT_TIMESTAMP WHERE key = ?", (key,))
            logger.debug(f"Cache hit for key: {key}")

        conn.commit()
        conn.close()
        return row[0] if row else None
    except Exception as e:
        logger.error(f"Error fetching from cache: {str(e)}")
        return None

def enforce_cache_limit(max_rows=500):
    try:
        conn = sqlite3.connect("cache.db")
        c = conn.cursor()

        # Count total entries
        c.execute("SELECT COUNT(*) FROM cache")
        count = c.fetchone()[0]

        if count > max_rows:
            # Delete oldest entries based on least recently accessed
            to_delete = count - max_rows
            c.execute('''
                DELETE FROM cache WHERE key IN (
                    SELECT key FROM cache ORDER BY last_accessed ASC LIMIT ?
                )
            ''', (to_delete,))
            logger.info(f"Cache cleanup: removed {to_delete} least recently accessed entries")

        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Error enforcing cache limit: {str(e)}")

def save_to_cache(key, destination, days, budget, theme, response):
    try:
        conn = sqlite3.connect("cache.db")
        c = conn.cursor()
        c.execute(
            '''INSERT OR REPLACE INTO cache 
               (key, destination, days, budget, theme, response, timestamp, last_accessed)
               VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)''',
            (key, destination, days, budget, theme, response)
        )
        conn.commit()
        conn.close()
        logger.debug(f"Saved to cache: {key}")
        enforce_cache_limit(500)
    except Exception as e:
        logger.error(f"Error saving to cache: {str(e)}")

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html", unsplash_key=UNSPLASH_ACCESS_KEY)

@app.route("/generate", methods=["POST"])




@app.route("/generate", methods=["POST"])
def generate():
    # Extract form inputs
    destination = request.form["destination"]
    days = int(request.form["days"])
    budget = request.form["budget"]
    theme = request.form["theme"]

    # Check cache first
    cache_key = generate_cache_key(destination, days, budget, theme)
    cached_response = fetch_from_cache(cache_key)

    try:
        if cached_response:
            parsed_itinerary = json.loads(cached_response)
            suggested_places = parsed_itinerary.get("suggested", [])
            itinerary = parsed_itinerary.get("itinerary", [])
            return render_template(
                "itinerary.html",
                itinerary=itinerary,
                suggested_places=suggested_places,
                destination=destination,
                days=days,
                budget=budget,
                theme=theme
            )

        # Construct the prompt for Gemini
        prompt = f"""
Generate a {days}-day travel itinerary to {destination} within a {budget} budget focused on a {theme} theme.
Return ONLY a raw JSON object, no markdown, text, or explanation.
The JSON must have two keys:
- "itinerary": a list where each item is a day with "day" (int), "morning", "afternoon", "evening", "estimated_cost_in_dollars".
- "suggested": a list of all unique places, attractions, or points of interest mentioned in the itinerary (do not include generic terms like 'hotel' or 'restaurant').

Example:
{{
  "itinerary": [
    {{
      "day": 1,
      "morning": "...",
      "afternoon": "...",
      "evening": "...",
      "estimated_cost_in_dollars": 100
    }},
    ...
  ],
  "suggested": ["Eiffel Tower", "Louvre Museum", "Montmartre"]
}}

Note: The suggested list will only have the places that are mention in the itinerary for that day.
"""

        # Call the Gemini model
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[prompt]
        )

        # Clean up response
        raw_json = response.text.strip()
        print("Raw JSON from Gemini:", repr(raw_json))

        # Remove Markdown code block if present
        raw_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_json.strip(), flags=re.MULTILINE)

        # Try to decode the response
        try:
            parsed_itinerary = json.loads(raw_json)
            suggested_places = parsed_itinerary.get("suggested", [])
            itinerary = parsed_itinerary.get("itinerary", [])
        except json.JSONDecodeError:
            return render_template("itinerary.html", error="Unable to parse JSON from model output.")

        # Save valid JSON to cache
        save_to_cache(cache_key, destination, days, budget, theme, json.dumps(parsed_itinerary))

        return render_template(
            "itinerary.html",
            itinerary=itinerary,
            suggested_places=suggested_places,
            destination=destination,
            days=days,
            budget=budget,
            theme=theme
        )

    except Exception as e:
        return render_template("itinerary.html", error=f"Error generating itinerary: {str(e)}")
    

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)