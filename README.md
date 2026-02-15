# Pbl-4

🌾 Smart Crop Prediction System

A full-stack AI-powered crop recommendation web application that predicts suitable crops based on soil and environmental parameters.
The project integrates a Node.js + Express website with a FastAPI Machine Learning microservice, following a modern microservice architecture.

⸻

🚀 Project Overview

This system allows users to input agricultural parameters such as nitrogen, phosphorus, potassium, temperature, humidity, pH value, and rainfall.

The website sends these values to a Machine Learning API, which predicts:
	•	🌱 Recommended crop
	•	📊 Prediction confidence

The prediction is then displayed on the website and optionally stored in a database.

⸻

🧠 Architecture

Frontend (EJS Templates)
⬇
Node.js Express Server (Backend API Layer)
⬇
FastAPI ML Service (Model Prediction)

Key Components
	•	Frontend: EJS + CSS + JavaScript
	•	Backend: Node.js, Express
	•	ML API: FastAPI (Python)
	•	Model: Trained ML crop prediction model
	•	Database: Supabase (optional storage)

personal/
│
├── server.js          
├── package.json
├── .env
│
├── views/             
├── public/            
│
└── ml/
    ├── api.py        
    ├── model.pkl  


⚙️ Features

✅ Crop prediction using ML
✅ Microservice-based architecture
✅ Environment-based configuration
✅ API error handling and logging
✅ Clean backend–ML separation

🛠 How Prediction Works
	1.	User submits form on website.
	2.	Express backend receives input.
	3.	Backend sends data to FastAPI model.
	4.	Model predicts best crop.
	5.	Result is returned and displayed to user.

⸻

🧪 Development Notes
	•	The ML service runs independently from the Node backend.
	•	Backend uses async fetch requests to communicate with FastAPI.
	•	Errors from ML API are logged for debugging.

⸻

📌 Future Improvements
	•	🌐 Deploy ML API on cloud (Render / Railway)
	•	🔐 Add authentication
	•	📈 Add yield prediction model
	•	📊 Prediction history dashboard
	•	🤖 LLM-based agriculture assistant

⸻

👨‍💻 Author

Rahul , Aaditya Jagdesh
BTech Computer Science Engineering

⸻
