"""
HealthCompanion Backend Main Application (Groq SDK Version with JSON Mode, Rate Limiter & Multilingual Proxy)

Request/Response Flow:
1. Rate limit check is executed by slowapi. If exceeded, returns a customized 429 JSON response.
2. Client sends user message, history, optional vitals, and language ("en", "hi", "gu").
3. Server submits messages to Groq using a dynamic language-driven system prompt in JSON Mode.
4. Server parses the JSON content and maps details to ChatResponse, calculating severities and icons.
5. Endpoint GET /nearby-hospitals acts as a CORS-safe proxy to find local facilities around coordinates.
"""

import json
import logging
import urllib.request
import urllib.parse
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
    version="0.6.0"
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

@app.get("/")
def read_root():
    """Health check endpoint to verify backend is up and running."""
    return {"message": "HealthCompanion API is running!"}

@app.get("/nearby-hospitals")
def get_nearby_hospitals(lat: float, lon: float):
    """
    Acts as a server-side proxy to query OpenStreetMap's Overpass API
    for hospitals and clinics near the user's coordinates.
    """
    overpass_url = "https://overpass-api.de/api/interpreter"
    query = f"""
    [out:json][timeout:15];
    (
      node["amenity"="hospital"](around:5000,{lat},{lon});
      way["amenity"="hospital"](around:5000,{lat},{lon});
      node["amenity"="clinic"](around:5000,{lat},{lon});
      way["amenity"="clinic"](around:5000,{lat},{lon});
    );
    out center;
    """
    try:
        data = urllib.parse.urlencode({"data": query}).encode("utf-8")
        req = urllib.request.Request(overpass_url, data=data, headers={
            "User-Agent": "HealthCompanionApp/1.0 (contact@healthcompanion.org)"
        })
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))
            
        elements = result.get("elements", [])
        hospitals = []
        for el in elements:
            item_lat = el.get("lat")
            item_lon = el.get("lon")
            if not item_lat and "center" in el:
                item_lat = el["center"].get("lat")
                item_lon = el["center"].get("lon")
                
            tags = el.get("tags", {})
            name = tags.get("name", "Medical Facility")
            addr_street = tags.get("addr:street", "")
            addr_city = tags.get("addr:city", "")
            address = f"{addr_street}, {addr_city}".strip(", ")
            if not address:
                address = "Address not available"
                
            hospitals.append({
                "name": name,
                "lat": item_lat,
                "lon": item_lon,
                "address": address,
                "type": tags.get("amenity", "hospital").capitalize()
            })
            
        return {"hospitals": hospitals[:10]}
        
    except Exception as e:
        logger.error(f"Error querying Overpass API: {str(e)}")
        return {"hospitals": [], "error": str(e)}

@app.post("/chat", response_model=ChatResponse)
@limiter.limit("15/minute")
def chat(chat_payload: ChatRequest, request: Request):
    """
    Handles triage chat messages, interacts with Groq model using JSON mode,
    parses the structured response, and enforces client rate limits.
    """
    # 1. Validate input content
    # 1. Validate input content
    message_text = chat_payload.message.strip() if chat_payload.message else ""
    if not message_text and not chat_payload.image:
        raise HTTPException(
            status_code=400,
            detail="Message or image must be provided."
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
    
    # 3. Call Groq Completion with JSON mode enabled and dynamic language selection
    selected_lang = chat_payload.language if chat_payload.language else "en"
    lang_map = {
        "en": "English",
        "hi": "Hindi",
        "gu": "Gujarati"
    }
    target_language = lang_map.get(selected_lang.lower(), "English")

    dynamic_system_prompt = (
        f"You are HealthCompanion, an AI-powered educational health triage assistant.\n"
        f"Your goal is to help users understand general health concerns and explore potential causes. "
        f"You MUST respond ONLY with a single valid JSON object in the {target_language} language. "
        f"Do not wrap it in markdown block quotes or include leading/trailing text. "
        f"The JSON object must match this schema:\n"
        "{\n"
        "  \"reply\": \"<conversational text shown to the user in the target language, including empathy, general observations, and clarifying questions if you need more details>\",\n"
        "  \"possible_causes\": [\"<possible educational cause 1 in the target language>\", \"<possible educational cause 2 in the target language>\", ...],\n"
        "  \"severity\": \"self-care\" | \"doctor\" | \"emergency\" | \"clarifying\",\n"
        "  \"recommended_action\": \"<one short, clear educational next-step sentence in the target language>\",\n"
        "  \"red_flags\": [\"<concerning red-flag symptoms in the target language user should watch for or seek urgent care for>\"]\n"
        "}\n\n"
        "Rules:\n"
        "1. Under severity, use \"clarifying\" if the user's description is too vague to safely triage and you are asking clarifying questions.\n"
        "2. If you have enough detail, use \"self-care\", \"doctor\", or \"emergency\".\n"
        "3. CRITICAL: The \"severity\" field value must remain strictly in English (i.e., exact string 'self-care', 'doctor', 'emergency', or 'clarifying') regardless of the target language, so that parsing doesn't break.\n"
        "4. You MUST include this disclaimer verbatim in your \"reply\" content:\n"
        "   - If target language is English: 'I am an AI assistant, not a doctor. Please consult a healthcare professional for proper medical advice.'\n"
        "   - If target language is Hindi: 'मैं एक एआई सहायक हूँ, डॉक्टर नहीं। उचित चिकित्सा सलाह के लिए कृपया किसी स्वास्थ्य देखभाल पेशेवर से परामर्श लें।'\n"
        "   - If target language is Gujarati: 'હું એઆઈ મદદનીશ છું, ડૉક્ટર નથી. કૃપા કરીને યોગ્ય તબીબી સલાહ માટે આરોગ્યસંભાળ વ્યવસાયિકની સલાહ લો.'\n"
        "5. Do not offer formal medical diagnosis. Frame causes strictly as possibilities."
    )

    try:
        model_to_use = MODEL_NAME
        
        if chat_payload.image:
            model_to_use = "qwen/qwen3.6-27b"
            image_system_prompt = (
                dynamic_system_prompt + "\n\n"
                "CRITICAL ADDITIONAL IMAGE RULES:\n"
                "1. You are analyzing an image uploaded by the patient (e.g. skin rash, cut, swelling).\n"
                "2. State only general visual observations (e.g., 'redness', 'raised bump', 'swelling present').\n"
                "3. NEVER make or claim to make a diagnostic conclusion from the image. Tell the user what visual features are present educationally.\n"
                "4. Warn the user that photos cannot replace an in-person clinical assessment.\n"
                "5. For English, your reply must end with: 'Image analysis is for general guidance only — not a medical diagnosis. A rash or injury photo cannot replace an in-person examination.'\n"
                "6. For Hindi, your reply must end with: 'छवि विश्लेषण केवल सामान्य मार्गदर्शन के लिए है - कोई चिकित्सा निदान नहीं है। दाने या चोट की तस्वीर इन-पर्सन परीक्षा की जगह नहीं ले सकती।'\n"
                "7. For Gujarati, your reply must end with: 'છબી વિશ્લેષણ ફક્ત સામાન્ય માર્ગદર્શન માટે છે - કોઈ તબીબી નિદાન નથી. ફોટો અથવા ઇજાનો ફોટો રૂબરૂ તપાસનું સ્થાન લઈ શકતો નથી.'"
            )
            messages = [{"role": "system", "content": image_system_prompt}]
        else:
            messages = [{"role": "system", "content": dynamic_system_prompt}]
        
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
                
        if chat_payload.image:
            user_content = []
            if current_content:
                user_content.append({"type": "text", "text": current_content})
            else:
                user_content.append({"type": "text", "text": "Please analyze this symptom image."})
            
            user_content.append({
                "type": "image_url",
                "image_url": {
                    "url": chat_payload.image
                }
            })
            messages.append({"role": "user", "content": user_content})
        else:
            messages.append({"role": "user", "content": current_content})

        try:
            completion = client.chat.completions.create(
                model=model_to_use,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.5,
                max_tokens=1024,
            )
            reply_content = completion.choices[0].message.content
        except Exception as vision_err:
            if chat_payload.image:
                logger.error(f"Vision model qwen/qwen3.6-27b failed: {vision_err}")
                err_replies = {
                    "en": "Image analysis is temporarily unavailable. Please describe your symptoms in text instead.",
                    "hi": "छवि विश्लेषण अस्थायी रूप से अनुपलब्ध है। कृपया इसके बजाय पाठ में अपने लक्षणों का वर्णन करें।",
                    "gu": "છબી વિશ્લેષણ અસ્થાયી રૂપે અપ્રાપ્ય છે. કૃપા કરીને તેના બદલે ટેક્સ્ટમાં તમારા લક્ષણોનું વર્ણન કરો."
                }
                fallback_reply = err_replies.get(selected_lang.lower(), err_replies["en"])
                reply_content = json.dumps({
                    "reply": fallback_reply,
                    "possible_causes": [],
                    "severity": "self-care",
                    "recommended_action": "Describe symptoms in text format.",
                    "red_flags": []
                })
            else:
                raise vision_err
        
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
