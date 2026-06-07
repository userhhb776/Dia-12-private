import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface HeartParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  duration: number;
}

export default function ConfettiHearts({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<HeartParticle[]>([]);

  useEffect(() => {
    if (!active) return;

    const colors = [
      "text-rose-400",
      "text-rose-500",
      "text-pink-400",
      "text-pink-500",
      "text-red-400",
      "text-red-500",
      "text-emerald-300", // warm pastel accents
    ];

    const newParticles = Array.from({ length: 45 }).map((_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100, // random percentage width
      y: 110, // starts off-screen at bottom or center
      size: Math.random() * 24 + 12, // size between 12px and 36px
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      duration: Math.random() * 2.5 + 2, // flight duration 2-4.5s
    }));

    setParticles((prev) => [...prev, ...newParticles]);

    // Clear after animation completes
    const timer = setTimeout(() => {
      setParticles([]);
    }, 5000);

    return () => clearTimeout(timer);
  }, [active]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ 
              opacity: 0, 
              scale: 0.5, 
              x: `${p.x}vw`, 
              y: "100vh" 
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1.2, 1, 0.4],
              y: "-10vh",
              x: `${p.x + (Math.random() * 20 - 10)}vw`,
              rotate: p.rotation + 180,
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: p.duration, 
              ease: "easeOut" 
            }}
            className={`absolute ${p.color}`}
            style={{ width: p.size, height: p.size }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-full h-full"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
