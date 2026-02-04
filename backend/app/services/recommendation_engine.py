import math
import re
from collections import Counter

def tokenize(text):
    """
    Simple tokenizer: lowercase, remove punctuation, split by whitespace.
    """
    if not text:
        return []
    text = text.lower()
    # Remove non-alphanumeric characters (keep spaces)
    text = re.sub(r'[^a-z0-9\s]', '', text)
    tokens = text.split()
    # Optional: Remove common stop words
    stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
    return [t for t in tokens if t not in stop_words]

def get_cosine_similarity(text1, text2):
    """
    Computes cosine similarity between two texts using word frequency vectors.
    Range: [0.0, 1.0]
    """
    tokens1 = tokenize(text1)
    tokens2 = tokenize(text2)

    vec1 = Counter(tokens1)
    vec2 = Counter(tokens2)

    intersection = set(vec1.keys()) & set(vec2.keys())
    
    # Dot product
    numerator = sum([vec1[x] * vec2[x] for x in intersection])

    # Magnitude
    sum1 = sum([vec1[x]**2 for x in vec1.keys()])
    sum2 = sum([vec2[x]**2 for x in vec2.keys()])
    
    denominator = math.sqrt(sum1) * math.sqrt(sum2)

    if not denominator:
        return 0.0
    else:
        return float(numerator) / denominator

def recommend_events_nlp(past_events, upcoming_events, threshold=0.1, limit=3):
    """
    Recommends events from upcoming_events that are similar to past_events.
    
    past_events: List of dicts/objects with 'title' and 'description'
    upcoming_events: List of dicts/objects with 'title' and 'description'
    
    Returns: List of (event, score) tuples recommended.
    """
    
    # 1. Build a combined profile text from past events
    # We weight the title more heavily (e.g. repeat it 3 times)
    user_profile_text = ""
    for event in past_events:
        title = event.title or ""
        desc = event.description or ""
        venue = event.venue_name or ""
        category = event.category or ""
        organizer = event.organizer_name or ""
        # Weight title and category more
        user_profile_text += (title + " ") * 3 + (category + " ") * 2 + desc + " " + venue + " " + organizer + " "
        
    if not user_profile_text.strip():
        return []

    recommendations = []
    
    for event in upcoming_events:
        title = event.title or ""
        desc = event.description or ""
        venue = event.venue_name or ""
        category = event.category or ""
        organizer = event.organizer_name or ""
        
        event_text = (title + " ") * 3 + (category + " ") * 2 + desc + " " + venue + " " + organizer
        
        score = get_cosine_similarity(user_profile_text, event_text)
        
        if score >= threshold:
            recommendations.append((event, score))
            
    # Sort by score descending
    recommendations.sort(key=lambda x: x[1], reverse=True)
    
    return recommendations[:limit]
