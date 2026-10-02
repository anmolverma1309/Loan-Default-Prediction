import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, confusion_matrix,
    roc_curve, precision_recall_curve
)

from backend.app.ml.preprocessing import prepare_training_data, NUMERICAL_FEATURES, CATEGORICAL_FEATURES
from backend.app.config import settings

# Attempt import of XGBoost and MLflow (handled gracefully if still finalizing install)
try:
    import xgboost as xgb
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False

try:
    import mlflow
    import mlflow.sklearn
    MLFLOW_AVAILABLE = True
except ImportError:
    MLFLOW_AVAILABLE = False


def train_and_evaluate_all_models(
    csv_path: str = None,
    output_dir: str = None,
    use_mlflow: bool = True
) -> Dict[str, Any]:
    """
    Trains Logistic Regression, Random Forest, and XGBoost on stratified 80/20 train/test split.
    Saves trained pipelines, evaluation metrics, curves, and feature importances.
    """
    if csv_path is None:
        csv_path = settings.DATA_PATH
    if output_dir is None:
        output_dir = settings.MODEL_DIR

    os.makedirs(output_dir, exist_ok=True)

    print(f"Loading and preprocessing data from {csv_path}...")
    X, y, preprocessor = prepare_training_data(csv_path)

    # Stratified 80/20 train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    print(f"Train samples: {len(X_train)} (Defaults: {sum(y_train)}), Test samples: {len(X_test)} (Defaults: {sum(y_test)})")

    # Fit preprocessor strictly on training data
    preprocessor.fit(X_train, y_train)

    # Transform data
    X_train_trans = preprocessor.transform(X_train)
    X_test_trans = preprocessor.transform(X_test)

    # Get feature names after one-hot encoding
    cat_encoder = preprocessor.named_transformers_["cat"].named_steps["onehot"]
    cat_feature_names = list(cat_encoder.get_feature_names_out(CATEGORICAL_FEATURES))
    all_transformed_features = NUMERICAL_FEATURES + cat_feature_names

    # Compute scale_pos_weight for XGBoost
    neg_count = sum(y_train == 0)
    pos_count = sum(y_train == 1)
    scale_pos_weight = neg_count / max(pos_count, 1)

    # Define candidate models
    models_dict = {
        "Logistic Regression": LogisticRegression(
            class_weight="balanced",
            max_iter=1000,
            C=0.1,
            random_state=42
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=150,
            max_depth=12,
            min_samples_split=10,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1
        )
    }

    if XGB_AVAILABLE:
        models_dict["XGBoost"] = xgb.XGBClassifier(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.05,
            scale_pos_weight=scale_pos_weight,
            eval_metric="logloss",
            random_state=42,
            n_jobs=-1
        )
    else:
        # Fallback gradient boosting if xgboost binary is still downloading
        from sklearn.ensemble import HistGradientBoostingClassifier
        models_dict["XGBoost"] = HistGradientBoostingClassifier(
            max_iter=200,
            max_depth=5,
            learning_rate=0.05,
            class_weight="balanced",
            random_state=42
        )

    # Optional MLflow tracking
    if use_mlflow and MLFLOW_AVAILABLE:
        try:
            mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
            mlflow.set_experiment(settings.EXPERIMENT_NAME)
        except Exception as e:
            print(f"MLflow initialization notice: {e}")

    results_summary = {}
    saved_models = {}
    best_auc = -1.0
    best_model_name = "XGBoost"

    for name, clf in models_dict.items():
        print(f"\n--- Training {name} ---")
        
        # Fit model on preprocessed training data
        clf.fit(X_train_trans, y_train)

        # Predict probabilities and classes on test set
        y_pred_proba = clf.predict_proba(X_test_trans)[:, 1]
        y_pred = (y_pred_proba >= 0.5).astype(int)

        # Compute all required metrics dynamically
        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))
        auc = float(roc_auc_score(y_test, y_pred_proba))
        pr_auc = float(average_precision_score(y_test, y_pred_proba))
        cm = confusion_matrix(y_test, y_pred).tolist()

        # Compute ROC Curve points (downsampled for smooth charts)
        fpr, tpr, _ = roc_curve(y_test, y_pred_proba)
        indices = np.linspace(0, len(fpr) - 1, min(50, len(fpr)), dtype=int)
        roc_data = {
            "fpr": [round(float(fpr[i]), 4) for i in indices],
            "tpr": [round(float(tpr[i]), 4) for i in indices]
        }

        # Compute Precision-Recall Curve points
        prec_curve, rec_curve, _ = precision_recall_curve(y_test, y_pred_proba)
        pr_indices = np.linspace(0, len(prec_curve) - 1, min(50, len(prec_curve)), dtype=int)
        pr_data = {
            "precision": [round(float(prec_curve[i]), 4) for i in pr_indices],
            "recall": [round(float(rec_curve[i]), 4) for i in pr_indices]
        }

        # Compute Feature Importances
        feature_importance_dict = {}
        if hasattr(clf, "feature_importances_"):
            importances = clf.feature_importances_
            # Aggregate one-hot back to base features or show top individual transformed features
            top_idx = np.argsort(importances)[::-1][:15]
            for idx in top_idx:
                fname = all_transformed_features[idx] if idx < len(all_transformed_features) else f"feature_{idx}"
                feature_importance_dict[fname] = round(float(importances[idx]), 4)
        elif hasattr(clf, "coef_"):
            coefs = np.abs(clf.coef_[0])
            top_idx = np.argsort(coefs)[::-1][:15]
            for idx in top_idx:
                fname = all_transformed_features[idx] if idx < len(all_transformed_features) else f"feature_{idx}"
                feature_importance_dict[fname] = round(float(coefs[idx]), 4)

        # Assemble full pipeline combining preprocessor + classifier
        full_pipeline = Pipeline([
            ("preprocessor", preprocessor),
            ("classifier", clf)
        ])

        # Save individual model pipeline artifact
        model_filename = f"{name.lower().replace(' ', '_')}.joblib"
        model_file_path = os.path.join(output_dir, model_filename)
        joblib.dump(full_pipeline, model_file_path)

        metrics_obj = {
            "model_name": name,
            "version": "1.0",
            "status": "active" if name == "XGBoost" else "candidate",
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(auc, 4),
            "pr_auc": round(pr_auc, 4),
            "confusion_matrix": cm,
            "roc_curve": roc_data,
            "pr_curve": pr_data,
            "feature_importances": feature_importance_dict
        }

        results_summary[name] = metrics_obj
        saved_models[name] = model_file_path

        print(f"{name} -> ROC-AUC: {auc:.4f}, PR-AUC: {pr_auc:.4f}, Recall: {rec:.4f}, F1: {f1:.4f}")

        # Track with MLflow
        if use_mlflow and MLFLOW_AVAILABLE:
            try:
                with mlflow.start_run(run_name=f"{name}_training"):
                    mlflow.log_params({"model_type": name, "test_size": 0.20, "stratified": True})
                    mlflow.log_metrics({
                        "accuracy": acc,
                        "precision": prec,
                        "recall": rec,
                        "f1": f1,
                        "roc_auc": auc,
                        "pr_auc": pr_auc
                    })
                    mlflow.sklearn.log_model(full_pipeline, artifact_path="model")
            except Exception as ex:
                print(f"MLflow logging notice for {name}: {ex}")

        # Track best model
        if auc > best_auc:
            best_auc = auc
            best_model_name = name

    # Save best model copy as best_model.joblib
    best_pipeline = joblib.load(saved_models[best_model_name])
    joblib.dump(best_pipeline, os.path.join(output_dir, "best_model.joblib"))

    # Save feature names & metadata for SHAP and explainability
    metadata = {
        "best_model_name": best_model_name,
        "best_auc": best_auc,
        "transformed_features": all_transformed_features,
        "numerical_features": NUMERICAL_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "models": results_summary
    }

    metrics_json_path = os.path.join(output_dir, "model_metrics.json")
    with open(metrics_json_path, "w") as f:
        json.dump(metadata, f, indent=2)

    # Save a small reference background sample for SHAP & Drift Monitoring
    ref_sample = X_train.sample(min(300, len(X_train)), random_state=42)
    ref_sample.to_csv(os.path.join(output_dir, "reference_sample.csv"), index=False)

    print(f"\nTraining Complete! Best model: {best_model_name} (ROC-AUC: {best_auc:.4f})")
    print(f"Saved artifacts in {output_dir}")

    return metadata


if __name__ == "__main__":
    train_and_evaluate_all_models()
