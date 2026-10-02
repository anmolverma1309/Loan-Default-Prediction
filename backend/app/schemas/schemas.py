from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import datetime

# --- Prediction Inputs ---

class LoanPredictionRequest(BaseModel):
    # Applicant details
    name: Optional[str] = Field(default="Anonymous Applicant", description="Applicant Name")
    annual_inc: float = Field(..., ge=1000, description="Annual Income in USD (e.g. 65000)")
    emp_length: Optional[str] = Field(default="5 years", description="Employment Length (e.g. '10+ years', '3 years', '< 1 year')")
    home_ownership: str = Field(default="RENT", description="Home Ownership (RENT, OWN, MORTGAGE, OTHER)")
    verification_status: str = Field(default="Verified", description="Verification Status (Verified, Not Verified, Source Verified)")
    
    # Loan specifics
    loan_amnt: float = Field(..., ge=500, description="Loan Amount in USD (e.g. 15000)")
    term: int = Field(default=36, description="Loan Term in months (36 or 60)")
    int_rate: float = Field(..., ge=1.0, le=40.0, description="Interest Rate percentage (e.g. 12.5)")
    installment: Optional[float] = Field(default=None, description="Monthly Installment (calculated if omitted)")
    purpose: str = Field(default="debt_consolidation", description="Loan Purpose (e.g. debt_consolidation, credit_card, home_improvement, small_business)")
    grade: str = Field(default="B", description="Credit Grade (A, B, C, D, E, F, G)")
    sub_grade: Optional[str] = Field(default="B2", description="Sub Grade (e.g. B1, B2, C3)")
    
    # Financial health / Credit profile
    dti: float = Field(default=15.0, ge=0.0, le=100.0, description="Debt-to-Income ratio (e.g. 15.2)")
    delinq_2yrs: Optional[int] = Field(default=0, ge=0, description="Delinquencies in the past 2 years")
    inq_last_6mths: Optional[int] = Field(default=0, ge=0, description="Inquiries in last 6 months")
    open_acc: Optional[int] = Field(default=8, ge=0, description="Open credit lines")
    pub_rec: Optional[int] = Field(default=0, ge=0, description="Public records of bankruptcies/derogatory")
    revol_bal: Optional[float] = Field(default=8000.0, ge=0, description="Revolving credit balance")
    revol_util: Optional[float] = Field(default=45.0, ge=0.0, le=150.0, description="Revolving line utilization %")
    total_acc: Optional[int] = Field(default=18, ge=0, description="Total credit lines in history")
    pub_rec_bankruptcies: Optional[int] = Field(default=0, ge=0, description="Number of public record bankruptcies")
    
    # Model override option
    model_override: Optional[str] = Field(default=None, description="Select specific model: 'XGBoost', 'Random Forest', 'Logistic Regression'")

    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Sarah Connor",
                "annual_inc": 75000.0,
                "emp_length": "5 years",
                "home_ownership": "MORTGAGE",
                "verification_status": "Verified",
                "loan_amnt": 15000.0,
                "term": 36,
                "int_rate": 11.49,
                "purpose": "debt_consolidation",
                "grade": "B",
                "sub_grade": "B3",
                "dti": 14.8,
                "delinq_2yrs": 0,
                "inq_last_6mths": 1,
                "open_acc": 9,
                "pub_rec": 0,
                "revol_bal": 12400.0,
                "revol_util": 42.5,
                "total_acc": 22,
                "pub_rec_bankruptcies": 0
            }
        }
    }


# --- Prediction Responses ---

class LoanPredictionResponse(BaseModel):
    prediction_id: Optional[int] = None
    default_probability: float = Field(..., description="Predicted probability of default between 0 and 1")
    risk_category: str = Field(..., description="Risk Category: Low, Medium, or High")
    model: str = Field(..., description="ML Model used")
    model_version: str = Field(..., description="Version of the model")
    low_risk_threshold: float = 0.30
    high_risk_threshold: float = 0.60
    confidence_score: float = Field(..., description="Model certainty")
    timestamp: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)


class SHAPFeatureContribution(BaseModel):
    feature: str
    feature_label: str
    value: Any
    contribution: float  # SHAP value
    impact_direction: str  # 'increases_risk' (positive SHAP) or 'decreases_risk' (negative SHAP)
    formatted_explanation: str


class ExplainPredictionResponse(BaseModel):
    prediction: LoanPredictionResponse
    base_value: float
    top_positive_risk_drivers: List[SHAPFeatureContribution]
    top_negative_risk_drivers: List[SHAPFeatureContribution]
    all_contributions: List[SHAPFeatureContribution]
    summary_text: str


# --- Model Performance & Metrics ---

class ModelMetricItem(BaseModel):
    model_name: str
    version: str
    status: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float
    pr_auc: float
    confusion_matrix: List[List[int]]
    roc_curve: Optional[Dict[str, List[float]]] = None  # fpr, tpr
    pr_curve: Optional[Dict[str, List[float]]] = None   # precision, recall
    feature_importances: Optional[Dict[str, float]] = None


class ModelComparisonResponse(BaseModel):
    active_model: str
    models: List[ModelMetricItem]
    best_model_by_auc: str


# --- Dataset & EDA Schemas ---

class DatasetSummaryResponse(BaseModel):
    total_records: int
    total_features: int
    target_distribution: Dict[str, int]
    default_rate: float
    missing_values: Dict[str, int]
    duplicate_records: int
    numerical_columns: List[str]
    categorical_columns: List[str]


class EDASummaryResponse(BaseModel):
    dataset_summary: DatasetSummaryResponse
    default_by_grade: Dict[str, Dict[str, float]]
    default_by_term: Dict[str, Dict[str, float]]
    default_by_home_ownership: Dict[str, Dict[str, float]]
    default_by_purpose: Dict[str, Dict[str, float]]
    numerical_distributions: Dict[str, Dict[str, Any]]
    correlation_matrix: Dict[str, Dict[str, float]]


# --- Prediction History ---

class PredictionHistoryItem(BaseModel):
    prediction_id: int
    loan_id: int
    applicant_name: str
    loan_amount: float
    loan_term: int
    interest_rate: float
    grade: Optional[str]
    purpose: Optional[str]
    default_probability: float
    risk_category: str
    model_name: str
    prediction_time: datetime.datetime


class PredictionDetailResponse(BaseModel):
    prediction_id: int
    applicant: Dict[str, Any]
    loan: Dict[str, Any]
    default_probability: float
    risk_category: str
    model_name: str
    prediction_time: datetime.datetime
    shap_summary: Optional[Dict[str, Any]] = None


# --- Drift / Monitoring ---

class DriftMetricItem(BaseModel):
    feature: str
    drift_detected: bool
    drift_score: float  # p-value or distance
    test_name: str
    reference_mean: Optional[float] = None
    current_mean: Optional[float] = None
    status: str  # 'OK', 'DRIFT_DETECTED', 'WARNING'


class MonitoringSummaryResponse(BaseModel):
    total_predictions_analyzed: int
    monitoring_status: str  # 'HEALTHY', 'DEGRADED', 'DRIFT_DETECTED'
    drift_metrics: List[DriftMetricItem]
    missing_value_rates: Dict[str, float]
    predicted_distribution: Dict[str, int]
    last_updated: datetime.datetime
