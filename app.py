from flask import Flask, request, jsonify
from flask_cors import CORS
import random
import numpy as np
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

# Mock Model Accuracy Config
MODEL_METRICS = {
    "Linear Regression": {"accuracy": 0.76, "rmse": 4500, "mae": 3200, "r2": 0.72},
    "Decision Tree": {"accuracy": 0.82, "rmse": 3800, "mae": 2800, "r2": 0.78},
    "Random Forest": {"accuracy": 0.91, "rmse": 2100, "mae": 1500, "r2": 0.89},
    "XGBoost": {"accuracy": 0.94, "rmse": 1200, "mae": 900, "r2": 0.93},
    "LSTM (Time-Series)": {"accuracy": 0.96, "rmse": 850, "mae": 600, "r2": 0.95}
}

def get_base_volume(hour, day_of_week=0):
    """Simulate traffic volume based on hour and day."""
    # Base pattern
    if 8 <= hour <= 10 or 17 <= hour <= 20:
        base = 40000
    elif 5 <= hour <= 22:
        base = 22000
    else:
        base = 8000
    
    # Day impact (Weekend vs Weekday)
    day_multiplier = 0.7 if day_of_week >= 5 else 1.0
    
    return int(base * day_multiplier + random.randint(-2000, 2000))

@app.route('/api/status', methods=['GET'])
def get_status():
    current_hour = datetime.now().hour
    vol = get_base_volume(current_hour)
    level = "High" if vol > 35000 else ("Moderate" if vol > 20000 else "Low")
    
    return jsonify({
        "status": "Operational",
        "current_traffic_level": level,
        "active_alerts": ["Silk Board Junction is currently at 92% congestion."],
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/model-comparison', methods=['POST'])
def model_comparison():
    data = request.json
    hour = int(data.get('hour', 9))
    day = int(data.get('day', 0))
    
    ground_truth = get_base_volume(hour, day)
    results = []
    
    for model_name, metrics in MODEL_METRICS.items():
        # Simulate model-specific prediction error based on its accuracy
        error_range = (1 - metrics['accuracy']) * 10000
        prediction = ground_truth + random.randint(int(-error_range), int(error_range))
        
        results.append({
            "model": model_name,
            "prediction": max(0, prediction),
            "metrics": metrics,
            "is_best": model_name == "LSTM (Time-Series)"
        })
        
    # Explainable AI: Feature Importance
    feature_importance = [
        {"feature": "Hour of Day", "importance": 0.55},
        {"feature": "Day of Week", "importance": 0.25},
        {"feature": "Weather (Rain)", "importance": 0.12},
        {"feature": "Public Holiday", "importance": 0.08}
    ]

    return jsonify({
        "ground_truth": ground_truth,
        "results": results,
        "feature_importance": feature_importance,
        "insight": "LSTM shows highest accuracy by capturing temporal dependencies in Bangalore's 30-year traffic cycles."
    })

@app.route('/api/predict', methods=['POST'])
def predict_traffic():
    data = request.json
    arrival_time = data.get('arrival_time', '09:00')
    
    try:
        arr_time = datetime.strptime(arrival_time, '%H:%M')
    except:
        arr_time = datetime.now()

    base_duration = random.randint(25, 40)
    vol = get_base_volume(arr_time.hour)
    delay = int((vol / 50000) * 40)
    total_duration = base_duration + delay
    
    rec_time = arr_time - timedelta(minutes=total_duration)
    
    return jsonify({
        "recommended_departure": rec_time.strftime('%I:%M %p'),
        "estimated_duration_mins": total_duration,
        "traffic_level": "High" if vol > 35000 else "Moderate",
        "recommendation_text": f"Leave at {rec_time.strftime('%I:%M %p')} to reach by {arrival_time}.",
        "routes": [{"type": "Fastest", "duration": total_duration, "cost": 250, "emissions": "Medium"}],
        "weather_impact": "Clear skies",
        "parking_availability": "Moderate"
    })

@app.route('/api/heatmap', methods=['GET'])
def get_heatmap():
    hours = [f"{i:02d}:00" for i in range(24)]
    volumes = [get_base_volume(i) for i in range(24)]
    return jsonify({"labels": hours, "data": volumes})

@app.route('/api/insights', methods=['GET'])
def get_insights():
    return jsonify({"insights": ["Traffic is 40% higher on Mondays.", "Best travel time: 11 AM - 3 PM."]})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
