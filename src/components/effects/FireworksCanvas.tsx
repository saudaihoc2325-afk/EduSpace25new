import React, { useEffect, useRef } from 'react';
import { fireworks, FireworkParticle, Rocket } from '../../utils/fireworks';
import { soundEffects } from '../../utils/soundEffects';

const VIBRANT_PALETTE = [
  '#f43f5e', // Rose
  '#3b82f6', // Sapphire Blue
  '#10b981', // Emerald Mint
  '#f59e0b', // Amber Gold
  '#a855f7', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#eab308', // Yellow
  '#ffffff', // Sparkle white
];

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
  vRot: number;
  alpha: number;
}

export const FireworksCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<FireworkParticle[]>([]);
  const rocketsRef = useRef<Rocket[]>([]);
  const confettiRef = useRef<ConfettiPiece[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const isRunningRef = useRef<boolean>(false);

  // Helper to create spark explosion particles
  const createExplosion = (
    x: number,
    y: number,
    count = 55,
    colors: string[] = VIBRANT_PALETTE,
    power = 6.5
  ) => {
    soundEffects.playFireworks();
    const particles: FireworkParticle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * power + 1.5;
      const color = colors[Math.floor(Math.random() * colors.length)];

      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 2.8 + 1.2,
        alpha: 1,
        decay: Math.random() * 0.015 + 0.015,
        gravity: 0.09,
        flicker: Math.random() > 0.4,
        trail: [],
      });
    }

    particlesRef.current.push(...particles);
    startAnimationLoop();
  };

  // Helper to launch celebratory confetti
  const createConfetti = (count = 70, colors: string[] = VIBRANT_PALETTE) => {
    const canvas = canvasRef.current;
    const width = canvas ? canvas.width : window.innerWidth;
    const confettiPieces: ConfettiPiece[] = [];

    for (let i = 0; i < count; i++) {
      confettiPieces.push({
        x: Math.random() * width,
        y: Math.random() * -100,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3.5 + 2.5,
        width: Math.random() * 8 + 6,
        height: Math.random() * 12 + 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 8,
        alpha: 1,
      });
    }

    confettiRef.current.push(...confettiPieces);
    startAnimationLoop();
  };

  // Helper for grand finale multi-stage rockets
  const launchGrandFinale = () => {
    const canvas = canvasRef.current;
    const width = canvas ? canvas.width : window.innerWidth;
    const height = canvas ? canvas.height : window.innerHeight;

    // Trigger celebratory audio
    soundEffects.playVictory();

    // Stage 1: Immediate double burst
    createExplosion(width * 0.3, height * 0.35, 70, VIBRANT_PALETTE, 8);
    createExplosion(width * 0.7, height * 0.35, 70, VIBRANT_PALETTE, 8);
    createConfetti(90);

    // Stage 2: Rocket launches after 300ms, 600ms, 900ms, 1200ms
    const delays = [300, 600, 900, 1200, 1500, 1800];
    delays.forEach((delay, idx) => {
      setTimeout(() => {
        const targetX = width * (0.2 + Math.random() * 0.6);
        const targetY = height * (0.15 + Math.random() * 0.35);
        rocketsRef.current.push({
          x: targetX + (Math.random() - 0.5) * 60,
          y: height,
          targetY,
          vx: (Math.random() - 0.5) * 2,
          vy: -(Math.random() * 4 + 11),
          color: VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length],
          exploded: false,
        });
        startAnimationLoop();
      }, delay);
    });
  };

  const startAnimationLoop = () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    loop();
  };

  const loop = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      isRunningRef.current = false;
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      isRunningRef.current = false;
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Update & Render Rockets
    const activeRockets: Rocket[] = [];
    for (const r of rocketsRef.current) {
      r.x += r.vx;
      r.y += r.vy;

      // Draw rocket head & sparkle trail
      ctx.save();
      ctx.beginPath();
      ctx.arc(r.x, r.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = r.color;
      ctx.fill();

      // Tail
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - r.vx * 3, r.y - r.vy * 3);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      if (r.y <= r.targetY || r.vy >= -1) {
        // Explode
        createExplosion(r.x, r.y, 65, VIBRANT_PALETTE, 7.5);
      } else {
        activeRockets.push(r);
      }
    }
    rocketsRef.current = activeRockets;

    // 2. Update & Render Particles
    const activeParticles: FireworkParticle[] = [];
    for (const p of particlesRef.current) {
      p.trail.push({ x: p.x, y: p.y, alpha: p.alpha });
      if (p.trail.length > 5) p.trail.shift();

      p.vx *= 0.96;
      p.vy *= 0.96;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.alpha > 0) {
        ctx.save();

        // Draw light trails
        if (p.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let t = 1; t < p.trail.length; t++) {
            ctx.lineTo(p.trail[t].x, p.trail[t].y);
          }
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = p.alpha * 0.45;
          ctx.lineWidth = p.size * 0.7;
          ctx.stroke();
        }

        // Draw particle head
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.flicker && Math.random() > 0.3 ? p.alpha * 0.7 : p.alpha;
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();

        activeParticles.push(p);
      }
    }
    particlesRef.current = activeParticles;

    // 3. Update & Render Confetti
    const activeConfetti: ConfettiPiece[] = [];
    for (const c of confettiRef.current) {
      c.x += c.vx;
      c.y += c.vy;
      c.rotation += c.vRot;
      c.vy += 0.05; // gentle gravity

      if (c.y < canvas.height + 40 && c.alpha > 0) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate((c.rotation * Math.PI) / 180);
        ctx.fillStyle = c.color;
        ctx.globalAlpha = c.alpha;
        ctx.shadowBlur = 4;
        ctx.shadowColor = c.color;
        ctx.fillRect(-c.width / 2, -c.height / 2, c.width, c.height);
        ctx.restore();

        activeConfetti.push(c);
      }
    }
    confettiRef.current = activeConfetti;

    // Check if anything is still alive
    if (
      particlesRef.current.length > 0 ||
      rocketsRef.current.length > 0 ||
      confettiRef.current.length > 0
    ) {
      animFrameIdRef.current = requestAnimationFrame(loop);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      isRunningRef.current = false;
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const unsubscribe = fireworks.subscribe((event, data) => {
      const canvas = canvasRef.current;
      const width = canvas ? canvas.width : window.innerWidth;
      const height = canvas ? canvas.height : window.innerHeight;

      if (event === 'burst') {
        const x = data?.x ?? width / 2;
        const y = data?.y ?? height * 0.4;
        createExplosion(x, y, data?.count ?? 60, data?.colors ?? VIBRANT_PALETTE, data?.power ?? 7);
      } else if (event === 'confetti') {
        createConfetti(data?.count ?? 80, data?.colors ?? VIBRANT_PALETTE);
      } else if (event === 'grandFinale') {
        launchGrandFinale();
      } else if (event === 'clear') {
        particlesRef.current = [];
        rocketsRef.current = [];
        confettiRef.current = [];
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      unsubscribe();
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};
