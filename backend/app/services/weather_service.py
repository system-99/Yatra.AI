# import requests
# from dotenv import load_dotenv
# import os 

# load_dotenv()

# weather_api_key = os.getenv("WEATHER_API_KEY")

# # usr = input("Enter promt:")

# def fetch_weather_details(place):
#     if not weather_api_key:
#         raise RuntimeError("Missing API key")

#     url = "https://api.openweathermap.org/data/2.5/weather"
#     params={
#         "q":place,
#         "appid":weather_api_key,
#         "units":"metric"
#     }

#     response=requests.get(url,params=params)
#     data = response.json()

#     # weather_data = {
#     #     "Name":data['name'],
#     #     "Country":data['sys']['country'],
#     #     "Rain":data['rain'],
#     #     "Weather":data['weather'][0]['description'],
#     #     "Temperature":data['main']['temp'],
#     #     "Minimum Temperature":data['main']['temp_min'],
#     #     "Maximum Temperature":data['main']['temp_max'],
#     #     "Feels Like":data['main']['feels_like']
#     # }
#     return data

# # print(fetch_weather_details(usr))



"""Weather lookup used after the LLM extracts a destination."""

from dotenv import load_dotenv
import os
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen
import json
from urllib.error import HTTPError, URLError
from datetime import datetime

BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")


def fetch_weather_details(place: str) -> dict:
    """Fetch current weather for a city, landmark, or other place name.

    OpenWeather's weather endpoint is city-oriented, so geocode first and
    then request weather by coordinates. This allows inputs such as
    ``Victoria Memorial`` to resolve to the landmark in Kolkata.
    """
    place = (place or "").strip()
    if not place:
        raise ValueError("A destination is required for the weather lookup")

    api_key = os.getenv("WEATHER_API_KEY")
    if not api_key:
        raise RuntimeError("Missing WEATHER_API_KEY in the backend .env file")

    try:
        geo_query = urlencode({"q": place, "limit": 1, "appid": api_key})
        with urlopen(
            f"https://api.openweathermap.org/geo/1.0/direct?{geo_query}", timeout=15
        ) as result:
            locations = json.load(result)
        if not locations:
            raise ValueError(f"Could not find a location named '{place}'")

        location = locations[0]
        weather_query = urlencode(
            {
                "lat": location["lat"],
                "lon": location["lon"],
                "appid": api_key,
                "units": "metric",
            }
        )
        with urlopen(
            f"https://api.openweathermap.org/data/2.5/weather?{weather_query}", timeout=15
        ) as result:
            response = json.load(result)
    except HTTPError as exc:
        if exc.code == 401:
            raise RuntimeError("OpenWeather rejected WEATHER_API_KEY") from exc
        raise RuntimeError(f"Weather service request failed (HTTP {exc.code})") from exc
    except URLError as exc:
        raise RuntimeError("Could not connect to the weather service") from exc
    return {
        "place": place,
        "city": response.get("name") or location.get("name"),
        "country": response.get("sys", {}).get("country") or location.get("country"),
        "latitude": location.get("lat"),
        "longitude": location.get("lon"),
        "temperature_c": response.get("main", {}).get("temp"),
        "feels_like_c": response.get("main", {}).get("feels_like"),
        "humidity_percent": response.get("main", {}).get("humidity"),
        "description": (response.get("weather") or [{}])[0].get("description"),
        "wind_speed_mps": response.get("wind", {}).get("speed"),
    }


def fetch_weather_forecast(place: str, days: int = 5, lat: float | None = None, lon: float | None = None) -> dict:
    """Return daily forecast data suitable for weather-aware itinerary generation.

    If *lat* and *lon* are provided the OpenWeather geo-lookup is skipped,
    which avoids failures for state / region names that the geocoder rejects.
    """
    if lat is not None and lon is not None:
        location = {
            "place": place,
            "city": place,
            "country": "",
            "latitude": lat,
            "longitude": lon,
            "temperature_c": None,
            "feels_like_c": None,
            "humidity_percent": None,
            "description": None,
            "wind_speed_mps": None,
        }
    else:
        location = fetch_weather_details(place)
    query = urlencode({
        "lat": location["latitude"],
        "lon": location["longitude"],
        "appid": os.getenv("WEATHER_API_KEY"),
        "units": "metric",
    })
    try:
        with urlopen(
            f"https://api.openweathermap.org/data/2.5/forecast?{query}", timeout=15
        ) as result:
            data = json.load(result)
    except HTTPError as exc:
        raise RuntimeError(f"Forecast request failed (HTTP {exc.code})") from exc
    except URLError as exc:
        raise RuntimeError("Could not connect to the forecast service") from exc

    grouped: dict[str, list[dict]] = {}
    for item in data.get("list", []):
        date = item.get("dt_txt", "").split(" ")[0]
        if date:
            grouped.setdefault(date, []).append(item)

    daily = []
    for date, entries in list(grouped.items())[: max(1, min(days, 5))]:
        temperatures = [e.get("main", {}).get("temp") for e in entries if e.get("main", {}).get("temp") is not None]
        rain_probability = max((e.get("pop", 0) or 0) for e in entries) * 100
        descriptions = [
            (e.get("weather") or [{}])[0].get("description")
            for e in entries
            if (e.get("weather") or [{}])[0].get("description")
        ]
        daily.append({
            "date": date,
            "min_temperature_c": min(temperatures) if temperatures else None,
            "max_temperature_c": max(temperatures) if temperatures else None,
            "rain_probability_percent": round(rain_probability),
            "description": max(set(descriptions), key=descriptions.count) if descriptions else "unknown",
        })
    return {"location": location, "daily_forecast": daily}
