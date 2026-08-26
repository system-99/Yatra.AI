from pathlib import Path

from dotenv import load_dotenv
import datetime
import json
from fastapi import Depends, FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.services.maps import calculate_route, geocode_place
from app.services.generate import generate_from_place, replan_itinerary
from app.services.supabase_db import (
    create_trip as db_create_trip,
    get_trip as db_get_trip,
    list_user_trips as db_list_user_trips,
    update_trip as db_update_trip,
    delete_trip as db_delete_trip,
)
from app.auth import get_current_user

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(BACKEND_DIR / ".env.local", override=True)


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


@app.get("/api/trips/")
def list_trips(current_user: dict = Depends(get_current_user)):
    return db_list_user_trips(current_user["id"])


@app.post("/api/trips/")
def create_trip(request: TripRequest, current_user: dict = Depends(get_current_user)):
    trip_data = request.model_dump()
    return db_create_trip(current_user["id"], trip_data)


@app.delete("/api/trips/{trip_id}")
def delete_trip(trip_id: int, current_user: dict = Depends(get_current_user)):
    trip = db_get_trip(trip_id)
    if not trip or trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Trip not found")
    db_delete_trip(trip_id)
    return {"status": "deleted", "id": trip_id}


@app.post("/api/trips/{trip_id}/generate")
def generate_trip(trip_id: int, current_user: dict = Depends(get_current_user)):
    trip = db_get_trip(trip_id)
    if not trip or trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Trip not found")

    try:
        result = generate_from_place(
            trip["destination"], trip["start_date"], trip["end_date"],
            trip["interests"], str(trip["budget"]),
        )
    except Exception as exc:
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

    db_update_trip(trip_id, {
        "destination": result.get("destination", trip["destination"]),
        "days": days,
        "total_days": len(days),
        "total_estimated_cost": total_cost,
        "status": "generated",
        "weather_summary": result.get("weather_summary"),
    })

    return {"id": trip_id, "status": "generated"}


@app.get("/api/trips/{trip_id}")
def get_trip(trip_id: int, current_user: dict = Depends(get_current_user)):
    trip = db_get_trip(trip_id)
    if not trip or trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@app.delete("/api/trips/{trip_id}")
def delete_trip(trip_id: int, current_user: dict = Depends(get_current_user)):
    trip = db_get_trip(trip_id)
    if not trip or trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Trip not found")
    success = db_delete_trip(trip_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete trip")
    return {"message": "Trip deleted successfully"}


@app.get("/api/trips/{trip_id}/geocoded-days")
def get_geocoded_days(trip_id: int, current_user: dict = Depends(get_current_user)):
    trip = db_get_trip(trip_id)
    if not trip or trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Trip not found")

    cached = trip.get("geocoded_days")
    if cached:
        return {"trip_id": trip_id, "destination": trip["destination"], "days": cached}

    days_data = trip.get("days") or []
    if not days_data:
        return {"trip_id": trip_id, "destination": trip["destination"], "days": []}

    geocoded_days = []
    location_cache = {}

    for day in days_data:
        g_day = {
            "day_number": day.get("day_number"),
            "date": day.get("date"),
            "theme": day.get("theme", "Exploring"),
            "locations": []
        }
        for act in day.get("activities", []):
            loc_str = act.get("location") or act.get("title")
            if not loc_str:
                continue

            lat, lng = None, None
            if loc_str in location_cache:
                lat, lng = location_cache[loc_str]
            else:
                try:
                    res = geocode_place(f"{loc_str}, {trip['destination']}")
                    lat = res["latitude"]
                    lng = res["longitude"]
                    location_cache[loc_str] = (lat, lng)
                except Exception:
                    pass

            if lat is not None and lng is not None:
                g_day["locations"].append({
                    "title": act.get("title"),
                    "lat": lat,
                    "lng": lng,
                    "category": act.get("category"),
                    "time_slot": act.get("time_slot"),
                    "description": act.get("description")
                })
        geocoded_days.append(g_day)

    db_update_trip(trip_id, {"geocoded_days": geocoded_days})
    return {"trip_id": trip_id, "destination": trip["destination"], "days": geocoded_days}


@app.get("/api/trips/{trip_id}/itinerary")
def get_itinerary(trip_id: int, current_user: dict = Depends(get_current_user)):
    trip = db_get_trip(trip_id)
    if not trip or trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Trip not found")
    return {"id": trip["id"], "destination": trip["destination"], "days": trip["days"]}
active_connections: dict[int, list[WebSocket]] = {}

@app.websocket("/ws/trips/{trip_id}")
async def websocket_endpoint(websocket: WebSocket, trip_id: int):
    await websocket.accept()
    if trip_id not in active_connections:
        active_connections[trip_id] = []
    active_connections[trip_id].append(websocket)
    try:
        while True:
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
    trip = db_get_trip(trip_id)
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

    db_update_trip(trip_id, {
        "days": new_days,
        "disruptions": disruptions,
        "total_estimated_cost": total_cost,
    })

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
    trip = db_get_trip(trip_id)
    if not trip or trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Trip not found")

    weather = trip.get("weather_forecast")
    if not weather:
        from app.services.weather_service import fetch_weather_forecast
        try:
            weather = fetch_weather_forecast(trip["destination"], days=len(trip.get("days", [])))
            db_update_trip(trip_id, {"weather_forecast": weather})
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
    trip = db_get_trip(trip_id)
    if not trip or trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip.get("disruptions", [])
