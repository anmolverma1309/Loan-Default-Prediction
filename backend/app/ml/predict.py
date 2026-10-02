import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from backend.app.ml.preprocessing import format_single_input
from backend.app.config import settings

# Global in-memory cache for loaded model pipelines
_LOADED_MODELS: Dict[str, Any] = {}

def get_model_pipeline(model_name: str = None) -> Tuple[Any, str, str]:
    """Retrieves or loads the scikit-learn pipeline for the specified model name."""
    if model_name is None:
        model_name = settings.ACTIVE_MODEL

    # Standardize model key
    clean_name = model_name.strip()
    if clean_name.lower() in ["xgboost", "xgb"]:
        filename = "xgboost.joblib"
        canonical_name = "XGBoost"
    elif clean_name.lower() in ["random forest", "rf", "randomforest"]:
        filename = "random_forest.joblib"
        canonical_name = "Random Forest"
    elif clean_name.lower() in ["logistic regression", "lr", "logistic"]:
        filename = "logistic_regression.joblib"
        canonical_name = "Logistic Regression"
    else:
        filename = "best_model.joblib"
        canonical_name = model_name

    if canonical_name in _LOADED_MODELS:
        return _LOADED_MODELS[canonical_name], canonical_name, "1.0"

    model_path = os.path.join(settings.MODEL_DIR, filename)
    if not os.path.exists(model_path):
        # Fallback to best_model.joblib
        fallback_path = os.path.join(settings.MODEL_DIR, "best_model.joblib")
        if os.path.exists(fallback_path):
            pipeline = joblib.load(fallback_path)
            _LOADED_MODELS[canonical_name] = pipeline
            return pipeline, canonical_name, "1.0"
        else:
            raise FileNotFoundError(f"Model file not found at {model_path} or {fallback_path}. Please train models first.")

    pipeline = joblib.load(model_path)
    _LOADED_MODELS[canonical_name] = pipeline
    return pipeline, canonical_name, "1.0"


def classify_risk(probability: float) -> str:
    """Classifies risk into Low, Medium, or High using configurable settings thresholds."""
    if probability < settings.LOW_RISK_THRESHOLD:
        return "Low"
    elif probability < settings.HIGH_RISK_THRESHOLD:
        return "Medium"
    else:
        return "High"


def predict_loan_default(input_data: Dict[str, Any], model_override: str = None) -> Dict[str, Any]:
    """
    Takes an applicant & loan dictionary, runs the full preprocessing & ML inference pipeline,
    and returns probability, risk category, model information, and confidence score.
    """
    model_name = model_override or input_data.get("model_override") or settings.ACTIVE_MODEL
    pipeline, resolved_model_name, version = get_model_pipeline(model_name)

    input_df = format_single_input(input_data)
    
    # Predict default probability (class 1)
    probabilities = pipeline.predict_proba(input_df)[0]
    default_prob = float(probabilities[1])

    # Classify Risk
    risk_cat = classify_risk(default_prob)

    # Compute confidence score: distance from decision threshold (0.5)
    confidence = float(min(1.0, abs(default_prob - 0.5) * 2.0 + 0.5))

    return {
        "default_probability": round(default_prob, 4),
        "risk_category": risk_cat,
        "model": resolved_model_name,
        "model_version": version,
        "low_risk_threshold": settings.LOW_RISK_THRESHOLD,
        "high_risk_threshold": settings.HIGH_RISK_THRESHOLD,
        "confidence_score": round(confidence, 4)
    }
