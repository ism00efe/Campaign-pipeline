import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    WIRO_API_KEY: str = os.getenv("WIRO_API_KEY", "")
    WIRO_BASE_URL: str = "https://api.wiro.ai/v1" # Dökümandan bu linki teyit et

settings = Settings()