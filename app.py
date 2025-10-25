from flask import Flask, request, Response, stream_with_context, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
import mysql.connector # <-- Impor library baru
from mysql.connector import errorcode # <-- Untuk menangani error
from fr import friday_response

app = Flask(__name__)
CORS(app)
bcrypt = Bcrypt(app)

# --- Konfigurasi Database MySQL ---
# Simpan konfigurasi dalam sebuah dictionary agar mudah digunakan
db_config = {
    'host': 'localhost',
    'user': 'root', # Ganti dengan username MySQL Anda
    'password': 'ris132109', # Ganti dengan password MySQL Anda
    'database': 'friday_db'
}

# Fungsi untuk mendapatkan koneksi database
def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            print("Error: Username atau password database salah")
        elif err.errno == errorcode.ER_BAD_DB_ERROR:
            print("Error: Database tidak ditemukan")
        else:
            print(f"Error koneksi database: {err}")
        return None

# --- Endpoint untuk Registrasi Pengguna ---
@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username dan password dibutuhkan"}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Tidak dapat terhubung ke database"}), 500

    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (username, password) VALUES (%s, %s)", (username, hashed_password))
        conn.commit()
        return jsonify({"message": "Registrasi berhasil!"}), 201
    except mysql.connector.Error as err:
        conn.rollback()
        if err.errno == 1062: # Error code for duplicate entry
            return jsonify({"error": "Username sudah digunakan"}), 409
        return jsonify({"error": f"Gagal mendaftar: {str(err)}"}), 500
    finally:
        cursor.close()
        conn.close()

# --- Endpoint untuk Login Pengguna ---
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username dan password dibutuhkan"}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Tidak dapat terhubung ke database"}), 500
        
    # dictionary=True agar hasil query bisa diakses seperti dict, e.g., user['password']
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()

        if user and bcrypt.check_password_hash(user['password'], password):
            return jsonify({"message": f"Selamat datang, {user['username']}!"}), 200
        else:
            return jsonify({"error": "Username atau password salah"}), 401
    except mysql.connector.Error as err:
        return jsonify({"error": f"Terjadi kesalahan: {str(err)}"}), 500
    finally:
        cursor.close()
        conn.close()

# --- Endpoint Chat yang sudah ada ---
@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "")
    response_generator = friday_response(user_message)
    return Response(stream_with_context(response_generator), mimetype="text/plain")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
