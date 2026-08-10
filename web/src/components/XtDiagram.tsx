import React, { useRef, useEffect } from 'react';

interface XtDiagramProps {
  /** 2D array: frames[time][space] */
  frames: number[][];
  times: number[];
  x: number[];
  height?: number;
}

const XtDiagram: React.FC<XtDiagramProps> = ({ frames, times, x, height = 200 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const N = frames[0].length;
    const T = frames.length;

    const padX = 40;
    const padY = 30;
    const plotW = W - padX * 2;
    const plotH = H - padY * 2;

    // Gather global min/max for color scaling
    let uMin = Infinity, uMax = -Infinity;
    for (const frame of frames) {
      for (const v of frame) {
        if (v < uMin) uMin = v;
        if (v > uMax) uMax = v;
      }
    }
    const uAbs = Math.max(Math.abs(uMin), Math.abs(uMax), 0.01);

    // Color map: blue (negative) → black (zero) → yellow (positive)
    const color = (v: number) => {
      const t = (v + uAbs) / (2 * uAbs); // 0..1
      if (t < 0.5) {
        const s = t / 0.5;
        return `rgb(${Math.round(s * 74)}, ${Math.round(s * 158)})`;
      } else {
        const s = (t - 0.5) / 0.5;
        return `rgb(255, ${Math.round((1 - s) * 154)}, ${Math.round((1 - s) * 74)})`;
      }
    };

    const cx = (xi: number) => padX + (xi / (N - 1)) * plotW;
    const cy = (ti: number) => padY + (ti / (T - 1)) * plotH;

    ctx.clearRect(0, 0, W, H);

    // Draw pixel grid
    const pixelW = plotW / (N - 1);
    const pixelH = plotH / (T - 1);

    for (let ti = 0; ti < T; ti++) {
      for (let xi = 0; xi < N; xi++) {
        ctx.fillStyle = color(frames[ti][xi]);
        ctx.fillRect(
          cx(xi) - pixelW / 2,
          cy(ti) - pixelH / 2,
          pixelW + 0.5,
          pixelH + 0.5
        );
      }
    }

    // Border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(padX, padY, plotW, plotH);

    // X axis labels
    ctx.fillStyle = '#888';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(x[0].toFixed(1), padX, H - 5);
    ctx.fillText(x[N - 1].toFixed(1), padX + plotW, H - 5);
    ctx.fillText('x', padX + plotW / 2, H - 5);

    // Y axis label
    ctx.save();
    ctx.translate(10, padY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('t', 0, 0);
    ctx.restore();

    // Time ticks
    ctx.fillStyle = '#666';
    ctx.textAlign = 'right';
    ctx.fillText(times[0].toFixed(2), padX - 5, padY + 4);
    ctx.fillText(times[T - 1].toFixed(2), padX - 5, padY + plotH + 4);

  }, [frames, times, x, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: `${height}px`, display: 'block' }}
    />
  );
};

export default XtDiagram;
