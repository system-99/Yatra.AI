from pathlib import Path

from dotenv import load_dotenv
import datetime
import json
from fastapi import Depends, FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.services.maps import calculate_route, geocode_place
from app.services.generate import generate_from_place, replan_itinerary
from app.auth import get_current_user

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(BACKEND_DIR / ".env.local", override=True)

# ── In-memory stores (no database required) ──────────────────────────────────
# trips_db:  { trip_id: { ...trip_data } }
trips_db: dict[int, dict] = {}
_next_trip_id = 1


app = FastAPI(title="Dynamic Itinerary Planner API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


class RouteRequest(BaseModel):
    points: list[dict[str, float]] = Field(min_length=2)
    traffic: bool = True

class TripRequest(BaseModel):
    destination: str = Field(min_length=1)
    start_date: str
    end_date: str
    budget: float = 0
    interests: list[str] = []
    pace: str = "moderate"

class ProfileUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: str = Field(min_length=3)

class DisruptionRequest(BaseModel):
    disruption_type: str
    description: str
    affected_day: int | None = None

class WeatherCheckRequest(BaseModel):
    day_number: int


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/auth/me")
def me(current_user: dict = Depends(get_current_user)):
    return current_user


@app.put("/api/auth/profile")
def update_profile(request: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    new_email = request.email.strip().lower()
    new_name = request.name.strip()

    if not new_name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    # Supabase owns profile writes. New clients update user metadata directly
    # with supabase.auth.updateUser; this endpoint remains backward compatible.
    return {"id": current_user["id"], "name": new_name, "email": new_email}


@app.get("/api/maps/geocode")
def geocode(query: str):
    try:
        return geocode_place(query)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/maps/route")
def route(request: RouteRequest):
    try:
        return calculate_route(request.points, request.traffic)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/trips/")
def create_trip(request: TripRequest, current_user: dict = Depends(get_current_user)):
    global _next_trip_id
    trip_id = _next_trip_id
    _next_trip_id += 1

    trip_data = request.model_dump()
    trip_data["id"] = trip_id
    trip_data["user_id"] = current_user["id"]
    trip_data["status"] = "created"
    trip_data["days"] = []
    trip_data["disruptions"] = []
    trip_data["weather_forecast"] = None
    trip_data["total_days"] = 0
    trip_data["total_estimated_cost"] = 0
    trip_data["weather_summary"] = None

    trips_db[trip_id] = trip_data
    return trip_data


@app.post("/api/trips/{trip_id}/generate")
def generate_trip(trip_id: int, current_user: dict = Depends(get_current_user)):
    trip = trips_db.get(trip_id)
    if not trip or trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Trip not found")

    try:
        result = generate_from_place(
            trip["destination"], trip["start_date"], trip["end_date"],
            trip["interests"], str(trip["budget"]),
        )
    except Exception as exc:
        # Surface provider quota/capacity errors as an API response instead of
        # an opaque 500 traceback in the frontend.
        message = str(exc)
        status = 429 if "RESOURCE_EXHAUSTED" in message or "quota" in message.lower() else 502
        raise HTTPException(status_code=status, detail=message) from exc
    days = []
    activity_id = 1
    total_cost = 0
    for generated_day in result.get("days", []):
        activities = []
        for act_data in generated_day.get("activities", []):
            if isinstance(act_data, str):
                act_obj = {
                    "id": activity_id,
                    "title": act_data,
                    "category": "sightseeing",
                    "location": result.get("destination", trip["destination"]),
                    "description": act_data,
                    "time_slot": "Daytime",
                    "estimated_cost": 0,
                    "is_weather_sensitive": True,
                }
            else:
                cost = act_data.get("estimated_cost", 0)
                if isinstance(cost, str):
                    cost = int("".join(filter(str.isdigit, cost)) or "0")
                total_cost += cost
                act_obj = {
                    "id": activity_id,
                    "title": act_data.get("title", "Activity"),
                    "category": act_data.get("category", "sightseeing"),
                    "location": act_data.get("location", result.get("destination", trip["destination"])),
                    "description": act_data.get("description", ""),
                    "time_slot": act_data.get("time_slot", "Daytime"),
                    "estimated_cost": cost,
                    "is_weather_sensitive": act_data.get("is_weather_sensitive", True),
                }
            activities.append(act_obj)
            activity_id += 1
        days.append({
            "day_number": generated_day.get("day"),
            "date": generated_day.get("date"),
            "theme": generated_day.get("theme", "Exploring"),
            "weather": generated_day.get("weather"),
            "indoor_backup": generated_day.get("indoor_backup"),
            "warnings": generated_day.get("warnings", []),
            "activities": activities,
        })

    trip["destination"] = result.get("destination", trip["destination"])
    trip["days"] = days
    trip["total_days"] = len(days)
    trip["total_estimated_cost"] = total_cost
    trip["status"] = "generated"
    trip["weather_summary"] = result.get("weather_summary")

    return {"id": trip_id, "status": "generated"}


@app.get("/api/trips/{trip_id}")
def get_trip(trip_id: int, current_user: dict = Depends(get_current_user)):
    trip = trips_db.get(trip_id)
    if not trip or trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@app.get("/api/trips/{trip_id}/itinerary")
def get_itinerary(trip_id: int, current_user: dict = Depends(get_current_user)):
    trip = trips_db.get(trip_id)
    if not trip or trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Trip not found")
    return {"id": trip["id"], "destination": trip["destination"], "days": trip["days"]}


# Active WebSocket connections
active_connections: dict[int, list[WebSocket]] = {}

@app.websocket("/ws/trips/{trip_id}")
async def websocket_endpoint(websocket: WebSocket, trip_id: int):
    await websocket.accept()
    if trip_id not in active_connections:
        active_connections[trip_id] = []
    active_connections[trip_id].append(websocket)
    try:
        while True:
            # Client sends keepalive pings
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("action") == "ping":
                    await websocket.send_json({"event": "pong"})
            except Exception:
                pass
    except WebSocketDisconnect:
        if trip_id in active_connections:
            active_connections[trip_id].remove(websocket)
            if not active_connections[trip_id]:
                del active_connections[trip_id]


async def broadcast_replan(trip_id: int, explanation: str, changes_summary: list[str]):
    if trip_id in active_connections:
        message = {
            "event": "itinerary_replanned",
            "explanation": explanation,
            "changes_summary": changes_summary
        }
        for ws in active_connections[trip_id]:
            try:
                await ws.send_json(message)
            except Exception:
                pass


@app.post("/api/trips/{trip_id}/disruptions/replan")
async def replan_trip(trip_id: int, request: DisruptionRequest, current_user: dict = Depends(get_current_user)):
    trip = trips_db.get(trip_id)
    if not trip or trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip_request = {
        "destination": trip.get("destination"),
        "start_date": trip.get("start_date"),
        "end_date": trip.get("end_date"),
        "interests": trip.get("interests", []),
        "budget": str(trip.get("budget", 0)),
    }

    current_days_simplified = []
    for day in trip.get("days", []):
        current_days_simplified.append({
            "day": day.get("day_number"),
            "date": day.get("date"),
            "weather": day.get("weather"),
            "activities": day.get("activities", []),
            "indoor_backup": day.get("indoor_backup"),
            "warnings": day.get("warnings", [])
        })

    weather = trip.get("weather_forecast")
    if not weather:
        from app.services.weather_service import fetch_weather_forecast
        try:
            weather = fetch_weather_forecast(trip["destination"], days=len(trip.get("days", [])))
        except Exception:
            weather = {"daily_forecast": []}

    try:
        replan_result = replan_itinerary(
            trip_request=trip_request,
            current_days=current_days_simplified,
            disruption={
                "disruption_type": request.disruption_type,
                "description": request.description,
                "affected_day": request.affected_day
            },
            weather=weather
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    new_days = []
    activity_id = 1
    total_cost = 0
    for day in replan_result.get("days", []):
        activities = []
        for act in day.get("activities", []):
            if isinstance(act, str):
                act_obj = {
                    "id": activity_id,
                    "title": act,
                    "category": "sightseeing",
                    "location": trip["destination"],
                    "description": act,
                    "time_slot": "Daytime",
                    "estimated_cost": 0,
                    "is_weather_sensitive": True
                }
            else:
                cost = act.get("estimated_cost", 0)
                if isinstance(cost, str):
                    cost = int("".join(filter(str.isdigit, cost)) or "0")
                total_cost += cost
                act_obj = {
                    "id": activity_id,
                    "title": act.get("title", "Activity"),
                    "category": act.get("category", "sightseeing"),
                    "location": act.get("location", trip["destination"]),
                    "description": act.get("description", ""),
                    "time_slot": act.get("time_slot", "Daytime"),
                    "estimated_cost": cost,
                    "is_weather_sensitive": act.get("is_weather_sensitive", True)
                }
            activities.append(act_obj)
            activity_id += 1

        new_days.append({
            "day_number": day.get("day"),
            "date": day.get("date"),
            "weather": day.get("weather"),
            "indoor_backup": day.get("indoor_backup"),
            "warnings": day.get("warnings", []),
            "activities": activities
        })

    disruption_record = {
        "disruption_type": request.disruption_type,
        "description": request.description,
        "affected_day": request.affected_day,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "replan_explanation": replan_result.get("explanation", "Itinerary was replanned."),
        "impact_summary": ", ".join(replan_result.get("changes_summary", []))
    }

    disruptions = trip.get("disruptions") or []
    disruptions.append(disruption_record)

    trip["days"] = new_days
    trip["disruptions"] = disruptions
    trip["total_estimated_cost"] = total_cost

    await broadcast_replan(
        trip_id=trip_id,
        explanation=replan_result.get("explanation", "Itinerary updated."),
        changes_summary=replan_result.get("changes_summary", [])
    )

    return {
        "status": "ok",
        "explanation": replan_result.get("explanation", "Itinerary updated."),
        "changes_summary": replan_result.get("changes_summary", [])
    }


@app.post("/api/trips/{trip_id}/disruptions/check-weather")
async def check_weather(trip_id: int, request: WeatherCheckRequest, current_user: dict = Depends(get_current_user)):
    trip = trips_db.get(trip_id)
    if not trip or trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Trip not found")

    weather = trip.get("weather_forecast")
    if not weather:
        from app.services.weather_service import fetch_weather_forecast
        try:
            weather = fetch_weather_forecast(trip["destination"], days=len(trip.get("days", [])))
            trip["weather_forecast"] = weather
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Failed to fetch weather: {exc}")

    daily_forecasts = weather.get("daily_forecast", [])
    day_idx = request.day_number - 1
    if day_idx < 0 or day_idx >= len(daily_forecasts):
        return {"status": "ok", "replanned": False, "reason": "No forecast available for this day"}

    day_forecast = daily_forecasts[day_idx]
    rain_prob = day_forecast.get("rain_probability_percent", 0)
    desc = day_forecast.get("description", "unknown")

    if rain_prob >= 60:
        disruption_desc = f"Adverse weather detected: high rain probability ({rain_prob}%) and {desc}."
        dis_req = DisruptionRequest(
            disruption_type="weather",
            description=disruption_desc,
            affected_day=request.day_number
        )
        result = await replan_trip(trip_id, dis_req, current_user=current_user)
        return {
            "status": "ok",
            "replanned": True,
            "explanation": result["explanation"],
            "changes_summary": result["changes_summary"]
        }

    return {"status": "ok", "replanned": False, "reason": f"Weather is fine (rain probability {rain_prob}%)"}


@app.get("/api/trips/{trip_id}/disruptions")
def get_disruptions(trip_id: int, current_user: dict = Depends(get_current_user)):
    trip = trips_db.get(trip_id)
    if not trip or trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip.get("disruptions", [])
