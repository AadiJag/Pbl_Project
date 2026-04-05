from flask import Flask, request, jsonify, render_template
import pickle
import numpy as np
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__)

# Load model and preprocessing tools
try:
    with open(os.path.join(BASE_DIR, 'champion_model.pkl'), 'rb') as f:
        model = pickle.load(f)
    with open(os.path.join(BASE_DIR, 'label_encoder.pkl'), 'rb') as f:
        le = pickle.load(f)
    with open(os.path.join(BASE_DIR, 'scaler.pkl'), 'rb') as f:
        scaler = pickle.load(f)
    print("✅ Model loaded successfully!")
except FileNotFoundError:
    print("⚠️  Model files not found. Run train_model.py first.")
    model, le, scaler = None, None, None


@app.route('/')
def home():
    return render_template('index.html', active_page='home')


@app.route('/predict')
def predict_page():
    return render_template('predict.html', active_page='predict')


@app.route('/about')
def about():
    return render_template('about.html', active_page='about')


@app.route('/api/predict', methods=['POST'])
def predict():
    if model is None or le is None or scaler is None:
        return jsonify({'success': False, 'error': 'Model not loaded. Run train_model.py first.'}), 500

    try:
        data = request.get_json()
        features = [
            float(data.get('N', 0)),
            float(data.get('P', 0)),
            float(data.get('K', 0)),
            float(data.get('temperature', 0)),
            float(data.get('humidity', 0)),
            float(data.get('ph', 0)),
            float(data.get('rainfall', 0))
        ]
        features_arr = np.array([features])
        scaled_features = scaler.transform(features_arr)
        prediction_encoded = model.predict(scaled_features)
        crop_name = le.inverse_transform(prediction_encoded)[0]

        return jsonify({
            'success': True,
            'prediction': crop_name.capitalize(),
            'message': f'Recommended crop: {crop_name}.'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
