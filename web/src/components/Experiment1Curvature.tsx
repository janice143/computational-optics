import React, { useState, useRef, useCallback, useEffect } from 'react';
import { waveCore } from '../physics/waveCore';

/**
 * Experiment 1: Why u_xx determines u_tt
 * Three draggable points show spatial curvature → temporal acceleration.
 */
const Exp1Curvature: React.FC = () => {
  const [points, setPoints] = useState([
    { y: 0.5 },
    { y: 1.0 },  // middle point (draggable)
    { y: 0.5 },
  ]);
  const [_u_xx, setU_xx] = useState(0);
  const [dragging, setDragging] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const dx = 0.2;

  // Compute u_xx from points
  const computeCurvature = useCallback(async (ys: number[]) => {
    if (!waveCore.isReady()) {
      // Fallback: compute directly in JS
      const u_xx_val = (ys[0] + ys[2] - 2 * ys[1]) / (dx * dx);
      setU_xx(u_xx_val);
      return;
    }
    try {
      const result = await waveCore.computeCurvature(ys, dx);
      setU_xx(result[1]); // u_xx at middle index
    } catch {
      const u_xx_val = (ys[0] + ys[2] - 2 * ys[1]) / (dx * dx);
      setU_xx(u_xx_val);
    }
  }, [dx]);

  useEffect(() => {
    computeCurvature(points.map(p => p.y));
  }, [points, computeCurvature]);

  // Drawing
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
    const padX = 60;
    const padY = 40;
    const plotW = W - padX * 2;
    const plotH = H - padY * 2;

    ctx.clearRect(0, 0, W, H);

    const ys = points.map(p => p.y);
    const yMin = -0.2, yMax = 2.0;
    const xCoords = [padX, padX + plotW / 2, padX + plotW];
    const cy = (yv: number) => padY + ((1 - (yv - yMin) / (yMax - yMin)) * plotH);

    // Axis
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, padY);
    ctx.lineTo(padX, padY + plotH);
    ctx.lineTo(padX + plotW, padY + plotH);
    ctx.stroke();

    // Curve (quadratic through 3 points)
    ctx.strokeStyle = '#4af';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 50; i++) {
      const t = i / 50;
      // Interpolate via Lagrange
      let yv = 0;
      for (let j = 0; j < 3; j++) {
        let L = 1;
        for (let k = 0; k < 3; k++) {
          if (k !== j) L *= (t - k / 2) / (j / 2 - k / 2);
        }
        yv += ys[j] * L;
      }
      const px = padX + t * plotW;
      const py = cy(yv);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Points
    xCoords.forEach((px, i) => {
      const py = cy(ys[i]);
      ctx.fillStyle = i === 1 ? '#fff' : '#4a9eff';
      ctx.beginPath();
      ctx.arc(px, py, i === 1 ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4af';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Labels
    ctx.fillStyle = '#888';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('xᵢ₋₁', xCoords[0], padY + plotH + 18);
    ctx.fillText('xᵢ', xCoords[1], padY + plotH + 18);
    ctx.fillText('xᵢ₊₁', xCoords[2], padY + plotH + 18);

    // u values
    ctx.textAlign = 'right';
    ctx.fillStyle = '#aaa';
    ys.forEach((yv, i) => {
      ctx.fillText(`u${i === 0 ? 'ᵢ₋₁' : i === 1 ? 'ᵢ' : 'ᵢ₊₁'} = ${yv.toFixed(2)}`, xCoords[i] - 10, cy(yv) - 10);
    });

  }, [points]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const padX = 60;
    const plotW = rect.width - padX * 2;
    const xCoords = [padX, padX + plotW / 2, padX + plotW];

    // Check if clicking near middle point
    const midX = xCoords[1];
    if (Math.abs(mx - midX) < 20) {
      setDragging(1);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragging === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const my = e.clientY - rect.top;
    const padY = 40;
    const plotH = rect.height - padY * 2;
    const yMin = -0.2, yMax = 2.0;
    const newY = yMin + (1 - (my - padY) / plotH) * (yMax - yMin);
    const clamped = Math.max(0, Math.min(yMax, newY));

    setPoints(prev => {
      const next = [...prev];
      next[1] = { y: clamped };
      return next;
    });
  };

  const handleMouseUp = () => setDragging(null);

  // Formula display
  const u_i = points[1].y;
  const u_im1 = points[0].y;
  const u_ip1 = points[2].y;
  const u_xx_val = (u_im1 + u_ip1 - 2 * u_i) / (dx * dx);

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: '16px', color: '#4af' }}>
        Experiment 1: Why u_xx → u_tt
      </h2>
      <p style={{ margin: '0 0 16px', color: '#888', fontSize: '13px' }}>
        Drag the middle point. Spatial curvature determines temporal acceleration.
      </p>

      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '200px', cursor: dragging !== null ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#1a1d27',
        borderRadius: '6px',
        fontFamily: 'monospace',
        fontSize: '13px',
      }}>
        <div style={{ color: '#888' }}>Second spatial derivative (curvature):</div>
        <div style={{ color: '#e0e0e0', margin: '6px 0' }}>
          u_xx ≈ (u<sub>i-1</sub> + u<sub>i+1</sub> - 2u<sub>i</sub>) / Δx²
        </div>
        <div style={{ color: '#4a9eff' }}>
          = ({u_im1.toFixed(2)} + {u_ip1.toFixed(2)} - 2×{u_i.toFixed(2)}) / {dx}²
          = <strong>{u_xx_val.toFixed(3)}</strong>
        </div>

        <div style={{ color: '#888', marginTop: '12px' }}>Wave equation:</div>
        <div style={{ color: '#e0e0e0' }}>
          u_tt = v² · u_xx = v² · <strong style={{ color: u_xx_val < 0 ? '#ff9a4a' : '#4af' }}>{u_xx_val.toFixed(3)}</strong>
        </div>

        {u_xx_val < -0.01 && (
          <div style={{ marginTop: '8px', color: '#ff9a4a', fontSize: '12px' }}>
            ↓ Negative curvature → downward acceleration (peak sinks)
          </div>
        )}
        {u_xx_val > 0.01 && (
          <div style={{ marginTop: '8px', color: '#4af', fontSize: '12px' }}>
            ↑ Positive curvature → upward acceleration (trough rises)
          </div>
        )}
        {Math.abs(u_xx_val) <= 0.01 && (
          <div style={{ marginTop: '8px', color: '#888', fontSize: '12px' }}>
            ≈ Flat — no acceleration
          </div>
        )}
      </div>
    </div>
  );
};

export default Exp1Curvature;
