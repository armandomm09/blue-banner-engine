import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import type {
  CanvasData,
  Stroke,
  StrokePoint,
  SplinePath,
  SplinePoint,
  Annotation,
  StrategyRobot,
  ToolMode,
  PathConflict,
  FieldZone,
} from "../../types/strategy";

interface StrategyCanvasProps {
  fieldImage: string;
  canvasData: CanvasData;
  activeTool: ToolMode;
  drawColor: string;
  drawWidth: number;
  conflicts: PathConflict[];
  zones: FieldZone[];
  showZones: boolean;
  onCanvasChange: (data: CanvasData) => void;
  onRobotContextMenu: (robot: StrategyRobot, x: number, y: number) => void;
  onRobotSelect: (robot: StrategyRobot | null) => void;
  animatedRobotPositions?: Record<string, { x: number; y: number }>;
  robotForSplineId?: string | null;
}

const StrategyCanvas: React.FC<StrategyCanvasProps> = ({
  fieldImage,
  canvasData,
  activeTool,
  drawColor,
  drawWidth,
  conflicts,
  zones,
  showZones,
  onCanvasChange,
  onRobotContextMenu,
  onRobotSelect,
  animatedRobotPositions = {},
  robotForSplineId = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<StrokePoint[] | null>(
    null
  );
  const [currentSplinePoints, setCurrentSplinePoints] = useState<
    SplinePoint[]
  >([]);

  // Dragging state
  const [draggingRobotId, setDraggingRobotId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Annotation state
  const [pendingAnnotation, setPendingAnnotation] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [annotationText, setAnnotationText] = useState("");

  const CANVAS_W = 1200;
  const CANVAS_H = 600;

  // ============================================================
  // Helper: get normalized position from mouse/touch event
  // ============================================================
  const getPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): StrokePoint => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? (e as TouchEvent).touches[0]?.clientX ?? (e as TouchEvent).changedTouches[0]?.clientX : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? (e as TouchEvent).touches[0]?.clientY ?? (e as TouchEvent).changedTouches[0]?.clientY : (e as MouseEvent).clientY;
      return {
        x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
      };
    },
    []
  );

  // ============================================================
  // Snap to zone
  // ============================================================
  const snapToZone = useCallback(
    (x: number, y: number): { x: number; y: number } => {
      if (!showZones) return { x, y };
      const SNAP_DIST = 0.04;
      for (const zone of zones) {
        const cx = zone.x + zone.width / 2;
        const cy = zone.y + zone.height / 2;
        const dx = Math.abs(x - cx);
        const dy = Math.abs(y - cy);
        if (dx < SNAP_DIST && dy < SNAP_DIST) {
          return { x: cx, y: cy };
        }
      }
      return { x, y };
    },
    [zones, showZones]
  );

  // ============================================================
  // Find robot at position
  // ============================================================
  const findRobotAt = useCallback(
    (pos: StrokePoint): StrategyRobot | null => {
      const ROBOT_RADIUS = 0.025;
      for (let i = canvasData.robots.length - 1; i >= 0; i--) {
        const r = canvasData.robots[i];
        const dx = pos.x - r.x;
        const dy = pos.y - r.y;
        if (Math.sqrt(dx * dx + dy * dy) <= ROBOT_RADIUS) {
          return r;
        }
      }
      return null;
    },
    [canvasData.robots]
  );

  // ============================================================
  // Drawing: render everything
  // ============================================================
  const drawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw zones
    if (showZones) {
      zones.forEach((zone) => {
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(
          zone.x * CANVAS_W,
          zone.y * CANVAS_H,
          zone.width * CANVAS_W,
          zone.height * CANVAS_H
        );
        ctx.fill();
        ctx.stroke();
        // Label
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.font = "10px sans-serif";
        ctx.fillText(
          zone.label,
          (zone.x + 0.005) * CANVAS_W,
          (zone.y + 0.03) * CANVAS_H
        );
      });
    }

    // Draw strokes
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    canvasData.strokes.forEach((s) => {
      if (s.points.length < 2) return;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x * CANVAS_W, s.points[0].y * CANVAS_H);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x * CANVAS_W, s.points[i].y * CANVAS_H);
      }
      ctx.stroke();
    });

    // Draw current stroke in progress
    if (currentStroke && currentStroke.length >= 2) {
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawWidth;
      ctx.beginPath();
      ctx.moveTo(
        currentStroke[0].x * CANVAS_W,
        currentStroke[0].y * CANVAS_H
      );
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(
          currentStroke[i].x * CANVAS_W,
          currentStroke[i].y * CANVAS_H
        );
      }
      ctx.stroke();
    }

    // Draw splines
    canvasData.splines.forEach((sp) => {
      if (sp.points.length < 2) return;
      ctx.strokeStyle = sp.color;
      ctx.lineWidth = sp.width;
      ctx.beginPath();
      ctx.moveTo(sp.points[0].x * CANVAS_W, sp.points[0].y * CANVAS_H);
      for (let i = 1; i < sp.points.length; i++) {
        const prev = sp.points[i - 1];
        const curr = sp.points[i];
        const cp1x = (prev.cp2x ?? prev.x) * CANVAS_W;
        const cp1y = (prev.cp2y ?? prev.y) * CANVAS_H;
        const cp2x = (curr.cp1x ?? curr.x) * CANVAS_W;
        const cp2y = (curr.cp1y ?? curr.y) * CANVAS_H;
        ctx.bezierCurveTo(
          cp1x,
          cp1y,
          cp2x,
          cp2y,
          curr.x * CANVAS_W,
          curr.y * CANVAS_H
        );
      }
      ctx.stroke();

      // Arrow at end
      if (sp.showArrow && sp.points.length >= 2) {
        const last = sp.points[sp.points.length - 1];
        const prev = sp.points[sp.points.length - 2];
        const angle = Math.atan2(
          (last.y - prev.y) * CANVAS_H,
          (last.x - prev.x) * CANVAS_W
        );
        const tipX = last.x * CANVAS_W;
        const tipY = last.y * CANVAS_H;
        const arrowLen = 12;
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(
          tipX - arrowLen * Math.cos(angle - Math.PI / 6),
          tipY - arrowLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          tipX - arrowLen * Math.cos(angle + Math.PI / 6),
          tipY - arrowLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }

      // Control point handles
      sp.points.forEach((pt) => {
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath();
        ctx.arc(pt.x * CANVAS_W, pt.y * CANVAS_H, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // Draw spline in progress
    if (currentSplinePoints.length > 0) {
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawWidth;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(
        currentSplinePoints[0].x * CANVAS_W,
        currentSplinePoints[0].y * CANVAS_H
      );
      for (let i = 1; i < currentSplinePoints.length; i++) {
        ctx.lineTo(
          currentSplinePoints[i].x * CANVAS_W,
          currentSplinePoints[i].y * CANVAS_H
        );
      }
      ctx.stroke();
      ctx.setLineDash([]);

      currentSplinePoints.forEach((pt) => {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(pt.x * CANVAS_W, pt.y * CANVAS_H, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw annotations
    canvasData.annotations.forEach((ann) => {
      ctx.fillStyle = ann.color;
      ctx.font = `bold ${ann.fontSize}px sans-serif`;
      ctx.fillText(ann.text, ann.x * CANVAS_W, ann.y * CANVAS_H);
    });

    // Draw robots
    canvasData.robots.forEach((robot) => {
      // Use animated position if available
      const animatedPos = animatedRobotPositions[robot.id];
      const posX = animatedPos ? animatedPos.x : robot.x;
      const posY = animatedPos ? animatedPos.y : robot.y;

      const rx = posX * CANVAS_W;
      const ry = posY * CANVAS_H;
      const radius = 22;

      // Glow if highlighted
      if (robot.highlighted) {
        ctx.shadowColor = robot.alliance === "red" ? "#ff4444" : "#4488ff";
        ctx.shadowBlur = 16;
      }

      // Circle
      ctx.fillStyle =
        robot.alliance === "red"
          ? "rgba(220, 60, 60, 0.9)"
          : "rgba(60, 100, 220, 0.9)";
      ctx.strokeStyle =
        robot.alliance === "red"
          ? "rgba(255, 100, 100, 0.8)"
          : "rgba(100, 150, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rx, ry, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      // Team number
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(robot.teamNumber), rx, ry);

      // Role badge
      if (robot.role !== "none") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.font = "bold 8px sans-serif";
        ctx.fillText(robot.role.toUpperCase(), rx, ry + radius + 10);
      }

      // Lock indicator
      if (robot.locked) {
        ctx.fillStyle = "#fbbf24";
        ctx.font = "10px sans-serif";
        ctx.fillText("🔒", rx + radius + 4, ry - radius);
      }

      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    });

    // Draw conflict indicators
    conflicts.forEach((c) => {
      const cx = c.intersectionX * CANVAS_W;
      const cy = c.intersectionY * CANVAS_H;
      ctx.strokeStyle = "#ff4444";
      ctx.lineWidth = 2;
      ctx.fillStyle = "rgba(255,0,0,0.2)";
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ff4444";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⚠", cx, cy + 5);
      ctx.textAlign = "start";
    });
  }, [
    canvasData,
    currentStroke,
    currentSplinePoints,
    drawColor,
    drawWidth,
    conflicts,
    zones,
    showZones,
    animatedRobotPositions,
  ]);

  useEffect(() => {
    drawAll();
  }, [drawAll]);

  // ============================================================
  // Mouse handlers
  // ============================================================
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getPos(e);

      if (activeTool === "select") {
        const robot = findRobotAt(pos);
        if (robot && !robot.locked) {
          setDraggingRobotId(robot.id);
          setDragOffset({ x: pos.x - robot.x, y: pos.y - robot.y });
          onRobotSelect(robot);
        } else {
          onRobotSelect(null);
        }
        return;
      }

      if (activeTool === "draw" || activeTool === "arrow") {
        setIsDrawing(true);
        setCurrentStroke([pos]);
        return;
      }

      if (activeTool === "erase") {
        // Erase strokes near click
        const ERASE_RADIUS = 0.03;
        const newStrokes = canvasData.strokes.filter((s) =>
          !s.points.some(
            (p) =>
              Math.abs(p.x - pos.x) < ERASE_RADIUS &&
              Math.abs(p.y - pos.y) < ERASE_RADIUS
          )
        );
        const newSplines = canvasData.splines.filter((sp) =>
          !sp.points.some(
            (p) =>
              Math.abs(p.x - pos.x) < ERASE_RADIUS &&
              Math.abs(p.y - pos.y) < ERASE_RADIUS
          )
        );
        const newAnnotations = canvasData.annotations.filter(
          (a) =>
            Math.abs(a.x - pos.x) > ERASE_RADIUS ||
            Math.abs(a.y - pos.y) > ERASE_RADIUS
        );
        onCanvasChange({
          ...canvasData,
          strokes: newStrokes,
          splines: newSplines,
          annotations: newAnnotations,
        });
        return;
      }

      if (activeTool === "text") {
        setPendingAnnotation(pos);
        setAnnotationText("");
        return;
      }

      if (activeTool === "spline" || activeTool === "robot_spline") {
        setCurrentSplinePoints((prev) => [...prev, { x: pos.x, y: pos.y }]);
        return;
      }
    },
    [activeTool, canvasData, findRobotAt, getPos, onCanvasChange, onRobotSelect]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool === "select" && draggingRobotId) {
        const pos = getPos(e);
        const snapped = snapToZone(pos.x - dragOffset.x, pos.y - dragOffset.y);
        const newRobots = canvasData.robots.map((r) =>
          r.id === draggingRobotId ? { ...r, x: snapped.x, y: snapped.y } : r
        );
        onCanvasChange({ ...canvasData, robots: newRobots });
        return;
      }

      if (isDrawing && currentStroke) {
        const pos = getPos(e);
        setCurrentStroke((prev) => (prev ? [...prev, pos] : null));
      }
    },
    [
      activeTool,
      draggingRobotId,
      isDrawing,
      currentStroke,
      canvasData,
      getPos,
      snapToZone,
      dragOffset,
      onCanvasChange,
    ]
  );

  const handleMouseUp = useCallback(() => {
    if (draggingRobotId) {
      setDraggingRobotId(null);
      return;
    }

    if (isDrawing && currentStroke && currentStroke.length >= 2) {
      const newStroke: Stroke = {
        id: crypto.randomUUID(),
        points: currentStroke,
        color: drawColor,
        width: drawWidth,
      };
      onCanvasChange({
        ...canvasData,
        strokes: [...canvasData.strokes, newStroke],
      });
    }
    setIsDrawing(false);
    setCurrentStroke(null);
  }, [
    draggingRobotId,
    isDrawing,
    currentStroke,
    canvasData,
    drawColor,
    drawWidth,
    onCanvasChange,
  ]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const pos = getPos(e);
      const robot = findRobotAt(pos);
      if (robot) {
        onRobotContextMenu(robot, e.clientX, e.clientY);
      }
    },
    [findRobotAt, getPos, onRobotContextMenu]
  );

  // Double-click to finalize spline
  const handleDoubleClick = useCallback(() => {
    if ((activeTool === "spline" || activeTool === "robot_spline") && currentSplinePoints.length >= 2) {
      // Generate smooth control points
      const points: SplinePoint[] = currentSplinePoints.map((pt, i, arr) => {
        if (i === 0 || i === arr.length - 1) return pt;
        const prev = arr[i - 1];
        const next = arr[i + 1];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        return {
          ...pt,
          cp1x: pt.x - dx * 0.25,
          cp1y: pt.y - dy * 0.25,
          cp2x: pt.x + dx * 0.25,
          cp2y: pt.y + dy * 0.25,
        };
      });

      const newSpline: SplinePath = {
        id: crypto.randomUUID(),
        points,
        color: drawColor,
        width: drawWidth,
        showArrow: true,
        ...(activeTool === "robot_spline" && robotForSplineId ? { linkedRobotId: robotForSplineId } : {}),
      };
      onCanvasChange({
        ...canvasData,
        splines: [...canvasData.splines, newSpline],
      });
      setCurrentSplinePoints([]);
    }
  }, [
    activeTool,
    currentSplinePoints,
    canvasData,
    drawColor,
    drawWidth,
    onCanvasChange,
    robotForSplineId,
  ]);

  // Submit annotation
  const submitAnnotation = useCallback(() => {
    if (pendingAnnotation && annotationText.trim()) {
      const newAnnotation: Annotation = {
        id: crypto.randomUUID(),
        x: pendingAnnotation.x,
        y: pendingAnnotation.y,
        text: annotationText.trim(),
        color: drawColor,
        fontSize: 14,
      };
      onCanvasChange({
        ...canvasData,
        annotations: [...canvasData.annotations, newAnnotation],
      });
    }
    setPendingAnnotation(null);
    setAnnotationText("");
  }, [pendingAnnotation, annotationText, canvasData, drawColor, onCanvasChange]);

  // Cursor style
  const cursor = useMemo(() => {
    switch (activeTool) {
      case "draw":
      case "arrow":
        return "crosshair";
      case "erase":
        return "not-allowed";
      case "text":
        return "text";
      case "spline":
        return "crosshair";
      case "select":
        return draggingRobotId ? "grabbing" : "grab";
      default:
        return "default";
    }
  }, [activeTool, draggingRobotId]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative w-full aspect-[2/1] bg-black rounded-2xl overflow-hidden border border-border shadow-2xl">
        <img
          src={fieldImage}
          alt="FRC Field"
          className="absolute inset-0 w-full h-full object-contain opacity-60"
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="absolute inset-0 w-full h-full"
          style={{ cursor, touchAction: "none" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={handleContextMenu}
          onDoubleClick={handleDoubleClick}
        />

        {/* Annotation input overlay */}
        {pendingAnnotation && (
          <div
            className="absolute z-20"
            style={{
              left: `${pendingAnnotation.x * 100}%`,
              top: `${pendingAnnotation.y * 100}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="bg-card border border-border rounded-lg shadow-xl p-2 flex gap-2">
              <input
                type="text"
                value={annotationText}
                onChange={(e) => setAnnotationText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitAnnotation();
                  if (e.key === "Escape") setPendingAnnotation(null);
                }}
                placeholder="Type annotation..."
                className="bg-background border border-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-accent w-40"
                autoFocus
              />
              <button
                onClick={submitAnnotation}
                className="px-2 py-1 bg-accent text-background text-xs font-bold rounded hover:bg-accent/80 transition-all"
              >
                ✓
              </button>
              <button
                onClick={() => setPendingAnnotation(null)}
                className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded hover:bg-red-500/40 transition-all"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(StrategyCanvas);
