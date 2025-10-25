import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, User, KeyRound } from "lucide-react";
import { ParticleBackground } from "@/components/ParticleBackground"; // Kita gunakan background partikel yang sama

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const url = isRegister
      ? "http://localhost:5000/api/register"
      : "http://localhost:5000/api/login";

    try {
      // Simulasi delay untuk menunjukkan loading state
      await new Promise(resolve => setTimeout(resolve, 500 ));

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Terjadi kesalahan pada server");
      }

      if (isRegister) {
        alert("Registrasi berhasil! Silakan masuk.");
        setIsRegister(false); // Arahkan ke form login
        setUsername(""); // Kosongkan form
        setPassword("");
      } else {
        // Simpan status login jika perlu (misal: di localStorage)
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("username", username);
        
        navigate("/"); // Arahkan ke halaman chat setelah login
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <ParticleBackground /> {/* Latar belakang partikel yang sama dengan halaman chat */}

      <div className="relative z-10 w-full max-w-sm transition-all duration-500">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 border border-primary/30 animate-float mb-4">
            <Bot className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white">
            {isRegister ? "Buat Akun" : "Welcome Back"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isRegister ? "Satu langkah lagi menuju asisten AI Anda." : "Masuk untuk melanjutkan sesi Anda."}
          </p>
        </div>

        {/* Form Container dengan efek glassmorphism */}
        <div className="p-8 space-y-6 bg-card/20 border border-glass-border rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Username */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-white bg-input/50 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 placeholder:text-muted-foreground"
                required
                disabled={isLoading}
              />
            </div>

            {/* Input Password */}
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-white bg-input/50 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 placeholder:text-muted-foreground"
                required
                disabled={isLoading}
              />
            </div>

            {error && <p className="text-sm text-destructive text-center pt-2">{error}</p>}

            <button
              type="submit"
              className={`w-full py-3 font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors duration-300 flex items-center justify-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              ) : (
                isRegister ? "Daftar" : "Masuk"
              )}
            </button>
          </form>

          <p className="text-sm text-center text-muted-foreground">
            {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
                setUsername("");
                setPassword("");
              }}
              className="font-semibold text-primary hover:underline focus:outline-none"
              disabled={isLoading}
            >
              {isRegister ? "Masuk" : "Buat Akun"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
