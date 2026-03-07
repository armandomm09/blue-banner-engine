import React, { useRef, useEffect, useState, useCallback } from "react";

interface StrokePoint {
    x: number;
    y: number;
}

interface Stroke {
    points: StrokePoint[];
    color: string;
}

interface ActionEvent {
    button_id: string;
    label: string;
    category: string;
    t_ms: number;
    end_t_ms?: number;
    event_type: "instant" | "toggle" | "timer";
}

interface FieldPlaybackProps {
    fieldImage: string;
    strokes: Stroke[];
    actions: ActionEvent[];
    durationMs?: number;
}

const FieldPlayback: React.FC<FieldPlaybackProps> = ({
    fieldImage,
    strokes,
    actions,
    durationMs = 15000, // Default to 15s auto period
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        let animationId: number;
        if (isPlaying) {
            const start = Date.now() - currentTime;
            const animate = () => {
                const now = Date.now() - start;
                if (now >= durationMs) {
                    setCurrentTime(durationMs);
                    setIsPlaying(false);
                } else {
                    setCurrentTime(now);
                    animationId = requestAnimationFrame(animate);
                }
            };
            animationId = requestAnimationFrame(animate);
        }
        return () => cancelAnimationFrame(animationId);
    }, [isPlaying, durationMs]);

    const drawAll = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 3;

        // Draw paths that occurred up to currentTime
        // Since we didn't store t_ms per point (simplified in FieldComponent),
        // we interpolate based on the index if needed, or just show full paths for now.
        // Let's assume strokes were drawn during the 'auto' period and just show them.
        // Ideally we should have timestamps per point for true playback.

        ctx.strokeStyle = "#00eee4";
        strokes.forEach((s) => {
            if (s.points.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(s.points[0].x * canvas.width, s.points[0].y * canvas.height);
            for (let i = 1; i < s.points.length; i++) {
                ctx.lineTo(s.points[i].x * canvas.width, s.points[i].y * canvas.height);
            }
            ctx.stroke();
        });
    }, [strokes, currentTime]);

    useEffect(() => {
        drawAll();
    }, [drawAll]);

    const activeActions = actions.filter((a) => {
        if (a.event_type === "instant") {
            return Math.abs(currentTime - a.t_ms) < 500; // Show for 500ms
        }
        return currentTime >= a.t_ms && (a.end_t_ms === undefined || currentTime <= a.end_t_ms);
    });

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-background/50 p-4 rounded-xl border border-border">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-10 h-10 flex items-center justify-center bg-accent text-background rounded-full hover:scale-105 transition-all"
                    >
                        {isPlaying ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                    </button>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Playback Time</span>
                        <span className="text-sm font-mono text-white">{(currentTime / 1000).toFixed(1)}s / {(durationMs / 1000).toFixed(1)}s</span>
                    </div>
                </div>

                <input
                    type="range"
                    min="0"
                    max={durationMs}
                    value={currentTime}
                    onChange={(e) => setCurrentTime(parseInt(e.target.value))}
                    className="flex-1 mx-8 accent-accent"
                />
            </div>

            <div className="relative w-full aspect-[2/1] bg-black rounded-2xl overflow-hidden border border-border">
                <img
                    src={fieldImage}
                    alt="Field Map"
                    className="absolute inset-0 w-full h-full object-contain opacity-40"
                />
                <canvas
                    ref={canvasRef}
                    width={1000}
                    height={500}
                    className="absolute inset-0 w-full h-full"
                />

                {/* Action log on playback */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-none">
                    {activeActions.map((a, i) => (
                        <div key={i} className="px-3 py-1 bg-accent/90 text-background text-[10px] font-bold rounded-lg animate-bounce uppercase">
                            {a.label}
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-4">
                    <h3 className="text-xs font-bold text-text-muted uppercase mb-4 tracking-widest">Action Timeline</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {actions.sort((a, b) => a.t_ms - b.t_ms).map((a, i) => (
                            <div
                                key={i}
                                className={`flex justify-between items-center p-2 rounded-lg text-xs border ${currentTime >= a.t_ms && (a.end_t_ms === undefined || currentTime <= a.end_t_ms)
                                        ? "bg-accent/10 border-accent/30 text-white"
                                        : "bg-background/20 border-border/50 text-text-muted"
                                    }`}
                            >
                                <span>{a.label}</span>
                                <span className="font-mono">{(a.t_ms / 1000).toFixed(1)}s {a.end_t_ms ? `- ${(a.end_t_ms / 1000).toFixed(1)}s` : ''}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FieldPlayback;
