import joblib

model = joblib.load("disaster_urgency_ensemble.pkl")
text_vectorizer = joblib.load("text_vectorizer_multi.pkl")
keyword_encoder = joblib.load("keyword_encoder.pkl")
location_encoder = joblib.load("location_encoder.pkl")

def safe_encode(encoder, value, default="unknown"):
    """
    Safely transform a value with LabelEncoder.
    If unseen, map it to 'unknown' (which must be included during training).
    """
    if value is None:
        value = default
    try:
        return encoder.transform([value])
    except ValueError:
        # if unseen, fallback to default
        return encoder.transform([default])


def predict_urgency(text, keyword=None, location=None):
    # Transform text
    X_text = text_vectorizer.transform([text])
    
    # Safe keyword transform
    X_keyword = safe_encode(keyword_encoder, keyword)
    
    # Safe location transform
    X_location = safe_encode(location_encoder, location)

    # Combine features
    from scipy.sparse import hstack
    X_combined = hstack([X_text, X_keyword.reshape(-1, 1), X_location.reshape(-1, 1)])

    # Predict
    probs = model.predict_proba(X_combined)[0]
    classes = model.classes_
    predicted_class = classes[probs.argmax()]
    confidence = probs.max()

    return {
        "predicted_urgency": predicted_class,
        "confidence": confidence,
        "probabilities": dict(zip(classes, probs))
    }

if __name__ == "__main__":
    test_cases = [
        {"text": "Massive flood, people trapped, urgent help needed!", "keyword": "flood", "location": "Delhi"},
        {"text": "Earthquake tremors felt, buildings shaking, immediate evacuation required!", "keyword": "earthquake", "location": "California"},
        {"text": "Minor road accident on the highway, no injuries reported", "keyword": "accident", "location": "Texas"},
    ]

    for case in test_cases:
        result = predict_urgency(case["text"], keyword=case["keyword"], location=case["location"])
        print("\n==============================")
        print(f"Text: {case['text']}")
        print(f"Predicted Urgency: {result['predicted_urgency'].upper()} (Confidence: {result['confidence']:.2f})")
        print(f"Probabilities: {result['probabilities']}")
