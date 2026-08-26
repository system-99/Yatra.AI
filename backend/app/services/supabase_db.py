"""Supabase database operations for trip persistence.

Uses the service-role key so the backend can read/write the ``trips`` table
without depending on Row Level Security policies.  Every public function
returns plain Python dicts so the rest of the app remains unchanged.
"""

import os
from typing import Any

from supabase import Client, create_client


def _service_client() -> Client:
    """Return a Supabase client authenticated with the **service-role** key."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "Supabase is not configured for DB access. "
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env"
        )
    return create_client(url, key)


def create_trip(user_id: str, trip_data: dict[str, Any]) -> dict:
    """Insert a new trip row and return the created record (including its ``id``)."""
    row = {
        "user_id": user_id,
        "destination": trip_data.get("destination", ""),
        "start_date": trip_data.get("start_date"),
        "end_date": trip_data.get("end_date"),
        "budget": float(trip_data.get("budget", 0)),
        "interests": trip_data.get("interests", []),
        "pace": trip_data.get("pace", "moderate"),
        "status": "created",
        "days": [],
        "disruptions": [],
        "weather_forecast": None,
        "weather_summary": None,
        "total_days": 0,
        "total_estimated_cost": 0,
    }
    result = _service_client().table("trips").insert(row).execute()
    return _row_to_trip(result.data[0])


def get_trip(trip_id: int) -> dict | None:
    """Fetch a single trip by ID, or ``None`` if it doesn't exist."""
    result = (
        _service_client()
        .table("trips")
        .select("*")
        .eq("id", trip_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        return None
    return _row_to_trip(result.data)


def list_user_trips(user_id: str) -> list[dict]:
    """Return all trips belonging to *user_id*, newest first."""
    result = (
        _service_client()
        .table("trips")
        .select("*")
        .eq("user_id", user_id)
        .order("id", desc=True)
        .execute()
    )
    return [_row_to_trip(row) for row in result.data]


def update_trip(trip_id: int, updates: dict[str, Any]) -> dict:
    """Partially update a trip row and return the updated record."""
    result = (
        _service_client()
        .table("trips")
        .update(updates)
        .eq("id", trip_id)
        .execute()
    )
    return _row_to_trip(result.data[0])


def delete_trip(trip_id: int) -> bool:
    """Delete a trip row.  Returns ``True`` if a row was actually deleted."""
    result = (
        _service_client()
        .table("trips")
        .delete()
        .eq("id", trip_id)
        .execute()
    )
    return len(result.data) > 0


def _row_to_trip(row: dict) -> dict:
    """Normalise a raw Supabase row into the dict shape the API already returns.

    The main concern is ensuring ``id`` is an int and ``budget`` /
    ``total_estimated_cost`` are numbers, since Supabase may return strings
    for ``numeric`` columns.
    """
    return {
        "id": int(row["id"]),
        "user_id": row["user_id"],
        "destination": row.get("destination", ""),
        "start_date": row.get("start_date"),
        "end_date": row.get("end_date"),
        "budget": float(row.get("budget") or 0),
        "interests": row.get("interests") or [],
        "pace": row.get("pace", "moderate"),
        "status": row.get("status", "created"),
        "days": row.get("days") or [],
        "disruptions": row.get("disruptions") or [],
        "geocoded_days": row.get("geocoded_days"),
        "weather_forecast": row.get("weather_forecast"),
        "weather_summary": row.get("weather_summary"),
        "total_days": int(row.get("total_days") or 0),
        "total_estimated_cost": float(row.get("total_estimated_cost") or 0),
    }
