import { CircuitLine } from "../components/decorations/CircuitLine";
import { CircuitBranch } from "../components/decorations/CircuitBranch";
import { CircuitDot } from "../components/decorations/CircuitDot";

// Helper to pick a random item from an array
const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
// Helper to get a random number in a range
const getRandomNumber = (min: number, max: number): number => Math.random() * (max - min) + min;

const availableComponents = [
  { component: CircuitDot, weight: 0.5 },
  { component: CircuitLine, weight: 0.3 },
  { component: CircuitBranch, weight: 0.2 },
];

const sizeClasses = ["w-2", "w-3", "w-4", "w-8", "w-12", "w-16", "w-20"];

interface LayerConfig {
  gridSize: [rows: number, cols: number];
  speedRange: [min: number, max: number];
  opacityRange: [min: number, max: number];
}

interface GeneratorConfig {
  layers: LayerConfig[];
}

interface Decoration {
    id: number;
    component: React.ComponentType<any>;
    className: string;
    style: { top: string; left: string };
    speed: number;
  }

export const generateDecorations = (config: GeneratorConfig) => {
  const decorations: Decoration[] = [];
  let uniqueId = 0;

  config.layers.forEach(layer => {
    const [rows, cols] = layer.gridSize;
    const cellWidth = 100 / cols;
    const cellHeight = 100 / rows;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        // Calculate random position WITHIN the current grid cell
        const top = `${i * cellHeight + getRandomNumber(0, cellHeight - 10)}%`;
        const left = `${j * cellWidth + getRandomNumber(0, cellWidth - 5)}%`;

        const size = getRandomItem(sizeClasses);
        const opacity = getRandomNumber(layer.opacityRange[0], layer.opacityRange[1]).toFixed(2);
        
        decorations.push({
          id: uniqueId++,
          component: getRandomItem(availableComponents).component,
          className: `${size} text-accent/[${opacity}]`, // ✅ Use the accent color
          style: { top, left },
          speed: getRandomNumber(layer.speedRange[0], layer.speedRange[1]),
        });
      }
    }
  });

  return decorations;
};