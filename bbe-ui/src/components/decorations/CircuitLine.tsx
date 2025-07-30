import React from 'react';
import { motion, type MotionValue } from 'framer-motion';

interface CircuitLineProps {
  y: MotionValue<number>;
  className?: string;
  style?: React.CSSProperties;
}

export const CircuitLine: React.FC<CircuitLineProps> = ({ y, className, style }) => {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 200"
      className={className}
      style={{ y, position: 'absolute', ...style }}
      aria-hidden="true"
    >
      <path
        d="M20 0 V 50 C 20 60, 20 60, 30 60 H 35 L 5 110 H 30 C 40 110, 40 110, 40 120 V 200"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="20" cy="40" r="4" fill="currentColor" />
      <circle cx="10" cy="110" r="3" fill="currentColor" />
      <circle cx="40" cy="130" r="4" fill="currentColor" />
    </motion.svg>
  );
};