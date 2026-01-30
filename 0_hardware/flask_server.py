from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from datetime import datetime

last_action = {
    "action": None,
    "timestamp": None,
    "consumed": False
}

custom_message = {
    "message": None,
    "timestamp": None,
    "consumed": False
}

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Shared system state
sensor_data = {}
light_state = "OFF"

# Caregiver status state (NEW)
caregiver_status = {
    "status": "idle",       # "idle" or "on_the_way"
    "updated_at": None,
    "consumed": False       # False = ESP32 has not shown it yet
}

@app.route('/')
def index():
    return "🚀 Flask Server for AID FOR ALL Running"

# --- Receive data from main ESP32 ---
@app.route('/sensor', methods=['POST'])
def sensor_data_route():
    global sensor_data, light_state
    sensor_data = request.get_json()
    print("✅ Received from ESP32 #1:", sensor_data)

    # If ESP32 sends light_state, update the shared state
    if 'light_state' in sensor_data:
        light_state = sensor_data['light_state']

    socketio.emit('sensor_update', sensor_data)
    return jsonify({"status": "true"})

# --- Control the light ---
@app.route('/light/on', methods=['GET'])
def light_on():
    global light_state
    light_state = "ON"
    print("💡 Light turned ON (command sent to ESP32 #2)")
    return jsonify({"light_state": light_state})
@app.route('/action', methods=['POST'])
def receive_action():
    global last_action

    data = request.get_json() or {}
    action = data.get("action")

    if not action:
        return jsonify({"success": False, "error": "No action provided"}), 400

    last_action = {
        "action": action,
        "timestamp": datetime.utcnow().isoformat(),
        "consumed": False
    }

    print("📲 Action received from app:", last_action)

    # Optional: realtime notify dashboard / ESP32
    socketio.emit("action_update", last_action)

    return jsonify({"success": True, **last_action})

@app.route('/light/off', methods=['GET'])
def light_off():
    global light_state
    light_state = "OFF"
    print("💡 Light turned OFF (command sent to ESP32 #2)")
    return jsonify({"light_state": light_state})

# --- ESP32 #2 (relay node) polls this ---
@app.route('/light/state', methods=['GET'])
def get_light_state():
    return jsonify({"light_state": light_state})

# --- Optional: Check latest sensor data ---
@app.route('/data', methods=['GET'])
def get_data():
    return jsonify(sensor_data)

# ================= CAREGIVER STATUS (NEW) =================
@app.route('/custom-message', methods=['POST'])
def receive_custom_message():
    global custom_message

    data = request.get_json() or {}
    message = data.get("message")

    if not message:
        return jsonify({"success": False, "error": "Empty message"}), 400

    custom_message = {
        "message": message,
        "timestamp": datetime.utcnow().isoformat(),
        "consumed": False
    }

    print("💬 Custom message received:", custom_message)

    socketio.emit("custom_message", custom_message)

    return jsonify({"success": True, **custom_message})

# Mobile app: caregiver taps "I'm on the way" → POST here
@app.route('/caregiver-status', methods=['POST'])
def set_caregiver_status():
    global caregiver_status
    data = request.get_json() or {}
    status = data.get("status")

    if status not in ["idle", "on_the_way"]:
        return jsonify({"error": "Invalid status"}), 400

    caregiver_status["status"] = status
    caregiver_status["updated_at"] = datetime.utcnow().isoformat()
    caregiver_status["consumed"] = False  # new event not yet handled by ESP32

    print("👨‍⚕️ Caregiver status updated:", caregiver_status)
    return jsonify({"ok": True, **caregiver_status})

# Any client (ESP32 or debug) can read current status
@app.route('/caregiver-status', methods=['GET'])
def get_caregiver_status():
    return jsonify(caregiver_status)

# ESP32: after showing "ON THE WAY" once, mark event as consumed
@app.route('/caregiver-status/consume', methods=['POST'])
def consume_caregiver_status():
    global caregiver_status
    caregiver_status["consumed"] = True
    print("✅ Caregiver status consumed by ESP32:", caregiver_status)
    return jsonify({"ok": True, **caregiver_status})

@app.route('/action', methods=['GET'])
def get_action():
    return jsonify(last_action)

@app.route('/custom-message', methods=['GET'])
def get_custom_message():
    return jsonify(custom_message)

@app.route('/action/consume', methods=['POST'])
def consume_action():
    global last_action
    last_action["consumed"] = True
    return jsonify({"ok": True, **last_action})

@app.route('/custom-message/consume', methods=['POST'])
def consume_custom_message():
    global custom_message
    custom_message["consumed"] = True
    return jsonify({"ok": True, **custom_message})

# =========================================================

if __name__ == '__main__':
    print("🚀 Flask-SocketIO Server Running...")
    socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)