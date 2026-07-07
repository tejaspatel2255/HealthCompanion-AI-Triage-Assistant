"""
HealthCompanion Backend Main Application (Groq SDK Version with JSON Mode & Rate Limiter)

Request/Response Flow:
1. Rate limit check is executed by slowapi. If exceeded, returns a customized 429 JSON response.
2. Client sends user message, history, and optional vitals.
3. Server submits messages to Groq with response_format={"type": "json_object"} to guarantee JSON output.
4. Server parses the JSON content and maps details to ChatResponse, calculating severities and icons.
"""

import json
import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from groq import Groq
from typing import Optional, List, Dict

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import GROQ_API_KEY, GROQ_MODEL, ALLOWED_ORIGIN
from app.models import ChatRequest, ChatResponse

# Configure structured logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("healthcompanion")

MODEL_NAME = GROQ_MODEL

# Instantiate Rate Limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="HealthCompanion API",
    description="Educational AI-powered health triage companion backend",
    version="0.5.0"
)
app.state.limiter = limiter

# Rate limit custom error handler (429 Status)
@app.exception_handler(RateLimitExceeded)
def rate_limit_custom_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "You're sending messages too quickly — please wait a moment."}
    )

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN] if ALLOWED_ORIGIN else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup validation checks for GROQ_API_KEY
if not GROQ_API_KEY:
    logger.warning("⚠️ WARNING: GROQ_API_KEY is not set or is empty in .env. Triage chat requests will fail.")
else:
    logger.info("✅ GROQ_API_KEY configuration detected. Key length: %d characters.", len(GROQ_API_KEY))

# Initialize Groq client
client = None
if GROQ_API_KEY:
    try:
        client = Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        logger.error("❌ Failed to initialize Groq client: %s", str(e))

SYSTEM_PROMPT = (
    "You are HealthCompanion, an AI-powered educational health triage assistant.\n"
    "Your goal is to help users understand general health concerns and explore potential causes. "
    "You MUST respond ONLY with a single valid JSON object. Do not wrap it in markdown block quotes or include leading/trailing text. "
    "The JSON object must match this schema:\n"
    "{\n"
    "  \"reply\": \"<conversational text shown to the user, including empathy, general observations, and clarifying questions if you need more details>\",\n"
    "  \"possible_causes\": [\"<possible educational cause 1>\", \"<possible educational cause 2>\", ...],\n"
    "  \"severity\": \"self-care\" | \"doctor\" | \"emergency\" | \"clarifying\",\n"
    "  \"recommended_action\": \"<one short, clear educational next-step sentence>\",\n"
    "  \"red_flags\": [\"<concerning red-flag symptoms the user should watch for or seek urgent care for>\"]\n"
    "}\n\n"
    "Rules:\n"
    "1. Use \"clarifying\" as the severity value if the user's description is too vague to safely triage and you are asking clarifying questions.\n"
    "2. If you have enough detail, use \"self-care\", \"doctor\", or \"emergency\".\n"
    "3. You MUST include this disclaimer verbatim in your \"reply\" content: "
    "'I am an AI assistant, not a doctor. Please consult a healthcare professional for proper medical advice.'\n"
    "4. Do not offer formal medical diagnosis. Frame causes strictly as possibilities."
)

@app.get("/")
def read_root():
    """Health check endpoint to verify backend is up and running."""
    return {"message": "HealthCompanion API is running!"}

@app.post("/chat", response_model=ChatResponse)
@limiter.limit("15/minute")
def chat(chat_payload: ChatRequest, request: Request):
    """
    Handles triage chat messages, interacts with Groq model using JSON mode,
    parses the structured response, and enforces client rate limits.
    """
    # 1. Validate input content
    message_text = chat_payload.message.strip() if chat_payload.message else ""
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
    
    # 3. Call Groq Completion with JSON mode enabled
    try:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        
        if chat_payload.history:
            for msg in chat_payload.history:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role in ["user", "assistant"] and content:
                    messages.append({"role": role, "content": content})
                    
        current_content = message_text
        if chat_payload.vitals:
            vitals_info = []
            temp = chat_payload.vitals.get("temperature")
            bp = chat_payload.vitals.get("bloodPressure")
            pulse = chat_payload.vitals.get("pulse")
            if temp:
                vitals_info.append(f"Temperature: {temp}°F")
            if bp:
                vitals_info.append(f"Blood Pressure: {bp}")
            if pulse:
                vitals_info.append(f"Pulse: {pulse} bpm")
                
            if vitals_info:
                current_content = f"Reported vitals: {', '.join(vitals_info)}.\nUser symptoms: {message_text}"
                
        messages.append({"role": "user", "content": current_content})

        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.5,
            max_tokens=1024,
        )
        
        reply_content = completion.choices[0].message.content
        
        # 4. Safe JSON parsing fallback block
        try:
            parsed_data = json.loads(reply_content)
        except Exception as json_err:
            logger.warning(f"Failed to parse JSON reply from Groq model: {json_err}. Raw reply: {reply_content}")
            parsed_data = {
                "reply": reply_content,
                "possible_causes": [],
                "severity": "self-care",
                "recommended_action": "Please monitor your symptoms closely.",
                "red_flags": []
            }

        # Normalize severity value
        severity_val = str(parsed_data.get("severity", "self-care")).lower().strip()
        if severity_val not in ["self-care", "doctor", "emergency", "clarifying"]:
            severity_val = "self-care"

        # Compute severity icon
        icon_map = {
            "self-care": "🟢",
            "doctor": "🟡",
            "emergency": "🔴",
            "clarifying": "⚪"
        }
        icon_val = icon_map[severity_val]

        # Normalize severity casing for display
        severity_display_map = {
            "self-care": "Self-care",
            "doctor": "Doctor",
            "emergency": "Emergency",
            "clarifying": "Clarifying"
        }
        severity_display = severity_display_map[severity_val]

        return ChatResponse(
            reply=parsed_data.get("reply", ""),
            possible_causes=parsed_data.get("possible_causes", []),
            severity=severity_display,
            recommended_action=parsed_data.get("recommended_action", ""),
            red_flags=parsed_data.get("red_flags", []),
            icon=icon_val
        )
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error calling Groq service: {error_msg}")
        
        # Default error values
        status_code = 500
        detail_msg = f"An error occurred while communicating with the AI service: {error_msg}"
        
        # Classify the exception details for refined error presentation
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
