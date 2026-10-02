import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "Loan Default Prediction & Risk Analysis System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./loan_default.db")
    
    # Risk Thresholds
    LOW_RISK_THRESHOLD: float = 0.30
    HIGH_RISK_THRESHOLD: float = 0.60
    
    # Paths
    BASE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    DATA_PATH: str = os.path.join(BASE_DIR, "data", "loan_train.csv")
    MODEL_DIR: str = os.path.join(BASE_DIR, "models")
    MLFLOW_TRACKING_URI: str = os.path.join(BASE_DIR, "mlruns")
    EXPERIMENT_NAME: str = "loan-default-prediction"
    
    # Active Model Name (e.g. 'XGBoost', 'Random Forest', 'Logistic Regression')
    ACTIVE_MODEL: str = "XGBoost"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
