import React, { useEffect, useState } from 'react';

interface LoadingSplashProps {
  ready: boolean;
  onFinished: () => void;
}

export const LoadingSplash: React.FC<LoadingSplashProps> = ({
  ready,
  onFinished,
}) => {
  const [canExit, setCanExit] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCanExit(true);
    }, 1250);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready || !canExit || exiting) return;

    setExiting(true);

    const timer = window.setTimeout(() => {
      onFinished();
    }, 720);

    return () => window.clearTimeout(timer);
  }, [ready, canExit, exiting, onFinished]);

  return (
    <div
      className={`us-splash ${exiting ? 'us-splash--exit' : ''}`}
      aria-label="Đang mở Us"
      role="status"
    >
      <style>{`
        .us-splash {
          position: fixed;
          inset: 0;
          z-index: 99999;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff7f8;
          transform: translateZ(0);
          will-change: opacity, transform;
          transition:
            opacity 520ms cubic-bezier(.22,.8,.25,1),
            transform 700ms cubic-bezier(.22,.8,.25,1),
            border-radius 700ms cubic-bezier(.22,.8,.25,1);
        }

        .us-splash--exit {
          opacity: 0;
          transform: translateY(-3.5%) scale(1.015);
          border-radius: 0 0 32px 32px;
          pointer-events: none;
        }

        .us-splash__wash {
          position: absolute;
          inset: -5%;
          width: 110%;
          height: 110%;
          overflow: visible;
          color: #fb7185;
          pointer-events: none;
        }

        .us-splash__path {
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          path-length: 1;
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: us-scribble 1550ms cubic-bezier(.55,.02,.24,1) both;
        }

        .us-splash__content {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          opacity: 0;
          transform: scale(.82) rotate(-2deg);
          animation: us-logo-in 1550ms cubic-bezier(.22,.8,.25,1) both;
        }

        .us-splash__icon-wrap {
          position: relative;
          width: 94px;
          height: 94px;
        }

        .us-splash__icon-glow {
          position: absolute;
          inset: -18px;
          border-radius: 38px;
          background: rgba(255,255,255,.28);
          filter: blur(18px);
        }

        .us-splash__icon {
          position: relative;
          display: block;
          width: 94px;
          height: 94px;
          object-fit: cover;
          border-radius: 25px;
          box-shadow:
            0 18px 45px rgba(136, 19, 55, .18),
            0 2px 8px rgba(136, 19, 55, .08);
          animation: us-icon-wiggle 680ms steps(2, end) 520ms 1 both;
        }

        .us-splash__name {
          margin: 0;
          color: #1e293b;
          font-size: 25px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: -0.04em;
        }

        .us-splash__caption {
          margin: 0;
          color: rgba(51, 65, 85, .72);
          font-size: 12px;
          line-height: 1.4;
          font-weight: 600;
          letter-spacing: .01em;
        }

        .us-splash__heart {
          display: inline-block;
          margin-left: 3px;
          color: #e11d48;
          animation: us-heart 900ms ease-in-out infinite;
        }

        @keyframes us-scribble {
          0% {
            stroke-dashoffset: 1;
            stroke-width: 12;
            opacity: 1;
          }
          42% {
            stroke-dashoffset: .08;
            stroke-width: 620;
            opacity: 1;
          }
          68% {
            stroke-dashoffset: -.08;
            stroke-width: 700;
            opacity: 1;
          }
          100% {
            stroke-dashoffset: -1;
            stroke-width: 14;
            opacity: 1;
          }
        }

        @keyframes us-logo-in {
          0%, 23% {
            opacity: 0;
            transform: scale(.82) rotate(-2deg);
          }
          42% {
            opacity: 1;
            transform: scale(1.04) rotate(0deg);
          }
          58% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
          82% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes us-icon-wiggle {
          0% { transform: rotate(0deg); }
          20% { transform: rotate(-2deg); }
          40% { transform: rotate(2deg); }
          60% { transform: rotate(-1deg); }
          80% { transform: rotate(1deg); }
          100% { transform: rotate(0deg); }
        }

        @keyframes us-heart {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.16); }
        }

        @media (prefers-reduced-motion: reduce) {
          .us-splash__path,
          .us-splash__content,
          .us-splash__icon,
          .us-splash__heart {
            animation: none !important;
          }

          .us-splash__content {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>

      <svg
        className="us-splash__wash"
        viewBox="0 0 1000 1800"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          className="us-splash__path"
          pathLength="1"
          d="M-90 220 C190 25 360 410 135 650 C-45 842 125 1055 350 885 C550 735 315 460 520 315 C705 185 985 325 840 575 C700 820 385 1015 495 1255 C610 1510 910 1265 1060 1515"
        />
      </svg>

      <div className="us-splash__content">
        <div className="us-splash__icon-wrap">
          <div className="us-splash__icon-glow" />
          <img
            className="us-splash__icon"
            src="/icons/icon.png"
            alt="Us"
          />
        </div>

        <h1 className="us-splash__name">Us</h1>

        <p className="us-splash__caption">
          Không gian của hai đứa
          <span className="us-splash__heart">♥</span>
        </p>
      </div>
    </div>
  );
};