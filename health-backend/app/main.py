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

from app.config import GROQ_API_KEY, GROQ_MODEL, ALLOWED_ORIGIN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
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

@app.get("/debug/list-models")
def debug_list_models():
    if not client:
        return {"error": "Groq client is not initialized"}
    try:
        models = client.models.list()
        model_ids = [m.id for m in models.data]
        return {"models": model_ids}
    except Exception as err:
        return {"error": str(err)}

@app.get("/debug/vision-test")
def debug_vision_test(model: str = "meta-llama/llama-4-scout-17b-16e-instruct", url: str = None):
    if not client:
        return {"error": "Groq client is not initialized"}
    
    if not url:
        try:
            from PIL import Image as PILImage
            import io
            import base64
            img = PILImage.new('RGB', (10, 10), color='red')
            buffered = io.BytesIO()
            img.save(buffered, format="JPEG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            url = f"data:image/jpeg;base64,{img_str}"
        except Exception as e:
            # Fallback to a pre-computed valid 2x2 JPEG if PIL is not installed
            url = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAACAAIBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
    
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "What color is this image?"},
                {"type": "image_url", "image_url": {"url": url}}
            ]
        }
    ]
    
    result = {
        "model_requested": model,
        "is_base64": url.startswith("data:"),
        "payload_size_chars": len(url),
        "status": "pending",
        "raw_response": None,
        "error_details": None
    }
    
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.1,
            max_tokens=100
        )
        result["status"] = "success"
        result["raw_response"] = completion.choices[0].message.content
    except Exception as err:
        result["status"] = "failed"
        err_details = {
            "class": type(err).__name__,
            "message": str(err)
        }
        if hasattr(err, "status_code"):
            err_details["status_code"] = err.status_code
        if hasattr(err, "response"):
            try:
                err_details["response_text"] = err.response.text
            except:
                pass
        if hasattr(err, "body"):
            err_details["body"] = err.body
        result["error_details"] = err_details
        logger.error(f"DEBUG VISION TEST FAILED: {err_details}")
    return result

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

@app.get("/analytics/summary")
def get_analytics_summary():
    """
    Fetches anonymized, aggregated symptom log data and conversation counts from Supabase.
    No user identifiers or raw texts are returned.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("Supabase keys are not configured. Returning demo mock analytics data.")
        return {
            "is_mock": True,
            "total_conversations": "Over 25 conversations",
            "symptom_counts": [
                {"name": "Headache", "count": 12},
                {"name": "Fever", "count": 8},
                {"name": "Cough", "count": 6},
                {"name": "Sore Throat", "count": 5},
                {"name": "Fatigue", "count": 4}
            ],
            "severity_distribution": [
                {"severity": "Self-care", "count": 15, "percentage": 50},
                {"severity": "Doctor", "count": 10, "percentage": 33},
                {"severity": "Emergency", "count": 5, "percentage": 17}
            ]
        }

    try:
        # 1. Fetch conversations count
        conv_url = f"{SUPABASE_URL}/rest/v1/conversations?select=id"
        conv_req = urllib.request.Request(
            conv_url,
            headers={
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                "Prefer": "count=exact"
            }
        )
        total_conv = 0
        try:
            with urllib.request.urlopen(conv_req) as response:
                content_range = response.headers.get("Content-Range", "")
                if "/" in content_range:
                    total_conv = int(content_range.split("/")[-1])
        except Exception as e:
            logger.error(f"Error fetching conversation count from Supabase: {e}")

        # Round conversations count to nearest 5 for anonymity
        if total_conv < 5:
            approx_conv = "Fewer than 5 conversations"
        else:
            rounded = round(total_conv / 5) * 5
            approx_conv = f"Over {rounded} conversations"

        # 2. Fetch symptom logs from last 30 days
        from datetime import datetime, timedelta
        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
        
        logs_url = f"{SUPABASE_URL}/rest/v1/symptom_logs?select=severity,possible_causes,created_at&created_at=gte.{thirty_days_ago}"
        logs_req = urllib.request.Request(
            logs_url,
            headers={
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
            }
        )
        
        logs = []
        with urllib.request.urlopen(logs_req) as response:
            logs = json.loads(response.read().decode("utf-8"))

        # Process logs
        symptom_frequency = {}
        severity_counts = {"self-care": 0, "doctor": 0, "emergency": 0}
        total_valid_severities = 0

        for log in logs:
            # Parse severity
            sev = str(log.get("severity", "")).lower().strip()
            if sev in severity_counts:
                severity_counts[sev] += 1
                total_valid_severities += 1

            # Parse possible causes
            causes = log.get("possible_causes", [])
            if isinstance(causes, list):
                for cause in causes:
                    c_clean = str(cause).strip()
                    if c_clean:
                        symptom_frequency[c_clean] = symptom_frequency.get(c_clean, 0) + 1
            elif isinstance(causes, str):
                try:
                    causes_list = json.loads(causes)
                    if isinstance(causes_list, list):
                        for cause in causes_list:
                            c_clean = str(cause).strip()
                            if c_clean:
                                symptom_frequency[c_clean] = symptom_frequency.get(c_clean, 0) + 1
                except:
                    pass

        # Format symptoms count list, sorted descending, limit to top 8
        sorted_symptoms = sorted(symptom_frequency.items(), key=lambda x: x[1], reverse=True)
        symptom_counts_list = [{"name": name, "count": count} for name, count in sorted_symptoms[:8]]

        # Format severity distribution with percentages
        severity_dist = []
        for sev_key, display_name in [("self-care", "Self-care"), ("doctor", "Doctor"), ("emergency", "Emergency")]:
            count = severity_counts[sev_key]
            percentage = 0
            if total_valid_severities > 0:
                percentage = round((count / total_valid_severities) * 100)
            severity_dist.append({
                "severity": display_name,
                "count": count,
                "percentage": percentage
            })

        return {
            "is_mock": False,
            "total_conversations": approx_conv,
            "symptom_counts": symptom_counts_list,
            "severity_distribution": severity_dist
        }

    except Exception as e:
        logger.error(f"Error compiling analytics summary: {e}")
        return {
            "is_mock": True,
            "error": str(e),
            "total_conversations": "Over 10 conversations (Demo Mode)",
            "symptom_counts": [
                {"name": "Headache", "count": 5},
                {"name": "Cough", "count": 3},
                {"name": "Fever", "count": 2}
            ],
            "severity_distribution": [
                {"severity": "Self-care", "count": 6, "percentage": 60},
                {"severity": "Doctor", "count": 3, "percentage": 30},
                {"severity": "Emergency", "count": 1, "percentage": 10}
            ]
        }

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
        "5. Do not offer formal medical diagnosis. Frame causes strictly as possibilities.\n"
        "6. Once you have enough information (including from any previously analyzed image or details from earlier turns in the conversation) to reach a confident severity level, you MUST stop asking questions and return a final severity of 'self-care', 'doctor', or 'emergency' — do not loop indefinitely on clarifying questions."
    )

    try:
        model_to_use = MODEL_NAME
        
        if chat_payload.image:
            model_to_use = "meta-llama/llama-4-scout-17b-16e-instruct"
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
            # Log image size, MIME type, and structure checks (never output full base64 data)
            img_str = chat_payload.image
            img_len = len(img_str)
            mime_type = "unknown"
            if img_str.startswith("data:"):
                parts = img_str.split(";", 1)
                mime_type = parts[0].replace("data:", "")
            logger.info(f"IMAGE DIAGNOSIS: Size = {img_len} chars, MIME = {mime_type}")
            logger.info(f"Groq request includes 'image_url' with expected format: {img_str[:45]}...")

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
                # Log detailed API error response to diagnose preview-model access
                logger.error("--- RAW GROQ VISION ERROR DETAILS ---")
                logger.error(f"Error Message: {str(vision_err)}")
                if hasattr(vision_err, "status_code"):
                    logger.error(f"HTTP Status Code: {vision_err.status_code}")
                if hasattr(vision_err, "response"):
                    try:
                        logger.error(f"HTTP Response Text: {vision_err.response.text}")
                    except:
                        pass
                if hasattr(vision_err, "body"):
                    logger.error(f"HTTP Error Body: {vision_err.body}")
                logger.error("--------------------------------------")

                err_replies = {
                    "en": "We couldn't analyze this image right now. Please try again or describe your symptoms in text.",
                    "hi": "हम अभी इस छवि का विश्लेषण नहीं कर सके। कृपया पुनः प्रयास करें या पाठ में अपने लक्षणों का वर्णन करें।",
                    "gu": "અમે અત્યારે આ છબીનું વિશ્લેષણ કરી શક્યા નથી. કૃપા કરીને ફરીથી પ્રયાસ કરો અથવા ટેક્સ્ટમાં તમારા લક્ષણોનું વર્ણન કરો."
                }
                fallback_reply = err_replies.get(selected_lang.lower(), err_replies["en"])
                reply_content = json.dumps({
                    "reply": fallback_reply,
                    "possible_causes": [],
                    "severity": "unable to analyze",
                    "recommended_action": "Describe symptoms in text format or try uploading again.",
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
                "severity": "unable to analyze" if chat_payload.image else "self-care",
                "recommended_action": "Please monitor your symptoms closely.",
                "red_flags": []
            }

        # Normalize severity value
        severity_val = str(parsed_data.get("severity", "self-care")).lower().strip()

        # Safety cap: force severity to 'doctor' if we have had 2+ clarifying turns in this session already
        if severity_val == "clarifying":
            clarifying_count = 0
            if chat_payload.history:
                for h in chat_payload.history:
                    hist_content = str(h.get("content", "")).lower()
                    if "triage severity: clarifying" in hist_content or "severity: clarifying" in hist_content:
                        clarifying_count += 1
            
            if clarifying_count >= 2:
                logger.info(f"SAFETY CAP TRIGGERED: forcing 'doctor' severity after {clarifying_count} clarifying turns.")
                severity_val = "doctor"
                parsed_data["severity"] = "doctor"
                
                # Append fallback note to the reply
                fallback_notes = {
                    "en": "Based on the information provided, we recommend consulting a healthcare professional for a proper evaluation.",
                    "hi": "दी गई जानकारी के आधार पर, हम उचित मूल्यांकन के लिए एक स्वास्थ्य देखभाल पेशेवर से परामर्श करने की सलाह देते हैं।",
                    "gu": "આપેલી માહિતીના આધારે, અમે યોગ્ય મૂલ્યાંકન માટે આરોગ્યસંભાળ વ્યવસાયિકની સલાહ લેવાની ભલામણ કરીએ છીએ."
                }
                note = fallback_notes.get(selected_lang.lower(), fallback_notes["en"])
                original_reply = parsed_data.get("reply", "")
                parsed_data["reply"] = f"{original_reply}\n\n{note}"
                parsed_data["recommended_action"] = "Schedule a visit with a medical professional."

        if severity_val not in ["self-care", "doctor", "emergency", "clarifying", "unable to analyze", "error"]:
            severity_val = "unable to analyze" if chat_payload.image else "self-care"

        # Temporary server-side logging of parsed severity on every response
        logger.info(f"--- TRIAGE RESPONSE SEVERITY: {severity_val.upper()} ---")

        # Compute severity icon
        icon_map = {
            "self-care": "🟢",
            "doctor": "🟡",
            "emergency": "🔴",
            "clarifying": "⚪",
            "unable to analyze": "⚪",
            "error": "⚪"
        }
        icon_val = icon_map[severity_val]

        # Normalize severity casing for display
        severity_display_map = {
            "self-care": "Self-care",
            "doctor": "Doctor",
            "emergency": "Emergency",
            "clarifying": "Clarifying",
            "unable to analyze": "Unable to analyze",
            "error": "Error"
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
