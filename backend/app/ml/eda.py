import os
import json
import numpy as np
import pandas as pd
from typing import Dict, Any
from backend.app.ml.preprocessing import clean_raw_dataframe, TARGET_COL, NUMERICAL_FEATURES, CATEGORICAL_FEATURES
from backend.app.config import settings

def compute_eda_summary(csv_path: str = None) -> Dict[str, Any]:
    """Computes comprehensive EDA statistics from the dataset and returns structured dictionary."""
    if csv_path is None:
        csv_path = settings.DATA_PATH

    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}")

    df_raw = pd.read_csv(csv_path)
    df_clean = clean_raw_dataframe(df_raw, is_training=True)

    # 1. Dataset Overview
    total_records = int(len(df_raw))
    total_features = int(df_raw.shape[1])
    missing_dict = {col: int(cnt) for col, cnt in df_raw.isnull().sum().items() if cnt > 0}
    duplicate_records = int(df_raw.duplicated().sum())

    # 2. Target Distribution
    target_counts = df_clean[TARGET_COL].value_counts().to_dict()
    target_dist = {
        "Non-Default (0)": int(target_counts.get(0, 0)),
        "Default (1)": int(target_counts.get(1, 0))
    }
    default_rate = float(target_counts.get(1, 0) / max(total_records, 1))

    # 3. Categorical default rates
    # Default by Grade
    grade_df = df_clean.groupby("grade")[TARGET_COL].agg(["count", "mean"]).reset_index()
    default_by_grade = {
        str(row["grade"]): {
            "total_loans": int(row["count"]),
            "default_rate": round(float(row["mean"]), 4),
            "defaults": int(round(row["count"] * row["mean"]))
        }
        for _, row in grade_df.iterrows() if str(row["grade"]) != "NAN"
    }

    # Default by Term
    term_df = df_clean.groupby("term")[TARGET_COL].agg(["count", "mean"]).reset_index()
    default_by_term = {
        f"{int(row['term'])} months": {
            "total_loans": int(row["count"]),
            "default_rate": round(float(row["mean"]), 4),
            "defaults": int(round(row["count"] * row["mean"]))
        }
        for _, row in term_df.iterrows()
    }

    # Default by Home Ownership
    home_df = df_clean.groupby("home_ownership")[TARGET_COL].agg(["count", "mean"]).reset_index()
    default_by_home = {
        str(row["home_ownership"]): {
            "total_loans": int(row["count"]),
            "default_rate": round(float(row["mean"]), 4)
        }
        for _, row in home_df.iterrows() if str(row["home_ownership"]) not in ["NAN", "NONE", "OTHER"]
    }

    # Default by Purpose
    purpose_df = df_clean.groupby("purpose")[TARGET_COL].agg(["count", "mean"]).reset_index()
    default_by_purpose = {
        str(row["purpose"]).lower(): {
            "total_loans": int(row["count"]),
            "default_rate": round(float(row["mean"]), 4)
        }
        for _, row in purpose_df.iterrows() if str(row["purpose"]) != "NAN"
    }

    # 4. Numerical Distributions & Stats
    num_cols_to_analyze = ["loan_amnt", "int_rate", "annual_inc", "dti", "installment", "revol_bal", "total_acc"]
    numerical_distributions = {}

    for col in num_cols_to_analyze:
        if col in df_clean.columns:
            s = df_clean[col].dropna()
            # Trim extreme outliers for histogram bins (e.g. 99th percentile)
            p99 = float(s.quantile(0.99))
            p01 = float(s.quantile(0.01))
            filtered_s = s[(s >= p01) & (s <= p99)]
            
            # Compute histogram bins
            counts, bin_edges = np.histogram(filtered_s, bins=12)
            bins = [
                {
                    "bin_start": round(float(bin_edges[i]), 2),
                    "bin_end": round(float(bin_edges[i+1]), 2),
                    "bin_label": f"{round(float(bin_edges[i]))}-{round(float(bin_edges[i+1]))}",
                    "count": int(counts[i])
                }
                for i in range(len(counts))
            ]

            # Non-default vs default means
            non_def_mean = float(df_clean[df_clean[TARGET_COL] == 0][col].mean())
            def_mean = float(df_clean[df_clean[TARGET_COL] == 1][col].mean())

            numerical_distributions[col] = {
                "mean": round(float(s.mean()), 2),
                "median": round(float(s.median()), 2),
                "std": round(float(s.std()), 2),
                "min": round(float(s.min()), 2),
                "max": round(float(s.max()), 2),
                "non_default_mean": round(non_def_mean, 2),
                "default_mean": round(def_mean, 2),
                "bins": bins
            }

    # 5. Correlation Matrix
    corr_cols = [c for c in num_cols_to_analyze if c in df_clean.columns] + [TARGET_COL]
    corr_df = df_clean[corr_cols].corr()
    correlation_matrix = {
        col: {c: round(float(val), 3) for c, val in row.items()}
        for col, row in corr_df.iterrows()
    }

    eda_data = {
        "dataset_summary": {
            "total_records": total_records,
            "total_features": total_features,
            "target_distribution": target_dist,
            "default_rate": round(default_rate, 4),
            "missing_values": missing_dict,
            "duplicate_records": duplicate_records,
            "numerical_columns": NUMERICAL_FEATURES,
            "categorical_columns": CATEGORICAL_FEATURES
        },
        "default_by_grade": default_by_grade,
        "default_by_term": default_by_term,
        "default_by_home_ownership": default_by_home,
        "default_by_purpose": default_by_purpose,
        "numerical_distributions": numerical_distributions,
        "correlation_matrix": correlation_matrix
    }

    return eda_data


def generate_eda_json_cache(output_path: str = None) -> str:
    """Generates and saves the EDA JSON summary cache for fast API serving."""
    if output_path is None:
        output_path = os.path.join(settings.BASE_DIR, "data", "eda_summary.json")
    
    data = compute_eda_summary()
    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)
    return output_path
