import uuid
from app.database import (
    db_create_trip,
    db_get_trip,
    db_update_trip,
    db_delete_trip,
    db_list_user_trips,
    db_create_user,
    db_get_user_by_email,
)


def test_database_trip_crud():
    test_email = f"trip_user_{uuid.uuid4().hex[:8]}@example.com"
    user = db_create_user("Trip Owner", test_email, "pass123")
    user_id = user["id"]
    
    # Create trip with dict payload
    trip_payload = {
        "destination": "Kyoto",
        "start_date": "2026-10-01",
        "end_date": "2026-10-05",
        "budget": 1500.0,
        "interests": ["temples", "food"],
        "pace": "relaxed",
    }
    trip = db_create_trip(user_id, trip_payload)
    assert trip["destination"] == "Kyoto"
    assert trip["user_id"] == user_id
    trip_id = trip["id"]

    # Get trip
    fetched = db_get_trip(trip_id)
    assert fetched is not None
    assert fetched["id"] == trip_id

    # Update trip
    updated = db_update_trip(trip_id, {"status": "generated"})
    assert updated is not None
    assert updated["status"] == "generated"

    # List trips
    trips = db_list_user_trips(user_id)
    assert len(trips) >= 1
    assert any(t["id"] == trip_id for t in trips)

    # Delete trip
    deleted = db_delete_trip(trip_id)
    assert deleted is True
    assert db_get_trip(trip_id) is None


def test_database_user_operations():
    test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    user = db_create_user("Test User", test_email, "hash123")
    assert user["name"] == "Test User"
    assert user["email"] == test_email

    fetched = db_get_user_by_email(test_email)
    assert fetched is not None
    assert fetched["id"] == user["id"]
