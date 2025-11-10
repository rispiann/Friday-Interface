# plugins/cuaca.py
import os
import requests
from plugin_manager import Plugin

class WeatherPlugin(Plugin):
    def __init__(self):
        super().__init__()
        self.name = "Cuaca"
        self.triggers = ["cuaca di", "bagaimana cuaca di", "suhu di"]
        self.api_key = os.getenv("WEATHER_API_KEY")
        self.default_city = os.getenv("CITY_NAME", "JAKARTA")

    def execute(self, city: str):
        """
        Menjalankan logika untuk mendapatkan data cuaca dan mengembalikannya
        sebagai dictionary terstruktur (JSON).
        """
        if not self.api_key:
            return "Maaf, API key untuk cuaca belum dikonfigurasi."

        target_city = city if city else self.default_city
        
        url = f"http://api.openweathermap.org/data/2.5/weather?q={target_city}&appid={self.api_key}&units=metric&lang=id"
        
        try:
            res = requests.get(url, timeout=10 )
            res.raise_for_status()
            data = res.json()
            
            # --- INI BAGIAN PENTINGNYA ---
            # Kita sekarang mengemas data ke dalam dictionary, bukan string.
            # Ini adalah "paket data" yang akan kita kirim ke frontend.
            weather_data = {
                "type": "weather_card",  # Ini adalah "kartu identitas" respons
                "data": {
                    "city": data["name"],
                    "temperature": round(data["main"]["temp"]), # Bulatkan suhu
                    "condition": data["weather"][0]["description"].capitalize(),
                    "icon_code": data["weather"][0]["icon"] # Kode ikon dari API (misal: "01d", "10n")
                }
            }
            return weather_data # Kembalikan dictionary-nya

        except requests.exceptions.HTTPError as http_err:
            if http_err.response.status_code == 404:
                return f"Maaf, saya tidak dapat menemukan kota bernama '{target_city}'."
            return f"Maaf, terjadi kesalahan saat menghubungi layanan cuaca: {http_err}"
        except Exception as e:
            return f"Maaf, terjadi kesalahan tak terduga saat mengambil data cuaca: {e}"
