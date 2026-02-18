import csv
import math
import os
import joblib
from flask import Flask, jsonify, request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
WORKSPACE_DIR = os.path.dirname(PROJECT_DIR)

DATA_CANDIDATES = [
    os.environ.get("CROP_DATA_PATH"),
    os.path.join(WORKSPACE_DIR, "Crop_recommendation.csv"),
    os.path.join(PROJECT_DIR, "Crop_recommendation.csv"),
    os.path.join(PROJECT_DIR, "sensor_Crop_Dataset (1).csv"),
]

MODEL_CANDIDATES = [
    os.environ.get("MODEL_PATH"),
    os.path.join(BASE_DIR, "model.joblib"),
    os.path.join(BASE_DIR, "crop_model.joblib"),
    os.path.join(PROJECT_DIR, "crop_model.joblib"),
    os.path.join(WORKSPACE_DIR, "crop_model.joblib"),
]

FEATURE_META = [
    {"label": "Nitrogen", "unit": ""},
    {"label": "Phosphorus", "unit": ""},
    {"label": "Potassium", "unit": ""},
    {"label": "Temperature", "unit": "°C"},
    {"label": "Humidity", "unit": "%"},
    {"label": "pH", "unit": ""},
    {"label": "Rainfall", "unit": "mm"},
]


def _find_dataset_path():
    for path in DATA_CANDIDATES:
        if path and os.path.exists(path):
            return path
    return None


def _find_model_path():
    for path in MODEL_CANDIDATES:
        if path and os.path.exists(path):
            return path
    return None


def _header_index(header, names):
    for i, h in enumerate(header):
        if h in names:
            return i
    return -1


def _load_dataset(path):
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader, [])
        header = [h.strip().lower() for h in header]

        idx_n = _header_index(header, {"n", "nitrogen"})
        idx_p = _header_index(header, {"p", "phosphorus"})
        idx_k = _header_index(header, {"k", "potassium"})
        idx_temp = _header_index(header, {"temperature", "temp"})
        idx_hum = _header_index(header, {"humidity"})
        idx_ph = _header_index(header, {"ph", "ph_value"})
        idx_rain = _header_index(header, {"rainfall", "rain"})
        idx_label = _header_index(header, {"label", "crop"})

        use_mapped = all(i >= 0 for i in [idx_n, idx_p, idx_k, idx_temp, idx_hum, idx_ph, idx_rain, idx_label])

        for parts in reader:
            if not parts or len(parts) < 8:
                continue
            try:
                features = (
                    [
                        float(parts[idx_n]),
                        float(parts[idx_p]),
                        float(parts[idx_k]),
                        float(parts[idx_temp]),
                        float(parts[idx_hum]),
                        float(parts[idx_ph]),
                        float(parts[idx_rain]),
                    ]
                    if use_mapped
                    else [float(v) for v in parts[:7]]
                )
            except ValueError:
                continue
            crop = parts[idx_label] if use_mapped else parts[7]
            rows.append({"features": features, "crop": crop})

    if not rows:
        raise ValueError("Dataset is empty or invalid.")
    return rows


def _compute_stats(rows):
    count = len(rows)
    means = [0.0] * 7
    for row in rows:
        for i, val in enumerate(row["features"]):
            means[i] += val
    means = [m / count for m in means]

    stds = [0.0] * 7
    for row in rows:
        for i, val in enumerate(row["features"]):
            diff = val - means[i]
            stds[i] += diff * diff
    stds = [math.sqrt(s / count) or 1.0 for s in stds]

    for row in rows:
        row["norm"] = [(val - means[i]) / stds[i] for i, val in enumerate(row["features"])]

    crop_stats = {}
    for row in rows:
        crop = row["crop"]
        if crop not in crop_stats:
            crop_stats[crop] = {"sum": [0.0] * 7, "count": 0}
        for i, val in enumerate(row["features"]):
            crop_stats[crop]["sum"][i] += val
        crop_stats[crop]["count"] += 1

    for crop, stats in crop_stats.items():
        stats["mean"] = [v / stats["count"] for v in stats["sum"]]
        stats["norm_mean"] = [(stats["mean"][i] - means[i]) / stds[i] for i in range(7)]

    return means, stds, crop_stats


def _format_value(index, value):
    if index in (3, 4, 5):
        return f"{value:.1f}"
    if index == 6:
        return f"{round(value)}"
    return f"{round(value)}"


def _build_hint(crop, input_values, means, stds, crop_stats):
    if not crop_stats or not means or not stds:
        return "Good overall match to your inputs."

    stats = crop_stats.get(crop)
    if not stats:
        return "Good overall match to your inputs."

    input_norm = [(val - means[i]) / stds[i] for i, val in enumerate(input_values)]
    diffs = [
        {"idx": i, "diff": abs(input_norm[i] - stats["norm_mean"][i])}
        for i in range(7)
    ]
    diffs.sort(key=lambda d: d["diff"])
    best = diffs[0]
    meta = FEATURE_META[best["idx"]]
    avg_val = stats["mean"][best["idx"]]
    unit = f" {meta['unit']}" if meta["unit"] else ""
    return f"{meta['label']} close to crop avg ({_format_value(best['idx'], avg_val)}{unit})."


DATA_PATH = _find_dataset_path()
DATA_ROWS = []
MEANS = None
STDS = None
CROP_STATS = {}
if DATA_PATH:
    DATA_ROWS = _load_dataset(DATA_PATH)
    MEANS, STDS, CROP_STATS = _compute_stats(DATA_ROWS)

MODEL_PATH = _find_model_path()
MODEL = None
MODEL_FEATURES = None
LABEL_ENCODER = None
if MODEL_PATH:
    artifact = joblib.load(MODEL_PATH)
    if hasattr(artifact, "predict"):
        MODEL = artifact
    elif isinstance(artifact, dict):
        MODEL = artifact.get("model") or artifact.get("pipeline") or artifact.get("estimator")
        LABEL_ENCODER = artifact.get("label_encoder") or artifact.get("encoder")
        MODEL_FEATURES = artifact.get("feature_names") or artifact.get("columns")
    if MODEL and MODEL_FEATURES is None:
        MODEL_FEATURES = getattr(MODEL, "feature_names_in_", None)

app = Flask(__name__)


@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "rows": len(DATA_ROWS),
        "dataset": os.path.basename(DATA_PATH) if DATA_PATH else None,
        "model": os.path.basename(MODEL_PATH) if MODEL_PATH else None
    })


def _build_feature_row(values, feature_names=None):
    input_map = {
        "n": values[0],
        "nitrogen": values[0],
        "p": values[1],
        "phosphorus": values[1],
        "k": values[2],
        "potassium": values[2],
        "temperature": values[3],
        "temp": values[3],
        "humidity": values[4],
        "ph": values[5],
        "pH": values[5],
        "ph_value": values[5],
        "rainfall": values[6],
        "rain": values[6],
    }

    if not feature_names:
        return values

    row = []
    for name in feature_names:
        key = str(name).strip()
        key_lower = key.lower()
        if key_lower in input_map:
            row.append(input_map[key_lower])
        elif key in input_map:
            row.append(input_map[key])
        else:
            raise ValueError(f"Missing feature mapping for {name}")
    return row


@app.post("/predict")
def predict():
    payload = request.get_json(silent=True) or {}
    required = ["nitrogen", "phosphorus", "potassium", "temperature", "humidity", "ph", "rainfall"]
    if not all(k in payload for k in required):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        values = [
            float(payload["nitrogen"]),
            float(payload["phosphorus"]),
            float(payload["potassium"]),
            float(payload["temperature"]),
            float(payload["humidity"]),
            float(payload["ph"]),
            float(payload["rainfall"]),
        ]
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid numeric values"}), 400

    if MODEL:
        try:
            row = _build_feature_row(values, MODEL_FEATURES)
        except ValueError as err:
            return jsonify({"error": str(err)}), 400

        pred = MODEL.predict([row])[0]
        if LABEL_ENCODER is not None:
            pred = LABEL_ENCODER.inverse_transform([pred])[0]
        best_crop = str(pred)

        top_crops = []
        if hasattr(MODEL, "predict_proba"):
            proba = MODEL.predict_proba([row])[0]
            classes = getattr(MODEL, "classes_", list(range(len(proba))))
            if LABEL_ENCODER is not None:
                classes = LABEL_ENCODER.inverse_transform(classes)
            ranked = sorted(zip(classes, proba), key=lambda x: x[1], reverse=True)
            for crop, score in ranked[:4]:
                crop_name = str(crop)
                top_crops.append({
                    "crop": crop_name,
                    "score": float(score),
                    "hint": _build_hint(crop_name, values, MEANS, STDS, CROP_STATS),
                })
        else:
            top_crops = [{
                "crop": best_crop,
                "score": 1.0,
                "hint": _build_hint(best_crop, values, MEANS, STDS, CROP_STATS),
            }]

        return jsonify({"crop": best_crop, "top_crops": top_crops})

    if not DATA_ROWS:
        return jsonify({"error": "No model or dataset available for prediction."}), 500

    norm_input = [(val - MEANS[i]) / STDS[i] for i, val in enumerate(values)]
    distances = []
    for row in DATA_ROWS:
        dist = math.sqrt(sum((norm_input[i] - row["norm"][i]) ** 2 for i in range(7)))
        distances.append((dist, row["crop"]))

    distances.sort(key=lambda x: x[0])
    k = min(7, len(distances))
    counts = {}
    for i in range(k):
        crop = distances[i][1]
        counts[crop] = counts.get(crop, 0) + 1

    ranked = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    best_crop = ranked[0][0] if ranked else "Unknown"
    top_crops = [
        {
            "crop": crop,
            "score": count / k,
            "hint": _build_hint(crop, values, MEANS, STDS, CROP_STATS),
        }
        for crop, count in ranked[:4]
    ]

    return jsonify({"crop": best_crop, "top_crops": top_crops})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=True)
