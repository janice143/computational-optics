import React, { useRef, useEffect } from 'react';

interface WaveCanvasProps {
  /** Current u values (1D array) */
  u: number[];
  /** x grid values */
  x: number[];
  /** Currently highlighted index for step-by-step display */
  highlightIdx?: number;
  /** u values from previous time step (for step-by-step display) */
  uPrev?: number[];
  /** u values from next time step (for step-by-step display) */
  uNext?: number[];
  /** Pre-computed global u bound for stable y-axis scaling (all frames) */
  globalUMax?: number;
  /** Label shown top-left */
  label?: string;
  /** Height of the canvas */
  height?: number;
}

const WaveCanvas: React.FC<WaveCanvasProps> = ({
  u,
  x,
  highlightIdx,
  uPrev,
  uNext,
  globalUMax,
  label,
  height = 300,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;

    ctx.clearRect(0, 0, W, H);

    if (u.length === 0) return;

    const xMin = x[0];
    const xMax = x[x.length - 1];
    // Use pre-computed global max for stable y-axis across frames
    const uAbsMax = globalUMax ?? Math.max(0.01, Math.max(...u.map(Math.abs)));

    const padX = 44;
    const padY = 28;
    const plotW = W - padX * 2;
    const plotH = H - padY * 2;
    const cx = (xVal: number) => padX + ((xVal - xMin) / (xMax - xMin)) * plotW;
    const cy = (uVal: number) => padY + ((1 - (uVal + uAbsMax) / (2 * uAbsMax)) * plotH);

    // Clip to plot area
    ctx.save();
    ctx.beginPath();
    ctx.rect(padX, padY, plotW, plotH);
    ctx.clip();

    // Zero line
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padX, cy(0));
    ctx.lineTo(padX + plotW, cy(0));
    ctx.stroke();
    ctx.setLineDash([]);

    const drawCurve = (values: number[], color: string, lineWidth: number, alpha = 1) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (let i = 0; i < values.length; i++) {
        const px = cx(x[i]);
        const py = cy(values[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    if (uPrev) drawCurve(uPrev, '#4a9eff', 1.5, 0.3);
    if (uNext) drawCurve(uNext, '#ff9a4a', 1.5, 0.3);
    drawCurve(u, '#4af', 2.5);

    // Highlight point (fixed spatial index)
    if (highlightIdx !== undefined && highlightIdx >= 0 && highlightIdx < u.length) {
      const px = cx(x[highlightIdx]);
      const py = cy(u[highlightIdx]);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f0f';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Vertical indicator line from point to zero
      ctx.strokeStyle = '#f0f';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, cy(0));
      ctx.stroke();
      ctx.setLineDash([]);

      if (highlightIdx > 0) {
        const p0x = cx(x[highlightIdx - 1]);
        const p0y = cy(u[highlightIdx - 1]);
        ctx.fillStyle = '#4a9eff';
        ctx.beginPath();
        ctx.arc(p0x, p0y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (highlightIdx < u.length - 1) {
        const p2x = cx(x[highlightIdx + 1]);
        const p2y = cy(u[highlightIdx + 1]);
        ctx.fillStyle = '#4a9eff';
        ctx.beginPath();
        ctx.arc(p2x, p2y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // Plot border
    ctx.strokeStyle = '#2a2a3a';
    ctx.lineWidth = 1;
    ctx.strokeRect(padX, padY, plotW, plotH);

    // X axis
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, H - padY);
    ctx.lineTo(padX + plotW, H - padY);
    ctx.stroke();

    // X labels
    ctx.fillStyle = '#666';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    const xTicks = 5;
    for (let i = 0; i <= xTicks; i++) {
      const xv = xMin + (i / xTicks) * (xMax - xMin);
      ctx.fillText(xv.toFixed(1), cx(xv), H - 6);
    }

    // Y labels
    ctx.textAlign = 'right';
    ctx.fillStyle = '#555';
    ctx.fillText(`+${uAbsMax.toFixed(2)}`, padX - 5, padY + 6);
    ctx.fillText(`-${uAbsMax.toFixed(2)}`, padX - 5, H - padY + 5);
    ctx.fillText('0', padX - 5, cy(0) + 4);

    // Optional label (e.g. pulse type)
    if (label) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#555';
      ctx.font = '10px system-ui';
      ctx.fillText(label, padX + 4, padY + 12);
    }
  }, [u, x, highlightIdx, uPrev, uNext, globalUMax, label, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: `${height}px`, display: 'block' }}
    />
  );
};

export default WaveCanvas;
