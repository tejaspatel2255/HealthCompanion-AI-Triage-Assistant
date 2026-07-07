from pydantic import BaseModel
from typing import Optional, List, Dict

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None
    vitals: Optional[Dict[str, str]] = None

class ChatResponse(BaseModel):
    reply: str
    severity: Optional[str] = None
    icon: Optional[str] = None
