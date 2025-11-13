import os
import subprocess
import webbrowser
import datetime
import speech_recognition as sr
from dotenv import load_dotenv
import time
import re
import json
import requests
from gtts import gTTS
from playsound import playsound
import tempfile
from plyer import notification
import pyautogui
from groq import Groq 
import threading
import random
import spotipy
from spotipy.oauth2 import SpotifyOAuth
try:
    # import chromadb
    # from chromadb.utils import embedding_functions
    chromadb_available = True
except ImportError:
    # chromadb = None
    chromadb_available = False
    print("Peringatan: ChromaDB tidak terinstal. Fitur memori jangka panjang dinonaktifkan.")
import schedule
import cv2
import numpy as np
from PIL import Image
import pytesseract

load_dotenv()

# Kunci API untuk Groq
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("GROQ_API_KEY tidak ditemukan di file .env. Fungsi AI tidak akan berjalan.")

# Konfigurasi lainnya (Spotify, Weather, dll.)
SPOTIFY_CLIENT_ID = os.getenv("SPOTIPY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIPY_CLIENT_SECRET")
SPOTIFY_REDIRECT_URI = os.getenv("SPOTIPY_REDIRECT_URI")
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")
CITY_NAME = os.getenv("CITY_NAME", "JAKARTA")
TESSERACT_PATH = os.getenv("TESSERACT_PATH", "")
if TESSERACT_PATH:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

# --- Inisialisasi Klien & Aplikasi ---
apps = {
    "notepad": "notepad.exe",
    "kalkulator": "calc.exe",
    "word": r"C:\Program Files\Microsoft Office\root\Office16\WINWORD.EXE",
    "excel": r"C:\Program Files\Microsoft Office\root\Office16\EXCEL.EXE",
    "spotify": os.getenv("SPOTIFY_PATH", r"C:\Users\awris\AppData\Local\Microsoft\WindowsApps\Spotify.exe")
}

sp = None
if all([SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI]):
    try:
        sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
            client_id=SPOTIFY_CLIENT_ID,
            client_secret=SPOTIFY_CLIENT_SECRET,
            redirect_uri=SPOTIFY_REDIRECT_URI,
            scope="user-read-playback-state,user-modify-playback-state,user-read-currently-playing"
        ))
    except Exception as e:
        print(f"Spotify init error: {e}")

memory = None
# if chromadb_available:
#     try:
#         # Menggunakan model embedding default dari ChromaDB yang tidak memerlukan kunci API
#         embedding_fn = embedding_functions.DefaultEmbeddingFunction()
#         chroma_client = chromadb.PersistentClient(path="./chroma_db")
#         memory = chroma_client.get_or_create_collection(name="friday_memory", embedding_function=embedding_fn)
#         print("Memori jangka panjang (ChromaDB) berhasil diaktifkan.")
#     except Exception as e:
#         print(f"ChromaDB/Memory init error: {e}")
# else:
#     print("Fitur memori jangka panjang tidak diaktifkan karena ChromaDB tidak terinstal.")


def save_memory(role: str, text: str):
    # """Menyimpan teks ke dalam memori jangka panjang."""
    # if memory and text and text.strip():
    #     try:
    #         unique_id = f"{role}_{int(time.time() * 1000)}"
    #         memory.add(documents=[text], metadatas=[{"role": role}], ids=[unique_id])
    #     except Exception as e:
    #         print(f"Gagal menyimpan ke memori: {e}")
    pass

def recall_memory(query: str) -> str:
    # """Mengambil kembali memori yang relevan berdasarkan query."""
    # if memory:
    #     try:
    #         results = memory.query(query_texts=[query], n_results=3)
    #         if results and results["documents"] and results["documents"][0]:
    #             return "\n".join(results["documents"][0])
    #     except Exception as e:
    #         print(f"Gagal mengambil dari memori: {e}")
    return ""

def ask_ai(prompt: str):
    """
    Fungsi AI utama yang berkomunikasi dengan Groq API.
    Versi ini TIDAK menggunakan memori jangka panjang untuk kompatibilitas deployment.
    """
    if not GROQ_API_KEY:
        yield "Maaf, fungsi AI tidak aktif karena kunci API Groq tidak dikonfigurasi."
        return

    try:
        client = Groq(api_key=GROQ_API_KEY)
        
        # --- BAGIAN MEMORI DINONAKTIFKAN ---
        # context = recall_memory(prompt) # <-- DIKOMENTARI
        
        # Prompt sekarang lebih sederhana, tanpa konteks memori
        full_prompt = [
            {
                "role": "system",
                "content": (
                    "Anda adalah Friday, sebuah asisten AI yang cerdas, ramah, dan membantu."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
        
        stream = client.chat.completions.create(
            messages=full_prompt,
            model="llama-3.1-8b-instant", 
            temperature=0.7,
            max_tokens=1024,
            top_p=1,
            stream=True,
            stop=None,
        )
        
        # --- BAGIAN MEMORI DINONAKTIFKAN ---
        # save_memory("user", prompt) # <-- DIKOMENTARI
        
        full_bot_response = ""
        for chunk in stream:
            chunk_text = chunk.choices[0].delta.content
            if chunk_text:
                full_bot_response += chunk_text
                yield chunk_text
        
        # --- BAGIAN MEMORI DINONAKTIFKAN ---
        # if full_bot_response.strip():
        #     save_memory("friday", full_bot_response.strip()) # <-- DIKOMENTARI
            
    except Exception as e:
        print(f"Terjadi kesalahan saat menghubungi Groq: {e}")
        yield f"Maaf, terjadi kesalahan internal saat memproses permintaan AI."



# Face Recognition Settings
privacy_mode = False
face_monitor_enabled = True
require_face_on_startup = False
allow_face_toggle = True
FACES_DIR = "faces"
MODEL_PATH = os.path.join(FACES_DIR, "face_model.yml")
LABELS_PATH = os.path.join(FACES_DIR, "face_model_labels.json")
NUM_SAMPLES = int(os.getenv("FACES_SAMPLES", "20"))
SAMPLE_DELAY = float(os.getenv("FACE_SAMPLE_DELAY", "0.25"))
LBPH_CONFIDENCE_THRESHOLD = float(os.getenv("LBPH_CONFIDENCE_THRESHOLD", "85.0"))
os.makedirs(FACES_DIR, exist_ok=True)

def create_recognizer():
    try:
        return cv2.face.LBPHFaceRecognizer_create()
    except AttributeError:
        print("ERROR: cv2.face tidak tersedia. Install opencv-contrib-python.")
        return None
recognizer = create_recognizer()

def speak(text):
    global privacy_mode
    print("Friday:", text)
    if privacy_mode:
        return
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as fp:
            temp_path = fp.name
        tts = gTTS(text=text, lang="id")
        tts.save(temp_path)
        playsound(temp_path)
        os.remove(temp_path)
    except Exception as e:
        print("TTS error:", e)

def listen(timeout=None, phrase_time_limit=8):
    if privacy_mode:
        return ""
    r = sr.Recognizer()
    with sr.Microphone() as source:
        print("Listening ....")
        try:
            audio = r.listen(source, timeout=timeout, phrase_time_limit=phrase_time_limit)
        except Exception:
            return ""
    try:
        command = r.recognize_google(audio, language="id-ID")
        print("You (ID):", command)
        return command.lower()
    except sr.UnknownValueError:
        return ""
    except sr.RequestError:
        speak("Sorry sir, we have problem with the internet")
        return ""

def notify(title, message):
    try:
        notification.notify(title=title, message=message, app_name="Friday", timeout=10)
    except Exception:
        pass

def set_reminder(delay, reminder_text):
    def job():
        notify("Friday Reminder", reminder_text)
        speak(f"Reminder: {reminder_text}")
    threading.Timer(delay, job).start()

def close_tab(): pyautogui.hotkey("ctrl", "w")
def minimize_window(): pyautogui.hotkey("win", "down")
def maximize_window(): pyautogui.hotkey("win", "up")
def switch_window(): pyautogui.hotkey("alt", "tab")
def close_window(): pyautogui.hotkey("alt", "f4")

def play_song(song_name):
    try:
        if not sp:
            speak("Spotify is not configured, sir.")
            return
        spotify_path = apps["spotify"]
        spotify_open = False
        for proc in os.popen('tasklist').read().strip().split('\n'):
            if "Spotify.exe" in proc:
                spotify_open = True
                break
        if not spotify_open:
            speak("Opening Spotify first, sir.")
            subprocess.Popen(spotify_path)
            time.sleep(5)
        results = sp.search(q=song_name, limit=1, type='track')
        if results['tracks']['items']:
            track = results['tracks']['items'][0]
            uri = track['uri']
            devices = sp.devices()
            if devices["devices"]:
                device_id = devices["devices"][0]["id"]
                sp.start_playback(device_id=device_id, uris=[uri])
                speak(f"Playing {track['name']} by {track['artists'][0]['name']} on Spotify, sir.")
            else:
                speak("No active Spotify device found. Please check Spotify, sir.")
        else:
            speak("Sorry, I couldn't find that song, sir.")
    except Exception as e:
        speak(f"Failed to play the song, sir. Error: {e}")

def pause_song():
    try:
        if not sp: speak("Spotify is not configured, sir."); return
        devices = sp.devices()
        if devices["devices"]: sp.pause_playback(); speak("Music paused, sir.")
        else: speak("No active Spotify device found, sir.")
    except: speak("Failed to pause music, sir.")

def resume_song():
    try:
        if not sp: speak("Spotify is not configured, sir."); return
        sp.start_playback()
        speak("Resuming music, sir.")
    except: speak("Failed to resume music, sir.")

def next_song():
    try:
        if not sp: speak("Spotify is not configured, sir."); return
        sp.next_track()
        speak("Skipping to the next track, sir.")
    except: speak("Failed to skip track, sir.")

def previous_song():
    try:
        if not sp: speak("Spotify is not configured, sir."); return
        sp.previous_track()
        speak("Going back to the previous track, sir.")
    except: speak("Failed to go back track, sir.")

def daily_weather():
    if not WEATHER_API_KEY: speak("Weather API is not configured, sir."); return
    url = f"http://api.openweathermap.org/data/2.5/weather?q={CITY_NAME}&appid={WEATHER_API_KEY}&units=metric"
    try:
        res = requests.get(url, timeout=10 )
        res.raise_for_status()
        data = res.json()
        weather_desc = data["weather"][0]["description"].capitalize()
        temp = data["main"]["temp"]
        feels_like = data["main"]["feels_like"]
        humidity = data["main"]["humidity"]
        msg = (f"Today's weather in {CITY_NAME}, sir:\n"
               f"{weather_desc}, Temperature: {temp}°C, Feels like: {feels_like}°C, Humidity: {humidity}%")
        notify("Weather Report", msg)
        speak(msg)
    except: speak("Sorry sir, I couldn't fetch the weather.")

def schedule_weather():
    try:
        import schedule
        schedule.every().day.at("09:00").do(daily_weather)
        while True:
            schedule.run_pending()
            time.sleep(30)
    except ImportError:
        print("Peringatan: 'schedule' tidak terinstal. Penjadwalan cuaca dinonaktifkan.")

# Fungsi friday_response yang lama tidak lagi relevan untuk web, tapi kita bisa buat versi sederhana untuk CLI
def friday_response_cli(message: str):
    return ask_ai(message)

def capture_face_samples(user_name):
    if not recognizer: speak("Face recognition is not available..."); return False
    speak(f"Starting face capture for {user_name}. Please look at the camera, sir.")
    user_dir = os.path.join(FACES_DIR, user_name)
    os.makedirs(user_dir, exist_ok=True)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    cap = cv2.VideoCapture(0)
    if not cap.isOpened(): speak("Cannot access camera, sir."); return False
    count = 0
    print(f"Capturing {NUM_SAMPLES} samples...")
    while count < NUM_SAMPLES:
        ret, frame = cap.read()
        if not ret: break
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        for (x, y, w, h) in faces:
            cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
            count += 1
            face_img = gray[y:y+h, x:x+w]
            file_path = os.path.join(user_dir, f"{user_name}_{count}.jpg")
            cv2.imwrite(file_path, face_img)
            cv2.putText(frame, f"Sample {count}/{NUM_SAMPLES}", (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
            time.sleep(SAMPLE_DELAY)
        cv2.imshow('Capturing Face - Press Q to quit', frame)
        if cv2.waitKey(1) & 0xFF == ord('q') or count >= NUM_SAMPLES: break
    cap.release()
    cv2.destroyAllWindows()
    if count >= NUM_SAMPLES: speak(f"Successfully captured {count} samples for {user_name}, sir."); return True
    else: speak(f"Only captured {count} samples. Please try again, sir."); return False

def train_face_model():
    if not recognizer: return False
    print("Memulai pelatihan model pengenalan wajah...")
    faces, labels, label_dict, current_label = [], [], {}, 0
    if not os.path.exists(FACES_DIR): os.makedirs(FACES_DIR)
    for user_name in os.listdir(FACES_DIR):
        user_path = os.path.join(FACES_DIR, user_name)
        if not os.path.isdir(user_path): continue
        label_dict[current_label] = user_name
        for img_name in os.listdir(user_path):
            img_path = os.path.join(user_path, img_name)
            try:
                img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
                if img is not None: faces.append(img); labels.append(current_label)
            except Exception as e: print(f"Gagal membaca gambar {img_path}: {e}")
        current_label += 1
    if not faces or not labels: print("Tidak ada data wajah untuk dilatih."); return False
    try:
        recognizer.train(faces, np.array(labels))
        recognizer.write(MODEL_PATH)
        with open(LABELS_PATH, "w") as f: json.dump(label_dict, f)
        print(f"Pelatihan selesai. Mengenali {len(label_dict)} pengguna."); return True
    except Exception as e: print(f"ERROR saat pelatihan model: {e}"); return False

def recognize_face():
    if not recognizer or not os.path.exists(MODEL_PATH): speak("No trained model found."); return None
    recognizer.read(MODEL_PATH)
    try:
        with open(LABELS_PATH, "r") as f: label_dict = {int(k): v for k, v in json.load(f).items()}
    except: speak("Cannot load label dictionary."); return None
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    cap = cv2.VideoCapture(0)
    if not cap.isOpened(): speak("Cannot access camera."); return None
    speak("Looking for your face, sir.")
    recognized_user, attempts, max_attempts = None, 0, 50
    while attempts < max_attempts:
        ret, frame = cap.read()
        if not ret: break
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        for (x, y, w, h) in faces:
            face_img = gray[y:y+h, x:x+w]
            label, confidence = recognizer.predict(face_img)
            if confidence < LBPH_CONFIDENCE_THRESHOLD:
                recognized_user = label_dict.get(label, "Unknown")
                cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
                cv2.putText(frame, f"{recognized_user} ({confidence:.1f})", (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
            else:
                cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 0, 255), 2)
                cv2.putText(frame, "Unknown", (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
        cv2.imshow('Face Recognition - Press Q to quit', frame)
        if recognized_user or cv2.waitKey(1) & 0xFF == ord('q'): break
        attempts += 1
    cap.release()
    cv2.destroyAllWindows()
    return recognized_user

def setup_face_recognition():
    speak("Face recognition setup, sir. What is your name?")
    print("Enter your name: ", end="")
    user_name = input().strip()
    if not user_name: speak("Invalid name, sir."); return False
    if capture_face_samples(user_name):
        if train_face_model(): speak("Face recognition setup complete, sir."); return True
    return False

def list_registered_faces():
    users = [d for d in os.listdir(FACES_DIR) if os.path.isdir(os.path.join(FACES_DIR, d))]
    if users: speak(f"Registered users: {', '.join(users)}, sir.")
    else: speak("No registered users found, sir.")

def recognize_face_from_image(image_array):
    if not recognizer or not os.path.exists(MODEL_PATH): return None
    try:
        with open(LABELS_PATH, "r") as f: label_dict = {int(k): v for k, v in json.load(f).items()}
    except Exception as e: return None
    recognizer.read(MODEL_PATH)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    for (x, y, w, h) in faces:
        face_img = gray[y:y+h, x:x+w]
        label, confidence = recognizer.predict(face_img)
        print(f"Wajah terdeteksi. Label: {label}, Confidence: {confidence}")
        if confidence < LBPH_CONFIDENCE_THRESHOLD:
            return label_dict.get(label)
    return None

def handle_command(command):
    if "waktu" in command or "time" in command:
        now = datetime.datetime.now().strftime("%H:%M")
        speak(f"It is {now} right now, sir.")
    elif "buka youtube" in command:
        speak("Opening Youtube now, sir.")
        webbrowser.open("https://youtube.com" )
    elif "hallo" in command or "hello" in command:
        responses = ["Hello sir, I'm fully online.", "Greetings, sir. How may I assist you?", "Hello sir, ready when you are."]
        speak(random.choice(responses))
    elif "buka google" in command:
        speak("Opening Google, sir.")
        webbrowser.open("https://google.com" )
    elif "mainkan lagu" in command or "putar lagu" in command:
        song = re.sub(r"(mainkan lagu|putar lagu)", "", command).strip()
        if song: play_song(song)
        else: speak("Please say the song name, sir.")
    elif "tutup tab" in command: speak("Closing the current tab, sir."); close_tab()
    elif "cuaca" in command: daily_weather()
    elif "pause lagu" in command or "jeda lagu" in command: pause_song()
    elif "lanjutkan lagu" in command or "resume lagu" in command: resume_song()
    elif "skip lagu" in command or "lagu berikutnya" in command: next_song()
    elif "lagu sebelumnya" in command: previous_song()
    elif "minimize" in command or "kecilkan" in command: speak("Minimizing the window, sir."); minimize_window()
    elif "maximize" in command or "besarkan" in command: speak("Maximizing the window, sir."); maximize_window()
    elif "switch" in command or "tukar" in command: speak("Switching the window, sir."); switch_window()
    elif "tutup window" in command or "close window" in command: speak("Closing the window, sir."); close_window()
    elif "setup wajah" in command or "daftar wajah" in command: setup_face_recognition()
    elif "cek wajah" in command or "kenali wajah" in command:
        user = recognize_face()
        if user: speak(f"Welcome back, {user}, sir.")
        else: speak("I couldn't recognize you, sir.")
    elif "latih wajah" in command or "train wajah" in command: train_face_model()
    elif "daftar user" in command or "list user" in command: list_registered_faces()
    elif "buka" in command:
        found = False
        for app in apps:
            if app in command:
                speak(f"Opening {app}, sir.")
                try: os.startfile(apps[app])
                except: speak(f"Sorry sir, I couldn't open {app}.")
                found = True; break
        if not found: speak("I don't know this app, sir.")
    elif "ingatkan" in command or "notifikasi" in command:
        match = re.search(r"(\d+)\s*(menit|detik)", command)
        if match:
            jumlah, satuan = int(match.group(1)), match.group(2)
            delay = jumlah * 60 if "menit" in satuan else jumlah
            reminder_text = re.sub(r"(\d+\s*(menit|detik))|ingatkan saya", "", command).strip() or "Your reminder"
            speak(f"Alright sir, I will remind you in {jumlah} {satuan}: {reminder_text}")
            set_reminder(delay, reminder_text)
        else: speak("Please specify the time, sir. Example: remind me in 5 minutes.")
    elif "help" in command or "bantuan" in command:
        speak("Commands: waktu, buka youtube, buka google, mainkan lagu, pause, resume, skip, cuaca, ingatkan, daftar wajah, cek wajah, keluar.")
    elif "keluar" in command or "stop" in command:
        speak("Shutting down. Goodbye, sir."); return False
    else:
        if command.strip():
            # Menggunakan friday_response_cli untuk mendapatkan jawaban dari AI
            responses_generator = friday_response_cli(command)
            full_reply = "".join(list(responses_generator))
            speak(full_reply)
        else:
            speak("I didn't catch that, sir. Could you repeat?")
    return True

def run_friday():
    if require_face_on_startup and recognizer:
        user = recognize_face()
        if not user: speak("Authentication failed. Shutting down."); return
        speak(f"Welcome back, {user}, sir.")
    speak("Hello, I am Friday. Fully operational.")
    if WEATHER_API_KEY:
        threading.Thread(target=schedule_weather, daemon=True).start()
    while True:
        command = listen()
        if command:
            if not handle_command(command): break

if __name__ == "__main__":
    run_friday()
