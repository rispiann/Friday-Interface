import { useState, useRef, useCallback } from 'react';
import { Camera, Loader2, UserCheck, UserX } from 'lucide-react';

// 1. Definisikan props baru yang akan diterima komponen
interface FaceLoginProps {
  onLoginSuccess: (token: string) => void;
}

// 2. Terima props tersebut di dalam komponen
const FaceLogin = ({ onLoginSuccess }: FaceLoginProps) => {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error' | 'not_found'>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleFaceLogin = async () => {
    setStatus('scanning');
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Beri waktu kamera untuk inisialisasi
      await new Promise(resolve => setTimeout(resolve, 1500));

      const canvas = document.createElement('canvas');
      if (!videoRef.current) throw new Error("Video ref not available");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error("Canvas context not available");

      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg');

      const response = await fetch('http://localhost:5000/api/face-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData } ),
      });

      const data = await response.json();
      stopCamera();

      if (response.ok && data.access_token) {
        setStatus('success');
        // 3. PANGGIL JEMBATAN KOMUNIKASI!
        // Panggil fungsi dari induk dan kirimkan tokennya.
        onLoginSuccess(data.access_token);
      } else {
        setStatus('not_found');
      }
    } catch (error) {
      console.error("Face login error:", error);
      setStatus('error');
      stopCamera();
    }
  };

  const renderStatus = () => {
    switch (status) {
      case 'scanning': return <><Loader2 className="w-4 h-4 animate-spin" /> Memindai...</>;
      case 'success': return <><UserCheck className="w-4 h-4 text-green-400" /> Login Berhasil!</>;
      case 'not_found': return <><UserX className="w-4 h-4 text-yellow-400" /> Wajah tidak dikenali</>;
      case 'error': return <span className="text-red-400">Kamera error</span>;
      default: return <>Masuk dengan Wajah</>;
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {status === 'scanning' && (
        <div className="w-full aspect-video rounded-lg bg-black overflow-hidden border border-primary/50">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        </div>
      )}
      <button
        onClick={handleFaceLogin}
        disabled={status === 'scanning' || status === 'success'}
        className="w-full py-3 font-semibold text-lg text-primary-foreground bg-gradient-to-r from-secondary to-purple-600 rounded-xl hover:shadow-lg hover:shadow-secondary/30 transition-all duration-300 flex items-center justify-center gap-2 transform hover:-translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'idle' && <Camera className="w-5 h-5" />}
        {renderStatus()}
      </button>
    </div>
  );
};

export default FaceLogin;
