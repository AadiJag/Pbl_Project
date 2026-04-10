import pandas as pd
import numpy as np
import pickle
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, classification_report

# Load data
df = pd.read_csv('Crop_recommendation_22000.csv')

# Split features and label
X = df.drop('label', axis=1)
y = df['label']

# Label Encoding for output (required for XGBoost)
le = LabelEncoder()
y_encoded = le.fit_transform(y)

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)

# Scaling (required for SVM)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Models
models = {
    "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
    "Gradient Boosting": GradientBoostingClassifier(n_estimators=100, random_state=42),
    "SVM": SVC(probability=True, random_state=42)
}

best_acc = 0
champion_model = None
champion_name = ""

results = {}
print("\n" + "="*60)
for name, model in models.items():
    model.fit(X_train_scaled, y_train)
    y_pred = model.predict(X_test_scaled)

    acc = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, output_dict=True)

    results[name] = {
        'accuracy': acc,
        'f1_macro':  report['macro avg']['f1-score'],
        'precision_macro': report['macro avg']['precision'],
        'recall_macro': report['macro avg']['recall'],
        'f1_weighted': report['weighted avg']['f1-score'],
    }

    print(f"\n{name}")
    print(f"  Accuracy          : {acc:.4f} ({acc*100:.2f}%)")
    print(f"  F1  (macro)       : {report['macro avg']['f1-score']:.4f}")
    print(f"  Precision (macro) : {report['macro avg']['precision']:.4f}")
    print(f"  Recall (macro)    : {report['macro avg']['recall']:.4f}")
    print(f"  F1  (weighted)    : {report['weighted avg']['f1-score']:.4f}")

    if acc > best_acc:
        best_acc = acc
        champion_model = model
        champion_name = name

print(f"\n{'='*60}")
print(f"Champion Model: {champion_name} — Accuracy: {best_acc*100:.2f}%")

# Save the champion model, the label encoder, and the scaler
with open('champion_model.pkl', 'wb') as f:
    pickle.dump(champion_model, f)

with open('label_encoder.pkl', 'wb') as f:
    pickle.dump(le, f)

with open('scaler.pkl', 'wb') as f:
    pickle.dump(scaler, f)

# Save the name of the champion model separately if needed
with open('champion_name.txt', 'w') as f:
    f.write(champion_name)

print("Champion model and preprocessing tools saved successfully!")
