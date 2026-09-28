import { useId } from 'react';
import { motion } from 'motion/react';

// Sorted rows from icon.png. dy moves a bar to its unsorted row: 50, 94, 22, 78, 36, 64.
const BARS = [
  { x: 53, y: 25, w: 22, dy: 28 },
  { x: 46, y: 39, w: 36, dy: 42 },
  { x: 39, y: 53, w: 50, dy: -28 },
  { x: 32, y: 67, w: 64, dy: 28 },
  { x: 25, y: 81, w: 78, dy: -14 },
  { x: 17, y: 95, w: 94, dy: -56 },
];

const EASE = [0.65, 0, 0.35, 1] as const;

/** `loop` sorts forever. `hover` sorts only while a motion ancestor is in its `shuffle` variant. */
export function Logo({ mode, className }: { mode: 'loop' | 'hover'; className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 128 128" className={className} aria-hidden="true">
      <rect width="128" height="128" rx="28" fill="#18192d" />
      <defs>
        <linearGradient id={id} x1="17" y1="64" x2="110" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#15e4c0" />
          <stop offset="1" stopColor="#0093f3" />
        </linearGradient>
      </defs>
      <g fill={`url(#${id})`}>
        {BARS.map((b) =>
          mode === 'loop' ? (
            <motion.g
              key={b.w}
              initial={{ y: b.dy }}
              animate={{ y: [b.dy, b.dy, 0, 0, b.dy] }}
              transition={{ duration: 8, times: [0, 0.18, 0.42, 0.88, 1], ease: EASE, repeat: Infinity }}
            >
              <rect x={b.x} y={b.y} width={b.w} height="8" rx="4" />
            </motion.g>
          ) : (
            <motion.g
              key={b.w}
              variants={{
                rest: { y: 0, transition: { duration: 0.4, ease: EASE } },
                shuffle: {
                  y: [0, b.dy, b.dy, 0],
                  transition: { duration: 1.6, times: [0, 0.35, 0.5, 1], ease: EASE, repeat: Infinity },
                },
              }}
            >
              <rect x={b.x} y={b.y} width={b.w} height="8" rx="4" />
            </motion.g>
          )
        )}
      </g>
    </svg>
  );
}
