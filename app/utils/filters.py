from sqlalchemy.orm import Session
from sqlalchemy import and_
import re
from typing import List
from datetime import datetime, timedelta
from models import DisasterRequest
from schemas import DisasterRequestCreate


SPAM_KEYWORDS = [
    "test", "testing", "fake", "dummy", "sample",
    "spam", "advertisement", "promotion", "offer",
    "click here", "buy now", "free money", "lottery",
    "congratulations", "winner", "prize"
]

SUSPICIOUS_PATTERNS = [
    r"(.)\1{5,}",  # Repeated characters (e.g., "aaaaaa")
    r"[0-9]{10,}",  # Long sequences of numbers
    r"[A-Z]{10,}",  # Long sequences of capital letters
    r"www\.[a-z]+\.[a-z]+",  # URLs
    r"http[s]?://",  # HTTP links
    r"[a-z]+(\.[a-z]+){2,}",  # Multiple domain-like patterns
]

def is_spam_request(request_data: DisasterRequestCreate) -> bool:
    """
    Check if a disaster relief request appears to be spam
    Args:
        request_data: The request data to check
    Returns:
        True if the request appears to be spam, False otherwise
    """
    # Combine all text fields for analysis
    text_content = " ".join([
        request_data.title.lower(),
        request_data.description.lower(),
        request_data.contact_name.lower(),
        request_data.address.lower(),
        request_data.additional_notes.lower() if request_data.additional_notes else ""
    ])

    spam_keyword_count = sum(1 for keyword in SPAM_KEYWORDS if keyword in text_content)
    if spam_keyword_count >= 3:
        return True

    for pattern in SUSPICIOUS_PATTERNS:
        if re.search(pattern, text_content):
            return True
    
    if request_data.people_affected > 1000:
        return True
    
    title_words = set(request_data.title.lower().split())
    desc_words = set(request_data.description.lower().split())
    if len(title_words.intersection(desc_words)) > len(title_words) * 0.8:
        return True

    if len(request_data.description) < 20 or len(request_data.description) > 5000:
        return True

    phone_digits = re.sub(r'[^0-9]', '', request_data.contact_phone)
    if len(phone_digits) < 10 or len(phone_digits) > 15:
        return True

    if len(set(phone_digits)) <= 2:
        return True

    return False


def is_duplicate_request(db: Session, request_data: DisasterRequestCreate, radius_km: float = 1.0, time_window_hours: int = 24) -> bool:
    """
    Check if a similar request already exists for the same location and time period

    Args:
        db: Database session
        request_data: The request data to check
        radius_km: Radius in kilometers to check for duplicate location
        time_window_hours: Time window in hours to check for duplicates

    Returns:
        True if a duplicate request is found, False otherwise
    """
    
    time_cutoff = datetime.utcnow() - timedelta(hours=time_window_hours)

    lat_delta = radius_km / 111  
    lng_delta = radius_km / 111
    
    similar_requests = db.query(DisasterRequest).filter(
        and_(
            DisasterRequest.latitude >= request_data.latitude - lat_delta,
            DisasterRequest.latitude <= request_data.latitude + lat_delta,
            DisasterRequest.longitude >= request_data.longitude - lng_delta,
            DisasterRequest.longitude <= request_data.longitude + lng_delta,

            DisasterRequest.request_type == request_data.request_type,
           
            DisasterRequest.created_at >= time_cutoff,

            DisasterRequest.is_active == True,

            DisasterRequest.contact_phone == request_data.contact_phone
        )
    ).limit(10).all()

    # Check for exact matches
    for similar_req in similar_requests:
        similarity_score = calculate_text_similarity(
            request_data.description.lower(),
            similar_req.description.lower()
        )

        if similarity_score > 0.8:
            return True
        
        if (similar_req.contact_name.lower() == request_data.contact_name.lower() and
            similar_req.address.lower() == request_data.address.lower()):
            return True

    return False


def calculate_text_similarity(text1: str, text2: str) -> float:
    """
    Calculate similarity between two text strings using Jaccard similarity
    Args:
        text1: First text string
        text2: Second text string
    Returns:
        Similarity score between 0 and 1
    """
    words1 = set(text1.split())
    words2 = set(text2.split())

    # Calculate Jaccard similarity
    intersection = len(words1.intersection(words2))
    union = len(words1.union(words2))

    if union == 0:
        return 0.0

    return intersection / union

def get_content_quality_score(request_data: DisasterRequestCreate) -> float:
    """
    Calculate a quality score for the request content
    Args:
        request_data: The request data to analyze
    Returns:
        Quality score between 0 and 1 (higher is better)
    """
    score = 0.0
    
    title_length = len(request_data.title)
    if 20 <= title_length <= 100:
        score += 20
    elif 10 <= title_length <= 200:
        score += 15
    else:
        score += 5

    # Description quality (0-30 points)
    desc_length = len(request_data.description)
    if 100 <= desc_length <= 1000:
        score += 30
    elif 50 <= desc_length <= 2000:
        score += 25
    elif 20 <= desc_length <= 50:
        score += 15
    else:
        score += 5

    # Contact information completeness (0-20 points)
    if request_data.contact_email:
        score += 10
    if len(re.sub(r'[^0-9]', '', request_data.contact_phone)) >= 10:
        score += 10

    # Location information completeness (0-15 points)
    if request_data.landmark:
        score += 5
    if len(request_data.address) >= 20:
        score += 10
    
    if request_data.additional_notes and len(request_data.additional_notes) > 10:
        score += 10
    if request_data.estimated_cost is not None and request_data.estimated_cost > 0:
        score += 5

    # Normalize to 0-1 scale
    return min(score / 100, 1.0)


def flag_suspicious_patterns(request_data: DisasterRequestCreate) -> List[str]:
    """
    Flag suspicious patterns in the request for manual review

    Args:
        request_data: The request data to analyze

    Returns:
        List of suspicious pattern descriptions
    """
    flags = []

    text_content = " ".join([
        request_data.title,
        request_data.description,
        request_data.contact_name,
        request_data.address
    ])

    # Check for various suspicious patterns
    if any(keyword in text_content.lower() for keyword in SPAM_KEYWORDS):
        flags.append("Contains potential spam keywords")

    if request_data.people_affected > 100:
        flags.append("Unusually high number of people affected")

    if request_data.estimated_cost and request_data.estimated_cost > 100000:
        flags.append("Very high estimated cost")

    # Check for formatting issues
    if text_content.isupper():
        flags.append("All caps text (shouting)")

    if len(set(request_data.contact_phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', ''))) <= 3:
        flags.append("Suspicious phone number pattern")

    # Check for very recent coordinates (possible automated submission)
    if (abs(request_data.latitude) < 0.001 and abs(request_data.longitude) < 0.001):
        flags.append("Coordinates too close to 0,0")
    return flags