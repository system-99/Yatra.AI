import requests
from dotenv import load_dotenv
import os 

load_dotenv()

weather_api_key = os.getenv("WEATHER_API_KEY")

# usr = input("Enter promt:")

def fetch_weather_details(place):
    if not weather_api_key:
        raise RuntimeError("Missing API key")

    url = "https://api.openweathermap.org/data/2.5/weather"
    params={
        "q":place,
        "appid":weather_api_key,
        "units":"metric"
    }

    response=requests.get(url,params=params)
    data = response.json()

    # weather_data = {
    #     "Name":data['name'],
    #     "Country":data['sys']['country'],
    #     "Rain":data['rain'],
    #     "Weather":data['weather'][0]['description'],
    #     "Temperature":data['main']['temp'],
    #     "Minimum Temperature":data['main']['temp_min'],
    #     "Maximum Temperature":data['main']['temp_max'],
    #     "Feels Like":data['main']['feels_like']
    # }
    return data

# print(fetch_weather_details(usr))