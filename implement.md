# Loan Default Prediction & Risk Analysis System

## 1. Project Overview

Build a full-stack machine-learning web application for **Loan Default Prediction**.

The system should analyze applicant and loan information and predict the probability that a loan will default.

The application should provide:

* Applicant/loan data input
* Loan default prediction
* Default probability
* Risk category
* Explainable AI using SHAP
* Prediction history
* Model performance information
* Dataset/EDA dashboard
* Model monitoring
* REST APIs
* PostgreSQL database
* Modern responsive frontend

The project is intended as an **academic/prototype banking analytics system** using the provided `loan_train.csv` dataset. It must not claim that the dataset is actual Bank Muscat customer data.

---

# 2. Technology Stack

Use only the following core technologies unless absolutely necessary:

| Layer                  | Technology            |
| ---------------------- | --------------------- |
| Programming Language   | Python 3.11           |
| Data Processing        | Pandas, NumPy         |
| Machine Learning       | Scikit-learn, XGBoost |
| Explainable AI         | SHAP                  |
| Frontend               | React                 |
| Backend                | FastAPI               |
| Database               | PostgreSQL            |
| Database Connectivity  | SQLAlchemy            |
| Model Tracking         | MLflow                |
| Drift Monitoring       | Evidently             |
| API Testing            | Swagger / Postman     |
| Containerization       | Docker                |
| Cloud-ready Deployment | AWS ECS               |
| Version Control        | Git / GitHub          |

Do not introduce unnecessary frameworks or technologies.

---

# 3. Dataset

Use the provided:

`loan_train.csv`

The dataset contains approximately:

* 27,003 records
* 47 columns
* Numerical and categorical features
* Target column: `loan_status`

Target:

```text
loan_status = 0 → Non-default
loan_status = 1 → Default
```

Observed target distribution:

```text
Non-default: 23,026
Default:      3,977
```

The target is imbalanced, so model evaluation must not rely only on accuracy.

Use:

* Precision
* Recall
* F1-score
* ROC-AUC
* PR-AUC
* Confusion Matrix

---

# 4. Data Preprocessing

Create a reproducible preprocessing pipeline.

## 4.1 Data Cleaning

Handle:

* Missing values
* Duplicate records
* Incorrect data types
* Percentage-formatted values
* Categorical values
* Numerical outliers

For example, convert:

```text
13.56%
```

into:

```text
13.56
```

for `int_rate`.

---

# 5. Prevent Data Leakage

This is critical.

Do NOT use information that becomes available only after the loan has been issued.

Exclude post-loan/payment-related fields such as:

```text
out_prncp
out_prncp_inv
total_pymnt
total_pymnt_inv
total_rec_prncp
total_rec_int
total_rec_late_fee
recoveries
collection_recovery_fee
last_pymnt_d
last_pymnt_amnt
```

Also exclude identifiers or unsuitable high-cardinality fields such as:

```text
id
member_id
url
desc
title
emp_title
zip_code
```

Columns with extremely high missingness should be evaluated and either removed or handled appropriately.

---

# 6. Initial Model Features

Use relevant application-time features such as:

```text
loan_amnt
funded_amnt
funded_amnt_inv
term
int_rate
installment
grade
sub_grade
emp_length
home_ownership
annual_inc
verification_status
purpose
dti
delinq_2yrs
inq_last_6mths
open_acc
pub_rec
revol_bal
revol_util
total_acc
pub_rec_bankruptcies
```

Target:

```text
loan_status
```

The application should automatically adapt if some columns are unavailable after preprocessing.

---

# 7. EDA Module

Create an EDA notebook/script and expose important results in the frontend dashboard.

Perform:

### Dataset Overview

Display:

* Number of rows
* Number of columns
* Numerical features
* Categorical features
* Missing values
* Duplicate count

### Target Analysis

Show:

* Default vs non-default count
* Default percentage
* Class imbalance chart

### Numerical Analysis

Generate:

* Histograms
* Boxplots
* Mean/median
* Min/max
* Outlier analysis

Important features:

* annual_inc
* loan_amnt
* int_rate
* dti
* installment
* revol_bal
* total_acc

### Categorical Analysis

Analyze default rate by:

* grade
* sub_grade
* term
* home_ownership
* verification_status
* purpose
* emp_length

### Correlation Analysis

Generate a numerical correlation heatmap.

Do not assume correlation means causation.

### Important EDA observations

The current dataset shows:

* 60-month loans have a higher observed default rate than 36-month loans.
* Default rate increases across credit grades from A toward G.
* Defaulted loans have higher average interest rates.
* Defaulted borrowers have lower average annual income.
* Defaulted loans have somewhat higher average loan amounts.

These should be presented as dataset observations, not causal claims.

---

# 8. Machine Learning Pipeline

Build three models:

## Model 1 — Logistic Regression

Purpose:

* Baseline model
* Interpretable
* Probability prediction

## Model 2 — Random Forest

Purpose:

* Non-linear relationships
* Feature importance
* Robust baseline tree model

## Model 3 — XGBoost

Purpose:

* Strong gradient boosting model
* Non-linear relationships
* Final candidate model

Do not hard-code a model as the winner.

Select the production candidate based on validation performance.

---

# 9. Train/Test Split

Use a stratified train/test split because the target is imbalanced.

Example:

```text
80% Training
20% Testing
```

Use a fixed random seed for reproducibility.

Never fit preprocessing transformations using the test dataset.

---

# 10. Handling Class Imbalance

Because only approximately 14.7% of records are defaults:

Evaluate class imbalance handling.

For Logistic Regression:

```text
class_weight="balanced"
```

For Random Forest:

```text
class_weight="balanced"
```

For XGBoost, evaluate an appropriate class-weighting strategy such as `scale_pos_weight`.

Compare performance rather than assuming balancing automatically improves the model.

Do not use SMOTE unless it is actually required and validated.

---

# 11. Model Evaluation

Create a model comparison table:

| Model               | Accuracy | Precision | Recall | F1 | ROC-AUC | PR-AUC |
| ------------------- | -------: | --------: | -----: | -: | ------: | -----: |
| Logistic Regression |          |           |        |    |         |        |
| Random Forest       |          |           |        |    |         |        |
| XGBoost             |          |           |        |    |         |        |

Also generate:

* Confusion matrix
* ROC curve
* Precision-Recall curve
* Feature importance

The application must display these metrics dynamically from actual training results.

Never hard-code model performance values.

---

# 12. SHAP Explainability

Integrate SHAP for model explainability.

For every prediction, show:

### Prediction

```text
Default Probability: 72%
Risk Category: High
```

### Explanation

Show the features that contributed most to the prediction.

Example:

```text
Higher interest rate       → Increased risk
High DTI                   → Increased risk
Lower annual income        → Increased risk
Higher credit grade risk   → Increased risk
```

The exact explanation must come from the trained model's SHAP values.

Do not hard-code explanations.

Provide:

* Global feature importance
* Individual prediction explanation
* SHAP bar chart
* SHAP waterfall/feature contribution visualization where appropriate

---

# 13. Risk Classification

Convert predicted probability into a simple risk category.

Use configurable thresholds rather than hard-coding them throughout the application.

Initial configuration:

```text
0.00 – 0.30 → Low Risk
0.30 – 0.60 → Medium Risk
0.60 – 1.00 → High Risk
```

Keep these thresholds configurable from the backend configuration.

The probability should remain visible even when a category is displayed.

---

# 14. Backend — FastAPI

Build a clean REST API.

Suggested endpoints:

### Health

```http
GET /health
```

Returns system/API status.

### Dataset

```http
GET /api/dataset/summary
```

Returns:

* rows
* columns
* missing values
* target distribution

### Model Information

```http
GET /api/models
```

Returns available models and their metrics.

### Prediction

```http
POST /api/predict
```

Accept applicant and loan information.

Example:

```json
{
  "loan_amnt": 10000,
  "term": 36,
  "int_rate": 12.5,
  "annual_inc": 60000,
  "dti": 15.2,
  "grade": "B",
  "home_ownership": "RENT",
  "verification_status": "Verified",
  "purpose": "debt_consolidation"
}
```

Response:

```json
{
  "default_probability": 0.24,
  "risk_category": "Low",
  "model": "XGBoost",
  "model_version": "1.0"
}
```

### Explanation

```http
POST /api/predict/explain
```

Returns prediction plus SHAP feature contributions.

### Prediction History

```http
GET /api/predictions
```

Returns previous predictions.

### Prediction Details

```http
GET /api/predictions/{prediction_id}
```

### Model Metrics

```http
GET /api/model/metrics
```

### EDA Summary

```http
GET /api/eda/summary
```

---

# 15. PostgreSQL Database

Use four main tables.

## Applicants

```text
applicant_id
name
age
income
employment_type
credit_score
created_at
```

## Loans

```text
loan_id
applicant_id
loan_amount
loan_term
interest_rate
loan_status
created_at
```

Relationship:

```text
Applicants 1 ──── N Loans
```

## Predictions

```text
prediction_id
loan_id
model_id
default_probability
risk_category
prediction_time
```

Relationship:

```text
Loans 1 ──── N Predictions
```

## Model Registry

```text
model_id
model_name
version
auc_score
status
created_at
```

Relationship:

```text
Model Registry 1 ──── N Predictions
```

Use foreign keys.

Recommended:

```text
Loans.applicant_id → Applicants.applicant_id

Predictions.loan_id → Loans.loan_id

Predictions.model_id → ModelRegistry.model_id
```

---

# 16. SQLAlchemy

Use SQLAlchemy for database connectivity.

Create separate database modules for:

```text
database connection
models
schemas
CRUD operations
```

Use environment variables for database credentials.

Example:

```text
DATABASE_URL
```

Never hard-code passwords or credentials.

---

# 17. Frontend — React

Build a modern responsive banking analytics dashboard.

Main pages:

## 17.1 Dashboard

Display:

* Total applications
* Default rate
* Non-default rate
* Number of predictions
* Current model
* ROC-AUC
* Recent predictions

Include charts.

---

# 18. Prediction Page

Create a form where the user enters:

### Applicant Information

* Annual income
* Employment length
* Home ownership
* Verification status

### Loan Information

* Loan amount
* Term
* Interest rate
* Purpose
* Grade
* Sub-grade
* DTI

### Output

After clicking:

```text
Predict Default Risk
```

show:

```text
Default Probability
Risk Category
Model Used
Model Version
```

Use a visual risk indicator.

---

# 19. Explainability Page

After prediction display:

```text
Why was this prediction made?
```

Show:

* SHAP feature contribution
* Positive risk contributors
* Negative risk contributors
* Feature values

Example:

```text
Feature              Contribution
Interest Rate        +0.18
DTI                  +0.12
Annual Income        -0.08
Loan Amount          +0.06
```

Use actual SHAP results.

---

# 20. Model Performance Page

Show:

* Logistic Regression metrics
* Random Forest metrics
* XGBoost metrics
* ROC-AUC
* Precision
* Recall
* F1
* PR-AUC

Charts:

* ROC curve
* Precision-Recall curve
* Confusion matrix
* Feature importance

---

# 21. EDA Dashboard

Create a page showing:

### Dataset Statistics

```text
Rows
Columns
Missing Values
Duplicate Rows
```

### Default Distribution

Pie/bar chart.

### Default by Grade

Bar chart.

### Default by Term

Bar chart.

### Income Distribution

Histogram.

### Loan Amount Distribution

Histogram/boxplot.

### Interest Rate Distribution

Histogram/boxplot.

### Correlation Heatmap

Display relevant numerical correlations.

---

# 22. Prediction History

Create a table:

| ID | Loan | Probability | Risk | Model | Date |
| -- | ---- | ----------: | ---- | ----- | ---- |

Allow:

* Search
* Filtering
* Sorting
* View prediction details

---

# 23. MLflow

Use MLflow to track:

* Experiment name
* Model name
* Parameters
* Metrics
* Model version
* Training timestamp

Track:

```text
accuracy
precision
recall
f1
roc_auc
pr_auc
```

Register trained models.

The backend should know which model/version is currently active.

---

# 24. Evidently Monitoring

Implement basic model/data monitoring.

Monitor:

* Feature distribution
* Missing values
* Data drift
* Prediction distribution

Create a monitoring page displaying:

```text
Feature
Drift Status
Drift Score
```

The monitoring system should be designed so that new prediction/application data can be compared with the training/reference data.

---

# 25. Project Structure

Use a clean structure similar to:

```text
loan-default-prediction/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routes/
│   │   ├── services/
│   │   └── ml/
│   │       ├── preprocessing.py
│   │       ├── train.py
│   │       ├── predict.py
│   │       ├── evaluate.py
│   │       └── explain.py
│   │
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   └── App.jsx
│   └── package.json
│
├── data/
│   └── loan_train.csv
│
├── notebooks/
│   └── eda.ipynb
│
├── models/
│
├── mlruns/
│
├── monitoring/
│
├── docker/
│
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

Keep the architecture modular.

Do not place all logic inside a single Python file.

---

# 26. Database Connection Management

Use SQLAlchemy with connection pooling.

Configuration should come from:

```text
.env
```

Example:

```text
DATABASE_URL=postgresql://username:password@localhost:5432/loan_db
```

Never commit `.env` to GitHub.

Provide:

```text
.env.example
```

instead.

---

# 27. Security

Implement basic security practices:

* Environment variables for secrets
* No hard-coded database passwords
* Input validation using Pydantic
* SQLAlchemy parameterized queries
* CORS configuration
* API validation
* No sensitive information in logs

Since this is an academic prototype, do not claim production banking security certification.

---

# 28. Docker

Create Docker configuration for:

```text
Frontend
Backend
PostgreSQL
```

Use Docker Compose for local development.

The application should be startable with a simple command.

Example:

```bash
docker compose up
```

---

# 29. API Documentation

FastAPI should automatically provide:

```text
Swagger UI
```

Document every endpoint with:

* Description
* Request parameters
* Request body
* Response format
* Error responses

---

# 30. Error Handling

Implement proper API errors.

Examples:

```text
400 → Invalid input
404 → Resource not found
422 → Validation error
500 → Internal server error
```

Frontend should show user-friendly error messages.

Do not expose stack traces to users.

---

# 31. User Experience

The UI should look like a modern banking analytics application.

Requirements:

* Responsive design
* Clean dashboard
* Cards for KPIs
* Tables
* Charts
* Forms
* Loading states
* Error states
* Empty states
* Clear navigation

Main navigation:

```text
Dashboard
Prediction
Prediction History
EDA
Model Performance
Explainability
Monitoring
```

---

# 32. Important ML Rules

Follow these rules strictly:

1. Never train using the test dataset.
2. Never use post-loan information as prediction features.
3. Never hard-code model performance.
4. Never hard-code SHAP explanations.
5. Save preprocessing and model together or ensure identical preprocessing at inference.
6. Use the same feature order during training and prediction.
7. Handle categorical features consistently.
8. Store model version with every prediction.
9. Keep random seeds reproducible.
10. Save trained models so the API does not retrain on every request.

---

# 33. Expected User Flow

```text
User opens application
        ↓
Dashboard
        ↓
Prediction Page
        ↓
Enter applicant + loan information
        ↓
Frontend sends POST /api/predict
        ↓
FastAPI validates request
        ↓
Preprocessing pipeline
        ↓
Trained ML model
        ↓
Default probability
        ↓
Risk classification
        ↓
Save prediction in PostgreSQL
        ↓
Return result to frontend
        ↓
Display probability + risk
        ↓
Generate SHAP explanation
        ↓
User can view explanation/history
```

---

# 34. Expected Final Output

The completed application should allow a user to:

1. Explore the loan dataset.
2. View default statistics.
3. Train/evaluate ML models.
4. Compare Logistic Regression, Random Forest and XGBoost.
5. Enter new loan information.
6. Get a default probability.
7. Get Low/Medium/High risk classification.
8. Understand the prediction using SHAP.
9. Store prediction results in PostgreSQL.
10. View prediction history.
11. View model metrics.
12. Monitor data drift.
13. Access all backend functionality through FastAPI.
14. Run the complete project using Docker.

---

# 35. Documentation

Generate a complete README containing:

* Project overview
* Problem statement
* Features
* Dataset description
* EDA
* ML methodology
* Architecture
* Tech stack
* Database schema
* API documentation
* Installation
* Environment variables
* Running locally
* Docker instructions
* Model training
* Model evaluation
* SHAP explanation
* Monitoring
* Future scope

---

# 36. Development Priority

Build the project in this order:

### Phase 1

Dataset loading + EDA + preprocessing

### Phase 2

Train Logistic Regression, Random Forest and XGBoost

### Phase 3

Evaluate and compare models

### Phase 4

SHAP explainability

### Phase 5

FastAPI backend

### Phase 6

PostgreSQL + SQLAlchemy

### Phase 7

React frontend

### Phase 8

Prediction history

### Phase 9

MLflow

### Phase 10

Evidently monitoring

### Phase 11

Docker

### Phase 12

Testing + README + final integration

---

# 37. Final Requirement

The final application should be a **working end-to-end system**, not merely a UI mockup.

All important dashboard values, prediction results, model metrics, database records and SHAP explanations must come from actual backend/ML/database functionality.

Avoid fake data, placeholder metrics and hard-coded prediction results.

The system should be easy to run locally, easy to demonstrate during a college project/viva, and structured so that it can later be deployed to AWS ECS.
