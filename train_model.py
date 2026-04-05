import pandas as pd
import numpy as np
import pickle
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score

# Load data
df = pd.read_csv('Crop_recommendation.csv')

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
    "XGBoost": XGBClassifier(eval_metric='mlogloss', random_state=42),
    "SVM": SVC(probability=True, random_state=42)
}

best_acc = 0
champion_model = None
champion_name = ""

print("Model Accuracies:")
for name, model in models.items():
    model.fit(X_train_scaled, y_train)
    y_pred = model.predict(X_test_scaled)
    
    acc = accuracy_score(y_test, y_pred)
    print(f"{name}: {acc:.4f}")
    
    if acc > best_acc:
        best_acc = acc
        champion_model = model
        champion_name = name

print(f"\nChampion Model: {champion_name} with accuracy {best_acc:.4f}")

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
