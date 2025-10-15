import { useEffect, useRef } from "react";

// Mendefinisikan struktur data untuk partikel
interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
}

// Mendefinisikan struktur data untuk posisi mouse
interface Mouse {
  x: number | null;
  y: number | null;
  radius: number;
}

export const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    let animationFrameId: number;

    const particles: Particle[] = [];
    const particleCount = Math.floor((w * h) / 10000); // Jumlah partikel berdasarkan area layar
    const connectDistance = 150; // Jarak maksimum untuk menghubungkan partikel
    const particleColor = "rgba(255, 255, 255, 1.0)";

    const mouse: Mouse = {
      x: null,
      y: null,
      radius: 150, // Jarak interaksi mouse
    };

    // Event listener untuk posisi mouse
    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = event.x;
      mouse.y = event.y;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Event listener untuk saat mouse meninggalkan jendela
    const handleMouseOut = () => {
      mouse.x = null;
      mouse.y = null;
    };
    window.addEventListener("mouseout", handleMouseOut);

    // Fungsi untuk membuat satu partikel
    const createParticle = (): Particle => {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 2.5 + 1.5,
        speedX: Math.random() * 1.4 - 0.7,
        speedY: Math.random() * 1.4 - 0.7,
      };
    };

    // Inisialisasi semua partikel
    const init = () => {
      particles.length = 0; // Kosongkan array jika diinisialisasi ulang
      for (let i = 0; i < particleCount; i++) {
        particles.push(createParticle());
      }
    };
    init();

    // Fungsi untuk menggambar partikel dan koneksinya
    const drawParticles = () => {
      for (let i = 0; i < particles.length; i++) {
        ctx.fillStyle = particleColor;
        ctx.beginPath();
        ctx.arc(particles[i].x, particles[i].y, particles[i].size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const connectParticles = () => {
      for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectDistance) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${1 - distance / connectDistance})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
    };

    // Fungsi untuk memperbarui posisi partikel
    const updateParticles = () => {
      for (let i = 0; i < particles.length; i++) {
        let p = particles[i];

        // Interaksi dengan mouse (menjauh)
        if (mouse.x !== null && mouse.y !== null) {
          const dxMouse = p.x - mouse.x;
          const dyMouse = p.y - mouse.y;
          const mouseDistance = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
          const forceDirectionX = dxMouse / mouseDistance;
          const forceDirectionY = dyMouse / mouseDistance;
          const force = (mouse.radius - mouseDistance) / mouse.radius;
          
          if (mouseDistance < mouse.radius) {
            p.x += forceDirectionX * force * 3;
            p.y += forceDirectionY * force * 3;
          }
        }

        // Pergerakan normal
        p.x += p.speedX;
        p.y += p.speedY;

        // Memastikan partikel tetap di dalam layar (efek wrap-around)
        if (p.x > w + p.size) p.x = -p.size;
        if (p.x < -p.size) p.x = w + p.size;
        if (p.y > h + p.size) p.y = -p.size;
        if (p.y < -p.size) p.y = h + p.size;
      }
    };

    // Loop animasi utama
    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      updateParticles();
      connectParticles();
      drawParticles();
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // Menangani perubahan ukuran jendela
    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      // Atur ulang jumlah partikel dan posisinya
      init();
    };
    window.addEventListener("resize", onResize);

    // Cleanup function
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseOut);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ opacity: 0.6 }} // Anda bisa menyesuaikan opacity ini
    />
  );
};
