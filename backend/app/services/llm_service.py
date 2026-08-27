import os
from pathlib import Path
from google import genai
from dotenv import load_dotenv
from google.genai import types
from huggingface_hub import InferenceClient
import json
from weather_service import fetch_weather_details
BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")

usr_input = input("Enter your travel request: ").strip()
if not usr_input:
    raise ValueError("Please enter a destination or travel request")

client=genai.Client(
    api_key=os.getenv('GEMINI_API_KEY')
)



response = client.models.generate_content(
    model="gemini-3.6-flash",
    contents=(
        "Extract the landmark or destination and its actual city and country. "
        "For example, Taj Mahal is in Agra, India, and Victoria Memorial is in Kolkata, India. "
        "Return only the requested JSON object. Request: " + usr_input
    ),
    config=types.GenerateContentConfig(response_mime_type="application/json",
        response_schema={
            "type":"OBJECT",
            "properties":{
                "landmark":{"type":"STRING"},
                "city":{"type":"STRING"},
                "country":{"type":"STRING"}
            },
            "required":["landmark", "city", "country"]
        },
        thinking_config=types.ThinkingConfig(thinking_level="minimal"),
        max_output_tokens=4000

        )

)
try:
    data = json.loads(response.text)
    landmark = data["landmark"].strip()
    city = data["city"].strip()
    country = data["country"].strip()
except (json.JSONDecodeError, KeyError, AttributeError) as exc:
    raise RuntimeError(f"Gemini returned invalid location data: {response.text!r}") from exc

weather_place = f"{city}, {country}"
print(f"Resolved landmark: {landmark}")
print(f"Weather location: {weather_place}")
try:
    weather = fetch_weather_details(weather_place)
except Exception as exc:
    raise RuntimeError(f"Could not retrieve weather for {weather_place}: {exc}") from exc
print(json.dumps(weather, indent=2))
