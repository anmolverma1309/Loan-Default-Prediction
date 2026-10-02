import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.config import settings
from backend.app.database import init_db
from backend.app.routes.api import router as api_router
from backend.app.ml.train import train_and_evaluate_all_models
from backend.app.ml.eda import generate_eda_json_cache

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB tables
    print("Initializing Database tables...")
    init_db()

    # Precompute EDA cache if not present
    eda_cache_file = os.path.join(settings.BASE_DIR, "data", "eda_summary.json")
    if not os.path.exists(eda_cache_file) and os.path.exists(settings.DATA_PATH):
        print("Generating EDA statistical cache from dataset...")
        try:
            generate_eda_json_cache(eda_cache_file)
        except Exception as e:
            print(f"EDA cache generation error: {e}")

    # Check if models are trained, if not train them automatically
    best_model_path = os.path.join(settings.MODEL_DIR, "best_model.joblib")
    if not os.path.exists(best_model_path) and os.path.exists(settings.DATA_PATH):
        print("Model artifacts not found. Starting initial model training...")
        try:
            train_and_evaluate_all_models()
        except Exception as e:
            print(f"Initial model training notice: {e}")

    print("FastAPI Application is ready and serving requests.")
    yield
    # Shutdown logic
    print("Shutting down API server.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Full-stack machine learning banking risk analysis system for predicting loan default probabilities and explainability.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for seamless local dev & Docker
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Top level health check
@app.get("/health", tags=["System"])
def root_health():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
