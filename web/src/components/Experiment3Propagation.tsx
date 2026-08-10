import React, { useState, useEffect, useRef, useCallback } from 'react';
import { waveCore, SimulateParams, SimulateResult } from '../physics/waveCore';
import WaveCanvas from './WaveCanvas';
import XtDiagram from './XtDiagram';

const X = 120;
const SPATIAL_DOMAIN = 6.0;
const dx = SPATIAL_DOMAIN / (X - 1);
const x = Array.from({ length: X }, (_, i) => -SPATIAL_DOMAIN / 2 + i * dx);

/**
 * Experiment 3: Gaussian pulse propagation.
 * Real-time animation with parameter sliders.
 */
const Exp3Propagation: React.FC = () => {
  const [params, setParams] = useState({
    v: 1.0, dt: 0.02, sigma: 0.4, amplitude: 1.0, shape: 'gaussian',
  });
  const [result, setResult] = useState<SimulateResult | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<number | null>(null);

  const runSimulation = useCallback(async () => {
    setLoading(true);
    try {
      const simParams: SimulateParams = {
        x, v: params.v, dx, dt: params.dt, steps: 300,
        shape: params.shape, center: -2.0, sigma: params.sigma,
        width: 0.5, k: 10, amplitude: params.amplitude,
      };
      const res = await waveCore.simulate(simParams);
      setResult(res);
      setFrameIdx(0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [x, params]);

  useEffect(() => { runSimulation(); }, [runSimulation]);

  useEffect(() => {
    if (playing && result && frameIdx < result.frames.length - 1) {
      timerRef.current = window.setTimeout(() => {
        setFrameIdx(i => i + 1);
      }, 16);
    } else {
      setPlaying(false);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, result, frameIdx]);

  const C = result?.C ?? 0;
  const Cstable = C <= 1;
  const t = result?.times[frameIdx] ?? 0;
  const uNow = result?.frames[frameIdx] ?? [];

  const cflColor = Cstable ? '#4af' : C < 1.2 ? '#f0a' : '#f44';

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: '16px', color: '#4af' }}>
        Experiment 3: Wave Propagation
      </h2>
      <p style={{ margin: '0 0 12px', color: '#888', fontSize: '13px' }}>
        Adjust wave speed, time step, and pulse shape. Watch the pulse travel.
      </p>

      {/* Sliders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        {[
          { label: 'Wave speed v', min: 0.1, max: 3, key: 'v' as const },
          { label: 'Δt', min: 0.001, max: 0.05, key: 'dt' as const },
          { label: 'Sigma σ', min: 0.1, max: 1.5, key: 'sigma' as const },
          { label: 'Amplitude', min: 0.2, max: 2, key: 'amplitude' as const },
        ].map(({ label, min, max, key }) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <label style={{ fontSize: '11px', color: '#888' }}>{label}: <strong style={{ color: '#e0e0e0' }}>
              {params[key] >= 0.001 ? params[key].toFixed(3) : params[key].toExponential(2)}
            </strong></label>
            <input
              type="range" min={min} max={max} step={(max - min) / 200}
              value={params[key]}
              onChange={e => setParams(p => ({ ...p, [key]: parseFloat(e.target.value) }))}
              style={{ width: '100%' }}
            />
          </div>
        ))}
      </div>

      {/* Shape selector */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {(['gaussian', 'triangle', 'square', 'sin'] as const).map(s => (
          <button
            key={s}
            onClick={() => setParams(p => ({ ...p, shape: s }))}
            style={{
              padding: '4px 10px',
              background: params.shape === s ? '#1e2a3a' : 'transparent',
              color: params.shape === s ? '#4af' : '#666',
              border: `1px solid ${params.shape === s ? '#4af' : '#333'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* CFL indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '8px 12px', background: '#1a1d27', borderRadius: '6px', marginBottom: '12px',
      }}>
        <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#888' }}>
          C = v·Δt/Δx = <span style={{ color: cflColor }}>{C.toFixed(4)}</span>
        </span>
        <span style={{
          padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
          background: Cstable ? '#0d1f1a' : '#1f0d0d',
          color: Cstable ? '#4f8' : '#f44',
        }}>
          {Cstable ? '✓ Stable' : '✗ Unstable'}
        </span>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Loading Pyodide...</div>
      ) : result ? (
        <>
          <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>
            t = {t.toFixed(3)} · frame {frameIdx + 1}/{result.frames.length}
          </div>
          <WaveCanvas u={uNow} x={x} height={200} />

          <div style={{ display: 'flex', gap: '8px', margin: '12px 0', justifyContent: 'center' }}>
            <button onClick={() => setFrameIdx(i => Math.max(0, i - 1))} disabled={frameIdx === 0} style={btnStyle(false)}>◀</button>
            <button onClick={() => setPlaying(p => !p)} disabled={frameIdx >= result.frames.length - 1} style={btnStyle(false)}>
              {playing ? '⏸' : '▶'}
            </button>
            <button onClick={() => setFrameIdx(i => Math.min(result.frames.length - 1, i + 1))} disabled={frameIdx >= result.frames.length - 1} style={btnStyle(false)}>▶</button>
            <button onClick={runSimulation} style={btnStyle(true)}>Re-run</button>
          </div>

          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Space-Time Diagram (x-t):</div>
            <XtDiagram frames={result.frames} times={result.times} x={x} height={160} />
            <div style={{ fontSize: '11px', color: '#555', textAlign: 'center' }}>
              A propagating pulse traces a diagonal line in x-t space.
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

const btnStyle = (primary: boolean) => ({
  padding: '6px 14px',
  background: primary ? '#1e2a3a' : '#161a24',
  color: '#4af',
  border: `1px solid ${primary ? '#4af' : '#333'}`,
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '13px',
});

export default Exp3Propagation;
