import { useEffect, useState } from "react";

interface Props {
  onDone: () => void;
  /** Total animation duration in ms. Default 2200. */
  durationMs?: number;
}

/**
 * Splash intro: logo PNG enters, drifts, then zooms through the viewer
 * in one continuous, GPU-accelerated CSS animation. No frozen phase.
 */
export default function IntroSplash({ onDone, durationMs = 2200 }: Props) {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setGone(true);
      onDone();
    }, durationMs);
    return () => window.clearTimeout(t);
  }, [durationMs, onDone]);

  if (gone) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center select-none overflow-hidden pointer-events-none bg-white"
      style={{
        animation: `introFade ${durationMs}ms ease-out forwards`,
      }}
    >
      <img
        src="/logo-intro.png"
        alt="BNP Paribas Savings Agent"
        draggable={false}
        className="w-64 h-64 sm:w-80 sm:h-80 md:w-[420px] md:h-[420px] object-contain"
        style={{
          animation: `introZoom ${durationMs}ms cubic-bezier(0.55, 0, 0.35, 1) forwards`,
          willChange: "transform, opacity, filter",
          backfaceVisibility: "hidden",
          transformOrigin: "center center",
        }}
      />
    </div>
  );
}
