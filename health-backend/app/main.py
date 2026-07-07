"""
HealthCompanion Backend Main Application (Groq SDK Version)

Request/Response Flow:
1. Client sends a JSON POST request to /chat containing the user's message.
2. Server validates the input and forwards the prompt to the official Groq API endpoint.
3. Server parses the completion to determine severity levels and status icons.
4. Server returns a structured ChatResponse JSON back to the client.
"""

import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq

from app.config import GROQ_API_KEY, GROQ_MODEL, ALLOWED_ORIGIN
from app.models import ChatRequest, ChatResponse

# Configure structured logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("healthcompanion")

# Groq Model Configuration
# Check active models: https://console.groq.com/docs/models
# Check deprecations: https://console.groq.com/docs/deprecations
MODEL_NAME = GROQ_MODEL

app = FastAPI(
    title="HealthCompanion API",
    description="Educational AI-powered health triage companion backend",
    version="0.3.1"
)

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN] if ALLOWED_ORIGIN else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup validation checks for GROQ_API_KEY (Step 2)
if not GROQ_API_KEY:
    logger.warning("⚠️ WARNING: GROQ_API_KEY is not set or is empty in .env. Triage chat requests will fail.")
else:
    logger.info("✅ GROQ_API_KEY configuration detected. Key length: %d characters.", len(GROQ_API_KEY))

# Initialize Groq client with no base_url overrides (Steps 3 & 4)
client = None
if GROQ_API_KEY:
    try:
        client = Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        logger.error("❌ Failed to initialize Groq client: %s", str(e))

SYSTEM_PROMPT = (
    "You are HealthCompanion, an AI-powered educational health triage assistant.\n"
    "Your goal is to help users understand general health concerns and explore potential causes. "
    "Please follow these instructions strictly:\n"
    "1. Be empathetic, objective, and clear.\n"
    "2. If the user's description of their symptoms is too vague, ask clarifying questions to narrow down the situation.\n"
    "3. Provide possible general causes for the symptoms described, but frame them strictly as possibilities, not diagnoses.\n"
    "4. You MUST include the following disclaimer verbatim in your response: "
    "'I am an AI assistant, not a doctor. Please consult a healthcare professional for proper medical advice.'\n"
    "5. You MUST conclude your response with a dedicated severity classification line. The line must start exactly with "
    "'SEVERITY: ' followed by one of these three values: 'Self-care', 'Doctor', or 'Emergency'.\n"
    "Example of ending line: 'SEVERITY: Doctor'"
)

def parse_severity(reply: str) -> tuple[str, str]:
    """
    Parses the response from the LLM to identify the severity category.
    Returns a tuple of (severity_text, icon_emoji).
    """
    reply_upper = reply.upper()
    
    # Check for explicit severity tag patterns
    if "SEVERITY: EMERGENCY" in reply_upper or "SEVERITY:EMERGENCY" in reply_upper:
        return "Emergency", "🔴"
    elif "SEVERITY: DOCTOR" in reply_upper or "SEVERITY:DOCTOR" in reply_upper:
        return "Doctor", "🟡"
    elif "SEVERITY: SELF-CARE" in reply_upper or "SEVERITY:SELF-CARE" in reply_upper or "SEVERITY: SELF CARE" in reply_upper:
        return "Self-care", "🟢"
    
    # Fallback check for keywords anywhere in the message
    if "EMERGENCY" in reply_upper:
        return "Emergency", "🔴"
    elif "DOCTOR" in reply_upper or "PHYSICIAN" in reply_upper or "CLINICAL" in reply_upper:
        return "Doctor", "🟡"
        
    return "Self-care", "🟢"

@app.get("/")
def read_root():
    """Health check endpoint to verify backend is up and running."""
    return {"message": "HealthCompanion API is running!"}

@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """
    Handles triage chat messages, interacts with Groq Llama 3 model,
    parses the response for severity, and returns the response metadata.
    """
    # 1. Validate input content
    message_text = request.message.strip() if request.message else ""
    if not message_text:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty or whitespace-only."
        )
    
    if len(message_text) > 1000:
        raise HTTPException(
            status_code=400,
            detail="Message exceeds the maximum limit of 1000 characters."
        )

    # 2. Check client initialization
    if not GROQ_API_KEY or not client:
        raise HTTPException(
            status_code=500,
            detail="Groq client is not initialized. Please ensure a valid GROQ_API_KEY is set in your .env file."
        )
    
    # 3. Call Groq Completion
    try:
        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": message_text}
            ],
            temperature=0.5,
            max_tokens=1024,
        )
        
        reply_content = completion.choices[0].message.content
        severity, icon = parse_severity(reply_content)
        
        return ChatResponse(
            reply=reply_content,
            severity=severity,
            icon=icon
        )
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error calling Groq service: {error_msg}")
        
        # Default error values
        status_code = 500
        detail_msg = f"An error occurred while communicating with the AI service: {error_msg}"
        
        # 5. Classify the exception details for refined error presentation
        if "model_decommissioned" in error_msg.lower() or "decommissioned" in error_msg.lower():
            status_code = 400
            detail_msg = "The AI model is temporarily unavailable — please try again shortly."
        elif "401" in error_msg or "unauthorized" in error_msg.lower() or "api key" in error_msg.lower() or "authentication" in error_msg.lower():
            status_code = 401
            detail_msg = "Authentication/Configuration Error: The Groq API key is invalid, missing, or unauthorized. Please verify your local .env file key value."
        elif "429" in error_msg or "rate limit" in error_msg.lower():
            status_code = 429
            detail_msg = "Model Error (Rate Limit): The Groq API rate limit has been exceeded. Please retry your request in a moment."
        elif "connection" in error_msg.lower() or "unreachable" in error_msg.lower() or "timeout" in error_msg.lower() or "api.groq.com" in error_msg.lower():
            status_code = 502
            detail_msg = "Network Error: Unable to connect to the Groq server. Please check your internet connection."
        elif "model" in error_msg.lower() or "400" in error_msg or "bad request" in error_msg.lower():
            status_code = 400
            detail_msg = f"Model Configuration Error: The request payload or model identifier is invalid. Details: {error_msg}"
            
        raise HTTPException(
            status_code=status_code,
            detail=detail_msg
        )
