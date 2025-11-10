import os
import importlib

# --- Kelas Dasar untuk semua Plugin (Kontrak Plugin) ---
class Plugin:
    def __init__(self):
        self.name = "Unnamed Plugin"
        self.triggers = []

    def execute(self, user_input: str):
        """Metode utama yang akan dijalankan oleh plugin."""
        raise NotImplementedError("Metode execute() harus diimplementasikan oleh plugin.")

# --- Manajer Plugin ---
class PluginManager:
    def __init__(self, plugin_folder="plugins"):
        self.plugins = {}
        self.load_plugins(plugin_folder)

    def load_plugins(self, plugin_folder):
        """Menemukan dan memuat semua plugin dari folder yang ditentukan."""
        if not os.path.exists(plugin_folder):
            return

        for filename in os.listdir(plugin_folder):
            if filename.endswith(".py") and filename != "__init__.py":
                module_name = f"{plugin_folder}.{filename[:-3]}"
                try:
                    module = importlib.import_module(module_name)
                    for item_name in dir(module):
                        item = getattr(module, item_name)
                        if isinstance(item, type) and issubclass(item, Plugin) and item is not Plugin:
                            plugin_instance = item()
                            # Daftarkan setiap trigger ke plugin yang sesuai
                            for trigger in plugin_instance.triggers:
                                self.plugins[trigger.lower()] = plugin_instance
                            print(f"Plugin '{plugin_instance.name}' berhasil dimuat.")
                except Exception as e:
                    print(f"Gagal memuat plugin dari {filename}: {e}")

    def find_and_execute_plugin(self, user_input: str):
        """Mencari plugin yang cocok dengan input dan menjalankannya."""
        lower_input = user_input.lower()
        for trigger, plugin_instance in self.plugins.items():
            if lower_input.startswith(trigger):
                # Ekstrak argumen dari input (teks setelah trigger)
                args = user_input[len(trigger):].strip()
                try:
                    return plugin_instance.execute(args)
                except Exception as e:
                    return f"Error saat menjalankan plugin {plugin_instance.name}: {e}"
        
        return None

plugin_manager = PluginManager()