"""Generate a weather-aware, day-by-day itinerary with Gemini."""

import json
import os
import time
from datetime import date
from pathlib import Path

from dotenv import load_dotenv

try:
    from google import genai
    from google.genai.errors import ServerError
    from google.genai import types
except ModuleNotFoundError:  # pragma: no cover - optional dependency in local dev/test wiring
    genai = None
    ServerError = RuntimeError
    types = None

from app.services.maps import search_places
from app.services.weather_service import fetch_weather_forecast


BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")


def _generate_with_retry(client, prompt: str, config):
    """Retry temporary Gemini 503 capacity errors before failing."""
    if genai is None or types is None:
        raise RuntimeError("Google GenAI dependency is not installed. Please install google-genai to enable itinerary generation.")
    last_error = None
    for attempt in range(3):
        try:
            return client.models.generate_content(
                model="gemini-3.6-flash",
                contents=prompt,
                config=config,
            )
        except ServerError as exc:
            last_error = exc
            if getattr(exc, "status_code", None) != 503 or attempt == 2:
                raise
            time.sleep(2 ** attempt)
    raise last_error


def resolve_destination(user_place: str) -> dict:
    """Resolve a place with TomTom candidates and Gemini only when ambiguous."""
    user_place = (user_place or "").strip()
    if not user_place:
        raise ValueError("A destination is required")
    if genai is None or types is None:
        raise RuntimeError("Google GenAI dependency is not installed. Please install google-genai to enable itinerary generation.")
    candidates = search_places(user_place, limit=5, country_set="IN")
    normalized = user_place.casefold()
    exact_city = next(
        (candidate for candidate in candidates
         if str(candidate.get("municipality") or "").casefold() == normalized),
        None,
    )
    if exact_city:
        result = exact_city
    elif len(candidates) == 1 or (
        candidates[0].get("score") is not None
        and (len(candidates) == 1 or candidates[1].get("score") is not None)
        and candidates[0]["score"] >= 0.95
        and (len(candidates) == 1 or candidates[0]["score"] - candidates[1]["score"] >= 0.1)
    ):
        result = candidates[0]
    else:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        candidate_text = json.dumps(candidates, indent=2)
        try:
            response = _generate_with_retry(
                client,
                f"Choose the correct location for '{user_place}' from these TomTom candidates. "
                "Use landmark knowledge and return only the candidate_index.\n" + candidate_text,
                types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema={
                        "type": "OBJECT",
                        "properties": {"candidate_index": {"type": "INTEGER"}},
                        "required": ["candidate_index"],
                    },
                ),
            )
            selected = json.loads(response.text).get("candidate_index", 0)
            result = candidates[int(selected)]
        except (ValueError, IndexError, KeyError, TypeError, ServerError) as exc:
            options = "; ".join(
                f"{i}: {c.get('label')} ({c.get('municipality')})"
                for i, c in enumerate(candidates)
            )
            raise ValueError(
                f"The place '{user_place}' is ambiguous. Choose one of: {options}"
            ) from exc
    city = result.get("municipality") or result.get("label")
    country = result.get("country") or ""
    landmark = result.get("label") or user_place
    is_city = user_place.casefold() in {str(city).casefold(), str(landmark).casefold()}
    return {
        "input_place": user_place,
        "place_type": "city" if is_city else "landmark",
        "landmark": user_place if not is_city else "",
        "city": city,
        "country": country,
        "latitude": result.get("latitude"),
        "longitude": result.get("longitude"),
    }


def generate_weather_aware_itinerary(trip_request: dict, weather: dict) -> dict:
    """Use trip preferences and daily forecast JSON to create a safe itinerary."""
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    prompt = f"""
Create a practical day-by-day travel itinerary.
Trip request JSON:
{json.dumps(trip_request, indent=2)}

Weather forecast JSON:
{json.dumps(weather, indent=2)}

Rules:
- Use the forecast for each date.
- If rain probability is 60% or higher, prefer indoor activities and provide an outdoor backup.
- Do not schedule outdoor activities during severe weather.
- Keep travel times realistic and preserve the user's budget and interests.
- Include the main requested landmark when one was supplied, then suggest nearby places
  in the resolved city. Group nearby attractions on the same day to reduce travel.
- Return only JSON matching the requested schema.
"""
    response = _generate_with_retry(
        client,
        prompt,
        types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema={
                "type": "OBJECT",
                "properties": {
                    "destination": {"type": "STRING"},
                    "weather_summary": {"type": "STRING"},
                    "days": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "day": {"type": "INTEGER"},
                                "date": {"type": "STRING"},
                                "weather": {"type": "STRING"},
                                "activities": {"type": "ARRAY", "items": {"type": "STRING"}},
                                "indoor_backup": {"type": "STRING"},
                                "warnings": {"type": "ARRAY", "items": {"type": "STRING"}},
                            },
                            "required": ["day", "date", "weather", "activities", "indoor_backup", "warnings"],
                        },
                    },
                },
                "required": ["destination", "weather_summary", "days"],
            },
        ),
    )
    return json.loads(response.text)


def generate_from_place(
    place: str,
    start_date: str,
    end_date: str,
    interests: list[str] | None = None,
    budget: str = "medium",
) -> dict:
    """End-to-end helper for a landmark/city plus travel dates."""
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)
    if end < start:
        raise ValueError("end_date must be on or after start_date")

    resolved = resolve_destination(place)
    city_country = f"{resolved['city']}, {resolved['country']}"
    weather = fetch_weather_forecast(city_country, days=min((end - start).days + 1, 5))
    trip_request = {
        "input_place": place,
        "place_type": resolved["place_type"],
        "landmark": resolved["landmark"],
        "destination": city_country,
        "start_date": start_date,
        "end_date": end_date,
        "travel_days": (end - start).days + 1,
        "interests": interests or [],
        "budget": budget,
    }
    itinerary = generate_weather_aware_itinerary(trip_request, weather)
    itinerary["resolved_destination"] = resolved
    itinerary["weather_forecast"] = weather
    return itinerary
