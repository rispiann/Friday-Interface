import { useState, useRef, useCallback } from 'react';
import { Camera, Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const TOTAL_SAMPLES = 20;
const SAMPLE_DELAY = 250; // Jeda 250ms antar sampel

export const FaceRegister = () => {
  const [status, setStatus] = useState<'idle' | 'capturing' | 'sending' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const samplesRef = useRef<string[]>([]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const resetState = () => {
    setStatus('idle');
    setProgress(0);
    setMessage('');
    samplesRef.current = [];
    stopCamera();
  };

  const startCapture = async () => {
    resetState();
    setStatus('capturing');
    setMessage('Bersiap... Mohon lihat lurus ke kamera.');

    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage('Browser tidak mendukung akses kamera.');
      setStatus('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Pengambilan sampel
      for (let i = 1; i <= TOTAL_SAMPLES; i++) {
        await new Promise(resolve => setTimeout(resolve, SAMPLE_DELAY));
        
        const canvas = document.createElement('canvas');
        if (!videoRef.current) throw new Error("Kamera terputus");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const context = canvas.getContext('2d');
        if (!context) throw new Error("Gagal membuat konteks kanvas");

        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/jpeg');
        samplesRef.current.push(imageDataUrl);
        
        setProgress(i);
        setMessage(`Mengambil sampel ${i} dari ${TOTAL_SAMPLES}...`);
      }

      stopCamera();
      setStatus('sending');
      setMessage('Sampel berhasil diambil. Mengirim ke server untuk pelatihan...');

      // Kirim data ke backend
      const token = localStorage.getItem('friday_access_token');
      const response = await fetch('http://localhost:5000/api/face-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ images: samplesRef.current } )
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Pelatihan model gagal.');

      setStatus('success');
      setMessage(data.message || 'Wajah berhasil didaftarkan!');

    } catch (error: any) {
      stopCamera();
      setStatus('error');
      setMessage(error.message || 'Terjadi kesalahan yang tidak diketahui.');
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'capturing':
      case 'sending':
        return (
          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-xs aspect-square rounded-full bg-black overflow-hidden border-4 border-primary/50 mb-4">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
            </div>
            <div className="w-full bg-muted/30 rounded-full h-2.5 mb-2">
              <div className="bg-primary h-2.5 rounded-full" style={{ width: `${(progress / TOTAL_SAMPLES) * 100}%` }}></div>
            </div>
            <p className="text-xs text-center text-muted-foreground h-8">
              {status === 'sending' ? <Loader2 className="inline-block animate-spin mr-2" /> : null}
              {message}
            </p>
          </div>
        );
      case 'success':
        return (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <p className="font-semibold text-white">Pendaftaran Berhasil</p>
            <p className="text-xs text-muted-foreground mt-1">{message}</p>
            <button onClick={resetState} className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-white">
              <RefreshCw size={14} /> Daftarkan Ulang
            </button>
          </div>
        );
      case 'error':
        return (
          <div className="text-center py-8">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="font-semibold text-white">Terjadi Kesalahan</p>
            <p className="text-xs text-muted-foreground mt-1">{message}</p>
            <button onClick={resetState} className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-white">
              <RefreshCw size={14} /> Coba Lagi
            </button>
          </div>
        );
      case 'idle':
      default:
        return (
          <button
            onClick={startCapture}
            className="w-full py-3 font-semibold text-lg text-primary-foreground bg-gradient-to-r from-primary to-cyan-400 rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 flex items-center justify-center gap-2 transform hover:-translate-y-1"
          >
            <Camera /> Mulai Pendaftaran Wajah
          </button>
        );
    }
  };

  return <div>{renderContent()}</div>;
};
