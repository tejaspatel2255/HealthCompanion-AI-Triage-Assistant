import os
from dotenv import load_dotenv

# Load environment variables from .env file BEFORE reading variables
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant").strip()
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "*")
