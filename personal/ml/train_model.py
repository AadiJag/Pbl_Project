import json
import os
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.ensemble import RandomForestClassifier

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.environ.get(
    "CROP_DATA_PATH",
    os.path.join(os.path.dirname(BASE_DIR), "sensor_Crop_Dataset (1).csv")
)
CROP_MODEL_PATH = os.path.join(BASE_DIR, "crop_model.joblib")
META_PATH = os.path.join(BASE_DIR, "model_meta.json")

TARGET = "Crop"
FEATURES = [
    "Nitrogen",
    "Phosphorus",
    "Potassium",
    "Temperature",
    "Humidity",
    "pH_Value",
    "Rainfall"
]

df = pd.read_csv(DATA_PATH)
X = df[FEATURES]
y = df[TARGET]

X_train, X_val, y_train, y_val = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

model = RandomForestClassifier(
    n_estimators=400,
    max_depth=None,
    min_samples_split=2,
    min_samples_leaf=1,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)
preds = model.predict(X_val)

metrics = {
    "crop_accuracy": float(accuracy_score(y_val, preds)),
    "rows": int(len(df)),
    "features": FEATURES,
}

joblib.dump(model, CROP_MODEL_PATH)
with open(META_PATH, "w") as f:
    json.dump(metrics, f, indent=2)

print("Crop model trained and saved:")
print(json.dumps(metrics, indent=2))
