# EcoHarvest — Crop Recommendation System

![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=flat-square&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-2.x-FF6B35?style=flat-square&logo=flask&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-1.x-F7931E?style=flat-square&logo=scikitlearn&logoColor=white)
![XGBoost](https://img.shields.io/badge/XGBoost-1.x-3CADA8?style=flat-square)
![Model Accuracy](https://img.shields.io/badge/Model%20Accuracy-99.32%25-2d6a4f?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-7B68EE?style=flat-square)

EcoHarvest is a machine learning web application that recommends the most suitable crop for a given set of soil and climate conditions. The user enters seven agronomic parameters, the backend runs a pre-trained classification model, and the recommended crop is returned in under a second.

This project was built as a practical demonstration of an end-to-end ML pipeline: data preprocessing, multi-model training, champion selection, and serving predictions through a Flask web interface.

---

## Overview

The system accepts the following inputs:

- Nitrogen (N) content of the soil in kg/ha
- Phosphorus (P) content of the soil in kg/ha
- Potassium (K) content of the soil in kg/ha
- Average temperature in degrees Celsius
- Relative humidity as a percentage
- Soil pH value
- Annual rainfall in millimetres

Based on these values, the model predicts which of 22 possible crops is best suited to those conditions. The prediction is made by the champion model selected during training — currently Random Forest, which achieved 99.32% accuracy on the held-out validation set.

---

## Dataset

The training data is sourced from the public Crop Recommendation Dataset, containing 2,200 labelled samples across 22 crop types. Each crop has exactly 100 samples, making the dataset perfectly balanced.

- Total samples: 2,200
- Features: 7 numerical agronomic parameters
- Target classes: 22 (rice, maize, chickpea, kidney beans, pigeon peas, moth beans, mung bean, black gram, lentil, pomegranate, banana, mango, grapes, watermelon, muskmelon, apple, orange, papaya, coconut, cotton, jute, coffee)
- Train/test split: 80% training (1,760 samples), 20% validation (440 samples)
- Random state fixed at 42 for reproducibility

---

## Machine Learning Workflow

### Step 1 — Data Loading

The CSV file is loaded with Pandas. Features (N, P, K, temperature, humidity, ph, rainfall) are separated from the target label column.

### Step 2 — Label Encoding

The string crop labels are converted to integer class indices using scikit-learn's `LabelEncoder`. This is required for XGBoost, which expects numeric targets, and is applied uniformly across all three models for consistency.

### Step 3 — Train/Test Split

Data is split 80/20 using `train_test_split` with `random_state=42`. The split is stratified by default in this balanced dataset context.

### Step 4 — Feature Scaling

All features are standardised using `StandardScaler` (mean = 0, unit variance). The scaler is fitted on the training set only and applied to both train and test sets. This step is critical for SVM and also keeps the comparison across models fair.

### Step 5 — Model Training

Three classifiers are trained on the scaled training set:

- **Random Forest** — 100 estimators, Gini criterion, bagging ensemble
- **XGBoost** — gradient-boosted trees, mlogloss objective, sequential ensemble
- **SVM** — RBF kernel, probability calibration enabled

### Step 6 — Champion Selection

Each model is evaluated on the held-out test set using accuracy score. The model with the highest accuracy is automatically labelled "champion" and serialised to disk.

### Step 7 — Serialisation

Three objects are saved as pickle files:

- `champion_model.pkl` — the best-performing classifier
- `scaler.pkl` — the fitted StandardScaler instance
- `label_encoder.pkl` — the fitted LabelEncoder for decoding predictions

The champion model name is also written to `champion_name.txt` for reference.

### Step 8 — Serving Predictions

On application startup, Flask loads all three pickle files into memory. When a POST request is received at `/api/predict`, the input values are extracted, scaled using the loaded scaler, passed to the model for prediction, and the resulting class index is decoded back to a crop name using the label encoder. The result is returned as JSON.

---

## Model Results

All models were evaluated on the same 440-sample held-out validation set.

| Model         | Accuracy | F1 (Macro) | Precision (Macro) | Recall (Macro) |
|---------------|----------|------------|-------------------|----------------|
| Random Forest | 99.32%   | 99.26%     | 99.26%            | 99.33%         |
| XGBoost       | 98.64%   | 98.59%     | 98.49%            | 98.76%         |
| SVM           | 96.82%   | 96.66%     | 96.77%            | 96.95%         |

Random Forest was selected as the champion in every run across all metrics.

---

## File Architecture

```
pbl/
|
|-- app.py                      # Flask application — routes, model loading, prediction API
|-- train_model.py              # Training script — runs all three models, saves champion
|-- Crop_recommendation.csv     # Raw dataset (2,200 rows, 8 columns)
|
|-- champion_model.pkl          # Serialised champion classifier (generated by train_model.py)
|-- scaler.pkl                  # Fitted StandardScaler (generated by train_model.py)
|-- label_encoder.pkl           # Fitted LabelEncoder (generated by train_model.py)
|-- champion_name.txt           # Name of the selected champion model
|
|-- templates/
|   |-- base.html               # Shared layout — navigation, footer, font imports
|   |-- index.html              # Home page — hero section, stats strip, feature grid, crop list
|   |-- predict.html            # Prediction form — 7 inputs, result panel, validation feedback
|   |-- about.html              # About page — how it works, model comparison, dataset details
|
|-- static/
|   |-- css/
|   |   |-- style.css           # Full design system — typography, layout, components, responsive
|   |
|   |-- js/
|   |   |-- script.js           # Prediction form logic — validation, async fetch, result display
|   |
|   |-- images/
|       |-- logo.png            # Application logo (used in nav and browser tab)
|
|-- .gitignore
|-- README.md
```

---

## Application Routes

| Route          | Method   | Description                                                  |
|----------------|----------|--------------------------------------------------------------|
| `/`            | GET      | Renders the home page                                        |
| `/predict`     | GET      | Renders the prediction form page                             |
| `/about`       | GET      | Renders the about/documentation page                         |
| `/api/predict` | POST     | Accepts JSON with 7 parameters, returns crop recommendation  |

The `/api/predict` endpoint expects a JSON body with keys: `N`, `P`, `K`, `temperature`, `humidity`, `ph`, `rainfall`. It returns `{"success": true, "prediction": "Rice", "message": "..."}` on success, or `{"success": false, "error": "..."}` on failure.

---

## Getting Started

### Prerequisites

- Python 3.9 or later
- pip

### Installation

Clone or download the project folder, then install dependencies:

```bash
pip install flask numpy scikit-learn xgboost pandas
```

### Training the Model (optional)

The repo includes pre-trained pickle files so you can skip this step. If you want to retrain from scratch:

```bash
python train_model.py
```

This will overwrite `champion_model.pkl`, `scaler.pkl`, `label_encoder.pkl`, and `champion_name.txt` with freshly trained versions.

### Running the Application

```bash
python app.py
```

The server starts on `http://localhost:5001`. Open that URL in your browser to use the application.

---

## Input Parameter Reference

| Parameter   | Unit  | Min  | Max   | Typical Mean |
|-------------|-------|------|-------|--------------|
| Nitrogen    | kg/ha | 0    | 140   | 50.6         |
| Phosphorus  | kg/ha | 5    | 145   | 53.4         |
| Potassium   | kg/ha | 5    | 205   | 48.1         |
| Temperature | C     | 8.8  | 43.7  | 25.6         |
| Humidity    | %     | 14.3 | 99.9  | 71.5         |
| Soil pH     | —     | 3.5  | 9.9   | 6.5          |
| Rainfall    | mm    | 20.2 | 298.6 | 103.5        |

The frontend validates all inputs against these ranges before submission and displays a warning if any value falls outside the expected bounds. Out-of-range values are flagged but do not block the prediction — they serve as a sanity check rather than a hard gate.

---

## Tech Stack

| Layer       | Technology                                          |
|-------------|-----------------------------------------------------|
| Backend     | Python 3, Flask                                     |
| ML Models   | scikit-learn (Random Forest, SVM), XGBoost          |
| Data        | Pandas, NumPy                                       |
| Frontend    | HTML5, CSS3, Vanilla JavaScript                     |
| Typography  | DM Sans, DM Serif Display (Google Fonts)            |
| Icons       | Font Awesome 6                                      |

No frontend frameworks or build tools are used. The entire frontend is plain HTML, CSS, and JavaScript.

---

## Notes

- The pickle files were generated with a specific version of scikit-learn. If you load them with a different version, you may see an `InconsistentVersionWarning`. The model will still work in most cases, but retraining with your installed version eliminates the warning.
- The application runs in Flask's development mode by default (`debug=True`). Do not expose this to the public internet without switching to a production WSGI server such as Gunicorn.
- All training, validation, and model selection logic lives entirely in `train_model.py`. The `app.py` file only handles loading, serving, and inference — it does not perform any training.
