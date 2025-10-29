import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { Camera, Loader2, UserCheck, UserX } from 'lucide-react';

const FaceLogin = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState('Menunggu...');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Terhubung ke WebSocket saat komponen dimuat
    socketRef.current = io('http://localhost:5000' );
    const socket = socketRef.current;

    socket.on('connect', () => setStatus('Terhubung. Arahkan wajah ke kamera.'));
    socket.on('recognizing', () => setStatus('Mencari wajah...'));
    socket.on('recognition_failed', (data) => setStatus(data.message || 'Wajah tidak dikenali.'));
    
    socket.on('login_success', (data) => {
      setStatus('Login Berhasil!');
      localStorage.setItem('friday_access_token', data.access_token);
      stopRecognition();
      setTimeout(() => navigate('/'), 1000);
    });

    return () => {
      stopRecognition();
      socket.disconnect();
    };
  }, [navigate]);

  const startRecognition = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsRecognizing(true);
    setStatus('Membuka kamera...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.play();

      // Kirim frame ke backend setiap 500ms
      const intervalId = setInterval(() => {
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          if (context) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            socketRef.current?.emit('recognize_frame', imageData);
          }
        }
      }, 500); // Interval pengiriman frame
      
      // Simpan interval ID untuk dihentikan nanti
      (videoRef.current as any).intervalId = intervalId;

    } catch (err) {
      setStatus('Gagal mengakses kamera. Mohon izinkan akses.');
      setIsRecognizing(false);
    }
  };

  const stopRecognition = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      clearInterval((videoRef.current as any).intervalId);
    }
    setIsRecognizing(false);
    setStatus('Menunggu...');
  };

  return (
    <div className="w-full text-center mt-6">
      <div className="relative w-48 h-36 mx-auto bg-input/30 rounded-lg overflow-hidden border-2 border-dashed border-border flex items-center justify-center">
        <video ref={videoRef} className={`w-full h-full object-cover ${isRecognizing ? 'block' : 'hidden'}`} />
        {!isRecognizing && <Camera size={40} className="text-muted-foreground" />}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <p className="text-xs text-muted-foreground mt-2 h-4">{status}</p>
      
      {!isRecognizing ? (
        <button onClick={startRecognition} className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-primary to-accent rounded-lg hover:opacity-90 transition-opacity">
          Masuk dengan Wajah
        </button>
      ) : (
        <button onClick={stopRecognition} className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors">
          Hentikan
        </button>
      )}
    </div>
  );
};

export default FaceLogin;
