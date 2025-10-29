import os
import jwt
import base64
import numpy as np
import cv2
from flask import Flask, request, Response, stream_with_context, jsonify
from flask_socketio import SocketIO, emit # <-- Impor baru
from flask_cors import CORS
from flask_bcrypt import Bcrypt
import mysql.connector
from datetime import datetime, timedelta, timezone
from functools import wraps
# Impor fungsi-fungsi relevan dari fr.py
from fr import create_recognizer, recognize_face, friday_response

# --- 1. Inisialisasi & Konfigurasi ---
app = Flask(__name__)
app.config["SECRET_KEY"] = "INI-KUNCI-RAHASIA-YANG-PASTI-BERHASIL-KARENA-KITA-YANG-BUAT"
bcrypt = Bcrypt(app)

# Inisialisasi SocketIO dengan mode async 'eventlet'
socketio = SocketIO(app, cors_allowed_origins="http://localhost:8080", async_mode='eventlet' )

CORS(app, resources={r"/api/*": {
    "origins": "http://localhost:8080",
    "methods": ["GET", "POST", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}} )

db_config = { 'host': 'localhost', 'user': 'root', 'password': 'ris132109', 'database': 'friday_db' }

def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn
    except mysql.connector.Error as err:
        print(f"DATABASE ERROR: {err}")
        return None

# --- 2. Dekorator Autentikasi (Tidak Berubah) ---
def token_required(f):
    # ... (kode dekorator ini tidak berubah)
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            try:
                token = request.headers['Authorization'].split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Token tidak memiliki format yang benar!'}), 401
        if not token:
            return jsonify({'message': 'Token tidak ditemukan!'}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user_id = data['user_id']
        except Exception as e:
            return jsonify({'message': f'Token tidak valid! {str(e)}'}), 401
        return f(current_user_id, *args, **kwargs)
    return decorated


# --- 3. Logika Pengenalan Wajah yang Diadaptasi untuk API ---
face_recognizer = create_recognizer()
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def recognize_face_from_image(image_data, recognizer):
    """Fungsi ini mengenali wajah dari data gambar yang diterima dari frontend."""
    if not recognizer: return None
    
    # Decode gambar dari base64
    try:
        header, encoded = image_data.split(",", 1)
        img_bytes = base64.b64decode(encoded)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    except Exception as e:
        print(f"Error decoding image: {e}")
        return None

    # Gunakan fungsi recognize_face yang sudah ada (atau logikanya)
    # Kita akan adaptasi logikanya di sini agar tidak membuka kamera di server
    # Anda perlu memastikan file model dan label ada
    try:
        import json
        recognizer.read("face_model.yml")
        with open("face_model_labels.json", "r") as f:
            label_dict = json.load(f)
            label_dict = {int(k): v for k, v in label_dict.items()}
    except FileNotFoundError:
        print("Model atau label pengenalan wajah tidak ditemukan di server.")
        return None

    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    for (x, y, w, h) in faces:
        face_img = gray[y:y+h, x:x+w]
        label, confidence = recognizer.predict(face_img)
        
        # Sesuaikan threshold confidence Anda
        if confidence < 70.0: 
            recognized_user_name = label_dict.get(label)
            print(f"Wajah dikenali: {recognized_user_name} dengan confidence {confidence}")
            return recognized_user_name

    return None

# --- 4. Event Handler untuk Socket.IO ---

@socketio.on('connect')
def handle_connect():
    """Handler saat frontend berhasil terhubung ke WebSocket."""
    print('Client terhubung ke WebSocket')

@socketio.on('recognize_frame')
def handle_recognize_frame(image_data):
    """Handler utama: menerima frame, mengenali wajah, dan mengirim token jika berhasil."""
    recognized_username = recognize_face_from_image(image_data, face_recognizer)
    
    if recognized_username:
        print(f"Login berhasil untuk: {recognized_username}")
        conn = get_db_connection()
        if conn is None: return
        
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id FROM users WHERE username = %s", (recognized_username,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if user:
            # Buat token JWT
            payload = {'user_id': user['id'], 'exp': datetime.now(timezone.utc) + timedelta(hours=1)}
            token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm="HS256")
            
            # Kirim token kembali ke frontend melalui WebSocket
            emit('login_success', {'access_token': token})
        else:
            emit('recognition_failed', {'message': 'Pengguna tidak ditemukan di database'})
    else:
        # Opsional: kirim status 'mencari' kembali ke frontend
        emit('recognizing', {'status': 'Mencari wajah...'})

@socketio.on('disconnect')
def handle_disconnect():
    print('Client terputus dari WebSocket')


# --- 5. Endpoint HTTP (Tidak Berubah) ---
# ... (semua endpoint @app.route Anda dari /register hingga /api/chat tetap di sini) ...
@app.route("/api/register", methods=["POST"])
def register():
    # ... (kode tidak berubah)
    data = request.get_json()
    username, password = data.get("username"), data.get("password")
    if not username or not password: return jsonify({"error": "Username dan password dibutuhkan"}), 400
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    conn = get_db_connection()
    if conn is None: return jsonify({"error": "Koneksi ke database gagal"}), 500
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (username, password) VALUES (%s, %s)", (username, hashed_password))
        conn.commit()
        return jsonify({"message": "Registrasi berhasil! Silakan masuk."}), 201
    except mysql.connector.Error as err:
        conn.rollback()
        if err.errno == 1062: return jsonify({"error": "Username sudah digunakan"}), 409
        return jsonify({"error": f"Gagal mendaftar: {str(err)}"}), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/api/login", methods=["POST"])
def login():
    # ... (kode tidak berubah)
    data = request.get_json()
    username, password = data.get("username"), data.get("password")
    if not username or not password: return jsonify({"error": "Username dan password dibutuhkan"}), 400
    conn = get_db_connection()
    if conn is None: return jsonify({"error": "Koneksi ke database gagal"}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
        if user and bcrypt.check_password_hash(user['password'], password):
            payload = {'user_id': user['id'], 'exp': datetime.now(timezone.utc) + timedelta(hours=1)}
            token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm="HS256")
            return jsonify(access_token=token), 200
        else:
            return jsonify({"error": "Username atau password salah"}), 401
    except mysql.connector.Error as err:
        return jsonify({"error": f"Terjadi kesalahan server: {str(err)}"}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/me", methods=["GET"])
@token_required
def get_current_user(current_user_id):
    # ... (kode tidak berubah)
    conn = get_db_connection()
    if conn is None: return jsonify({"error": "Koneksi ke database gagal"}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT username FROM users WHERE id = %s", (current_user_id,))
        user = cursor.fetchone()
        if user: return jsonify(username=user['username']), 200
        else: return jsonify({"error": "Pengguna tidak ditemukan"}), 404
    except mysql.connector.Error as err:
        return jsonify({"error": f"Gagal mengambil data pengguna: {str(err)}"}), 500
    finally:
        if conn.is_connected(): cursor.close(); conn.close()


@app.route("/api/chat/history", methods=["GET"])
@token_required
def get_chat_history(current_user_id):
    # ... (kode tidak berubah)
    conn = get_db_connection()
    if conn is None: return jsonify({"error": "Koneksi ke database gagal"}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        query = "SELECT role, message, timestamp FROM chat_history WHERE user_id = %s ORDER BY timestamp ASC"
        cursor.execute(query, (current_user_id,))
        history = cursor.fetchall()
        formatted_history = [{"isBot": row['role'] == 'bot', "text": row['message'], "timestamp": row['timestamp'].strftime("%H:%M")} for row in history]
        return jsonify(formatted_history), 200
    except mysql.connector.Error as err:
        return jsonify({"error": f"Gagal mengambil riwayat: {str(err)}"}), 500
    finally:
        if conn.is_connected(): cursor.close(); conn.close()


@app.route("/api/chat/history", methods=["DELETE"])
@token_required
def delete_chat_history(current_user_id):
    # ... (kode tidak berubah)
    conn = get_db_connection()
    if conn is None: return jsonify({"error": "Koneksi ke database gagal"}), 500
    try:
        cursor = conn.cursor()
        query = "DELETE FROM chat_history WHERE user_id = %s"
        cursor.execute(query, (current_user_id,))
        conn.commit()
        return jsonify({"message": f"Riwayat obrolan telah dihapus. {cursor.rowcount} pesan dihapus."}), 200
    except mysql.connector.Error as err:
        conn.rollback()
        return jsonify({"error": f"Gagal menghapus riwayat: {str(err)}"}), 500
    finally:
        if conn.is_connected(): cursor.close(); conn.close()

@app.route("/api/chat", methods=["POST"])
@token_required
def chat(current_user_id):
    # ... (kode tidak berubah)
    data = request.get_json()
    user_message = data.get("message", "")
    save_message_to_db(current_user_id, 'user', user_message)
    def stream_and_save():
        full_bot_response = ""
        for chunk in friday_response(user_message):
            full_bot_response += chunk
            yield chunk
        if full_bot_response:
            save_message_to_db(current_user_id, 'bot', full_bot_response.strip())
    return Response(stream_with_context(stream_and_save()), mimetype="text/plain")

def save_message_to_db(user_id, role, message):
    conn = get_db_connection()
    if conn is None: return
    try:
        cursor = conn.cursor()
        query = "INSERT INTO chat_history (user_id, role, message, timestamp) VALUES (%s, %s, %s, %s)"
        cursor.execute(query, (user_id, role, message, datetime.now()))
        conn.commit()
    except mysql.connector.Error as err:
        print(f"Gagal menyimpan pesan ke DB: {err}"); conn.rollback()
    finally:
        if conn.is_connected(): cursor.close(); conn.close()


# --- 6. Menjalankan Aplikasi dengan SocketIO ---
if __name__ == "__main__":
    print("Menjalankan server dengan SocketIO...")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)

