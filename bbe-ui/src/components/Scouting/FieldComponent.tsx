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

interface FieldAction {
    id: string;
    label: string;
    category: string;
    behavior_type: "instant" | "toggle" | "timer";
    placement: "side" | "field";
    x?: number;
    y?: number;
}

interface FieldComponentProps {
    fieldImage: string;
    drawingEnabled: boolean;
    actions: FieldAction[];
    value: {
        strokes: Stroke[];
        actions: ActionEvent[];
    };
    onChange: (val: { strokes: Stroke[]; actions: ActionEvent[] }) => void;
}

const FieldComponent: React.FC<FieldComponentProps> = ({
    fieldImage,
    drawingEnabled,
    actions,
    value,
    onChange,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentStroke, setCurrentStroke] = useState<StrokePoint[] | null>(null);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [activeToggles, setActiveToggles] = useState<Record<string, number>>({});
    const [activeTimers, setActiveTimers] = useState<Record<string, number>>({});

    // Initialize start time if not set - in a real app, this might be synced with a global timer
    const getTimestamp = () => {
        if (!startTime) {
            const now = Date.now();
            setStartTime(now);
            return 0;
        }
        return Date.now() - startTime;
    };

    const drawAll = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 3;

        const drawStroke = (stroke: StrokePoint[]) => {
            if (stroke.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(stroke[0].x * canvas.width, stroke[0].y * canvas.height);
            for (let i = 1; i < stroke.length; i++) {
                ctx.lineTo(stroke[i].x * canvas.width, stroke[i].y * canvas.height);
            }
            ctx.stroke();
        };

        ctx.strokeStyle = "#00eee4"; // Cyan accent
        value.strokes.forEach((s) => drawStroke(s.points));

        if (currentStroke) {
            ctx.strokeStyle = "#ffffff";
            drawStroke(currentStroke);
        }
    }, [value.strokes, currentStroke]);

    useEffect(() => {
        drawAll();
    }, [drawAll]);

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (!drawingEnabled) return;
        setIsDrawing(true);
        const pos = getPos(e);
        setCurrentStroke([pos]);
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !currentStroke) return;
        const pos = getPos(e);
        setCurrentStroke([...currentStroke, pos]);
    };

    const handleEnd = () => {
        if (!isDrawing || !currentStroke) return;
        setIsDrawing(false);
        onChange({
            ...value,
            strokes: [...value.strokes, { points: currentStroke, color: "#00eee4" }],
        });
        setCurrentStroke(null);
    };

    const getPos = (e: React.MouseEvent | React.TouchEvent): StrokePoint => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) / rect.width,
            y: (clientY - rect.top) / rect.height,
        };
    };

    const handleAction = (action: FieldAction) => {
        const t = getTimestamp();
        const newActions = [...value.actions];

        if (action.behavior_type === "instant") {
            newActions.push({
                button_id: action.id,
                label: action.label,
                category: action.category,
                t_ms: t,
                event_type: "instant",
            });
        } else if (action.behavior_type === "toggle") {
            if (activeToggles[action.id] !== undefined) {
                // Stop toggle
                newActions.push({
                    button_id: action.id,
                    label: action.label,
                    category: action.category,
                    t_ms: activeToggles[action.id],
                    end_t_ms: t,
                    event_type: "toggle",
                });
                const nextToggles = { ...activeToggles };
                delete nextToggles[action.id];
                setActiveToggles(nextToggles);
            } else {
                // Start toggle
                setActiveToggles({ ...activeToggles, [action.id]: t });
                return; // Don't trigger onChange yet for start
            }
        } else if (action.behavior_type === "timer") {
            if (activeTimers[action.id] !== undefined) {
                // Stop timer
                newActions.push({
                    button_id: action.id,
                    label: action.label,
                    category: action.category,
                    t_ms: activeTimers[action.id],
                    end_t_ms: t,
                    event_type: "timer",
                });
                const nextTimers = { ...activeTimers };
                delete nextTimers[action.id];
                setActiveTimers(nextTimers);
            } else {
                // Start timer
                setActiveTimers({ ...activeTimers, [action.id]: t });
                return;
            }
        }

        onChange({ ...value, actions: newActions });
    };

    const clearStrokes = () => {
        onChange({ ...value, strokes: [] });
    };

    const undoStroke = () => {
        onChange({ ...value, strokes: value.strokes.slice(0, -1) });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-background/50 p-3 rounded-xl border border-border">
                <div className="flex gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Status</span>
                        <span className="text-xs font-bold text-white">
                            {startTime ? `Recording (${Math.floor(getTimestamp() / 1000)}s)` : "Ready to Start"}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Events</span>
                        <span className="text-xs font-bold text-accent">{value.actions.length} recorded</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    {drawingEnabled && (
                        <>
                            <button
                                type="button"
                                onClick={undoStroke}
                                className="px-3 py-1 bg-background text-[10px] font-bold text-white border border-border rounded-lg hover:border-accent transition-all"
                            >
                                Undo Path
                            </button>
                            <button
                                type="button"
                                onClick={clearStrokes}
                                className="px-3 py-1 bg-red-500/10 text-[10px] font-bold text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                            >
                                Clear
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="relative w-full aspect-[2/1] bg-black rounded-2xl overflow-hidden border border-border shadow-2xl group">
                <img
                    src={fieldImage}
                    alt="Field Map"
                    className="absolute inset-0 w-full h-full object-contain opacity-60"
                />

                <canvas
                    ref={canvasRef}
                    width={1000}
                    height={500}
                    className={`absolute inset-0 w-full h-full ${drawingEnabled ? "cursor-crosshair" : "pointer-events-none"}`}
                    style={{ touchAction: "none" }}
                    onMouseDown={handleStart}
                    onMouseMove={handleMove}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={handleStart}
                    onTouchMove={handleMove}
                    onTouchEnd={handleEnd}
                />

                {/* On-field buttons */}
                {actions
                    .filter((a) => a.placement === "field")
                    .map((action) => (
                        <button
                            key={action.id}
                            type="button"
                            onClick={() => handleAction(action)}
                            style={{
                                left: `${(action.x || 0.5) * 100}%`,
                                top: `${(action.y || 0.5) * 100}%`,
                                transform: "translate(-50%, -50%)",
                            }}
                            className={`absolute px-3 py-1.5 rounded-full text-[10px] font-bold uppercase shadow-lg transition-all active:scale-95 ${activeToggles[action.id] || activeTimers[action.id]
                                ? "bg-accent text-background scale-110 ring-4 ring-accent/30"
                                : "bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20"
                                }`}
                        >
                            {action.label}
                            {(activeToggles[action.id] || activeTimers[action.id]) && (
                                <span className="ml-1 inline-block w-1.5 h-1.5 bg-background rounded-full animate-pulse" />
                            )}
                        </button>
                    ))}
            </div>

            {/* Side Actions Panel */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {actions
                    .filter((a) => a.placement === "side")
                    .map((action) => (
                        <button
                            key={action.id}
                            type="button"
                            onClick={() => handleAction(action)}
                            className={`px-4 py-3 rounded-xl font-bold text-xs uppercase transition-all shadow-lg border flex flex-col items-center gap-1 ${activeToggles[action.id] || activeTimers[action.id]
                                ? "bg-accent border-accent text-background"
                                : "bg-card border-border text-text-muted hover:border-accent hover:text-white"
                                }`}
                        >
                            <span className="opacity-70 text-[9px] tracking-widest">{action.category}</span>
                            {action.label}
                            {activeTimers[action.id] !== undefined && (
                                <span className="text-[10px] tabular-nums mt-1 font-mono">
                                    {((Date.now() - activeTimers[action.id]) / 1000).toFixed(1)}s
                                </span>
                            )}
                        </button>
                    ))}
            </div>
        </div>
    );
};

export default FieldComponent;
