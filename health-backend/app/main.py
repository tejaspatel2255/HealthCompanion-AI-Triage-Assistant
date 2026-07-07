"""
HealthCompanion Backend Main Application

Request/Response Flow:
1. Client sends a JSON POST request to /chat containing the user's message (ChatRequest).
2. The server wraps the message with a system prompt specifying HealthCompanion's educational role,
   necessary guidelines, disclaimer, and severity requirements.
3. The server forwards the conversation to the Groq API (using Llama 3).
4. The server receives the completion, extracts the reply, and parses it to determine severity level
   (Emergency, Doctor, or Self-care).
5. The severity level is mapped to a corresponding status indicator icon (🔴, 🟡, 🟢).
6. The server returns a structured ChatResponse JSON back to the client.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq

from app.config import GROQ_API_KEY, ALLOWED_ORIGIN
from app.models import ChatRequest, ChatResponse

app = FastAPI(
    title="HealthCompanion API",
    description="Educational AI-powered health triage companion backend",
    version="0.2.0"
)

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN] if ALLOWED_ORIGIN else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

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
    
    # 1. Check for explicit severity tag patterns
    if "SEVERITY: EMERGENCY" in reply_upper or "SEVERITY:EMERGENCY" in reply_upper:
        return "Emergency", "🔴"
    elif "SEVERITY: DOCTOR" in reply_upper or "SEVERITY:DOCTOR" in reply_upper:
        return "Doctor", "🟡"
    elif "SEVERITY: SELF-CARE" in reply_upper or "SEVERITY:SELF-CARE" in reply_upper or "SEVERITY: SELF CARE" in reply_upper:
        return "Self-care", "🟢"
    
    # 2. Fallback check for keywords anywhere in the message
    if "EMERGENCY" in reply_upper:
        return "Emergency", "🔴"
    elif "DOCTOR" in reply_upper or "PHYSICIAN" in reply_upper or "CLINICAL" in reply_upper:
        return "Doctor", "🟡"
        
    # Default fallback
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
    # Validate input content
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

    if not GROQ_API_KEY or not client:
        raise HTTPException(
            status_code=500,
            detail="Groq client is not initialized. Please set the GROQ_API_KEY environment variable."
        )
    
    try:
        completion = client.chat.completions.create(
            model="llama3-8b-8192",
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
        print(f"Error communicating with Groq API: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while communicating with the AI service: {str(e)}"
        )
