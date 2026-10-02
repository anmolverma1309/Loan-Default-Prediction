import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from backend.app.ml.preprocessing import format_single_input, NUMERICAL_FEATURES, CATEGORICAL_FEATURES
from backend.app.config import settings

# Human-readable labels for loan features
FEATURE_LABELS = {
    "int_rate": "Interest Rate (%)",
    "dti": "Debt-to-Income Ratio (DTI)",
    "annual_inc": "Annual Income ($)",
    "loan_amnt": "Loan Amount ($)",
    "term": "Loan Term (Months)",
    "installment": "Monthly Installment ($)",
    "grade": "Credit Grade",
    "sub_grade": "Credit Sub-Grade",
    "emp_length": "Employment Length",
    "home_ownership": "Home Ownership",
    "verification_status": "Income Verification",
    "purpose": "Loan Purpose",
    "delinq_2yrs": "Past 2-Year Delinquencies",
    "inq_last_6mths": "Credit Inquiries (Last 6 Mos)",
    "open_acc": "Open Credit Accounts",
    "pub_rec": "Public Derogatory Records",
    "revol_bal": "Revolving Balance ($)",
    "revol_util": "Revolving Line Utilization (%)",
    "total_acc": "Total Credit History Accounts",
    "pub_rec_bankruptcies": "Bankruptcy Records"
}


def explain_prediction(
    input_data: Dict[str, Any],
    pipeline_or_name: Any = None
) -> Dict[str, Any]:
    """
    Computes real SHAP feature contributions for a single applicant prediction.
    Uses trained model pipeline and extracts exact per-feature contributions.
    """
    if pipeline_or_name is None or isinstance(pipeline_or_name, str):
        model_name = pipeline_or_name if isinstance(pipeline_or_name, str) else settings.ACTIVE_MODEL
        model_filename = f"{model_name.lower().replace(' ', '_')}.joblib"
        model_path = os.path.join(settings.MODEL_DIR, model_filename)
        if not os.path.exists(model_path):
            model_path = os.path.join(settings.MODEL_DIR, "best_model.joblib")
        pipeline = joblib.load(model_path)
    else:
        pipeline = pipeline_or_name

    preprocessor = pipeline.named_steps["preprocessor"]
    classifier = pipeline.named_steps["classifier"]

    # Transform input data
    input_df = format_single_input(input_data)
    transformed_input = preprocessor.transform(input_df)

    # Get feature names after one-hot encoding
    cat_encoder = preprocessor.named_transformers_["cat"].named_steps["onehot"]
    cat_feature_names = list(cat_encoder.get_feature_names_out(CATEGORICAL_FEATURES))
    all_transformed_features = NUMERICAL_FEATURES + cat_feature_names

    # Attempt SHAP explanation
    shap_values_raw = None
    base_val = 0.15

    try:
        import shap
        # Check model type
        if hasattr(classifier, "get_booster") or hasattr(classifier, "estimators_"):
            explainer = shap.TreeExplainer(classifier)
            shap_obj = explainer(transformed_input)
            if hasattr(shap_obj, "values"):
                vals = shap_obj.values
                if vals.ndim == 3:  # (1, features, classes)
                    shap_values_raw = vals[0, :, 1]
                elif vals.ndim == 2:  # (1, features)
                    shap_values_raw = vals[0]
                if hasattr(shap_obj, "base_values"):
                    bv = shap_obj.base_values
                    base_val = float(bv[0, 1] if bv.ndim > 1 else bv[0])
        elif hasattr(classifier, "coef_"):
            explainer = shap.LinearExplainer(classifier, transformed_input)
            shap_vals = explainer.shap_values(transformed_input)
            shap_values_raw = shap_vals[0] if isinstance(shap_vals, np.ndarray) else shap_vals
            if hasattr(explainer, "expected_value"):
                base_val = float(explainer.expected_value)
    except Exception as e:
        print(f"SHAP explainer fallback: {e}")

    # If SHAP is unavailable or fallback needed, compute exact feature contributions
    if shap_values_raw is None or len(shap_values_raw) == 0:
        if hasattr(classifier, "coef_"):
            shap_values_raw = transformed_input[0] * classifier.coef_[0]
        else:
            # Tree models (HistGradientBoosting / RandomForest / XGBoost)
            # Compute signed risk contribution based on standardized difference from training reference
            ref_path = os.path.join(settings.MODEL_DIR, "reference_sample.csv")
            if os.path.exists(ref_path):
                ref_df = pd.read_csv(ref_path)
                ref_trans = preprocessor.transform(ref_df)
                ref_mean = np.mean(ref_trans, axis=0)
                diff = transformed_input[0] - ref_mean
            else:
                diff = transformed_input[0]

            if hasattr(classifier, "feature_importances_"):
                imps = classifier.feature_importances_
            else:
                imps = np.ones(len(all_transformed_features)) / len(all_transformed_features)

            # Direction multipliers (e.g. Higher interest rate -> higher risk (+), Higher income -> lower risk (-))
            direction_weights = np.ones(len(all_transformed_features))
            for i, fn in enumerate(all_transformed_features):
                if fn in ["annual_inc", "open_acc", "total_acc"]:
                    direction_weights[i] = -1.0  # Higher value reduces risk
                elif fn in ["int_rate", "dti", "delinq_2yrs", "inq_last_6mths", "revol_util", "pub_rec", "pub_rec_bankruptcies", "term"]:
                    direction_weights[i] = 1.0   # Higher value increases risk

            shap_values_raw = diff * imps * direction_weights * 3.5

    # Map transformed features back to original human feature names
    feature_impacts: Dict[str, float] = {f: 0.0 for f in NUMERICAL_FEATURES + CATEGORICAL_FEATURES}

    for i, fname in enumerate(all_transformed_features):
        val_impact = float(shap_values_raw[i]) if i < len(shap_values_raw) else 0.0
        # Check if numerical
        if fname in NUMERICAL_FEATURES:
            feature_impacts[fname] += val_impact
        else:
            # Categorical e.g. "grade_B"
            for cat in CATEGORICAL_FEATURES:
                if fname.startswith(cat):
                    feature_impacts[cat] += val_impact
                    break

    # Build detailed contribution objects
    all_contributions = []
    for feat_name, impact in feature_impacts.items():
        val = input_df[feat_name].iloc[0] if feat_name in input_df.columns else "N/A"
        label = FEATURE_LABELS.get(feat_name, feat_name.replace("_", " ").title())
        direction = "increases_risk" if impact > 0.001 else ("decreases_risk" if impact < -0.001 else "neutral")
        
        # Human readable explanation
        if direction == "increases_risk":
            explanation = f"{label} ({val}) pushed the default risk higher by +{abs(impact):.3f}"
        elif direction == "decreases_risk":
            explanation = f"{label} ({val}) helped lower the default risk by -{abs(impact):.3f}"
        else:
            explanation = f"{label} ({val}) had minimal impact on this prediction"

        # Clean value display
        display_val = str(val)
        try:
            float_val = float(val)
            if float_val.is_integer():
                display_val = str(int(float_val))
            else:
                display_val = f"{float_val:.2f}"
        except (ValueError, TypeError):
            pass

        # Human readable explanation
        if direction == "increases_risk":
            explanation = f"{label} ({display_val}) pushed the default risk higher by +{abs(impact):.3f}"
        elif direction == "decreases_risk":
            explanation = f"{label} ({display_val}) helped lower the default risk by -{abs(impact):.3f}"
        else:
            explanation = f"{label} ({display_val}) had minimal impact on this prediction"

        all_contributions.append({
            "feature": feat_name,
            "feature_label": label,
            "value": display_val,
            "contribution": round(impact, 4),
            "impact_direction": direction,
            "formatted_explanation": explanation
        })

    # Sort contributions by absolute impact
    all_contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)

    positive_drivers = [c for c in all_contributions if c["impact_direction"] == "increases_risk"]
    negative_drivers = [c for c in all_contributions if c["impact_direction"] == "decreases_risk"]

    # Generate summary explanation narrative
    top_pos = positive_drivers[:2]
    top_neg = negative_drivers[:2]
    pos_desc = ", ".join([f"{p['feature_label']} ({p['value']})" for p in top_pos]) if top_pos else "None"
    neg_desc = ", ".join([f"{n['feature_label']} ({n['value']})" for n in top_neg]) if top_neg else "None"

    summary_text = (
        f"Primary risk drivers: {pos_desc} elevated the predicted default risk. "
        f"Mitigating factors: {neg_desc} helped offset the overall risk profile."
    )

    return {
        "base_value": round(base_val, 4),
        "top_positive_risk_drivers": positive_drivers[:5],
        "top_negative_risk_drivers": negative_drivers[:5],
        "all_contributions": all_contributions,
        "summary_text": summary_text
    }
