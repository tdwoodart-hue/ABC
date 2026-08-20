// LoadingSplash.tsx — FIX_FROM_EXACT_UPLOADED_FILE_20260820
// Replace: src/components/LoadingSplash.tsx
import React, { useEffect, useRef, useState } from 'react';

interface LoadingSplashProps {
  ready: boolean;
  onFinished: () => void;
}

/*
 * Matched to the reference transition's actual proportions:
 * scale: 0.75
 * stroke: 8% -> 34.5%
 * draw in: 2.2s
 * draw out: 2.7s
 */
const DRAW_IN_MS = 2200;
const DRAW_OUT_MS = 2700;
const START_STROKE = 8;
const MAX_STROKE = 35.5;

const clamp01 = (value: number) =>
  Math.max(0, Math.min(1, value));

const easeInOut = (t: number) =>
  t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;

const easeOut = (t: number) =>
  1 - Math.pow(1 - t, 3);

export const LoadingSplash: React.FC<LoadingSplashProps> = ({
  ready,
  onFinished,
}) => {
  const pathRef = useRef<SVGPathElement | null>(null);
  const logoRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const exitStartedRef = useRef(false);

  const [covered, setCovered] = useState(false);

  const cancelFrame = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const runAnimation = (
    duration: number,
    onFrame: (progress: number) => void,
    onDone?: () => void
  ) => {
    cancelFrame();

    const startTime = performance.now();

    const tick = (now: number) => {
      if (!mountedRef.current) return;

      const progress = clamp01(
        (now - startTime) / duration
      );

      onFrame(progress);

      if (progress < 1) {
        animationFrameRef.current =
          requestAnimationFrame(tick);
      } else {
        animationFrameRef.current = null;
        onDone?.();
      }
    };

    animationFrameRef.current =
      requestAnimationFrame(tick);
  };

  /*
   * PHASE 1 — snake enters
   *
   * A relatively thin stroke travels along one long curved path.
   * While its head advances, the body grows from 8% to 31%.
   * The SVG itself is oversized but scaled to 0.7, matching the
   * visual proportion of the reference, with a tiny coverage boost for phone corners.
   */
  useEffect(() => {
    mountedRef.current = true;

    const path = pathRef.current;
    const logo = logoRef.current;

    if (!path || !logo) return;

    const length = path.getTotalLength();

    path.style.strokeDasharray =
      `${length + 5}px ${length + 5}px`;

    path.style.strokeDashoffset =
      `${length + 5}px`;

    path.style.strokeWidth =
      `${START_STROKE}%`;

    path.style.opacity = '1';

    logo.style.opacity = '0';
    logo.style.transform =
      'translate(-50%, -50%) scale(.9) rotate(-2deg)';

    runAnimation(
      DRAW_IN_MS,
      (raw) => {
        const p = easeInOut(raw);

        const dashOffset =
          (length + 5) * (1 - p);

        path.style.strokeDashoffset =
          `${dashOffset}px`;

        const stroke =
          START_STROKE +
          (MAX_STROKE - START_STROKE) * p;

        path.style.strokeWidth =
          `${stroke}%`;

        /*
         * Logo appears only after the snake has already covered
         * most of the center. Small and understated.
         */
        const logoP = clamp01(
          (raw - 0.52) / 0.22
        );

        if (logoP > 0) {
          const eased = easeOut(logoP);

          logo.style.opacity = `${eased}`;

          const scale =
            0.9 + 0.1 * eased;

          const rotate =
            -2 + 2 * eased;

          logo.style.transform =
            `translate(-50%, -50%) scale(${scale}) rotate(${rotate}deg)`;
        }
      },
      () => {
        path.style.strokeDashoffset = '0px';
        path.style.strokeWidth =
          `${MAX_STROKE}%`;

        logo.style.opacity = '1';
        logo.style.transform =
          'translate(-50%, -50%) scale(1) rotate(0deg)';

        setCovered(true);
      }
    );

    return () => {
      mountedRef.current = false;
      cancelFrame();
    };
  }, []);

  /*
   * PHASE 2 — snake exits
   *
   * Do NOT fade the pink layer.
   * The same stroke keeps moving forward past the end of the path.
   * The tail narrows back to 8%, which produces the "snake sliding
   * away toward the bottom corner" look.
   *
   * If auth/data is still loading, hold the covered frame until ready.
   */
  useEffect(() => {
    if (
      !ready ||
      !covered ||
      exitStartedRef.current
    ) {
      return;
    }

    const path = pathRef.current;
    const logo = logoRef.current;

    if (!path || !logo) {
      onFinished();
      return;
    }

    exitStartedRef.current = true;

    // FIX_FROM_UPLOADED_FILE_20260820:
    // The root loader background (#fff7f8) used to stay on top of Home
    // during the whole exit animation, which caused the blank pale screen.
    // Keep the intro exactly the same, but reveal Home underneath
    // the moment the snake starts sliding out.
    if (containerRef.current) {
      containerRef.current.style.background = 'transparent';
    }

    const length = path.getTotalLength();
    const totalLength = length + 5;

    runAnimation(
      DRAW_OUT_MS,
      (raw) => {
        const p = easeInOut(raw);

        /*
         * Continue in the SAME direction.
         * This is the crucial motion: 0 -> negative full path length.
         */
        path.style.strokeDashoffset =
          `${-totalLength * p}px`;

        const stroke =
          MAX_STROKE -
          (MAX_STROKE - START_STROKE) * p;

        path.style.strokeWidth =
          `${stroke}%`;

        /*
         * Keep logo visible for roughly the first half of exit,
         * then remove it while the tail slides toward bottom-right.
         */
        const hideP = clamp01(
          (raw - 0.43) / 0.12
        );

        logo.style.opacity =
          `${1 - hideP}`;

        if (hideP < 1) {
          const wiggle =
            Math.sin(raw * Math.PI * 6) * 1.1;

          const scale =
            1 - 0.05 * hideP;

          logo.style.transform =
            `translate(-50%, -50%) scale(${scale}) rotate(${wiggle}deg)`;
        }
      },
      () => {
        path.style.strokeDashoffset =
          `${-totalLength}px`;

        path.style.strokeWidth =
          `${START_STROKE}%`;

        logo.style.opacity = '0';

        window.setTimeout(() => {
          if (mountedRef.current) {
            onFinished();
          }
        }, 30);
      }
    );
  }, [ready, covered, onFinished]);

  return (
    <div
      ref={containerRef}
      className="us-snake-loader"
      role="status"
      aria-label="Đang mở Us"
    >
      <style>{`
        .us-snake-loader {
          position: fixed;
          inset: 0;
          z-index: 99999;

          overflow: hidden;
          pointer-events: auto;

          /*
           * The page remains underneath.
           * Only the snake itself paints over it.
           */
          background: #fff7f8;

          isolation: isolate;
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
        }

        /*
         * Reference geometry:
         *   200vw × 200vh
         *   positioned -50vw / -50vh
         *   then scaled to 0.75 around the center
         *
         * Effective visual footprint ≈ 150vw × 150vh.
         */
        .us-snake-loader__svg {
          position: fixed;

          top: -50vh;
          left: -50vw;

          width: 200vw;
          height: 200vh;

          z-index: 1;

          overflow: visible;
          pointer-events: none;

          color: #fb7185;

          transform: scale(.765);
          transform-origin: 50% 50%;

          will-change: transform;
        }

        .us-snake-loader__path {
          fill: none;

          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;

          opacity: 0;

          will-change:
            stroke-dashoffset,
            stroke-width;
        }

        /*
         * Intentionally SMALL relative to the phone screen.
         * No subtitle — only icon + Us.
         */
        .us-snake-loader__logo {
          position: fixed;

          top: 50%;
          left: 50%;

          z-index: 3;

          display: flex;
          flex-direction: column;
          align-items: center;

          opacity: 0;

          transform:
            translate(-50%, -50%)
            scale(.9)
            rotate(-2deg);

          pointer-events: none;

          will-change:
            opacity,
            transform;
        }

        .us-snake-loader__icon {
          display: block;

          width: 62px;
          height: 62px;

          object-fit: cover;

          border-radius: 18px;

          border:
            1px solid
            rgba(255, 255, 255, .38);

          box-shadow:
            0 10px 26px rgba(136, 19, 55, .14),
            0 2px 7px rgba(136, 19, 55, .08);
        }

        .us-snake-loader__name {
          margin: 8px 0 0;

          color: #172033;

          font-size: 21px;
          line-height: 1;

          font-weight: 850;
          letter-spacing: -.045em;
        }

        @media (min-width: 768px) {
          .us-snake-loader__icon {
            width: 72px;
            height: 72px;
            border-radius: 20px;
          }

          .us-snake-loader__name {
            margin-top: 10px;
            font-size: 23px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .us-snake-loader__logo {
            transform:
              translate(-50%, -50%);
          }
        }
      `}</style>

      <svg
        className="us-snake-loader__svg"
        viewBox="0 0 3222 3114"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/*
         * One continuous custom snake path.
         *
         * Start: outside upper-left
         * Body: snakes repeatedly across the viewport
         * End: leaves through the lower-right corner
         *
         * The long final diagonal is important: during phase 2,
         * the thick tail visibly slides DOWN and OUT instead of
         * simply shrinking in place.
         */}
        <path
          ref={pathRef}
          className="us-snake-loader__path"
          d="
            M 180 390
            C 430 150, 770 125, 985 245
            C 1190 360, 1125 585, 880 790
            C 625 1005, 310 1210, 205 1420
            C 105 1625, 250 1710, 470 1540
            C 720 1345, 995 1015, 1255 760
            C 1515 505, 1780 315, 1945 375
            C 2110 435, 1985 705, 1770 985
            C 1545 1275, 1265 1580, 1080 1830
            C 895 2075, 900 2200, 1060 2110
            C 1270 1990, 1525 1670, 1775 1430
            C 2035 1180, 2290 1010, 2435 1085
            C 2590 1165, 2455 1430, 2260 1715
            C 2070 1990, 1860 2260, 1845 2455
            C 1830 2645, 2025 2570, 2250 2380
            C 2485 2180, 2720 1970, 2925 1810
            C 3080 1690, 3185 1760, 3265 1910
            C 3350 2070, 3395 2320, 3485 2575
          "
        />
      </svg>

      <div
        ref={logoRef}
        className="us-snake-loader__logo"
      >
        <img
          className="us-snake-loader__icon"
          src="/icons/icon.png"
          alt=""
        />

        <div className="us-snake-loader__name">
          Us
        </div>
      </div>
    </div>
  );
};