"""TomTom map services for the itinerary backend.

This module does not read GPS from the server. The browser obtains the user's
location and sends latitude/longitude to ``update_live_location``. TomTom is
used for place search (geocoding) and route calculation.
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path
from threading import Lock
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import urlopen

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")


def _tomtom_key() -> str:
    key = (os.getenv("TOMTOM_API_KEY") or "").strip()
    if not key:
        raise RuntimeError("Missing TOMTOM_API_KEY in backend/.env")
    return key


def _get_json(url: str) -> dict[str, Any]:
    try:
        with urlopen(url, timeout=15) as response:
            return json.load(response)
    except HTTPError as exc:
        if exc.code in (401, 403):
            raise RuntimeError("TomTom rejected TOMTOM_API_KEY") from exc
        raise RuntimeError(f"TomTom request failed (HTTP {exc.code})") from exc
    except URLError as exc:
        raise RuntimeError("Could not connect to TomTom") from exc


def search_places(query: str, limit: int = 5, country_set: str = "IN") -> list[dict[str, Any]]:
    """Return several geocoding candidates for ambiguity checking."""
    query = (query or "").strip()
    if not query:
        raise ValueError("A place name is required")
    path_query = quote(query, safe="")
    params = urlencode({"key": _tomtom_key(), "limit": min(max(limit, 1), 10), "countrySet": country_set})
    data = _get_json(
        f"https://api.tomtom.com/search/2/geocode/{path_query}.json?{params}"
    )
    results = data.get("results") or []
    if not results:
        raise ValueError(f"TomTom could not find '{query}'")
    candidates = []
    for result in results:
        position = result.get("position") or {}
        address = result.get("address") or {}
        candidates.append({
            "query": query,
            "latitude": position.get("lat"),
            "longitude": position.get("lon"),
            "label": address.get("freeformAddress") or result.get("poi", {}).get("name"),
            "country": address.get("country"),
            "municipality": address.get("municipality"),
            "entity_type": result.get("type") or result.get("entityType"),
            "score": result.get("score"),
        })
    return candidates


def geocode_place(query: str) -> dict[str, Any]:
    """Resolve a city, address, or landmark using the best candidate."""
    return search_places(query, limit=1)[0]


def calculate_route(points: Iterable[dict[str, float]], traffic: bool = True) -> dict[str, Any]:
    """Calculate a driving route from ``[{latitude, longitude}, ...]``."""
    points = list(points)
    if len(points) < 2:
        raise ValueError("At least an origin and destination are required")
    try:
        coordinates = ":".join(
            f"{float(point['latitude'])},{float(point['longitude'])}" for point in points
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("Each route point needs numeric latitude and longitude") from exc
    params = urlencode({"key": _tomtom_key(), "traffic": str(traffic).lower()})
    data = _get_json(
        f"https://api.tomtom.com/routing/1/calculateRoute/{coordinates}/json?{params}"
    )
    route = (data.get("routes") or [{}])[0]
    summary = route.get("summary") or {}
    return {
        "distance_meters": summary.get("lengthInMeters"),
        "travel_seconds": summary.get("travelTimeInSeconds"),
        "traffic_delay_seconds": summary.get("trafficDelayInSeconds"),
        "points": (route.get("legs") or [{}])[0].get("points", []),
        "raw": data,
    }


_latest_locations: dict[str, dict[str, float]] = {}
_location_lock = Lock()


def update_live_location(user_id: str, latitude: float, longitude: float) -> dict[str, Any]:
    """Validate and store the latest browser GPS position for one user."""
    latitude, longitude = float(latitude), float(longitude)
    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        raise ValueError("Invalid latitude/longitude")
    location = {
        "user_id": str(user_id),
        "latitude": latitude,
        "longitude": longitude,
        "updated_at": time.time(),
    }
    with _location_lock:
        _latest_locations[str(user_id)] = location
    return location


def get_live_location(user_id: str) -> dict[str, Any] | None:
    """Return the latest location, or ``None`` if no update was received."""
    with _location_lock:
        return _latest_locations.get(str(user_id))
