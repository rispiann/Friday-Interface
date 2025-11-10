import { Link } from 'react-router-dom';
import { ParticleBackground } from '@/components/ParticleBackground';
import { FaceRegister } from '@/components/FaceRegister';
import { ChevronLeft } from 'lucide-react';

const ProfilePage = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-background">
      <ParticleBackground />
      <div className="relative w-full max-w-2xl bg-card/20 border border-glass-border rounded-3xl shadow-2xl shadow-black/30 overflow-hidden p-8">
        
        {/* Tombol Kembali */}
        <Link 
          to="/" 
          className="absolute top-6 left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
        >
          <ChevronLeft size={18} />
          Kembali ke Chat
        </Link>

        {/* Header */}
        <div className="text-center mb-8 mt-10">
          <h1 className="text-3xl font-bold text-white">Pengaturan Akun</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Kelola preferensi dan keamanan akun Anda di sini.
          </p>
        </div>

        {/* Konten Utama - Komponen Pendaftaran Wajah */}
        <div className="bg-card/30 p-6 rounded-2xl border border-glass-border">
          <h2 className="text-lg font-semibold text-white mb-2">Login dengan Wajah</h2>
          <p className="text-xs text-muted-foreground mb-6">
            Aktifkan login tanpa kata sandi dengan mendaftarkan wajah Anda. Pastikan Anda berada di ruangan dengan pencahayaan yang baik.
          </p>
          <FaceRegister />
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
