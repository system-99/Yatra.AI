import hashlib
import hmac
import os
import secrets
import uuid
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.services.maps import calculate_route, geocode_place
from app.services.generate import generate_from_place

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(BACKEND_DIR / ".env.local", override=True)


app = FastAPI(title="Dynamic Itinerary Planner API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
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


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: str = Field(min_length=3)
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=8)


trips: dict[int, dict] = {}
next_trip_id = 1
users: dict[str, dict] = {}
tokens: dict[str, dict] = {}


def hash_password(password: str) -> str:
    salt = secrets.token_hex(8)
    digest = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return f"{salt}:{digest}"


def verify_password(password: str, stored_hash: str) -> bool:
    if not stored_hash or ":" not in stored_hash:
        return False
    salt, expected_digest = stored_hash.split(":", 1)
    actual_digest = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return hmac.compare_digest(actual_digest, expected_digest)


def issue_token(user: dict) -> str:
    token = secrets.token_urlsafe(32)
    tokens[token] = {"user_id": user["id"], "email": user["email"]}
    return token


def get_current_user(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization.split(" ", 1)[1].strip()
    session = tokens.get(token)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = users.get(session["email"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_dev_key(x_api_key: str | None = Header(default=None)):
    expected = os.getenv("DEV_API_KEY")
    if not expected or x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing development API key")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/auth/register")
def register(request: RegisterRequest):
    email = request.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Email is invalid")
    if email in users:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user = {
        "id": str(uuid.uuid4()),
        "name": request.name.strip(),
        "email": email,
        "password": hash_password(request.password),
    }
    users[email] = user
    token = issue_token(user)
    return {
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
    }


@app.post("/api/auth/login")
def login(request: LoginRequest):
    email = request.email.strip().lower()
    user = users.get(email)
    if not user or not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = issue_token(user)
    return {
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
    }


@app.get("/api/auth/me")
def me(current_user: dict = Depends(get_current_user)):
    return {"id": current_user["id"], "name": current_user["name"], "email": current_user["email"]}


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


@app.post("/api/trips/", dependencies=[Depends(require_dev_key)])
def create_trip(request: TripRequest):
    global next_trip_id
    trip_id = next_trip_id
    next_trip_id += 1
    trips[trip_id] = {"id": trip_id, **request.model_dump(), "status": "created", "days": []}
    return trips[trip_id]


@app.post("/api/trips/{trip_id}/generate", dependencies=[Depends(require_dev_key)])
def generate_trip(trip_id: int):
    trip = trips.get(trip_id)
    if trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    try:
        result = generate_from_place(
            trip["destination"], trip["start_date"], trip["end_date"],
            trip["interests"], str(trip["budget"]),
        )
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    days = []
    activity_id = 1
    for generated_day in result.get("days", []):
        activities = [{
            "id": activity_id + index,
            "title": title,
            "category": "sightseeing",
            "location": result.get("destination", trip["destination"]),
            "description": title,
            "time_slot": "Daytime",
            "estimated_cost": 0,
            "is_weather_sensitive": True,
        } for index, title in enumerate(generated_day.get("activities", []))]
        activity_id += len(activities)
        days.append({"day_number": generated_day.get("day"), "date": generated_day.get("date"),
                     "weather": generated_day.get("weather"), "indoor_backup": generated_day.get("indoor_backup"),
                     "warnings": generated_day.get("warnings", []), "activities": activities})
    trip.update({"destination": result.get("destination", trip["destination"]), "days": days,
                 "total_days": len(days), "total_estimated_cost": 0, "status": "generated",
                 "weather_summary": result.get("weather_summary")})
    return {"id": trip_id, "status": "generated"}


@app.get("/api/trips/{trip_id}", dependencies=[Depends(require_dev_key)])
def get_trip(trip_id: int):
    trip = trips.get(trip_id)
    if trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@app.get("/api/trips/{trip_id}/itinerary", dependencies=[Depends(require_dev_key)])
def get_itinerary(trip_id: int):
    trip = trips.get(trip_id)
    if trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return {"id": trip_id, "destination": trip["destination"], "days": trip["days"]}
