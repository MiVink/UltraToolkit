import { useEffect, useRef } from 'react';

/* EASTER-EGG: цей ефект поки вимкнено (див. App.tsx).
   Залишено як заготовку під майбутню пасхалку — нічого не видаляти. */
import type { MotionIntensity } from '../config/catalog';

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

const MAX_PARTICLES = 90;

/** Легкі зелені частинки за курсором на canvas. Без бібліотек, з пулом і rAF. */
export default function CursorParticles({ motion }: { motion: MotionIntensity }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (motion === 'off' || reduced) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let raf = 0;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const parts: P[] = [];
    let lastX = -9999;
    let lastY = -9999;
    let lastSpawn = 0;

    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const spawnRate = motion === 'soft' ? 55 : 22;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const now = performance.now();
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      const dist = Math.hypot(dx, dy);
      lastX = e.clientX;
      lastY = e.clientY;
      if (now - lastSpawn < spawnRate || dist < 2) return;
      lastSpawn = now;
      if (parts.length >= (motion === 'soft' ? MAX_PARTICLES / 2 : MAX_PARTICLES)) {
        parts.shift();
      }
      const count = motion === 'soft' ? 1 : 2;
      for (let i = 0; i < count; i++) {
        parts.push({
          x: e.clientX + (Math.random() - 0.5) * 8,
          y: e.clientY + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 0.35 - dx * 0.004,
          vy: -0.25 - Math.random() * 0.4,
          life: 0,
          maxLife: 50 + Math.random() * 40,
          size: 1 + Math.random() * 2.2,
        });
      }
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      // легке світіння: 'lighter' дає неоновий відтінок без тіней (дешево)
      ctx.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.004;
        const t = 1 - p.life / p.maxLife;
        if (t <= 0) {
          parts.splice(i, 1);
          continue;
        }
        const alpha = Math.min(1, t * 1.4) * (motion === 'soft' ? 0.45 : 0.8);
        ctx.beginPath();
        ctx.fillStyle = `rgba(74, 222, 128, ${alpha.toFixed(3)})`;
        ctx.arc(p.x, p.y, p.size * (0.5 + t * 0.7), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
    };
  }, [motion]);

  return <canvas id="cursor-canvas" ref={ref} aria-hidden="true" />;
}
