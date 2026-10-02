import json
import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.models.entities import Applicant, Loan, Prediction, ModelRegistry
from backend.app.schemas.schemas import LoanPredictionRequest, LoanPredictionResponse, ExplainPredictionResponse
from backend.app.ml.predict import predict_loan_default
from backend.app.ml.explain import explain_prediction
from backend.app.config import settings

def save_and_predict(db: Session, request_data: LoanPredictionRequest) -> Dict[str, Any]:
    """
    Executes prediction, runs SHAP explainability, and saves applicant, loan, and prediction to DB.
    """
    input_dict = request_data.model_dump()
    
    # 1. Run ML Prediction
    pred_res = predict_loan_default(input_dict, model_override=request_data.model_override)
    
    # 2. Compute SHAP Explanation
    explanation = explain_prediction(input_dict, pipeline_or_name=pred_res["model"])

    # 3. Find or create ModelRegistry record
    model_reg = db.query(ModelRegistry).filter(
        ModelRegistry.model_name == pred_res["model"]
    ).first()

    if not model_reg:
        model_reg = ModelRegistry(
            model_name=pred_res["model"],
            version=pred_res["model_version"],
            auc_score=0.74,
            status="active"
        )
        db.add(model_reg)
        db.flush()

    # 4. Create Applicant record
    applicant = Applicant(
        name=request_data.name or "Anonymous Applicant",
        income=request_data.annual_inc,
        employment_type=request_data.emp_length,
        credit_score=int(750 - (request_data.dti * 5) - (request_data.int_rate * 8))  # estimated credit score
    )
    db.add(applicant)
    db.flush()

    # 5. Create Loan record
    loan = Loan(
        applicant_id=applicant.applicant_id,
        loan_amount=request_data.loan_amnt,
        loan_term=request_data.term,
        interest_rate=request_data.int_rate,
        purpose=request_data.purpose,
        grade=request_data.grade,
        sub_grade=request_data.sub_grade,
        dti=request_data.dti,
        home_ownership=request_data.home_ownership,
        verification_status=request_data.verification_status
    )
    db.add(loan)
    db.flush()

    # 6. Create Prediction record
    pred_record = Prediction(
        loan_id=loan.loan_id,
        model_id=model_reg.model_id,
        default_probability=pred_res["default_probability"],
        risk_category=pred_res["risk_category"],
        shap_summary=explanation,
        input_data=input_dict,
        prediction_time=datetime.datetime.utcnow()
    )
    db.add(pred_record)
    db.commit()
    db.refresh(pred_record)

    pred_res["prediction_id"] = pred_record.prediction_id
    pred_res["timestamp"] = pred_record.prediction_time

    return {
        "prediction": pred_res,
        "explanation": explanation
    }


def get_prediction_history(db: Session, limit: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
    """Retrieves paginated list of recent predictions with loan & applicant metadata."""
    predictions = (
        db.query(Prediction)
        .order_by(desc(Prediction.prediction_time))
        .offset(skip)
        .limit(limit)
        .all()
    )

    history = []
    for p in predictions:
        applicant_name = p.loan.applicant.name if p.loan and p.loan.applicant else "Applicant"
        loan_amt = p.loan.loan_amount if p.loan else 0.0
        loan_term = p.loan.loan_term if p.loan else 36
        int_rate = p.loan.interest_rate if p.loan else 0.0
        grade = p.loan.grade if p.loan else "N/A"
        purpose = p.loan.purpose if p.loan else "N/A"
        model_name = p.model_registry.model_name if p.model_registry else settings.ACTIVE_MODEL

        history.append({
            "prediction_id": p.prediction_id,
            "loan_id": p.loan_id,
            "applicant_name": applicant_name,
            "loan_amount": loan_amt,
            "loan_term": loan_term,
            "interest_rate": int_rate,
            "grade": grade,
            "purpose": purpose,
            "default_probability": p.default_probability,
            "risk_category": p.risk_category,
            "model_name": model_name,
            "prediction_time": p.prediction_time
        })

    return history


def get_prediction_detail(db: Session, prediction_id: int) -> Optional[Dict[str, Any]]:
    """Retrieves complete details for a single prediction."""
    p = db.query(Prediction).filter(Prediction.prediction_id == prediction_id).first()
    if not p:
        return None

    return {
        "prediction_id": p.prediction_id,
        "applicant": {
            "applicant_id": p.loan.applicant.applicant_id if p.loan and p.loan.applicant else None,
            "name": p.loan.applicant.name if p.loan and p.loan.applicant else "Applicant",
            "income": p.loan.applicant.income if p.loan and p.loan.applicant else None,
            "employment_type": p.loan.applicant.employment_type if p.loan and p.loan.applicant else None,
            "credit_score": p.loan.applicant.credit_score if p.loan and p.loan.applicant else None
        },
        "loan": {
            "loan_id": p.loan.loan_id if p.loan else None,
            "loan_amount": p.loan.loan_amount if p.loan else None,
            "loan_term": p.loan.loan_term if p.loan else None,
            "interest_rate": p.loan.interest_rate if p.loan else None,
            "grade": p.loan.grade if p.loan else None,
            "sub_grade": p.loan.sub_grade if p.loan else None,
            "dti": p.loan.dti if p.loan else None,
            "home_ownership": p.loan.home_ownership if p.loan else None,
            "purpose": p.loan.purpose if p.loan else None
        },
        "default_probability": p.default_probability,
        "risk_category": p.risk_category,
        "model_name": p.model_registry.model_name if p.model_registry else settings.ACTIVE_MODEL,
        "prediction_time": p.prediction_time,
        "shap_summary": p.shap_summary,
        "input_data": p.input_data
    }
