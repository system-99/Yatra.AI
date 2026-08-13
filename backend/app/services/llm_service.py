import os
from google import genai
from dotenv import load_dotenv
from google.genai import types
from huggingface_hub import InferenceClient
import json
from weather_service import fetch_weather_details

##Loading .env file(containing API keys)
load_dotenv()

usr_input = input("Enter Your Request:")

client=genai.Client(
    api_key=os.getenv('GEMINI_API_KEY')
)


# hf_client = InferenceClient(
#     api_key=os.getenv('HUGGING_FACE_TOKEN')
# )

# response_hf = hf_client.chat.completions.create(
#     model='meta-llama/Llama-3.3-70B-Instruct',
#     messages=[
#         {
#             "role": "system",
#             "content": "Extract travel requirements and return structured information."
#         },
#         {
#             "role": "user",
#             "content": """
#             I have 4 days in Kolkata with my parents.
#             We love historical places and Bengali food.
#             We want to keep the trip cheap and avoid crowded places.
#             """
#         }
#     ],
#     max_tokens=300
# )


response = client.models.generate_content(
    model="gemini-3.6-flash",
    contents=usr_input,
    config=types.GenerateContentConfig(response_mime_type="application/json",
        response_schema={
            "type":"OBJECT",
            "properties":{
                "destination":{"type":"STRING"}
            },
            "required":["destination"]
        },
        thinking_config=types.ThinkingConfig(thinking_level="minimal"),
        max_output_tokens=4000

        )

)
data = json.loads(response.text)

results = data["destination"]
res = fetch_weather_details(results)
print(res)
