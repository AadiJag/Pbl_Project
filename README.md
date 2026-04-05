<div align="center">

<img src="static/images/logo.png" alt="EcoHarvest Logo" width="100" style="border-radius: 20px"/>

# EcoHarvest 🌱

### AI-Powered Crop Recommendation System

[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-2.x-FF6B35?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.x-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![XGBoost](https://img.shields.io/badge/XGBoost-1.x-3CADA8?style=for-the-badge)](https://xgboost.readthedocs.io)
[![Accuracy](https://img.shields.io/badge/Model%20Accuracy-99.32%25-52b788?style=for-the-badge)](https://github.com)
[![License](https://img.shields.io/badge/License-MIT-a78bfa?style=for-the-badge)](LICENSE)

**A precision agriculture platform that recommends the optimal crop based on soil composition and climate data — powered by an ensemble of machine learning models.**

[🚀 Live Demo](#running-locally) · [📊 Model Details](#ml-models) · [📁 Project Structure](#project-structure)

---

</div>

## ✨ Overview

EcoHarvest takes 7 agronomic input parameters and predicts the best-suited crop from **22 varieties** using a **Random Forest Classifier** trained to 99.32% accuracy. The platform features a premium multi-page web interface with real-time input validation, animated UI components, and a full model performance breakdown.

---

## 🖼️ Screenshots

| Home Page | Prediction Engine | About & Model Details |
|---|---|---|
| Hero section with animated orb, stats bar, and feature grid | Two-panel form with real-time field validation and live result card | ML model comparison with animated metric bars and comparison table |

---

## 🔥 Features

- **99.32% Accurate** — Random Forest Champion model with full benchmark against XGBoost and SVM
- **Multi-Page Design** — Home, Predict, and About pages with shared navigation
- **Real-Time Validation** — Data-driven input range checking with amber inline warnings and toast notifications
- **7-Parameter Analysis** — Nitrogen, Phosphorus, Potassium, Temperature, Humidity, Soil pH, Rainfall
- **22 Crop Classes** — Grains, legumes, fruits, fibres and beverages
- **Premium UI** — Glassmorphism, aurora background animations, magnetic button, reveal-on-scroll effects
- **Responsive** — Fully mobile-friendly layout across all pages
- **Auto-Select Champion** — Training script benchmarks 3 models and saves the best automatically

---

## 🤖 ML Models

Three models were trained and evaluated on an 80/20 train-test split with `StandardScaler` preprocessing:

| Model | Accuracy | F1 (Macro) | Precision (Macro) | Recall (Macro) | Status |
|---|---|---|---|---|---|
| 🏆 **Random Forest** | **99.32%** | **99.26%** | **99.26%** | **99.33%** | ✅ Champion |
| ⚡ XGBoost | 98.64% | 98.59% | 98.49% | 98.76% | Runner-up |
| 🔷 SVM (RBF Kernel) | 96.82% | 96.66% | 96.77% | 96.95% | 3rd Place |

> **Training config:** `n_estimators=100`, `random_state=42`, `eval_metric=mlogloss`, `probability=True`  
> **Dataset split:** 1,760 training samples · 440 validation samples

---

## 📦 Dataset

| Property | Value |
|---|---|
| Source | Crop Recommendation Dataset |
| File | `Crop_recommendation.csv` |
| Total Samples | 2,200 |
| Samples per Crop | 100 |
| Features | 7 (N, P, K, Temperature, Humidity, pH, Rainfall) |
| Target Classes | 22 crop varieties |

### Parameter Ranges

| Parameter | Unit | Min | Max | Mean |
|---|---|---|---|---|
| Nitrogen (N) | kg/ha | 0 | 140 | 50.6 |
| Phosphorus (P) | kg/ha | 5 | 145 | 53.4 |
| Potassium (K) | kg/ha | 5 | 205 | 48.1 |
| Temperature | °C | 8.8 | 43.7 | 25.6 |
| Humidity | % | 14.3 | 99.9 | 71.5 |
| Soil pH | — | 3.5 | 9.9 | 6.5 |
| Rainfall | mm | 20.2 | 298.6 | 103.5 |

---

## 🗂️ Project Structure

```
pbl/
├── app.py                      # Flask application — routes & prediction API
├── train_model.py              # ML training script — benchmarks 3 models, saves champion
├── Crop_recommendation.csv     # Dataset (2,200 samples, 22 crop classes)
├── champion_model.pkl          # Saved Random Forest champion model
├── champion_name.txt           # Name of the saved champion ("Random Forest")
├── label_encoder.pkl           # LabelEncoder for crop class decoding
├── scaler.pkl                  # StandardScaler fitted on training data
├── static/
│   ├── css/
│   │   └── style.css           # Full design system (glassmorphism, animations, responsive)
│   ├── js/
│   │   └── script.js           # Form logic, validation, API calls, UI interactions
│   └── images/
│       └── logo.png            # App icon / favicon
└── templates/
    ├── base.html               # Shared layout (nav, footer, aurora background)
    ├── index.html              # Home page (hero, stats, features, crop showcase)
    ├── predict.html            # Prediction page (form + live result panel)
    └── about.html              # About page (timeline, model details, dataset info)
```

---

## ⚙️ Getting Started

### Prerequisites

- Python 3.8+
- pip

### 1. Clone the repository

```bash
git clone https://github.com/your-username/ecoharvest.git
cd ecoharvest
```

### 2. Install dependencies

```bash
pip install flask scikit-learn xgboost numpy pandas
```

### 3. Train the model

This benchmarks all 3 models and saves the champion automatically:

```bash
python3 train_model.py
```

> This generates `champion_model.pkl`, `label_encoder.pkl`, and `scaler.pkl`.

### 4. Run the app

```bash
python3 app.py
```

Then open **[http://127.0.0.1:5001](http://127.0.0.1:5001)** in your browser.

---

## 🌐 API Reference

### `POST /api/predict`

Accepts JSON with the 7 agronomic parameters and returns the recommended crop.

**Request:**
```json
{
  "N": 90,
  "P": 42,
  "K": 43,
  "temperature": 20.8,
  "humidity": 82.0,
  "ph": 6.5,
  "rainfall": 202.9
}
```

**Response:**
```json
{
  "success": true,
  "prediction": "Rice",
  "message": "Recommended crop: rice."
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Model not loaded. Run train_model.py first."
}
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python 3, Flask |
| **ML** | scikit-learn (Random Forest, SVM), XGBoost |
| **Data** | Pandas, NumPy |
| **Frontend** | HTML5, CSS3 (Vanilla), JavaScript (ES6+) |
| **Fonts & Icons** | Google Fonts (Inter, Poppins), Font Awesome 6 |

---

## 🎨 Design System

The UI follows an **"Emerald Frost"** dark theme:

- **Primary:** `#52b788` (Emerald green)
- **Background:** `#040d0c` (Deep dark)
- **Glass cards:** `rgba(255,255,255,0.03)` with `backdrop-filter: blur(40px)`
- **Accent:** `#ffaa32` (Amber for warnings)
- **Animations:** Aurora blobs, orbital rings, reveal-on-scroll, magnetic button

---

## 🔮 Roadmap

- [ ] Add crop growing tips per recommendation
- [ ] Geolocation-based climate autofill
- [ ] User history and recommendation log
- [ ] Export results as PDF report
- [ ] Deploy to production with Gunicorn + Nginx

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with 🌱 by [Rahul Anand](https://github.com/your-username)

*EcoHarvest — Growing intelligence, one prediction at a time.*

</div>
