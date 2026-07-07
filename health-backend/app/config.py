import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "*")

# Validation warning if key is missing
if not GROQ_API_KEY:
    print("Warning: GROQ_API_KEY is not set in environment or .env file.")
