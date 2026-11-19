import { useEffect, useRef } from "react";

/**
 * Subtle "constellation" background (particles.js network style):
 * slow-drifting dots joined by faint lines when they come close.
 * Pure canvas, no dependency. Color follows `--color-primary`, so it
 * adapts to the light/dark theme. Static frame under reduced motion.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

const DENSITY = 1 / 14000; // particles per px²
const MAX_PARTICLES = 90;
const LINK_DISTANCE = 100;
const SPEED = 0.18;
const DOT_ALPHA = 0.07;
const LINE_ALPHA = 0;
const DOT_SCALE = 50;
const RESPAWN_DELAY = 150; // ms after the last resize event

function readColor(): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-primary")
    .trim();
  return value || "#17906F";
}

/** Converts a hex color to an "r, g, b" string usable in rgba(). */
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(n)) return "23, 144, 111";
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

export function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let rgb = hexToRgb(readColor());
    let frame = 0;

    const spawn = (): Particle => {
      const angle = Math.random() * Math.PI * 2;
      const speed = SPEED * (0.4 + Math.random() * 0.6);
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 0.8 + Math.random() * DOT_SCALE,
      };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /** Throws away every particle and spawns a fresh set for the current size. */
    const respawn = () => {
      const target = Math.min(
        MAX_PARTICLES,
        Math.round(width * height * DENSITY),
      );
      particles = Array.from({ length: target }, spawn);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK_DISTANCE) {
            const alpha = LINE_ALPHA * (1 - dist / LINK_DISTANCE);
            ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      ctx.fillStyle = `rgba(${rgb}, ${DOT_ALPHA})`;
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = () => {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        // Wrap around edges for a seamless drift.
        if (p.x < -10) p.x = width + 10;
        else if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        else if (p.y > height + 10) p.y = -10;
      }
      draw();
      frame = requestAnimationFrame(step);
    };

    resize();
    respawn();
    if (reducedMotion) draw();
    else frame = requestAnimationFrame(step);

    // Resize the canvas right away (no stretching), but only respawn once
    // the user stops dragging the window edge.
    let respawnTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      resize();
      if (reducedMotion) draw();
      clearTimeout(respawnTimer);
      respawnTimer = setTimeout(() => {
        respawn();
        if (reducedMotion) draw();
      }, RESPAWN_DELAY);
    };
    window.addEventListener("resize", onResize);

    // Re-read the color when the theme switches.
    const observer = new MutationObserver(() => {
      rgb = hexToRgb(readColor());
      if (reducedMotion) draw();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(respawnTimer);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="particles-background"
      aria-hidden="true"
    />
  );
}
