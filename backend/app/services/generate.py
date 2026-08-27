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
except ModuleNotFoundError:
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
    landmark_words = {"mahal", "memorial", "gardens", "garden", "fort", "palace", "museum", "temple", "falls", "monastery"}
    looks_like_city = len(user_place.split()) <= 2 and not landmark_words.intersection(user_place.casefold().split())
    normalized = user_place.casefold()
    exact_city = next(
        (candidate for candidate in candidates
         if str(candidate.get("municipality") or "").casefold() == normalized),
        None,
    )
    if looks_like_city:
        result = candidates[0]
    elif exact_city:
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
    city = user_place if looks_like_city else (result.get("municipality") or result.get("label"))
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
    """Use trip preferences and daily forecast JSON to create a detailed itinerary."""
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    budget_val = trip_request.get("budget", "medium")
    interests = trip_request.get("interests", [])
    travel_days = trip_request.get("travel_days", 3)

    prompt = f"""
You are an expert travel planner creating a DETAILED day-by-day travel itinerary.

Trip request JSON:
{json.dumps(trip_request, indent=2)}

Weather forecast JSON:
{json.dumps(weather, indent=2)}

CRITICAL RULES:
1. Generate activities for EVERY day of the trip ({travel_days} days total).
2. Each day MUST have 4-6 activities covering morning, afternoon, and evening.
3. Activities must include REAL, SPECIFIC place names — not generic descriptions.
   - For restaurants: use actual restaurant names (e.g., "Karim's", "Indian Coffee House", "MTR Restaurant")
   - For attractions: use real names (e.g., "Hawa Mahal", "Meenakshi Temple", "Gateway of India")
   - For hotels/stays: use real hotel or homestay names
4. Each activity must have a realistic estimated_cost in INR (Indian Rupees).
   - The total cost across ALL days should roughly align with the trip budget of {budget_val} INR.
   - Distribute costs realistically: entry fees, meals, transport, shopping.
5. Each activity must have a specific time_slot like "8:00 AM - 9:30 AM", not just "Morning".
6. Each activity must have a category from: sightseeing, culture, food, dining, relaxation, nature, transit, shopping.
7. Use the weather forecast: if rain probability is >=60%, prefer indoor activities with outdoor backup.
8. Do not schedule outdoor activities during severe weather.
9. The user's interests are: {', '.join(interests) if interests else 'general sightseeing'}.
   Prioritize activities matching these interests.
10. Include the main requested landmark if one was supplied, then suggest nearby real places.
    Group nearby attractions on the same day to reduce travel time.
11. Include at least one meal activity (breakfast, lunch, or dinner at a named restaurant) per day.
12. The description field should be 1-2 sentences explaining what makes this place special or what to expect.
13. The location field should be the specific address or area (e.g., "Chandni Chowk, Old Delhi" or "MG Road, Bangalore").
14. Return only JSON matching the requested schema.
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
                                "theme": {"type": "STRING"},
                                "weather": {"type": "STRING"},
                                "activities": {
                                    "type": "ARRAY",
                                    "items": {
                                        "type": "OBJECT",
                                        "properties": {
                                            "title": {"type": "STRING"},
                                            "category": {"type": "STRING"},
                                            "location": {"type": "STRING"},
                                            "description": {"type": "STRING"},
                                            "time_slot": {"type": "STRING"},
                                            "estimated_cost": {"type": "INTEGER"},
                                            "is_weather_sensitive": {"type": "BOOLEAN"},
                                        },
                                        "required": ["title", "category", "location", "description", "time_slot", "estimated_cost", "is_weather_sensitive"],
                                    },
                                },
                                "indoor_backup": {"type": "STRING"},
                                "warnings": {"type": "ARRAY", "items": {"type": "STRING"}},
                            },
                            "required": ["day", "date", "theme", "weather", "activities", "indoor_backup", "warnings"],
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
    weather = fetch_weather_forecast(
        city_country,
        days=min((end - start).days + 1, 5),
        lat=resolved.get("latitude"),
        lon=resolved.get("longitude"),
    )
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


def replan_itinerary(
    trip_request: dict,
    current_days: list,
    disruption: dict,
    weather: dict,
) -> dict:
    """Use trip preferences, current itinerary, disruption info, and weather forecast to replan."""
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    prompt = f"""
You are a smart travel assistant. Replan the existing itinerary to handle a real-world disruption.

Trip details:
{json.dumps(trip_request, indent=2)}

Current itinerary days:
{json.dumps(current_days, indent=2)}

Disruption details:
- Type: {disruption.get('disruption_type')}
- Description: {disruption.get('description')}
- Affected Day: {disruption.get('affected_day')}

Weather forecast:
{json.dumps(weather, indent=2)}

Rules for replanning:
1. Try to minimize disruption to the overall trip. Keep unchanged days exactly the same.
2. Swap outdoor activities for indoor alternatives on the affected day if the disruption is weather-related (e.g. rain, heatwave).
3. If it's a delay, adjust the activities of the affected day (e.g., remove less important activities or reschedule them).
4. Provide a clear explanation of what was changed and why.
5. Provide a list of bullet points summarizing the changes (changes_summary).
6. Each activity must include real place names, specific time slots, category, estimated cost in INR, and a description.

Return only JSON matching the requested schema.
"""
    response = _generate_with_retry(
        client,
        prompt,
        types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema={
                "type": "OBJECT",
                "properties": {
                    "explanation": {"type": "STRING"},
                    "changes_summary": {
                        "type": "ARRAY",
                        "items": {"type": "STRING"}
                    },
                    "days": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "day": {"type": "INTEGER"},
                                "date": {"type": "STRING"},
                                "theme": {"type": "STRING"},
                                "weather": {"type": "STRING"},
                                "activities": {
                                    "type": "ARRAY",
                                    "items": {
                                        "type": "OBJECT",
                                        "properties": {
                                            "title": {"type": "STRING"},
                                            "category": {"type": "STRING"},
                                            "location": {"type": "STRING"},
                                            "description": {"type": "STRING"},
                                            "time_slot": {"type": "STRING"},
                                            "estimated_cost": {"type": "INTEGER"},
                                            "is_weather_sensitive": {"type": "BOOLEAN"},
                                        },
                                        "required": ["title", "category", "location", "description", "time_slot", "estimated_cost", "is_weather_sensitive"],
                                    },
                                },
                                "indoor_backup": {"type": "STRING"},
                                "warnings": {"type": "ARRAY", "items": {"type": "STRING"}},
                            },
                            "required": ["day", "date", "theme", "weather", "activities", "indoor_backup", "warnings"],
                        },
                    },
                },
                "required": ["explanation", "changes_summary", "days"],
            },
        ),
    )
    return json.loads(response.text)


