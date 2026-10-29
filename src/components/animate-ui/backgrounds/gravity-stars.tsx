'use client';

import * as React from 'react';
// Adapted from Animate UI, copyright (c) 2025 Elliot Sutton.
// MIT + Commons Clause: see third-party/animate-ui/LICENSE.md and NOTICE.
// Modified for KadoLakay: native lifecycle hooks, bounded fixed-step rendering,
// viewport pointer handling, paused control, DPR cap and no Motion dependency.
import { cn } from '@/lib/utils';
import { gravityCanvasScale, gravityStarCount } from '@/lib/gravity-budget';

function useInView(ref: React.RefObject<HTMLDivElement | null>) {
  const [visible, setVisible] = React.useState(true);
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return visible;
}
function usePageVisible() {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible');
    update(); document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return visible;
}
function useShouldReduceMotion() {
  const [reduced, setReduced] = React.useState(true);
  React.useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(preference.matches);
    update(); preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  return reduced;
}

type MouseGravity = 'attract' | 'repel';
type GlowAnimation = 'instant' | 'ease' | 'spring';
type StarsInteractionType = 'bounce' | 'merge';

type GravityStarsProps = {
  paused?: boolean;
  starsCount?: number;
  starsSize?: number;
  starsOpacity?: number;
  glowIntensity?: number;
  glowAnimation?: GlowAnimation;
  movementSpeed?: number;
  mouseInfluence?: number;
  mouseGravity?: MouseGravity;
  gravityStrength?: number;
  starsInteraction?: boolean;
  starsInteractionType?: StarsInteractionType;
} & React.ComponentProps<'div'>;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  baseOpacity: number;
  mass: number;
  glowMultiplier?: number;
  glowVelocity?: number;
};

function GravityStarsBackgroundContent({
  paused = false,
  starsCount = 75,
  starsSize = 2,
  starsOpacity = 0.75,
  glowIntensity = 15,
  glowAnimation = 'ease',
  movementSpeed = 0.3,
  mouseInfluence = 100,
  mouseGravity = 'attract',
  gravityStrength = 75,
  starsInteraction = false,
  starsInteractionType = 'bounce',
  ref,
  className,
  children,
  onMouseMove,
  onTouchMove,
  ...props
}: GravityStarsProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  React.useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const starsRef = React.useRef<Particle[]>([]);
  const mouseRef = React.useRef<{ x: number; y: number }>({ x: -10000, y: -10000 });

  const inView = useInView(containerRef);
  const pageVisible = usePageVisible();
  const reduce = useShouldReduceMotion();
  const playing = inView && pageVisible && !reduce && !paused;

  const options = {
    starsCount,
    starsSize,
    starsOpacity,
    glowIntensity,
    glowAnimation,
    movementSpeed,
    mouseInfluence,
    mouseGravity,
    gravityStrength,
    starsInteraction,
    starsInteractionType,
  };
  const optionsRef = React.useRef(options);
  React.useEffect(() => {
    optionsRef.current = options;
  });

  const engineRef = React.useRef<{
    start: () => void;
    stop: () => void;
    reset: () => void;
    retune: () => void;
  } | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let color = '#ffffff';
    let running = false;
    let frameId = 0;

    const createStar = (): Particle => {
      const { movementSpeed, starsSize, starsOpacity } = optionsRef.current;
      const angle = Math.random() * Math.PI * 2;
      const speed = movementSpeed * (0.5 + Math.random() * 0.5);
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * starsSize + 1,
        opacity: starsOpacity,
        baseOpacity: starsOpacity,
        mass: Math.random() * 0.5 + 0.5,
        glowMultiplier: 1,
        glowVelocity: 0,
      };
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      const { glowIntensity } = optionsRef.current;
      let shadowBlur = -1;
      for (const p of starsRef.current) {
        const blur = glowIntensity * (p.glowMultiplier || 1) * 2;
        if (blur !== shadowBlur) {
          ctx.shadowBlur = blur;
          shadowBlur = blur;
        }
        ctx.globalAlpha = p.opacity;
        ctx.beginPath();
        ctx.arc(p.x * dpr, p.y * dpr, p.size * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const readColor = () => {
      color = getComputedStyle(container).color || '#ffffff';
      if (!running) draw();
    };

    const retuneStars = () => {
      const { starsOpacity, movementSpeed } = optionsRef.current;
      for (const p of starsRef.current) {
        p.baseOpacity = starsOpacity;
        p.opacity = starsOpacity;
        const spd = Math.hypot(p.vx, p.vy);
        if (spd > 0) {
          const ratio = movementSpeed / spd;
          p.vx *= ratio;
          p.vy *= ratio;
        }
      }
    };

    const createStars = () => {
      starsRef.current = Array.from(
        { length: gravityStarCount(width, optionsRef.current.starsCount) },
        createStar,
      );
      retuneStars();
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const nextDpr = gravityCanvasScale(rect.width, rect.height, window.devicePixelRatio);
      const sizeChanged = rect.width !== width || rect.height !== height;
      if (!sizeChanged && nextDpr === dpr && starsRef.current.length > 0)
        return;
      width = rect.width;
      height = rect.height;
      dpr = nextDpr;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      color = getComputedStyle(container).color || '#ffffff';
      if (starsRef.current.length !== gravityStarCount(width, optionsRef.current.starsCount)) {
        createStars();
      } else {
        for (const p of starsRef.current) {
          p.x = Math.random() * width;
          p.y = Math.random() * height;
        }
        if (sizeChanged) retuneStars();
      }
      if (!running) draw();
    };

    const update = () => {
      const {
        mouseInfluence,
        mouseGravity,
        gravityStrength,
        glowAnimation,
        starsInteraction,
        starsInteractionType,
      } = optionsRef.current;
      const mouse = mouseRef.current;
      const stars = starsRef.current;

      for (let i = 0; i < stars.length; i++) {
        const p = stars[i]!;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < mouseInfluence * mouseInfluence && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const force = (mouseInfluence - dist) / mouseInfluence;
          const nx = dx / dist;
          const ny = dy / dist;
          const g = force * (gravityStrength * 0.001);

          if (mouseGravity === 'attract') {
            p.vx += nx * g;
            p.vy += ny * g;
          } else if (mouseGravity === 'repel') {
            p.vx -= nx * g;
            p.vy -= ny * g;
          }

          p.opacity = Math.min(1, p.baseOpacity + force * 0.4);

          const targetGlow = 1 + force * 2;
          const currentGlow = p.glowMultiplier || 1;

          if (glowAnimation === 'instant') {
            p.glowMultiplier = targetGlow;
          } else if (glowAnimation === 'ease') {
            const ease = 0.15;
            p.glowMultiplier = currentGlow + (targetGlow - currentGlow) * ease;
          } else {
            const spring = (targetGlow - currentGlow) * 0.2;
            const damping = 0.85;
            p.glowVelocity = (p.glowVelocity || 0) * damping + spring;
            p.glowMultiplier = currentGlow + (p.glowVelocity || 0);
          }
        } else {
          p.opacity = Math.max(p.baseOpacity * 0.3, p.opacity - 0.02);
          const targetGlow = 1;
          const currentGlow = p.glowMultiplier || 1;
          if (glowAnimation === 'instant') {
            p.glowMultiplier = targetGlow;
          } else if (glowAnimation === 'ease') {
            const ease = 0.08;
            p.glowMultiplier = Math.max(
              1,
              currentGlow + (targetGlow - currentGlow) * ease,
            );
          } else {
            const spring = (targetGlow - currentGlow) * 0.15;
            const damping = 0.9;
            p.glowVelocity = (p.glowVelocity || 0) * damping + spring;
            p.glowMultiplier = Math.max(1, currentGlow + (p.glowVelocity || 0));
          }
        }

        if (starsInteraction) {
          for (let j = i + 1; j < stars.length; j++) {
            const o = stars[j]!;
            const dx2 = o.x - p.x;
            const dy2 = o.y - p.y;
            const dSq = dx2 * dx2 + dy2 * dy2;
            const minD = p.size + o.size + 5;
            if (dSq < minD * minD && dSq > 0) {
              const d = Math.sqrt(dSq);
              if (starsInteractionType === 'bounce') {
                const nx = dx2 / d;
                const ny = dy2 / d;
                const rvx = p.vx - o.vx;
                const rvy = p.vy - o.vy;
                const speed = rvx * nx + rvy * ny;
                if (speed < 0) continue;
                const impulse = (2 * speed) / (p.mass + o.mass);
                p.vx -= impulse * o.mass * nx;
                p.vy -= impulse * o.mass * ny;
                o.vx += impulse * p.mass * nx;
                o.vy += impulse * p.mass * ny;
                const overlap = minD - d;
                const sx = nx * overlap * 0.5;
                const sy = ny * overlap * 0.5;
                p.x -= sx;
                p.y -= sy;
                o.x += sx;
                o.y += sy;
              } else {
                const mergeForce = (minD - d) / minD;
                p.glowMultiplier = (p.glowMultiplier || 1) + mergeForce * 0.5;
                o.glowMultiplier = (o.glowMultiplier || 1) + mergeForce * 0.5;
                const af = mergeForce * 0.01;
                p.vx += dx2 * af;
                p.vy += dy2 * af;
                o.vx -= dx2 * af;
                o.vy -= dy2 * af;
              }
            }
          }
        }

        p.x += p.vx;
        p.y += p.vy;

        p.vx += (Math.random() - 0.5) * 0.001;
        p.vy += (Math.random() - 0.5) * 0.001;

        p.vx *= 0.999;
        p.vy *= 0.999;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
      }
    };

    let lastFrame = 0;
    let accumulator = 0;
    const tick = (now: number) => {
      accumulator += Math.min(50, lastFrame ? now - lastFrame : 1000 / 60);
      lastFrame = now;
      if (accumulator >= 1000 / 60) {
        while (accumulator >= 1000 / 60) { update(); accumulator -= 1000 / 60; }
        draw();
      }
      frameId = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      lastFrame = 0; accumulator = 0;
      frameId = requestAnimationFrame(tick);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(frameId);
    };

    const reset = () => {
      createStars();
      if (!running) draw();
    };

    const retune = () => {
      retuneStars();
      if (!running) draw();
    };

    resize();
    window.addEventListener('resize', resize);
    const pointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const leave = () => { mouseRef.current = { x: -10000, y: -10000 }; };
    window.addEventListener('pointermove', pointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    window.addEventListener('blur', leave);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const mutationObserver = new MutationObserver(readColor);
    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', readColor);

    engineRef.current = { start, stop, reset, retune };

    return () => {
      stop();
      engineRef.current = null;
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', pointer);
      document.documentElement.removeEventListener('pointerleave', leave);
      window.removeEventListener('blur', leave);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      mql.removeEventListener('change', readColor);
    };
  }, []);

  React.useEffect(() => {
    engineRef.current?.reset();
  }, [starsCount, starsSize]);

  React.useEffect(() => {
    engineRef.current?.retune();
  }, [starsOpacity, movementSpeed, glowIntensity]);

  React.useEffect(() => {
    const engine = engineRef.current;
    if (!playing || !engine) return;
    engine.start();
    return engine.stop;
  }, [playing]);

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const point = 'touches' in e ? e.touches[0] : e;
    if (!point) return;
    mouseRef.current = {
      x: point.clientX - rect.left,
      y: point.clientY - rect.top,
    };
  };

  return (
    <div
      ref={containerRef}
      data-slot="gravity-stars-background"
      data-playing={playing}
      className={cn('relative size-full overflow-hidden', className)}
      onMouseMove={(e) => {
        handlePointerMove(e);
        onMouseMove?.(e);
      }}
      onTouchMove={(e) => {
        handlePointerMove(e);
        onTouchMove?.(e);
      }}
      {...props}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 block size-full"
      />
      {children}
    </div>
  );
}

function GravityStarsBackground(props: GravityStarsProps) {
  return <GravityStarsBackgroundContent {...props} />;
}

export { GravityStarsBackground, type GravityStarsProps };
