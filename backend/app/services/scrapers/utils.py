
from typing import Dict

BUSINESS_KEYWORDS = [
    "business", "tech", "workshop", "seminar", "networking", "conference", 
    "startup", "exhibition", "trade", "summit", "entrepreneur", "investor", 
    "corporate", "training", "leadership", "marketing", "sales", "finance",
    "technology", "software", "development", "ai", "artificial intelligence",
    "management", "career", "professional", "mentoring", "hiring", "recruitment",
    "b2b", "industry", "expo", "conclave", "innovation", "digital", "data",
    "analytics", "strategy", "investment", "founding", "entrepreneurship"
]

NON_BUSINESS_KEYWORDS = [
    "music", "magic", "concert", "dj", "party", "dance", "stand-up", 
    "comedy", "singing", "spiritual", "yoga", "meditation", "movie",
    "film", "theatre", "drama", "painting", "art class", "clubbing",
    "nightlife", "pub", "bar", "cricket", "football", "sports", "kids",
    "fest", "festival", "carnival", "mela", "celebration", "wedding",
    "tribute", "night", "marathon", "trek", "trip", "adventure", "valentine",
    "new year", "poetry", "open mic", "dating", "speed-dating", "shopping"
]

def is_business_event(event: Dict) -> bool:
    title = event.get("title", "").lower()
    description = event.get("description", "").lower()
    combined = title + " " + description
    
    # 1. Check for non-business keywords first (Hard exclusions)
    if any(k in title for k in NON_BUSINESS_KEYWORDS):
        return False
        
    # 2. Check for business keywords
    if any(k in combined for k in BUSINESS_KEYWORDS):
        return True
    
    # 3. Default to False if no keywords found
    return False
