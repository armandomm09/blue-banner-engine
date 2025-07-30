import { CircuitLine } from "../components/decorations/CircuitLine";
import { CircuitBranch } from "../components/decorations/CircuitBranch";
import { CircuitDot } from "../components/decorations/CircuitDot";

export const decorationsConfig = [
  // Layer 1: Farthest Back (slowest, most transparent)
  { id: 1, component: CircuitLine, className: "top-[5%] left-[5%] w-12 text-accent/5", speed: 50 },
  { id: 2, component: CircuitBranch, className: "bottom-[-20%] right-[-5%] w-24 text-accent/5", speed: 70 },
  { id: 3, component: CircuitDot, className: "top-[20%] right-[15%] w-4 text-accent/5", speed: 60 },

  // Layer 2: Background
  { id: 4, component: CircuitBranch, className: "top-[10%] left-[-5%] w-20 text-accent/10", speed: 100 },
  { id: 5, component: CircuitLine, className: "bottom-[-10%] left-[20%] w-10 text-accent/10", speed: 120 },
  { id: 6, component: CircuitDot, className: "bottom-[15%] left-[5%] w-3 text-accent/10", speed: 110 },
  
  // Layer 3: Mid-ground
  { id: 7, component: CircuitBranch, className: "bottom-[5%] right-[5%] w-28 text-accent/20", speed: 200 },
  { id: 8, component: CircuitLine, className: "top-[-15%] right-[10%] w-16 text-accent/20", speed: 220 },
  
  // Layer 4: Foreground (fastest, most opaque)
  { id: 9, component: CircuitDot, className: "top-[40%] left-[10%] w-2 text-accent/30", speed: 400 },
  { id: 10, component: CircuitDot, className: "bottom-[30%] right-[15%] w-3 text-accent/30", speed: 350 },
];