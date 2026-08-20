// V2_TRUUS_STYLE — replace the CONTENT of src/components/LoadingSplash.tsx with this file.
import React, { useEffect, useRef, useState } from 'react';

interface LoadingSplashProps {
  ready: boolean;
  onFinished: () => void;
}

const DRAW_IN_MS = 800;
const DRAW_OUT_MS = 1500;

const easeInOut = (t: number) =>
  t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export const LoadingSplash: React.FC<LoadingSplashProps> = ({
  ready,
  onFinished,
}) => {
  const pathRef = useRef<SVGPathElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const exitStartedRef = useRef(false);
  const mountedRef = useRef(true);

  const [covered, setCovered] = useState(false);

  const stopRaf = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const animate = (
    duration: number,
    frame: (progress: number) => void,
    done?: () => void
  ) => {
    stopRaf();

    const startedAt = performance.now();

    const tick = (now: number) => {
      if (!mountedRef.current) return;

      const progress = Math.min(
        1,
        (now - startedAt) / duration
      );

      frame(progress);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        done?.();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  // Phase 1: draw + expand the scribble until it covers the viewport.
  useEffect(() => {
    mountedRef.current = true;

    const path = pathRef.current;
    const content = contentRef.current;

    if (!path || !content) return;

    const length = path.getTotalLength();

    path.style.strokeDasharray = `${length}px`;
    path.style.strokeDashoffset = `${length}px`;
    path.style.strokeWidth = '0.4%';
    path.style.opacity = '1';

    content.style.opacity = '0';
    content.style.transform =
      'translate(-50%, -50%) scale(.82) rotate(-2deg)';

    animate(
      DRAW_IN_MS,
      (rawProgress) => {
        const p = easeInOut(rawProgress);

        path.style.strokeDashoffset = `${
          length * (1 - p)
        }px`;

        // This is intentionally percentage-based, like the reference.
        // It lets the rounded stroke become a screen-covering "paint swipe".
        const strokeWidth = 0.4 + 42 * p;
        path.style.strokeWidth = `${strokeWidth}%`;

        // Logo only appears after the scribble is already taking over.
        const logoStart = 0.42;
        const logoP = Math.max(
          0,
          Math.min(1, (rawProgress - logoStart) / 0.34)
        );

        if (logoP > 0) {
          const easedLogo = easeOut(logoP);
          content.style.opacity = `${easedLogo}`;

          const scale =
            0.82 + (1.0 - 0.82) * easedLogo;

          const rotation =
            -2 + 2 * easedLogo;

          content.style.transform =
            `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`;
        }
      },
      () => {
        path.style.strokeDashoffset = '0px';
        path.style.strokeWidth = '42.4%';

        content.style.opacity = '1';
        content.style.transform =
          'translate(-50%, -50%) scale(1) rotate(0deg)';

        setCovered(true);
      }
    );

    return () => {
      mountedRef.current = false;
      stopRaf();
    };
  }, []);

  // Phase 2: once Firebase/auth is ready, pull the scribble out and reveal the app.
  useEffect(() => {
    if (!ready || !covered || exitStartedRef.current) {
      return;
    }

    const path = pathRef.current;
    const content = contentRef.current;

    if (!path || !content) {
      onFinished();
      return;
    }

    exitStartedRef.current = true;

    const length = path.getTotalLength();

    animate(
      DRAW_OUT_MS,
      (rawProgress) => {
        const p = easeInOut(rawProgress);

        // Continue the same line forward rather than fading a rectangle.
        path.style.strokeDashoffset = `${
          -length * p
        }px`;

        // Thick paint swipe shrinks back into a thin hand-drawn line.
        const strokeWidth =
          42.4 - (42.4 - 0.4) * p;

        path.style.strokeWidth = `${Math.max(
          0.4,
          strokeWidth
        )}%`;

        // Keep the icon visible during the first half of the exit,
        // then remove it while the scribble finishes clearing.
        if (rawProgress < 0.42) {
          content.style.opacity = '1';

          const wobble =
            Math.sin(rawProgress * Math.PI * 5) * 1.2;

          content.style.transform =
            `translate(-50%, -50%) scale(1) rotate(${wobble}deg)`;
        } else {
          const hideP = Math.min(
            1,
            (rawProgress - 0.42) / 0.16
          );

          content.style.opacity = `${1 - hideP}`;

          const scale = 1 - 0.06 * hideP;

          content.style.transform =
            `translate(-50%, -50%) scale(${scale})`;
        }
      },
      () => {
        path.style.strokeDashoffset = `${-length}px`;
        path.style.strokeWidth = '0.4%';
        content.style.opacity = '0';

        window.setTimeout(() => {
          if (mountedRef.current) {
            onFinished();
          }
        }, 40);
      }
    );
  }, [ready, covered, onFinished]);

  return (
    <div
      className="us-transition-v2"
      role="status"
      aria-label="Đang mở Us"
    >
      <style>{`
        .us-transition-v2 {
          position: fixed;
          inset: 0;
          z-index: 99999;
          overflow: hidden;
          pointer-events: auto;
          background: transparent;
          isolation: isolate;
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
        }

        /*
         * IMPORTANT:
         * Truus-style transition needs an SVG much larger than the viewport.
         * 200vw / 200vh prevents the giant rounded stroke from exposing
         * rectangular SVG edges on iPhone.
         */
        .us-transition-v2__svg {
          position: fixed;
          top: -50vh;
          left: -50vw;
          width: 200vw;
          height: 200vh;
          z-index: 1;
          overflow: visible;
          pointer-events: none;
          color: #fb7185;
        }

        .us-transition-v2__path {
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: 0;
          vector-effect: non-scaling-stroke;
          will-change: stroke-dashoffset, stroke-width;
        }

        .us-transition-v2__content {
          position: fixed;
          top: 50%;
          left: 50%;
          z-index: 2;

          display: flex;
          flex-direction: column;
          align-items: center;

          width: min(82vw, 340px);

          opacity: 0;
          transform:
            translate(-50%, -50%)
            scale(.82)
            rotate(-2deg);

          pointer-events: none;
          will-change: opacity, transform;
        }

        .us-transition-v2__icon-wrap {
          position: relative;
          width: 92px;
          height: 92px;
          margin-bottom: 14px;
        }

        .us-transition-v2__glow {
          position: absolute;
          inset: -22px;
          border-radius: 40px;
          background:
            radial-gradient(
              circle,
              rgba(255,255,255,.5) 0%,
              rgba(255,255,255,.18) 48%,
              rgba(255,255,255,0) 72%
            );
          filter: blur(11px);
        }

        .us-transition-v2__icon {
          position: relative;
          display: block;
          width: 92px;
          height: 92px;
          object-fit: cover;
          border-radius: 25px;
          border: 1px solid rgba(255,255,255,.42);

          box-shadow:
            0 16px 42px rgba(136,19,55,.18),
            0 3px 10px rgba(136,19,55,.1);
        }

        .us-transition-v2__title {
          margin: 0;
          color: #172033;
          font-size: 27px;
          line-height: 1;
          font-weight: 850;
          letter-spacing: -.045em;
        }

        .us-transition-v2__subtitle {
          margin: 9px 0 0;
          color: rgba(30,41,59,.68);
          font-size: 12px;
          line-height: 1.4;
          font-weight: 650;
          white-space: nowrap;
        }

        .us-transition-v2__heart {
          display: inline-block;
          margin-left: 3px;
          color: #be123c;
          animation:
            us-transition-v2-heart
            900ms ease-in-out infinite;
        }

        @keyframes us-transition-v2-heart {
          0%, 100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.16);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .us-transition-v2__heart {
            animation: none;
          }
        }
      `}</style>

      <svg
        className="us-transition-v2__svg"
        viewBox="0 0 3222 3114"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          ref={pathRef}
          className="us-transition-v2__path"
          d="
            M 120 420
            C 410 120, 810 120, 610 610
            C 430 1050, 90 1330, 350 1690
            C 610 2050, 1060 1750, 900 1270
            C 740 780, 1080 290, 1530 470
            C 1990 650, 2130 1150, 1710 1460
            C 1290 1770, 1230 2340, 1780 2500
            C 2330 2660, 2520 2100, 3040 1760
            C 3300 1590, 3370 1980, 3490 2230
          "
        />
      </svg>

      <div
        ref={contentRef}
        className="us-transition-v2__content"
      >
        <div className="us-transition-v2__icon-wrap">
          <div className="us-transition-v2__glow" />

          <img
            className="us-transition-v2__icon"
            src="/icons/icon.png"
            alt=""
          />
        </div>

        <h1 className="us-transition-v2__title">
          Us
        </h1>

        <p className="us-transition-v2__subtitle">
          Không gian của hai đứa
          <span className="us-transition-v2__heart">
            ♥
          </span>
        </p>
      </div>
    </div>
  );
};