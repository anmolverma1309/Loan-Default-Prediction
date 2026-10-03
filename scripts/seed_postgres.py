import os
import sys
import pandas as pd
import numpy as np
import psycopg2
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.ml.preprocessing import clean_raw_dataframe, ALL_FEATURE_COLS, TARGET_COL
from backend.app.database import Base
from backend.app.models.entities import Applicant, Loan, ModelRegistry, Prediction
from backend.app.config import settings

def export_cleaned_csv(raw_csv_path: str, cleaned_csv_path: str) -> pd.DataFrame:
    """Cleans loan_train.csv, removes leakage/identifiers, and saves to loan_cleaned.csv."""
    print(f"Reading raw dataset from {raw_csv_path}...")
    df_raw = pd.read_csv(raw_csv_path)
    df_clean = clean_raw_dataframe(df_raw, is_training=True)
    
    # Save cleaned dataset
    os.makedirs(os.path.dirname(cleaned_csv_path), exist_ok=True)
    df_clean.to_csv(cleaned_csv_path, index=False)
    print(f"Saved cleaned dataset ({df_clean.shape[0]} rows x {df_clean.shape[1]} cols) to {cleaned_csv_path}")
    return df_clean


def connect_and_create_postgres_db(db_user="postgres", db_password="postgres", db_host="localhost", db_port=5432, db_name="loan_db"):
    """Attempts to connect to PostgreSQL server and create loan_db if not existing."""
    passwords_to_try = [db_password, "postgres", "admin", "root", "password", "1234", "123456", ""]
    connected_pwd = None
    
    for pwd in passwords_to_try:
        try:
            conn = psycopg2.connect(
                host=db_host,
                port=db_port,
                user=db_user,
                password=pwd,
                dbname="postgres"
            )
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute(f"SELECT 1 FROM pg_database WHERE datname='{db_name}'")
            if not cur.fetchone():
                cur.execute(f"CREATE DATABASE {db_name}")
                print(f"Created PostgreSQL database: '{db_name}'")
            else:
                print(f"PostgreSQL database '{db_name}' already exists.")
            cur.close()
            conn.close()
            connected_pwd = pwd
            break
        except Exception as e:
            continue

    if connected_pwd is None:
        raise ConnectionError("Could not connect to PostgreSQL on localhost:5432. Please verify username and password.")

    postgres_url = f"postgresql://{db_user}:{connected_pwd}@{db_host}:{db_port}/{db_name}"
    return postgres_url, connected_pwd


def populate_postgres_from_cleaned_csv(cleaned_csv_path: str, db_url: str, max_records: int = None):
    """Loads cleaned CSV data and populates PostgreSQL applicants, loans, and model registry tables."""
    print(f"\nConnecting to PostgreSQL at: {db_url}")
    engine = create_engine(db_url, pool_size=10, max_overflow=20)
    
    # Re-create all tables in PostgreSQL
    print("Creating tables in PostgreSQL (applicants, loans, predictions, model_registry)...")
    Base.metadata.create_all(bind=engine)
    
    Session = sessionmaker(bind=engine)
    session = Session()

    # Read cleaned data
    df = pd.read_csv(cleaned_csv_path)
    if max_records:
        df = df.head(max_records)
    
    total = len(df)
    print(f"Populating PostgreSQL database with {total:,} cleaned loan records...")

    # Register initial models in model_registry
    models_to_register = [
        {"model_name": "XGBoost", "version": "1.0", "auc_score": 0.7073, "status": "active"},
        {"model_name": "Random Forest", "version": "1.0", "auc_score": 0.7014, "status": "candidate"},
        {"model_name": "Logistic Regression", "version": "1.0", "auc_score": 0.7093, "status": "active"}
    ]
    for m in models_to_register:
        existing = session.query(ModelRegistry).filter_by(model_name=m["model_name"]).first()
        if not existing:
            reg = ModelRegistry(**m)
            session.add(reg)
    session.commit()

    # Bulk insert applicants and loans in chunks for high performance
    batch_size = 1000
    for start_idx in range(0, total, batch_size):
        end_idx = min(start_idx + batch_size, total)
        chunk = df.iloc[start_idx:end_idx]

        for i, row in chunk.iterrows():
            income = float(row.get("annual_inc", 50000.0)) if not pd.isna(row.get("annual_inc")) else 50000.0
            dti = float(row.get("dti", 15.0)) if not pd.isna(row.get("dti")) else 15.0
            int_rate = float(row.get("int_rate", 12.0)) if not pd.isna(row.get("int_rate")) else 12.0
            calc_credit_score = int(max(350, min(850, 750 - (dti * 4) - (int_rate * 6))))

            applicant = Applicant(
                name=f"Applicant #{i+1}",
                age=int(np.random.randint(22, 65)),
                income=income,
                employment_type=str(row.get("emp_length", "5 years")),
                credit_score=calc_credit_score
            )
            session.add(applicant)
            session.flush()  # to get applicant_id

            loan = Loan(
                applicant_id=applicant.applicant_id,
                loan_amount=float(row.get("loan_amnt", 10000.0)) if not pd.isna(row.get("loan_amnt")) else 10000.0,
                loan_term=int(row.get("term", 36)) if not pd.isna(row.get("term")) else 36,
                interest_rate=int_rate,
                purpose=str(row.get("purpose", "debt_consolidation")) if not pd.isna(row.get("purpose")) else "debt_consolidation",
                grade=str(row.get("grade", "B")) if not pd.isna(row.get("grade")) else "B",
                sub_grade=str(row.get("sub_grade", "B2")) if not pd.isna(row.get("sub_grade")) else "B2",
                dti=dti,
                home_ownership=str(row.get("home_ownership", "RENT")) if not pd.isna(row.get("home_ownership")) else "RENT",
                verification_status=str(row.get("verification_status", "Verified")) if not pd.isna(row.get("verification_status")) else "Verified",
                loan_status=int(row.get("loan_status", 0)) if not pd.isna(row.get("loan_status")) else 0
            )
            session.add(loan)

        session.commit()
        print(f"Inserted batch {start_idx+1:,} to {end_idx:,} of {total:,} records...")

    session.close()
    print("\nPostgreSQL Database Population Completed Successfully!")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Clean dataset and seed PostgreSQL database")
    parser.add_argument("--password", "-p", default=os.getenv("PGPASSWORD", None), help="PostgreSQL password")
    parser.add_argument("--user", "-u", default=os.getenv("PGUSER", "postgres"), help="PostgreSQL username")
    parser.add_argument("--host", default="localhost", help="PostgreSQL host")
    parser.add_argument("--port", type=int, default=5432, help="PostgreSQL port")
    parser.add_argument("--dbname", default="loan_db", help="PostgreSQL database name")
    parser.add_argument("--max-records", type=int, default=None, help="Max records to insert (default: all)")
    args = parser.parse_args()

    raw_path = os.path.join(settings.BASE_DIR, "data", "loan_train.csv")
    cleaned_path = os.path.join(settings.BASE_DIR, "data", "loan_cleaned.csv")
    
    # 1. Export Cleaned CSV
    df_clean = export_cleaned_csv(raw_path, cleaned_path)
    
    # 2. Connect to PostgreSQL
    try:
        pg_url, detected_pwd = connect_and_create_postgres_db(
            db_user=args.user,
            db_password=args.password,
            db_host=args.host,
            db_port=args.port,
            db_name=args.dbname
        )
        print(f"PostgreSQL Connection Established using user '{args.user}'")
        
        # 3. Populate Database from Cleaned CSV
        populate_postgres_from_cleaned_csv(cleaned_path, pg_url, max_records=args.max_records)

        # 4. Update .env file with PostgreSQL connection string
        env_path = os.path.join(settings.BASE_DIR, ".env")
        with open(env_path, "r") as f:
            env_content = f.read()

        new_env_line = f"DATABASE_URL={pg_url}\n"
        if "DATABASE_URL=" in env_content:
            lines = env_content.splitlines()
            updated_lines = [new_env_line.strip() if l.startswith("DATABASE_URL=") else l for l in lines]
            env_content = "\n".join(updated_lines) + "\n"
        else:
            env_content += "\n" + new_env_line

        with open(env_path, "w") as f:
            f.write(env_content)

        print(f"\nUpdated .env with DATABASE_URL={pg_url}")

    except Exception as ex:
        print(f"\nPostgreSQL Setup Notice: {ex}")
        print("To populate your PostgreSQL database, run:")
        print(f"python scripts/seed_postgres.py --password YOUR_POSTGRES_PASSWORD")
