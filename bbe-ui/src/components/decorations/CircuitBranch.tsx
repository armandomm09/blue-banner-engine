import React from 'react';
import { motion, type MotionValue } from 'framer-motion';

interface CircuitBranchProps {
  y: MotionValue<number>;
  className?: string;
  style?: React.CSSProperties;
}

export const CircuitBranch: React.FC<CircuitBranchProps> = ({ y, className, style }) => {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 250"
      className={className}
      style={{ y, position: 'absolute', ...style }}
      aria-hidden="true"
    >
      <path
        d="M50 0 V 80 C 50 100, 50 100, 70 100 H 90"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M50 120 V 250"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M50 120 C 50 110, 50 110, 30 110 H 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="50" cy="60" r="5" fill="currentColor" />
      <circle cx="50" cy="120" r="6" fill="currentColor" />
      <circle cx="90" cy="100" r="4" fill="currentColor" />
      <circle cx="10" cy="110" r="3" fill="currentColor" />
      <circle cx="50" cy="180" r="4" fill="currentColor" />
    </motion.svg>
  );
};