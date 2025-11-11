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

# --- Impor dari Modul Lokal Kita (SUDAH DIPERBAIKI) ---
from plugin_manager import plugin_manager
from fr import ask_ai, recognize_face_from_image, train_face_model

# --- Inisialisasi & Konfigurasi ---
app = Flask(__name__)
bcrypt = Bcrypt(app)
app.config["SECRET_KEY"] = "INI-KUNCI-RAHASIA-YANG-PASTI-BERHASIL-KARENA-KITA-YANG-BUAT"
CORS(app, resources={r"/api/*": {"origins": "http://localhost:8080"}} ) # Disederhanakan
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
    """Dekorator untuk memvalidasi token JWT."""
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
            # --- PERBAIKAN PENTING DI SINI ---
            # Masukkan user_id ke dalam kwargs agar bisa diterima oleh fungsi endpoint
            kwargs['current_user_id'] = data['user_id']
        except Exception as e:
            return jsonify({'message': f'Token tidak valid! {str(e)}'}), 401
        
        # Panggil fungsi asli dengan argumen yang sudah diperbarui
        return f(*args, **kwargs)
    return decorated

def save_message_to_db(user_id, role, message):
    """Menyimpan pesan ke database."""
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

@app.route("/api/chat", methods=["POST"])
@token_required
def chat(current_user_id):
    data = request.get_json()
    user_message = data.get("message", "")
    if not user_message:
        return jsonify({"error": "Pesan tidak boleh kosong"}), 400

    save_message_to_db(current_user_id, 'user', user_message)
    
    print(f"\n[DEBUG] Menerima pesan: '{user_message}'") # <-- TAMBAHKAN INI
    
    # Cek plugin terlebih dahulu
    plugin_result = plugin_manager.find_and_execute_plugin(user_message)
    
    if plugin_result:
        print(f"[DEBUG] Plugin ditemukan! Hasil: {plugin_result}") # <-- TAMBAHKAN INI
        if isinstance(plugin_result, dict):
            save_message_to_db(current_user_id, 'bot', f"[Data Terstruktur: {plugin_result.get('type')}]")
            return jsonify(plugin_result)
        else:
            save_message_to_db(current_user_id, 'bot', str(plugin_result))
            return Response(str(plugin_result), mimetype="text/plain")
    
    # Jika tidak ada plugin, panggil AI
    print("[DEBUG] Tidak ada plugin yang cocok. Meneruskan ke AI...")
    def stream_and_save():
        full_bot_response = ""
        # --- PERBAIKAN PENTING DI SINI ---
        # Memanggil ask_ai, bukan ask_openrouter
        for chunk in ask_ai(user_message):
            full_bot_response += chunk
            yield chunk
        if full_bot_response.strip():
            save_message_to_db(current_user_id, 'bot', full_bot_response.strip())
            
    return Response(stream_with_context(stream_and_save()), mimetype="text/plain")

# --- Endpoint Autentikasi & Profil (Tidak Berubah, tapi pastikan ada) ---

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
        if conn.is_connected(): cursor.close(); conn.close()

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
        if conn.is_connected(): cursor.close(); conn.close()

@app.route("/api/face-login", methods=["POST"])
def face_login():
    data = request.get_json()
    if 'image' not in data: return jsonify({"error": "Tidak ada data gambar"}), 400
    try:
        image_data = data['image'].split(',')[1]
        decoded_image = base64.b64decode(image_data)
        np_arr = np.frombuffer(decoded_image, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        recognized_username = recognize_face_from_image(img)
        if recognized_username:
            conn = get_db_connection()
            if conn is None: return jsonify({"error": "Koneksi database gagal"}), 500
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT id FROM users WHERE username = %s", (recognized_username,))
            user = cursor.fetchone()
            cursor.close(); conn.close()
            if user:
                payload = {'user_id': user['id'], 'exp': datetime.now(timezone.utc) + timedelta(hours=1)}
                token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm="HS256")
                return jsonify(access_token=token), 200
            else:
                return jsonify({"error": "Wajah dikenali tapi pengguna tidak ditemukan"}), 404
        else:
            return jsonify({"error": "Wajah tidak dikenali"}), 401
    except Exception as e:
        return jsonify({"error": f"Terjadi kesalahan saat memproses gambar: {str(e)}"}), 500

@app.route("/api/face-register", methods=["POST"])
@token_required
def face_register(current_user_id):
    data = request.get_json()
    if 'images' not in data or not isinstance(data['images'], list):
        return jsonify({"error": "Data gambar tidak valid"}), 400
    conn = get_db_connection()
    if conn is None: return jsonify({"error": "Koneksi database gagal"}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT username FROM users WHERE id = %s", (current_user_id,))
    user = cursor.fetchone()
    cursor.close(); conn.close()
    if not user: return jsonify({"error": "Pengguna tidak ditemukan"}), 404
    username = user['username']
    user_face_dir = os.path.join('faces', username)
    os.makedirs(user_face_dir, exist_ok=True)
    image_count = 0
    for i, image_data_url in enumerate(data['images']):
        try:
            image_data = image_data_url.split(',')[1]
            decoded_image = base64.b64decode(image_data)
            file_path = os.path.join(user_face_dir, f"{username}_{i + 1}.jpg")
            with open(file_path, 'wb') as f: f.write(decoded_image)
            image_count += 1
        except Exception as e:
            print(f"Gagal menyimpan gambar sampel ke-{i+1}: {e}")
            continue
    if image_count < 5: return jsonify({"error": f"Hanya {image_count} sampel wajah yang berhasil disimpan."}), 500
    if train_face_model():
        return jsonify({"message": "Wajah berhasil didaftarkan."}), 201
    else:
        return jsonify({"error": "Pelatihan model gagal."}), 500

@app.route("/api/me", methods=["GET"])
@token_required
def get_current_user(current_user_id):
    conn = get_db_connection()
    if conn is None: return jsonify({"error": "Koneksi database gagal"}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT username FROM users WHERE id = %s", (current_user_id,))
        user = cursor.fetchone()
        if user: return jsonify(username=user['username']), 200
        else: return jsonify({"error": "Pengguna tidak ditemukan"}), 404
    finally:
        if conn.is_connected(): cursor.close(); conn.close()

@app.route("/api/chat/history", methods=["GET"])
@token_required
def get_chat_history(current_user_id):
    conn = get_db_connection()
    if conn is None: return jsonify({"error": "Koneksi database gagal"}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT role, message, timestamp FROM chat_history WHERE user_id = %s ORDER BY timestamp ASC", (current_user_id,))
        history = cursor.fetchall()
        formatted_history = [{"isBot": row['role'] == 'bot', "text": row['message'], "timestamp": row['timestamp'].strftime("%H:%M")} for row in history]
        return jsonify(formatted_history), 200
    finally:
        if conn.is_connected(): cursor.close(); conn.close()

@app.route("/api/chat/history", methods=["DELETE"])
@token_required
def delete_chat_history(current_user_id):
    conn = get_db_connection()
    if conn is None: return jsonify({"error": "Koneksi database gagal"}), 500
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM chat_history WHERE user_id = %s", (current_user_id,))
        conn.commit()
        return jsonify({"message": "Riwayat obrolan telah dihapus."}), 200
    finally:
        if conn.is_connected(): cursor.close(); conn.close()

# --- Menjalankan Aplikasi ---
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
