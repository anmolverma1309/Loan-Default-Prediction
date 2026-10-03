# CreditShield AI — Loan Default Prediction & Risk Analysis System

[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.14-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.131-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-1.8-F7931E.svg)](https://scikit-learn.org/)
[![XGBoost](https://img.shields.io/badge/XGBoost-Ensemble-red.svg)](https://xgboost.readthedocs.io/)
[![SHAP](https://img.shields.io/badge/SHAP-Explainable%20AI-purple.svg)](https://shap.readthedocs.io/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-red.svg)](https://www.sqlalchemy.org/)

An enterprise-grade, end-to-end Machine Learning banking analytics application for predicting loan default risk probabilities, categorizing risk tiers, explaining individual applicant decisions using SHAP (SHapley Additive exPlanations), and continuously monitoring distribution drift.

---

## 1. System Architecture

```
                                  +-----------------------------+
                                  |     React 18 Dashboard      |
                                  | (Vite + Modern Vanilla CSS) |
                                  +--------------+--------------+
                                                 |
                                         REST API (JSON)
                                                 |
                                  +--------------v--------------+
                                  |       FastAPI Backend       |
                                  |      (Python 3.11/3.14)     |
                                  +-------+--------------+------+
                                          |              |
                      +-------------------+              +--------------------+
                      |                                                       |
          +-----------v-----------+                               +-----------v-----------+
          |  SQLAlchemy ORM Layer |                               |  ML Pipeline & Engine |
          | (PostgreSQL / SQLite) |                               | (Cleaners & Models)   |
          +-----------+-----------+                               +-----------+-----------+
                      |                                                       |
          +-----------+-----------+                      +--------------------+--------------------+
          | Tables:               |                      |                    |                    |
          | - applicants          |             +--------v-------+   +--------v-------+   +--------v-------+
          | - loans               |             |  Logistic Reg  |   |  Random Forest |   |    XGBoost     |
          | - model_registry      |             |   (Baseline)   |   | (Tree Ensemble)|   | (Champion AUC) |
          | - predictions         |             +----------------+   +----------------+   +----------------+
          +-----------------------+                                           |
                                                                  +-----------v-----------+
                                                                  |  SHAP TreeExplainer   |
                                                                  | (Feature Attribution) |
                                                                  +-----------------------+
```

---

## 2. Dataset & Exploratory Data Analysis (EDA)

* **Dataset**: `loan_train.csv` (27,003 records, 47 attributes)
* **Target**: `loan_status` (Binary: `0` = Non-default, `1` = Default)
* **Observed Class Imbalance**:
  * Non-Default: `23,026` (~85.27%)
  * Default: `3,977` (~14.73%)
* **Key Observations**:
  1. **Term Impact**: 60-month loan terms carry substantially higher empirical default rates than 36-month terms.
  2. **Credit Grade**: Default frequency scales monotonically across credit grades from `A` toward `G`.
  3. **Financial Burden**: Higher Debt-to-Income (DTI) and interest rates strongly correlate with higher default propensity.

---

## 3. Strict Data Leakage Prevention

To ensure strict production validity, the modeling pipeline excludes all post-loan issuance fields and non-predictive identifiers:
* **Post-issuance dropped columns**: `out_prncp`, `out_prncp_inv`, `total_pymnt`, `total_pymnt_inv`, `total_rec_prncp`, `total_rec_int`, `total_rec_late_fee`, `recoveries`, `collection_recovery_fee`, `last_pymnt_d`, `last_pymnt_amnt`, `last_credit_pull_d`.
* **High-cardinality & ID columns**: `id`, `member_id`, `url`, `desc`, `title`, `emp_title`, `zip_code`.

---

## 4. Machine Learning & Explainable AI (SHAP)

### Model Candidates Evaluated:
1. **Logistic Regression**: Scaled baseline with balanced class weights.
2. **Random Forest**: 150-tree ensemble with robust outlier scaling.
3. **XGBoost Classifier**: Gradient boosted trees tuned with `scale_pos_weight` to address target imbalance.

### Dynamic Metrics Tracked:
* **Accuracy, Precision, Recall, F1-Score, ROC-AUC, PR-AUC, and Confusion Matrix**.

### Explainable AI (SHAP):
Every prediction computes exact feature contributions using SHAP:
* **Positive Risk Drivers**: Attributes that push the applicant's default probability higher (e.g. high interest rate, high DTI).
* **Mitigating Factors**: Attributes that lower the default probability (e.g. high annual income, prime credit grade).

---

## 5. Risk Classification Tiers

Default probabilities are classified using configurable thresholds:
* `0.00 - 0.30` $\rightarrow$ **Low Risk** (Green)
* `0.30 - 0.60` $\rightarrow$ **Medium Risk** (Amber)
* `0.60 - 1.00` $\rightarrow$ **High Risk** (Rose/Red)

---

## 6. PostgreSQL Database Schema

* `applicants`: ID, name, age, income, employment_type, credit_score, created_at.
* `loans`: ID, applicant_id, loan_amount, loan_term, interest_rate, purpose, grade, dti, created_at.
* `model_registry`: ID, model_name, version, auc_score, status, metrics_json, created_at.
* `predictions`: ID, loan_id, model_id, default_probability, risk_category, shap_summary, input_data, prediction_time.

---

## 7. REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | System health check & active model status |
| `GET` | `/api/dataset/summary` | Total records, missingness, class distribution |
| `GET` | `/api/eda/summary` | Full EDA statistical metrics & correlation matrix |
| `GET` | `/api/models` | Comparative model benchmarks (ROC-AUC, F1, PR-AUC) |
| `POST` | `/api/predict` | Predict loan default risk and persist to database |
| `POST` | `/api/predict/explain` | Predict loan default risk + SHAP explanation |
| `GET` | `/api/predictions` | Paginated prediction audit history |
| `GET` | `/api/predictions/{id}` | Complete applicant prediction detail with SHAP |
| `GET` | `/api/monitoring/drift` | Kolmogorov-Smirnov 2-sample data drift tests |

---

## 8. Getting Started & Running Locally

### Prerequisites
* Python 3.11+
* Node.js 18+ and npm
* Docker & Docker Compose (optional)

### Quick Start (Local Development)

#### 1. Backend Setup:
```bash
# Install backend requirements
pip install -r backend/requirements.txt

# Run model training pipeline (generates models & metrics)
python -m backend.app.ml.train

# Start FastAPI server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

#### 2. Frontend Setup:
```bash
cd frontend
npm install
npm run dev
```
Frontend Web Dashboard: [http://localhost:5173](http://localhost:5173)

---

## 9. Running with Docker Compose

Run the entire full-stack system (PostgreSQL + FastAPI + React + Nginx):
```bash
docker compose up --build
```
* **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
* **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **PostgreSQL Database**: `localhost:5432` (database: `loan_db`, user: `postgres`)
