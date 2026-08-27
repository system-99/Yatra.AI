import datetime
import os
import secrets
import uuid
from pathlib import Path
from typing import Any, cast

from dotenv import load_dotenv

try:
    from supabase import Client, create_client
except ImportError:
    Client = Any  # type: ignore[misc, assignment]

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(BACKEND_DIR / ".env.local", override=True)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

supabase: Client | None = None
is_supabase_connected = False

if SUPABASE_URL and SUPABASE_KEY and "your-project-ref" not in SUPABASE_URL:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        is_supabase_connected = True
        print("[Database] Supabase client initialized successfully.")
    except Exception as exc:  # noqa: BLE001
        print(f"[Database] Failed to connect to Supabase: {exc}. Falling back to in-memory store.")
else:
    print("[Database] Supabase credentials not configured. Operating in in-memory mode.")


# ── In-Memory Fallback Stores ────────────────────────────────────────────────
_mem_users: dict[str, dict[str, Any]] = {}
_mem_tokens: dict[str, str] = {}
_mem_trips: dict[int, dict[str, Any]] = {}
_next_trip_id = 1


def _row_to_trip(row: dict[str, Any]) -> dict[str, Any]:
    """Normalise raw Supabase row into standard dict shape with correct field types."""
    return {
        "id": int(row["id"]),
        "user_id": str(row["user_id"]),
        "destination": str(row.get("destination", "")),
        "start_date": row.get("start_date"),
        "end_date": row.get("end_date"),
        "budget": float(row.get("budget") or 0),
        "interests": row.get("interests") or [],
        "pace": str(row.get("pace", "moderate")),
        "status": str(row.get("status", "created")),
        "days": row.get("days") or [],
        "disruptions": row.get("disruptions") or [],
        "geocoded_days": row.get("geocoded_days"),
        "weather_forecast": row.get("weather_forecast"),
        "weather_summary": row.get("weather_summary"),
        "total_days": int(row.get("total_days") or 0),
        "total_estimated_cost": float(row.get("total_estimated_cost") or 0),
    }


# ── User Operations ──────────────────────────────────────────────────────────
def db_get_user_by_email(email: str) -> dict[str, Any] | None:
    """Fetch user record by email address."""
    normalized_email = email.strip().lower()
    if is_supabase_connected and supabase:
        try:
            resp = supabase.table("users").select("*").eq("email", normalized_email).execute()
            data = cast(list[dict[str, Any]], resp.data)
            if data and len(data) > 0:
                return data[0]
            return None
        except Exception as exc:  # noqa: BLE001
            print(f"[Database Error] db_get_user_by_email: {exc}")
    # Fallback to memory
    for u in _mem_users.values():
        if u["email"] == normalized_email:
            return u
    return None


def db_create_user(name: str, email: str, password_hash: str) -> dict[str, Any]:
    """Create a new user record."""
    normalized_email = email.strip().lower()
    user_id = str(uuid.uuid4())
    if is_supabase_connected and supabase:
        try:
            resp = supabase.table("users").insert({
                "id": user_id,
                "name": name.strip(),
                "email": normalized_email,
                "password_hash": password_hash
            }).execute()
            data = cast(list[dict[str, Any]], resp.data)
            if data:
                return data[0]
        except Exception as exc:  # noqa: BLE001
            print(f"[Database Error] db_create_user: {exc}")

    # Fallback / memory store
    user_data = {
        "id": user_id,
        "name": name.strip(),
        "email": normalized_email,
        "password_hash": password_hash
    }
    _mem_users[user_id] = user_data
    return user_data


def db_get_user_by_id(user_id: str) -> dict[str, Any] | None:
    """Fetch user record by user ID."""
    if is_supabase_connected and supabase:
        try:
            resp = supabase.table("users").select("*").eq("id", user_id).execute()
            data = cast(list[dict[str, Any]], resp.data)
            if data:
                return data[0]
            return None
        except Exception as exc:  # noqa: BLE001
            print(f"[Database Error] db_get_user_by_id: {exc}")

    return _mem_users.get(user_id)


def db_update_user_profile(user_id: str, name: str, email: str) -> dict[str, Any] | None:
    """Update user profile name and email."""
    normalized_email = email.strip().lower()
    if is_supabase_connected and supabase:
        try:
            resp = supabase.table("users").update({
                "name": name.strip(),
                "email": normalized_email
            }).eq("id", user_id).execute()
            data = cast(list[dict[str, Any]], resp.data)
            if data:
                return data[0]
        except Exception as exc:  # noqa: BLE001
            print(f"[Database Error] db_update_user_profile: {exc}")

    user = _mem_users.get(user_id)
    if user:
        user["name"] = name.strip()
        user["email"] = normalized_email
    return user


# ── Token / Session Operations ────────────────────────────────────────────────
def db_create_token(user_id: str) -> str:
    """Generate and store an authentication token for a user."""
    token = secrets.token_urlsafe(32)
    if is_supabase_connected and supabase:
        try:
            supabase.table("user_tokens").insert({"token": token, "user_id": user_id}).execute()
            return token
        except Exception as exc:  # noqa: BLE001
            print(f"[Database Error] db_create_token: {exc}")

    _mem_tokens[token] = user_id
    return token


def db_get_user_by_token(token: str) -> dict[str, Any] | None:
    """Fetch user record associated with an auth token."""
    if is_supabase_connected and supabase:
        try:
            tok_resp = supabase.table("user_tokens").select("user_id").eq("token", token).execute()
            data = cast(list[dict[str, Any]], tok_resp.data)
            if data and len(data) > 0:
                uid = str(data[0]["user_id"])
                return db_get_user_by_id(uid)
            return None
        except Exception as exc:  # noqa: BLE001
            print(f"[Database Error] db_get_user_by_token: {exc}")

    user_id = _mem_tokens.get(token)
    if user_id:
        return _mem_users.get(user_id)
    return None


# ── Trip Operations ──────────────────────────────────────────────────────────
def db_create_trip(
    user_id: str,
    destination_or_data: str | dict[str, Any],
    start_date: str | None = None,
    end_date: str | None = None,
    budget: float = 0,
    interests: list[str] | None = None,
    pace: str = "moderate"
) -> dict[str, Any]:
    """Create a trip record, supporting both dict payload or individual positional arguments."""
    global _next_trip_id

    if isinstance(destination_or_data, dict):
        tdata = destination_or_data
        destination = str(tdata.get("destination", ""))
        start_date = tdata.get("start_date")
        end_date = tdata.get("end_date")
        budget = float(tdata.get("budget", 0))
        interests = tdata.get("interests", [])
        pace = tdata.get("pace", "moderate")
    else:
        destination = destination_or_data
        interests = interests or []

    if is_supabase_connected and supabase:
        try:
            resp = supabase.table("trips").insert({
                "user_id": user_id,
                "destination": destination,
                "start_date": start_date,
                "end_date": end_date,
                "budget": budget,
                "interests": interests,
                "pace": pace,
                "status": "created",
                "days": [],
                "disruptions": []
            }).execute()
            data = cast(list[dict[str, Any]], resp.data)
            if data:
                return _row_to_trip(data[0])
        except Exception as exc:  # noqa: BLE001
            print(f"[Database Error] db_create_trip: {exc}")

    # Memory fallback
    trip_id = _next_trip_id
    _next_trip_id += 1
    trip_data: dict[str, Any] = {
        "id": trip_id,
        "user_id": user_id,
        "destination": destination,
        "start_date": start_date,
        "end_date": end_date,
        "budget": budget,
        "interests": interests,
        "pace": pace,
        "status": "created",
        "days": [],
        "disruptions": [],
        "weather_forecast": None,
        "total_days": 0,
        "total_estimated_cost": 0,
        "weather_summary": None
    }
    _mem_trips[trip_id] = trip_data
    return trip_data


def db_get_trip(trip_id: int, user_id: str | None = None) -> dict[str, Any] | None:
    """Fetch trip record by trip ID and optional user ID."""
    if is_supabase_connected and supabase:
        try:
            query = supabase.table("trips").select("*").eq("id", trip_id)
            if user_id:
                query = query.eq("user_id", user_id)
            resp = query.execute()
            data = cast(list[dict[str, Any]], resp.data)
            if data and len(data) > 0:
                return _row_to_trip(data[0])
            return None
        except Exception as exc:  # noqa: BLE001
            print(f"[Database Error] db_get_trip: {exc}")

    trip = _mem_trips.get(trip_id)
    if trip and (user_id is None or trip["user_id"] == user_id):
        return trip
    return None


def db_update_trip(trip_id: int, updates: dict[str, Any]) -> dict[str, Any] | None:
    """Update trip record by trip ID."""
    if is_supabase_connected and supabase:
        try:
            updates_copy = dict(updates)
            updates_copy["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            resp = supabase.table("trips").update(updates_copy).eq("id", trip_id).execute()
            data = cast(list[dict[str, Any]], resp.data)
            if data:
                return _row_to_trip(data[0])
        except Exception as exc:  # noqa: BLE001
            print(f"[Database Error] db_update_trip: {exc}")

    trip = _mem_trips.get(trip_id)
    if trip:
        trip.update(updates)
    return trip


def db_delete_trip(trip_id: int) -> bool:
    """Delete a trip record by trip ID."""
    if is_supabase_connected and supabase:
        try:
            resp = supabase.table("trips").delete().eq("id", trip_id).execute()
            data = cast(list[dict[str, Any]], resp.data)
            return bool(data and len(data) > 0)
        except Exception as exc:  # noqa: BLE001
            print(f"[Database Error] db_delete_trip: {exc}")

    if trip_id in _mem_trips:
        del _mem_trips[trip_id]
        return True
    return False


def db_list_user_trips(user_id: str) -> list[dict[str, Any]]:
    """List all trips for a given user ID."""
    if is_supabase_connected and supabase:
        try:
            resp = supabase.table("trips").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            data = cast(list[dict[str, Any]], resp.data)
            if data:
                return [_row_to_trip(item) for item in data]
            return []
        except Exception as exc:  # noqa: BLE001
            print(f"[Database Error] db_list_user_trips: {exc}")

    return [t for t in _mem_trips.values() if t["user_id"] == user_id]
