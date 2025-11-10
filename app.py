import os
import jwt
import base64
import cv2
import numpy as np
from flask import Flask, request, Response, stream_with_context, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
import mysql.connector
from datetime import datetime, timedelta, timezone
from functools import wraps
from plugin_manager import plugin_manager
from fr import ask_openrouter, recognize_face_from_image
from fr import train_face_model

# --- Inisialisasi & Konfigurasi ---
app = Flask(__name__)
bcrypt = Bcrypt(app)
app.config["SECRET_KEY"] = "INI-KUNCI-RAHASIA-YANG-PASTI-BERHASIL-KARENA-KITA-YANG-BUAT"
# Pastikan CORS mengizinkan semua metode yang kita butuhkan
CORS(app, resources={r"/api/*": {"origins": "http://localhost:8080", "methods": ["GET", "POST", "DELETE", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}} )
db_config = { 'host': 'localhost', 'user': 'root', 'password': 'ris132109', 'database': 'friday_db' }

# --- Fungsi Helper & Dekorator ---
def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn
    except mysql.connector.Error as err:
        print(f"DATABASE ERROR: {err}")
        return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            try: token = request.headers['Authorization'].split(" ")[1]
            except IndexError: return jsonify({'message': 'Token tidak memiliki format yang benar!'}), 401
        if not token: return jsonify({'message': 'Token tidak ditemukan!'}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            kwargs['current_user_id'] = data['user_id'] # Masukkan user_id ke kwargs
        except Exception as e: return jsonify({'message': f'Token tidak valid! {str(e)}'}), 401
        return f(*args, **kwargs)
    return decorated

def friday_response(user_message: str):
    plugin_result = plugin_manager.find_and_execute_plugin(user_message)
    if plugin_result:
        if isinstance(plugin_result, dict): return plugin_result
        def stream_plugin_result():
            words = str(plugin_result).split()
            for word in words: yield word + " "
        return stream_plugin_result()
    return ask_openrouter(user_message)

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

# --- ENDPOINT APLIKASI ---

@app.route("/api/register", methods=["POST"])
def register():
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
        cursor.close(); conn.close()

@app.route("/api/login", methods=["POST"])
def login():
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
        cursor.close(); conn.close()

@app.route("/api/face-login", methods=["POST"])
def face_login():
    data = request.get_json()
    if 'image' not in data:
        return jsonify({"error": "Tidak ada data gambar"}), 400

    # Decode gambar dari base64
    image_data = data['image'].split(',')[1]
    decoded_image = base64.b64decode(image_data)
    np_arr = np.frombuffer(decoded_image, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    # Panggil fungsi pengenalan wajah dari fr.py
    recognized_username = recognize_face_from_image(img)

    if recognized_username:
        # Jika wajah dikenali, cari user di database
        conn = get_db_connection()
        if conn is None: return jsonify({"error": "Koneksi ke database gagal"}), 500
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id FROM users WHERE username = %s", (recognized_username,))
        user = cursor.fetchone()
        cursor.close(); conn.close()

        if user:
            # Buat dan kirim token sama seperti login biasa
            user_id = user['id']
            payload = {'user_id': user_id, 'exp': datetime.now(timezone.utc) + timedelta(hours=1)}
            token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm="HS256")
            return jsonify(access_token=token), 200
        else:
            return jsonify({"error": "Wajah dikenali tapi pengguna tidak ditemukan di database"}), 404
    else:
        return jsonify({"error": "Wajah tidak dikenali"}), 401

@app.route("/api/face-register", methods=["POST"])
@token_required
def face_register(current_user_id):
    data = request.get_json()
    if 'images' not in data or not isinstance(data['images'], list):
        return jsonify({"error": "Data gambar tidak ada atau formatnya salah"}), 400

    # Dapatkan username pengguna saat ini untuk nama folder
    conn = get_db_connection()
    if conn is None: return jsonify({"error": "Koneksi database gagal"}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT username FROM users WHERE id = %s", (current_user_id,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if not user:
        return jsonify({"error": "Pengguna tidak ditemukan"}), 404
    
    username = user['username']
    user_face_dir = os.path.join('faces', username)
    os.makedirs(user_face_dir, exist_ok=True)

    # Simpan setiap gambar sampel yang dikirim dari frontend
    image_count = 0
    for i, image_data_url in enumerate(data['images']):
        try:
            image_data = image_data_url.split(',')[1]
            decoded_image = base64.b64decode(image_data)
            
            # Simpan file gambar
            file_path = os.path.join(user_face_dir, f"{username}_{i + 1}.jpg")
            with open(file_path, 'wb') as f:
                f.write(decoded_image)
            image_count += 1
        except Exception as e:
            print(f"Gagal menyimpan gambar sampel ke-{i+1}: {e}")
            # Lanjutkan saja jika satu gambar gagal
            continue
    
    if image_count < 5: # Butuh setidaknya beberapa sampel
        return jsonify({"error": f"Gagal menyimpan cukup sampel wajah. Hanya {image_count} yang tersimpan."}), 500

    # Setelah semua sampel disimpan, latih ulang model
    training_success = train_face_model()
    
    if training_success:
        return jsonify({"message": f"Wajah untuk '{username}' berhasil didaftarkan dan model telah dilatih ulang."}), 201
    else:
        return jsonify({"error": "Sampel wajah berhasil disimpan, tetapi pelatihan model gagal."}), 500

@app.route("/api/me", methods=["GET"])
@token_required
def get_current_user(current_user_id):
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
    data = request.get_json()
    user_message = data.get("message", "")
    save_message_to_db(current_user_id, 'user', user_message)
    response_data = friday_response(user_message)
    if isinstance(response_data, dict):
        save_message_to_db(current_user_id, 'bot', f"[Data Terstruktur: {response_data.get('type')}]")
        return jsonify(response_data)
    else:
        def stream_and_save():
            full_bot_response = ""
            for chunk in response_data:
                full_bot_response += chunk
                yield chunk
            if full_bot_response:
                save_message_to_db(current_user_id, 'bot', full_bot_response.strip())
        return Response(stream_with_context(stream_and_save()), mimetype="text/plain")

# --- Menjalankan Aplikasi ---
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
