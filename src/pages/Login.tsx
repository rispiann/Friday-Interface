import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, KeyRound, Mail, Loader2 as Loader } from "lucide-react";
import { ParticleBackground } from "@/components/ParticleBackground";
import FaceLogin from "@/components/FaceLogin"; // <-- 1. Impor komponen baru

// Komponen AuthForm (tidak ada perubahan)
const AuthForm = ({ isRegister, isLoading, onSubmit, error, setUsername, setPassword, isCurrentForm }) => (
  <form onSubmit={onSubmit} className="w-full h-full flex flex-col justify-center space-y-5 px-4 md:px-0" style={{ pointerEvents: isCurrentForm ? 'auto' : 'none' }}>
    <div className="text-center mb-6">
      <h1 className="text-3xl font-bold text-white">{isRegister ? "Buat Akun Baru" : "Masuk Kembali"}</h1>
      <p className="text-muted-foreground mt-2 text-sm">{isRegister ? "Isi data untuk memulai petualangan." : "Selamat datang, agen."}</p>
    </div>
    
    <div className="relative">
      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <input type="text" placeholder="Username" onChange={(e) => setUsername(e.target.value)} required disabled={isLoading} className="w-full pl-12 pr-4 py-3 text-white bg-input/50 border-2 border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
    </div>

    {isRegister && (
      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.4 }} className="relative">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input type="email" placeholder="Email (opsional)" disabled={isLoading} className="w-full pl-12 pr-4 py-3 text-white bg-input/50 border-2 border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
      </motion.div>
    )}

    <div className="relative">
      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} className="w-full pl-12 pr-4 py-3 text-white bg-input/50 border-2 border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
    </div>

    {error && <p className={`text-xs text-center pt-1 ${error.includes('berhasil') ? 'text-green-400' : 'text-destructive'}`}>{error}</p>}

    <button type="submit" className={`w-full py-3 mt-2 font-bold text-lg text-primary-foreground bg-gradient-to-r from-primary to-cyan-400 rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 flex items-center justify-center transform hover:-translate-y-1 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={isLoading}>
      {isLoading ? <Loader className="animate-spin" /> : (isRegister ? "Daftar" : "Masuk")}
    </button>
  </form>
);

const LoginPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const endpoint = isRegister ? "/api/register" : "/api/login";
    const fullUrl = `http://localhost:5000${endpoint}`;
    try {
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password } ),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Terjadi kesalahan pada server");
      if (isRegister) {
        setIsRegister(false);
        setError("Registrasi berhasil! Silakan masuk.");
      } else {
        localStorage.setItem('friday_access_token', data.access_token);
        navigate("/");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-background">
      <ParticleBackground />
      <div className="relative w-full max-w-md bg-card/20 border border-glass-border rounded-3xl shadow-2xl shadow-black/30 overflow-hidden p-8">
        
        {/* --- Bagian Atas: Form Login/Register --- */}
        <div className="w-full h-[380px] relative">
          <AnimatePresence initial={false}>
            {!isRegister ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.4 }}
                className="absolute w-full h-full"
              >
                <AuthForm isRegister={false} isLoading={isLoading} onSubmit={handleSubmit} error={error} setUsername={setUsername} setPassword={setPassword} isCurrentForm={!isRegister} />
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.4 }}
                className="absolute w-full h-full"
              >
                <AuthForm isRegister={true} isLoading={isLoading} onSubmit={handleSubmit} error={error} setUsername={setUsername} setPassword={setPassword} isCurrentForm={isRegister} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tombol untuk switch antara Login dan Register */}
        <div className="text-center text-sm">
          <span className="text-muted-foreground">
            {isRegister ? "Sudah punya akun? " : "Belum punya akun? "}
          </span>
          <button onClick={() => { setIsRegister(!isRegister); setError(''); }} className="font-semibold text-primary hover:underline">
            {isRegister ? "Masuk di sini" : "Daftar sekarang"}
          </button>
        </div>

        {/* --- 2. Garis Pemisah "Atau" --- */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card/20 px-2 text-muted-foreground backdrop-blur-sm">
              Atau
            </span>
          </div>
        </div>

        {/* --- 3. Komponen FaceLogin --- */}
        <FaceLogin />

      </div>
    </div>
  );
};

export default LoginPage;
