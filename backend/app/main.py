from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.services.maps import calculate_route, geocode_place


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


@app.get("/health")
def health():
    return {"status": "ok"}


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
