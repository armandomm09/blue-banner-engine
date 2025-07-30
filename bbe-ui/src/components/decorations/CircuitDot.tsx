import React from 'react';
import { motion, type MotionValue } from 'framer-motion';

interface CircuitDotProps {
  y: MotionValue<number>;
  className?: string;
  style?: React.CSSProperties;
}

export const CircuitDot: React.FC<CircuitDotProps> = ({ y, className, style }) => {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 10 10"
      className={className}
      style={{ y, position: 'absolute', ...style }}
      aria-hidden="true"
    >
      <circle cx="5" cy="5" r="5" fill="currentColor" />
    </motion.svg>
  );
};