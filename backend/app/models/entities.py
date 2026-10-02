import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Applicant(Base):
    __tablename__ = "applicants"

    applicant_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, default="Applicant")
    age = Column(Integer, nullable=True)
    income = Column(Float, nullable=False)
    employment_type = Column(String(100), nullable=True)
    credit_score = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    loans = relationship("Loan", back_populates="applicant", cascade="all, delete-orphan")


class Loan(Base):
    __tablename__ = "loans"

    loan_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    applicant_id = Column(Integer, ForeignKey("applicants.applicant_id"), nullable=False)
    loan_amount = Column(Float, nullable=False)
    loan_term = Column(Integer, nullable=False)
    interest_rate = Column(Float, nullable=False)
    purpose = Column(String(100), nullable=True)
    grade = Column(String(10), nullable=True)
    sub_grade = Column(String(10), nullable=True)
    dti = Column(Float, nullable=True)
    home_ownership = Column(String(50), nullable=True)
    verification_status = Column(String(50), nullable=True)
    loan_status = Column(Integer, nullable=True)  # 0: non-default, 1: default (if known)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    applicant = relationship("Applicant", back_populates="loans")
    predictions = relationship("Prediction", back_populates="loan", cascade="all, delete-orphan")


class ModelRegistry(Base):
    __tablename__ = "model_registry"

    model_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    auc_score = Column(Float, nullable=True)
    status = Column(String(50), default="active")  # 'active', 'archived', 'candidate'
    metrics_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    predictions = relationship("Prediction", back_populates="model_registry")


class Prediction(Base):
    __tablename__ = "predictions"

    prediction_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    loan_id = Column(Integer, ForeignKey("loans.loan_id"), nullable=False)
    model_id = Column(Integer, ForeignKey("model_registry.model_id"), nullable=True)
    default_probability = Column(Float, nullable=False)
    risk_category = Column(String(50), nullable=False)
    shap_summary = Column(JSON, nullable=True)
    input_data = Column(JSON, nullable=True)
    prediction_time = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    loan = relationship("Loan", back_populates="predictions")
    model_registry = relationship("ModelRegistry", back_populates="predictions")
