import re
import numpy as np
import pandas as pd
from typing import Tuple, List, Dict, Any, Optional
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder, RobustScaler

# Target definition
TARGET_COL = "loan_status"

# Excluded columns to strictly prevent data leakage and drop identifiers
LEAKAGE_COLUMNS = [
    "out_prncp",
    "out_prncp_inv",
    "total_pymnt",
    "total_pymnt_inv",
    "total_rec_prncp",
    "total_rec_int",
    "total_rec_late_fee",
    "recoveries",
    "collection_recovery_fee",
    "last_pymnt_d",
    "last_pymnt_amnt",
    "last_credit_pull_d"
]

IDENTIFIER_COLUMNS = [
    "id",
    "member_id",
    "url",
    "desc",
    "title",
    "emp_title",
    "zip_code",
    "issue_d",
    "earliest_cr_line",
    "mths_since_last_delinq",
    "mths_since_last_record"
]

# Core Application-Time Features
NUMERICAL_FEATURES = [
    "loan_amnt",
    "term",
    "int_rate",
    "installment",
    "annual_inc",
    "dti",
    "delinq_2yrs",
    "inq_last_6mths",
    "open_acc",
    "pub_rec",
    "revol_bal",
    "revol_util",
    "total_acc",
    "pub_rec_bankruptcies",
    "emp_length"
]

CATEGORICAL_FEATURES = [
    "grade",
    "sub_grade",
    "home_ownership",
    "verification_status",
    "purpose"
]

ALL_FEATURE_COLS = NUMERICAL_FEATURES + CATEGORICAL_FEATURES


def parse_emp_length(val: Any) -> float:
    """Converts emp_length string like '10+ years', '< 1 year', '3 years' to numeric float."""
    if pd.isna(val) or val is None:
        return 3.0  # median fallback
    val_str = str(val).strip().lower()
    if "<" in val_str:
        return 0.0
    if "10+" in val_str:
        return 10.0
    match = re.search(r"(\d+)", val_str)
    if match:
        return float(match.group(1))
    return 3.0


def parse_percentage(val: Any) -> float:
    """Converts percentage string like '13.56%' or numeric 13.56 to float."""
    if pd.isna(val) or val is None:
        return np.nan
    if isinstance(val, (int, float)):
        return float(val)
    val_str = str(val).strip().replace("%", "")
    try:
        return float(val_str)
    except ValueError:
        return np.nan


def parse_term(val: Any) -> int:
    """Converts term string like '36 months' or integer 36 to int."""
    if pd.isna(val) or val is None:
        return 36
    if isinstance(val, (int, float)):
        return int(val)
    val_str = str(val).strip().lower()
    if "60" in val_str:
        return 60
    return 36


def clean_raw_dataframe(df: pd.DataFrame, is_training: bool = True) -> pd.DataFrame:
    """Cleans raw dataframe: fixes percentage formats, term, emp_length, and drops leaks."""
    df_clean = df.copy()

    # Drop leakage and identifier columns if present
    cols_to_drop = [c for c in LEAKAGE_COLUMNS + IDENTIFIER_COLUMNS if c in df_clean.columns]
    if cols_to_drop:
        df_clean.drop(columns=cols_to_drop, inplace=True)

    # Clean numerical columns
    if "int_rate" in df_clean.columns:
        df_clean["int_rate"] = df_clean["int_rate"].apply(parse_percentage)
    if "revol_util" in df_clean.columns:
        df_clean["revol_util"] = df_clean["revol_util"].apply(parse_percentage)
    if "term" in df_clean.columns:
        df_clean["term"] = df_clean["term"].apply(parse_term)
    if "emp_length" in df_clean.columns:
        df_clean["emp_length"] = df_clean["emp_length"].apply(parse_emp_length)

    # Compute installment if missing
    if "installment" in df_clean.columns and "loan_amnt" in df_clean.columns and "int_rate" in df_clean.columns:
        missing_inst = df_clean["installment"].isna()
        if missing_inst.any():
            r = df_clean.loc[missing_inst, "int_rate"] / 1200.0
            n = df_clean.loc[missing_inst, "term"]
            p = df_clean.loc[missing_inst, "loan_amnt"]
            calculated = p * (r * (1 + r) ** n) / ((1 + r) ** n - 1)
            df_clean.loc[missing_inst, "installment"] = calculated.fillna(p / n)

    # Ensure required categorical strings are trimmed/standardized
    for col in CATEGORICAL_FEATURES:
        if col in df_clean.columns:
            df_clean[col] = df_clean[col].astype(str).str.strip().str.upper()

    return df_clean


def build_preprocessor() -> ColumnTransformer:
    """Builds a scikit-learn ColumnTransformer for preprocessing numerical & categorical features."""
    num_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", RobustScaler())  # Robust against extreme income/debt outliers
    ])

    cat_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="constant", fill_value="UNKNOWN")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", num_pipeline, NUMERICAL_FEATURES),
            ("cat", cat_pipeline, CATEGORICAL_FEATURES)
        ],
        remainder="drop"
    )

    return preprocessor


def prepare_training_data(csv_path: str) -> Tuple[pd.DataFrame, pd.Series, ColumnTransformer]:
    """Loads CSV dataset, cleans it, extracts X and y, and returns raw feature matrix and preprocessor."""
    df_raw = pd.read_csv(csv_path)
    df_clean = clean_raw_dataframe(df_raw, is_training=True)

    if TARGET_COL not in df_clean.columns:
        raise ValueError(f"Target column '{TARGET_COL}' not found in dataset.")

    # Filter any row where target is NaN
    df_clean = df_clean.dropna(subset=[TARGET_COL])
    df_clean[TARGET_COL] = df_clean[TARGET_COL].astype(int)

    # Make sure all required feature columns exist (create with NaN if absent)
    for col in ALL_FEATURE_COLS:
        if col not in df_clean.columns:
            df_clean[col] = np.nan

    X = df_clean[ALL_FEATURE_COLS]
    y = df_clean[TARGET_COL]

    preprocessor = build_preprocessor()

    return X, y, preprocessor


def format_single_input(data: Dict[str, Any]) -> pd.DataFrame:
    """Formats a single dictionary request into a cleaned DataFrame matching ALL_FEATURE_COLS."""
    data_copy = dict(data)
    
    # Pre-parse individual fields
    data_copy["int_rate"] = parse_percentage(data_copy.get("int_rate"))
    data_copy["revol_util"] = parse_percentage(data_copy.get("revol_util"))
    data_copy["term"] = parse_term(data_copy.get("term"))
    data_copy["emp_length"] = parse_emp_length(data_copy.get("emp_length"))

    # Compute installment if absent
    if not data_copy.get("installment") and data_copy.get("loan_amnt") and data_copy.get("int_rate"):
        r = data_copy["int_rate"] / 1200.0
        n = data_copy["term"]
        p = data_copy["loan_amnt"]
        try:
            data_copy["installment"] = p * (r * (1 + r) ** n) / ((1 + r) ** n - 1)
        except ZeroDivisionError:
            data_copy["installment"] = p / n

    # Build DataFrame
    df = pd.DataFrame([data_copy])

    # Guarantee all feature columns exist
    for col in ALL_FEATURE_COLS:
        if col not in df.columns:
            df[col] = np.nan

    # Ensure categorical are upper-cased
    for col in CATEGORICAL_FEATURES:
        df[col] = df[col].astype(str).str.strip().str.upper()

    return df[ALL_FEATURE_COLS]
