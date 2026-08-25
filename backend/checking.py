from app.services.generate import generate_from_place

trip = {
    "destination": "Eden Gardens",
    "start_date": "2026-08-26",
    "end_date": "2026-08-28",
    "interests": ["history", "food"],
    "budget": "medium",
}

itinerary = generate_from_place(
    place=trip["destination"],
    start_date=trip["start_date"],
    end_date=trip["end_date"],
    interests=trip["interests"],
    budget=trip["budget"],
)

print(itinerary)
