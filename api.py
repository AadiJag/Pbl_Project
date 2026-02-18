import os
import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CROP_MODEL_PATH = os.path.join(BASE_DIR, "crop_model.joblib")

app = FastAPI(title="EcoHarvest ML API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    nitrogen: float
    phosphorus: float
    potassium: float
    temperature: float
    humidity: float
    ph_value: float
    rainfall: float

crop_model = joblib.load(CROP_MODEL_PATH)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict")
def predict(req: PredictRequest):
    payload = {
        "N": req.nitrogen,
        "P": req.phosphorus,
        "K": req.potassium,
        "temperature": req.temperature,
        "humidity": req.humidity,
        "ph": req.ph_value,
        "rainfall": req.rainfall,
    }
    df = pd.DataFrame([payload])
    pred_c = crop_model.predict(df)[0]
    proba = crop_model.predict_proba(df)[0]
    confidence = float(max(proba))
    return {"crop": str(pred_c), "confidence": confidence}
