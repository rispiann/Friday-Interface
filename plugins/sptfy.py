import os
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from plugin_manager import Plugin

sp = None
try:
    if all(os.getenv(key ) for key in ["SPOTIPY_CLIENT_ID", "SPOTIPY_CLIENT_SECRET", "SPOTIPY_REDIRECT_URI"]):
        sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
            client_id=os.getenv("SPOTIPY_CLIENT_ID"),
            client_secret=os.getenv("SPOTIPY_CLIENT_SECRET"),
            redirect_uri=os.getenv("SPOTIPY_REDIRECT_URI"),
            scope="user-modify-playback-state,user-read-playback-state"
        ))
except Exception as e:
    print(f"Gagal menginisialisasi Spotify: {e}")

class SpotifyPlugin(Plugin):
    def __init__(self):
        super().__init__()
        self.name = "Spotify Controller"
        # Kita menggunakan satu trigger utama dan memproses sub-perintah di dalam execute
        self.triggers = ["spotify"]

    def execute(self, command: str):
        """Memproses berbagai sub-perintah untuk Spotify."""
        if not sp:
            return "Maaf, Spotify tidak terkonfigurasi dengan benar."

        cmd_lower = command.lower().strip()

        try:
            if cmd_lower.startswith("mainkan") or cmd_lower.startswith("putar"):
                song_name = cmd_lower.replace("mainkan", "").replace("putar", "").strip()
                if not song_name: return "Lagu apa yang ingin Anda putar?"
                
                results = sp.search(q=song_name, limit=1, type='track')
                if not results['tracks']['items']:
                    return f"Maaf, saya tidak dapat menemukan lagu '{song_name}'."
                
                track = results['tracks']['items'][0]
                sp.start_playback(uris=[track['uri']])
                return f"Memutar {track['name']} oleh {track['artists'][0]['name']} di Spotify."

            elif cmd_lower == "jeda" or cmd_lower == "pause":
                sp.pause_playback()
                return "Musik dijeda."
            
            elif cmd_lower == "lanjutkan" or cmd_lower == "resume":
                sp.start_playback()
                return "Melanjutkan musik."

            elif cmd_lower == "berikutnya" or cmd_lower == "next":
                sp.next_track()
                return "Memutar lagu berikutnya."
            
            elif cmd_lower == "sebelumnya" or cmd_lower == "previous":
                sp.previous_track()
                return "Kembali ke lagu sebelumnya."

            else:
                return "Perintah Spotify tidak dikenal. Coba 'spotify mainkan [lagu]', 'spotify jeda', dll."

        except Exception as e:
            # Error ini sering terjadi jika tidak ada perangkat aktif
            if "No active device found" in str(e):
                return "Tidak ada perangkat Spotify yang aktif. Mohon putar lagu apa saja di salah satu perangkat Anda terlebih dahulu."
            return f"Terjadi kesalahan dengan Spotify: {e}"