import React, { useState, useEffect, useRef } from "react";

interface StopwatchProps {
  value: number;
  onChange: (newValue: number) => void;
}

const SEGMENTS: Record<string, string[]> = {
  "0": ["a", "b", "c", "d", "e", "f"],
  "1": ["b", "c"],
  "2": ["a", "b", "g", "e", "d"],
  "3": ["a", "b", "g", "c", "d"],
  "4": ["f", "g", "b", "c"],
  "5": ["a", "f", "g", "c", "d"],
  "6": ["a", "f", "e", "d", "c", "g"],
  "7": ["a", "b", "c"],
  "8": ["a", "b", "c", "d", "e", "f", "g"],
  "9": ["a", "b", "c", "d", "f", "g"],
};

const Stopwatch: React.FC<StopwatchProps> = ({ value, onChange }) => {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [time, setTime] = useState(value * 1000);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setTime((prevTime) => {
          const nextTime = prevTime + 10;
          onChange(nextTime / 1000);
          return nextTime;
        });
      }, 10);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused, onChange]);

  useEffect(() => {
    if (!isActive) {
      setTime(value * 1000);
    }
  }, [value, isActive]);

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    setIsActive(false);
    setIsPaused(true);
  };

  const handleReset = () => {
    setIsActive(false);
    setIsPaused(true);
    setTime(0);
    onChange(0);
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);

    return {
      min: minutes.toString().padStart(2, "0"),
      sec: seconds.toString().padStart(2, "0"),
      ms: centiseconds.toString().padStart(2, "0"),
    };
  };

  const t = formatTime(time);

  return (
    <div className="bg-background/50 border border-border p-5 rounded-2xl flex flex-col items-center gap-6">
      <div className="flex items-center gap-4 px-8 py-6 bg-black/60 rounded-xl border border-white/5 shadow-2xl">
        <TimeUnit value={t.min} label="MIN" />
        <div className="flex flex-col gap-3 py-2">
          <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(0,238,228,0.6)]" />
          <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(0,238,228,0.6)]" />
        </div>
        <TimeUnit value={t.sec} label="SEC" />
        <div className="flex flex-col gap-3 py-2 mt-auto">
          <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(0,238,228,0.6)]" />
        </div>
        <TimeUnit value={t.ms} label="CS" small />
      </div>

      <div className="flex gap-3 w-full">
        {!isActive ? (
          <button
            type="button"
            onClick={handleStart}
            className="flex-1 py-3 bg-accent text-background rounded-xl font-bold hover:shadow-[0_0_15px_rgba(0,238,228,0.4)] transition-all"
          >
            START
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handlePauseResume}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                isPaused
                  ? "bg-yellow-500 text-background"
                  : "bg-blue-500/20 border border-blue-500 text-blue-400"
              }`}
            >
              {isPaused ? "RESUME" : "PAUSE"}
            </button>
            <button
              type="button"
              onClick={handleStop}
              className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold transition-all"
            >
              STOP
            </button>
          </>
        )}
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-3 bg-background border border-border text-text-muted rounded-xl font-bold hover:border-accent/40 transition-all"
        >
          RESET
        </button>
      </div>
    </div>
  );
};

const SevenSegmentDigit = ({
  digit,
  small = false,
}: {
  digit: string;
  small?: boolean;
}) => {
  const activeSegments = SEGMENTS[digit] || [];
  const size = small ? { w: 30, h: 50 } : { w: 44, h: 72 };

  const Segment = ({ id, d }: { id: string; d: string }) => (
    <path
      d={d}
      className={`transition-all duration-300 ${
        activeSegments.includes(id)
          ? "fill-accent filter drop-shadow-[0_0_4px_rgba(0,238,228,0.8)]"
          : "fill-white/5"
      }`}
    />
  );

  return (
    <svg
      width={size.w}
      height={size.h}
      viewBox="0 0 44 72"
      className="overflow-visible"
    >
      <Segment id="a" d="M8,4 L36,4 L39,7 L36,10 L8,10 L5,7 Z" />

      <Segment id="b" d="M37,8 L40,11 L40,34 L37,37 L34,34 L34,11 Z" />

      <Segment id="c" d="M37,39 L40,42 L40,65 L37,68 L34,65 L34,42 Z" />

      <Segment id="d" d="M8,66 L36,66 L39,69 L36,72 L8,72 L5,69 Z" />

      <Segment id="e" d="M7,39 L10,42 L10,65 L7,68 L4,65 L4,42 Z" />

      <Segment id="f" d="M7,8 L10,11 L10,34 L7,37 L4,34 L4,11 Z" />

      <Segment id="g" d="M8,35 L36,35 L39,38 L36,41 L8,41 L5,38 Z" />
    </svg>
  );
};

const TimeUnit = ({
  value,
  label,
  small = false,
}: {
  value: string;
  label: string;
  small?: boolean;
}) => (
  <div className="flex flex-col items-center gap-2">
    <div className="flex gap-1">
      {value.split("").map((d, i) => (
        <SevenSegmentDigit key={i} digit={d} small={small} />
      ))}
    </div>
    <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
      {label}
    </span>
  </div>
);

export default Stopwatch;
