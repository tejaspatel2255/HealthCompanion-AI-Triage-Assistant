from pydantic import BaseModel
from typing import Optional, List, Dict

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None
    vitals: Optional[Dict[str, str]] = None
    language: Optional[str] = "en"
    image: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    possible_causes: Optional[List[str]] = None
    severity: str
    recommended_action: Optional[str] = None
    red_flags: Optional[List[str]] = None
    icon: Optional[str] = None
