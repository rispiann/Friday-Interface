import os
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from plugin_manager import Plugin 

# Inisialisasi klien Spotify tetap di luar kelas agar hanya dibuat sekali
sp = None
try:
    if all(os.getenv(key) for key in ["SPOTIPY_CLIENT_ID", "SPOTIPY_CLIENT_SECRET", "SPOTIPY_REDIRECT_URI"]):
        sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
            client_id=os.getenv("SPOTIPY_CLIENT_ID"),
            client_secret=os.getenv("SPOTIPY_CLIENT_SECRET"),
            redirect_uri=os.getenv("SPOTIPY_REDIRECT_URI"),
            scope="user-read-currently-playing" # Scope yang benar dan gratis
        ))
        print("Plugin 'Spotify' berhasil menginisialisasi klien.")
    else:
        print("Peringatan Plugin Spotify: Variabel lingkungan tidak lengkap.")
except Exception as e:
    print(f"Error saat inisialisasi plugin Spotify: {e}")


class SpotifyPlugin(Plugin):
    def __init__(self):
        super().__init__()
        self.name = "Spotify Info"
        # Trigger ini akan dicocokkan oleh PluginManager
        self.triggers = ["spotify info", "info lagu", "lagu apa"] 

    def execute(self, args: str):
        """
        Metode ini akan dijalankan oleh PluginManager.
        Parameter 'args' akan kosong karena trigger kita sudah mencakup seluruh perintah.
        """
        if not sp:
            return {"type": "error", "content": "Integrasi Spotify tidak dikonfigurasi."}

        try:
            current_track = sp.current_user_playing_track()

            if current_track and current_track.get('is_playing') and current_track.get('item'):
                track_item = current_track['item']
                
                return {
                    "type": "spotify_card",
                    "data": {
                        "title": track_item['name'],
                        "artist": ", ".join([artist['name'] for artist in track_item['artists']]),
                        "imageUrl": track_item['album']['images'][0]['url'] if track_item['album']['images'] else None,
                        "songUrl": track_item['external_urls'].get('spotify', '#')
                    }
                }
            else:
                return {"type": "error", "content": "Tidak ada lagu yang sedang diputar di Spotify."}

        except Exception as e:
            error_str = str(e)
            print(f"Error di plugin Spotify: {error_str}")
            if "token" in error_str.lower():
                 return {"type": "error", "content": "Token Spotify kedaluwarsa. Coba hapus file .cache dan autentikasi ulang."}
            return {"type": "error", "content": "Gagal mendapatkan info dari Spotify."}
