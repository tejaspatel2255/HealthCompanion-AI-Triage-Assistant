import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Accept both GROQ_API_KEY and OPENROUTER_API_KEY for maximum flexibility
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY") or os.getenv("GROQ_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3-8b-instruct:free")
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "*")

# Validation warning if key is missing
if not OPENROUTER_API_KEY:
    print("Warning: Neither OPENROUTER_API_KEY nor GROQ_API_KEY is set in environment or .env file.")
