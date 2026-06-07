import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface FallingHeart {
  id: number;
  x: number; // percentage horizontal position (0-100)
  delay: number; // start delay in seconds
  size: number; // size in pixels
  duration: number; // animation duration in seconds
  color: string; // colors for variance
  sway: number; // custom horizontal sway offset
}

export default function FallingHearts() {
  const [hearts, setHearts] = useState<FallingHeart[]>([]);

  useEffect(() => {
    // Colors of sweet pinks, soft red and gold sparkles
    const colors = [
      "text-rose-400/40 rgb(251, 113, 133, 0.4)",
      "text-rose-500/35 rgb(244, 63, 94, 0.35)",
      "text-pink-400/40 rgb(244, 114, 182, 0.4)",
      "text-pink-500/35 rgb(236, 72, 153, 0.35)",
      "text-red-400/30 rgb(248, 113, 113, 0.3)",
      "text-red-500/25 rgb(239, 68, 68, 0.25)",
      "text-amber-400/30 rgb(250, 204, 21, 0.3)"
    ];

    // Initial batch of ambient falling hearts
    const initialHearts = Array.from({ length: 15 }).map((_, i) => ({
      id: Math.random() + i,
      x: Math.random() * 100,
      delay: Math.random() * 4,
      size: Math.random() * 16 + 8, // 8px to 24px
      duration: Math.random() * 8 + 6, // 6s to 14s (slow, elegant fall)
      color: colors[Math.floor(Math.random() * colors.length)],
      sway: Math.random() * 15 - 7.5 // -7.5vw to +7.5vw
    }));

    setHearts(initialHearts);

    // Keep spawning new hearts periodically to replace completed ones
    const interval = setInterval(() => {
      setHearts((prev) => {
        // Keep screen optimization, prune old ones (max 30 hearts)
        const active = prev.filter((h) => Date.now() - h.id < h.duration * 1000 + 4000);
        
        if (active.length < 25) {
          return [
            ...active,
            {
              id: Date.now(),
              x: Math.random() * 100,
              delay: 0,
              size: Math.random() * 16 + 8,
              duration: Math.random() * 8 + 6,
              color: colors[Math.floor(Math.random() * colors.length)],
              sway: Math.random() * 15 - 7.5
            }
          ];
        }
        return active;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      <AnimatePresence>
        {hearts.map((h) => (
          <motion.div
            key={h.id}
            initial={{
              opacity: 0,
              y: "-5vh",
              x: `${h.x}vw`,
              rotate: Math.random() * 45 - 22.5
            }}
            animate={{
              opacity: [0, 0.8, 0.8, 0],
              y: "105vh",
              x: [`${h.x}vw`, `${h.x + h.sway}vw`],
              rotate: [0, Math.random() * 180 - 90]
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: h.duration,
              delay: h.delay,
              ease: "linear"
            }}
            className="absolute"
            style={{ width: h.size, height: h.size }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className={`w-full h-full ${h.color.split(" ")[0]}`}
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
