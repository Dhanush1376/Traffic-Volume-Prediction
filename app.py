from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import joblib
import os

app = Flask(__name__, static_folder='public')
CORS(app)

@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('public', path)


# Load Trained Models & Metadata
MODELS = {}
MODEL_METRICS = {}
FEATURE_IMPORTANCE = []
ENCODERS = {}

try:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(base_dir, 'models')
    
    # Load Models
    model_files = {
        "Linear Regression": 'linear_regression.pkl',
        "Decision Tree": 'decision_tree.pkl',
        "Random Forest": 'random_forest.pkl',
        "XGBoost": 'xgboost.pkl',
        "Best Model": 'best_model.pkl'
    }
    for name, filename in model_files.items():
        path = os.path.join(models_dir, filename)
        if os.path.exists(path):
            MODELS[name] = joblib.load(path)
    
    # Load Encoders
    if os.path.exists(os.path.join(models_dir, 'encoders.pkl')):
        ENCODERS = joblib.load(os.path.join(models_dir, 'encoders.pkl'))
        
    # Load Metrics
    if os.path.exists(os.path.join(models_dir, 'model_metrics.json')):
        import json
        with open(os.path.join(models_dir, 'model_metrics.json'), 'r') as f:
            meta = json.load(f)
            MODEL_METRICS = meta.get('metrics', {})
            FEATURE_IMPORTANCE = meta.get('feature_importance', [])
            
except Exception as e:
    print(f"⚠️ Warning: Could not load models or metrics: {e}")

def get_base_volume(hour, day_of_week=0, area="Indiranagar", road="100 Feet Road", weather="Clear"):
    """Predict traffic volume using the Random Forest model with full features."""
    model_name = "Random Forest"
    if model_name in MODELS:
        try:
            # Prepare feature dictionary
            feat_dict = {
                'hour': hour,
                'day_of_week': day_of_week,
                'month': datetime.now().month,
                'hour_sin': np.sin(2 * np.pi * hour / 24),
                'hour_cos': np.cos(2 * np.pi * hour / 24)
            }
            
            # Add encoded categoricals
            feat_dict['Area Name'] = ENCODERS['Area Name'].transform([area])[0] if 'Area Name' in ENCODERS else 0
            feat_dict['Road/Intersection Name'] = ENCODERS['Road/Intersection Name'].transform([road])[0] if 'Road/Intersection Name' in ENCODERS else 0
            feat_dict['Weather Conditions'] = ENCODERS['Weather Conditions'].transform([weather])[0] if 'Weather Conditions' in ENCODERS else 0
            feat_dict['Roadwork and Construction Activity'] = 0 # Default
            
            # Predict using DataFrame to maintain feature names
            X = pd.DataFrame([feat_dict])
            # Reorder columns to match training
            cols = ['hour', 'day_of_week', 'month', 'hour_sin', 'hour_cos', 'Area Name', 'Road/Intersection Name', 'Weather Conditions', 'Roadwork and Construction Activity']
            return int(MODELS[model_name].predict(X[cols])[0])
        except Exception as e:
            print(f"❌ Prediction error: {e}")
    
    # Fallback to simulation if model fails
    if 8 <= hour <= 10 or 17 <= hour <= 20: base = 40000
    elif 5 <= hour <= 22: base = 22000
    else: base = 8000
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
        "active_alerts": [
            "Extreme congestion at Silk Board Junction. Avoid the flyover.",
            "Heavy rain predicted in North Bangalore after 6 PM." if random.random() > 0.5 else "Stable conditions across central corridors."
        ],
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/simulation', methods=['POST'])
def run_simulation():
    data = request.json
    departure_time = data.get('departure_time', '09:00')
    weather = data.get('weather', 'Clear')
    
    try:
        dep_time = datetime.strptime(departure_time, '%H:%M')
    except:
        dep_time = datetime.now()

    vol = get_base_volume(dep_time.hour, dep_time.weekday(), weather=weather)
    duration = 30 + int((vol / 50000) * 45)

    if weather == "Rain":
        vol = int(vol * 1.4)
        duration = int(duration * 1.8)
    
    return jsonify({
        "formatted_departure": dep_time.strftime('%I:%M %p'),
        "estimated_duration_mins": duration,
        "predicted_volume": vol,
        "congestion_level": "Heavy" if vol > 35000 else ("Moderate" if vol > 20000 else "Smooth")
    })

@app.route('/api/model-comparison', methods=['POST'])
def model_comparison():
    data = request.json
    hour = int(data.get('hour', 9))
    day = int(data.get('day', 0))
    
    ground_truth = get_base_volume(hour, day)
    results = []
    
    # Ensure we use the keys from MODEL_METRICS which includes ARIMA
    all_models = list(MODEL_METRICS.keys()) if MODEL_METRICS else ["Linear Regression", "Decision Tree", "Random Forest", "XGBoost", "ARIMA (Time-Series)"]

    # Identify the best model based on accuracy (R2) in metrics
    best_perf_model = ""
    max_acc = -1.0
    for name, m in MODEL_METRICS.items():
        if m.get('accuracy', 0) > max_acc:
            max_acc = m.get('accuracy', 0)
            best_perf_model = name

    for model_name in all_models:
        m = MODEL_METRICS.get(model_name, {"accuracy": 0.8, "rmse": 2000, "mae": 1500, "r2": 0.8})
        prediction = 0
        
        if model_name in MODELS:
            try:
                feat_dict = {
                    'hour': hour, 'day_of_week': day, 'month': datetime.now().month,
                    'hour_sin': np.sin(2 * np.pi * hour / 24), 'hour_cos': np.cos(2 * np.pi * hour / 24)
                }
                # Add categoricals (using 0 or first known label as default for comparison view)
                feat_dict['Area Name'] = 0
                feat_dict['Road/Intersection Name'] = 0
                feat_dict['Weather Conditions'] = 0
                feat_dict['Roadwork and Construction Activity'] = 0
                
                X = pd.DataFrame([feat_dict])
                cols = ['hour', 'day_of_week', 'month', 'hour_sin', 'hour_cos', 'Area Name', 'Road/Intersection Name', 'Weather Conditions', 'Roadwork and Construction Activity']
                prediction = int(MODELS[model_name].predict(X[cols])[0])
            except:
                prediction = ground_truth + random.randint(-1000, 1000)
        else:
            # ARIMA or missing model: simulate prediction relative to ground truth
            error_factor = 1.0 - m.get('accuracy', 0.8)
            prediction = ground_truth + int(random.uniform(-1, 1) * ground_truth * error_factor * 0.5)
        
        results.append({
            "model": model_name,
            "prediction": max(0, prediction),
            "metrics": m,
            "is_best": model_name == best_perf_model
        })

    return jsonify({
        "ground_truth": ground_truth,
        "results": results,
        "feature_importance": FEATURE_IMPORTANCE if FEATURE_IMPORTANCE else [
            {"feature": "Hour", "importance": 0.4},
            {"feature": "Day", "importance": 0.3}
        ],
        "insight": f"The {best_perf_model} model currently offers the highest predictive precision for this temporal window."
    })

# Real Route Data (Distance in km, Base Duration in mins)
ROUTE_DATA = {
    ('Indiranagar', 'M.G. Road'): {'dist': 4.5, 'base_time': 15},
    ('Indiranagar', 'Whitefield'): {'dist': 12.0, 'base_time': 35},
    ('Whitefield', 'Airport'): {'dist': 38.5, 'base_time': 55},
    ('Koramangala', 'Electronic City'): {'dist': 14.2, 'base_time': 30},
    ('M.G. Road', 'Hebbal'): {'dist': 8.8, 'base_time': 25},
    ('Jayanagar', 'Silk Board'): {'dist': 6.2, 'base_time': 20},
    ('Yeshwanthpur', 'Tumkur Road'): {'dist': 5.5, 'base_time': 18}
}

@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.json
    arrival_time = data.get('arrival_time', '09:00')
    source = data.get('source', 'Indiranagar')
    destination = data.get('destination', 'M.G. Road')
    weather = data.get('weather', 'Clear')
    
    route = ROUTE_DATA.get((source, destination)) or ROUTE_DATA.get((destination, source))
    if not route:
        route = {'dist': 10.0, 'base_time': 25}
        
    try:
        arr_time = datetime.strptime(arrival_time, '%H:%M')
    except:
        arr_time = datetime.now()

    vol = get_base_volume(arr_time.hour, arr_time.weekday(), area=source, road=destination, weather=weather)
    
    weather_multiplier = 1.0
    weather_text = "Clear skies"
    if weather == "Rain":
        weather_multiplier = 1.8
        vol = int(vol * 1.4)
        weather_text = "Heavy Bangalore Rain (Significant delays)"
    elif weather == "Fog":
        weather_multiplier = 1.3
        vol = int(vol * 1.1)
        weather_text = "Morning Fog (Reduced visibility)"

    traffic_factor = (vol / 50000)
    delay = int(route['base_time'] * traffic_factor * weather_multiplier)
    total_duration = route['base_time'] + delay
    
    rec_time = arr_time - timedelta(minutes=total_duration)
    
    return jsonify({
        "recommended_departure": rec_time.strftime('%I:%M %p'),
        "estimated_duration_mins": total_duration,
        "traffic_level": "High" if vol > 35000 else ("Moderate" if vol > 20000 else "Low"),
        "recommendation_text": f"Leave at {rec_time.strftime('%I:%M %p')} to reach {destination} by {arrival_time}.",
        "routes": [
            {"type": "Fastest", "duration": total_duration, "cost": int(route['dist'] * 15), "emissions": "Medium"},
            {"type": "Alternative", "duration": int(total_duration * 1.2), "cost": int(route['dist'] * 12), "emissions": "Low"}
        ],
        "weather_impact": weather_text,
        "parking_availability": "Limited" if vol > 35000 else "Moderate",
        "distance_km": route['dist']
    })

@app.route('/api/heatmap', methods=['GET'])
def get_heatmap():
    hours = [f"{i:02d}:00" for i in range(24)]
    volumes = [get_base_volume(i) for i in range(24)]
    return jsonify({"labels": hours, "data": volumes})

@app.route('/api/insights', methods=['GET'])
def get_insights():
    current_hour = datetime.now().hour
    current_day = datetime.now().weekday()
    
    # Dynamic insight 1: Peak hour prediction
    vols = [get_base_volume(h, current_day) for h in range(24)]
    peak_h = np.argmax(vols)
    peak_time = datetime.strptime(f"{peak_h}:00", "%H:%M").strftime("%I %p")
    
    # Dynamic insight 2: Weekend vs Weekday comparison
    weekday_vol = get_base_volume(current_hour, 0) # Monday
    weekend_vol = get_base_volume(current_hour, 6) # Sunday
    diff_pct = int(abs(weekday_vol - weekend_vol) / weekday_vol * 100)
    
    # Dynamic insight 3: Weather impact
    rain_vol = get_base_volume(current_hour, current_day, weather="Rain")
    clear_vol = get_base_volume(current_hour, current_day, weather="Clear")
    weather_impact = int((rain_vol - clear_vol) / clear_vol * 100)

    insights = [
        f"Today's peak congestion is predicted at {peak_time}.",
        f"Traffic is currently {diff_pct}% lower on weekends vs workdays.",
        f"Rain events increase trip duration by up to {weather_impact}% today.",
        "Silk Board remains the highest delay node in the network.",
        f"The best window for travel today is between 11 AM and 3 PM."
    ]
    
    return jsonify({"insights": random.sample(insights, 3)})


@app.route('/api/hotspots', methods=['GET'])
def get_hotspots():
    current_hour = datetime.now().hour
    hotspots = [
        {"name": "Silk Board Junction", "area": "Silk Board", "road": "Hosur Road"},
        {"name": "Tin Factory / K.R. Puram", "area": "K.R. Puram", "road": "Old Madras Road"},
        {"name": "Hebbal Flyover", "area": "Hebbal", "road": "Bellary Road"}
    ]
    results = []
    for hs in hotspots:
        vol = get_base_volume(current_hour, area=hs['area'], road=hs['road'])
        # Calculate percentage (max capacity assumed 60000 for calculation)
        percentage = min(100, int((vol / 60000) * 100))
        level = "high" if percentage > 80 else ("mod" if percentage > 50 else "low")
        results.append({
            "name": hs['name'],
            "percentage": f"{percentage}% Congestion",
            "status": level
        })
    return jsonify(results)

@app.route('/api/weekly', methods=['GET'])
def get_weekly():
    days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    # Predicted peaks for each day
    data = []
    for d in range(7):
        # Sample peak hour (9 AM)
        vol = get_base_volume(9, d)
        data.append(vol)
    return jsonify({"labels": days, "data": data})



if __name__ == '__main__':
    app.run(debug=True, port=5000)
