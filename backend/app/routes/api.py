import os
import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.config import settings
from backend.app.schemas.schemas import (
    LoanPredictionRequest,
    LoanPredictionResponse,
    ExplainPredictionResponse,
    ModelComparisonResponse,
    ModelMetricItem,
    DatasetSummaryResponse,
    EDASummaryResponse,
    PredictionHistoryItem,
    PredictionDetailResponse,
    MonitoringSummaryResponse
)
from backend.app.services.prediction_service import (
    save_and_predict,
    get_prediction_history,
    get_prediction_detail
)
from backend.app.ml.eda import compute_eda_summary
from backend.app.ml.monitoring import compute_drift_monitoring

router = APIRouter()

# In-memory cache for EDA summary
_EDA_CACHE: Optional[Dict[str, Any]] = None

@router.get("/health", tags=["System"])
def health_check():
    """Returns the system health and active model configuration status."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "active_model": settings.ACTIVE_MODEL,
        "low_risk_threshold": settings.LOW_RISK_THRESHOLD,
        "high_risk_threshold": settings.HIGH_RISK_THRESHOLD
    }


@router.get("/dataset/summary", response_model=DatasetSummaryResponse, tags=["Dataset"])
def get_dataset_summary():
    """Returns high-level dataset statistics, missing values count, and target distribution."""
    global _EDA_CACHE
    if _EDA_CACHE is None:
        _EDA_CACHE = compute_eda_summary()
    return _EDA_CACHE["dataset_summary"]


@router.get("/eda/summary", response_model=EDASummaryResponse, tags=["EDA"])
def get_eda_summary():
    """Returns full exploratory data analysis metrics, breakdowns by grade/term/income, and correlation matrix."""
    global _EDA_CACHE
    if _EDA_CACHE is None:
        _EDA_CACHE = compute_eda_summary()
    return _EDA_CACHE


@router.get("/models", response_model=ModelComparisonResponse, tags=["Models"])
@router.get("/model/metrics", response_model=ModelComparisonResponse, tags=["Models"])
def get_model_metrics():
    """Returns comparative performance metrics for Logistic Regression, Random Forest, and XGBoost."""
    metrics_path = os.path.join(settings.MODEL_DIR, "model_metrics.json")
    if not os.path.exists(metrics_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model metrics not found. Models may still be training or need to be trained."
        )

    with open(metrics_path, "r") as f:
        data = json.load(f)

    models_list = []
    for model_name, info in data.get("models", {}).items():
        models_list.append(ModelMetricItem(**info))

    return ModelComparisonResponse(
        active_model=settings.ACTIVE_MODEL,
        models=models_list,
        best_model_by_auc=data.get("best_model_name", "XGBoost")
    )


@router.post("/predict", response_model=LoanPredictionResponse, tags=["Prediction"])
def predict_loan(
    request: LoanPredictionRequest,
    db: Session = Depends(get_db)
):
    """
    Accepts applicant and loan application details, evaluates default risk probability,
    assigns risk category, and persists the transaction to PostgreSQL/SQLite database.
    """
    try:
        result = save_and_predict(db, request)
        return LoanPredictionResponse(**result["prediction"])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction error: {str(e)}"
        )


@router.post("/predict/explain", response_model=ExplainPredictionResponse, tags=["Prediction"])
def predict_and_explain(
    request: LoanPredictionRequest,
    db: Session = Depends(get_db)
):
    """
    Computes loan default prediction along with full SHAP explainability breakdown
    identifying primary positive and negative risk contributors.
    """
    try:
        result = save_and_predict(db, request)
        exp = result["explanation"]
        return ExplainPredictionResponse(
            prediction=LoanPredictionResponse(**result["prediction"]),
            base_value=exp["base_value"],
            top_positive_risk_drivers=exp["top_positive_risk_drivers"],
            top_negative_risk_drivers=exp["top_negative_risk_drivers"],
            all_contributions=exp["all_contributions"],
            summary_text=exp["summary_text"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Explainability error: {str(e)}"
        )


@router.get("/predictions", response_model=List[PredictionHistoryItem], tags=["History"])
def list_predictions(
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Retrieves paginated history of all loan predictions and risk assessments."""
    return get_prediction_history(db, limit=limit, skip=skip)


@router.get("/predictions/{prediction_id}", response_model=PredictionDetailResponse, tags=["History"])
def get_prediction_by_id(
    prediction_id: int,
    db: Session = Depends(get_db)
):
    """Retrieves full details including SHAP feature impacts for a specific historical prediction."""
    detail = get_prediction_detail(db, prediction_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prediction with ID {prediction_id} not found."
        )
    return detail


@router.get("/monitoring/summary", response_model=MonitoringSummaryResponse, tags=["Monitoring"])
@router.get("/monitoring/drift", response_model=MonitoringSummaryResponse, tags=["Monitoring"])
def get_monitoring_drift(
    db: Session = Depends(get_db)
):
    """Computes real-time data drift metrics and distribution shifts across input features."""
    recent = get_prediction_history(db, limit=100)
    # Extract input data if available
    recent_inputs = []
    for item in recent:
        detail = get_prediction_detail(db, item["prediction_id"])
        if detail and detail.get("input_data"):
            recent_inputs.append(detail["input_data"])

    monitoring_result = compute_drift_monitoring(recent_inputs)
    return monitoring_result
