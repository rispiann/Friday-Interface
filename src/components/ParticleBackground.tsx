import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  length: number;
  alpha: number;
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
    let stopped = false;

    const particles: Particle[] = [];
    
    const createParticle = (): Particle => {
      const x = Math.random() * w;
      return {
        x,
        y: -10 - Math.random() * 200,
        size: 0.8 + Math.random() * 2.2,
        speedY: 0.2 + Math.random() * 0.6,
        length: 14 + Math.random() * 30,
        alpha: 0.06 + Math.random() * 0.14,
      };
    };

    // Initialize particles
    for (let i = 0; i < Math.floor(w / 40); i++) {
      particles.push(createParticle());
    }

    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    function frame() {
      if (stopped) return;
      ctx.clearRect(0, 0, w, h);

      // Soft vignette gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, "rgba(0,0,0,0.18)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Draw falling particles (meteor-like)
      particles.forEach((p, idx) => {
        p.y += p.speedY;
        p.x += Math.sin(p.y * 0.01) * 0.3;
        
        if (p.y - p.length > h) {
          particles[idx] = createParticle();
          particles[idx].y = -10;
        }
        
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.length * 0.35, p.y - p.length);
        ctx.strokeStyle = `rgba(255,255,255,${p.alpha})`;
        ctx.lineWidth = p.size;
        ctx.lineCap = "round";
        ctx.stroke();
      });

      requestAnimationFrame(frame);
    }
    frame();

    return () => {
      stopped = true;
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.15 }}
    />
  );
};
