import React, { useState, useEffect, useRef, useCallback } from 'react';
import { waveCore, SimulateParams, SimulateResult } from '../physics/waveCore';
import WaveCanvas from './WaveCanvas';

/**
 * Experiment 4: CFL instability — let it explode.
 * Same as Exp 3 but encourages user to push C > 1.
 */
const X = 100;
const SPATIAL_DOMAIN = 4.0;
const dx = SPATIAL_DOMAIN / (X - 1);
const x = Array.from({ length: X }, (_, i) => -SPATIAL_DOMAIN / 2 + i * dx);

const Exp4Stability: React.FC = () => {
  const [params, setParams] = useState({
    v: 1.0, dt: 0.035, sigma: 0.4, amplitude: 1.0, shape: 'gaussian',
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
        x, v: params.v, dx, dt: params.dt, steps: 400,
        shape: params.shape, center: -1.0, sigma: params.sigma,
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
      }, 40);
    } else {
      setPlaying(false);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, result, frameIdx]);

  const C = result?.C ?? 0;
  const isUnstable = C > 1;
  const t = result?.times[frameIdx] ?? 0;
  const uNow = result?.frames[frameIdx] ?? [];

  // Check for explosion (values too large)
  const isExploded = uNow.some(v => Math.abs(v) > 1e6);

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: '16px', color: isUnstable ? '#f44' : '#4af' }}>
        Experiment 4: {isUnstable ? '⚠ CFL Instability' : 'CFL Stability'}
      </h2>
      <p style={{ margin: '0 0 12px', color: '#888', fontSize: '13px' }}>
        Push <strong style={{ color: '#e0e0e0' }}>Δt</strong> large enough so that <strong style={{ color: '#e0e0e0' }}>C &gt; 1</strong>.
        The simulation will explode. That's the point.
      </p>

      {/* Sliders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        {[
          { label: 'Wave speed v', min: 0.1, max: 3, key: 'v' as const },
          { label: 'Δt (push me!)', min: 0.001, max: 0.08, key: 'dt' as const },
          { label: 'Sigma σ', min: 0.1, max: 1.5, key: 'sigma' as const },
          { label: 'Amplitude', min: 0.2, max: 2, key: 'amplitude' as const },
        ].map(({ label, min, max, key }) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <label style={{ fontSize: '11px', color: '#888' }}>{label}: <strong style={{ color: '#e0e0e0' }}>
              {params[key] >= 0.001 ? params[key].toFixed(4) : params[key].toExponential(2)}
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

      {/* CFL indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '10px 14px',
        background: isUnstable ? '#1f0d0d' : '#0d1f1a',
        borderRadius: '6px', marginBottom: '12px',
        border: isUnstable ? '1px solid #f44' : '1px solid #333',
      }}>
        <span style={{ fontFamily: 'monospace', fontSize: '16px', color: '#888' }}>
          C = v·Δt/Δx = <span style={{ color: isUnstable ? '#f44' : '#4f8' }}>{C.toFixed(4)}</span>
        </span>
        <span style={{
          padding: '4px 10px', borderRadius: '4px', fontSize: '13px',
          background: isUnstable ? '#3d0a0a' : '#0d2d1a',
          color: isUnstable ? '#f44' : '#4f8',
          fontWeight: 'bold',
        }}>
          {isUnstable ? `✗ UNSTABLE  (C > 1)` : '✓ Stable (C ≤ 1)'}
        </span>
      </div>

      {isUnstable && !playing && !isExploded && (
        <div style={{
          padding: '8px 12px', marginBottom: '12px',
          background: '#2a1500', border: '1px solid #f80',
          borderRadius: '6px', color: '#f80', fontSize: '12px',
        }}>
          ⚡ C &gt; 1 — click <strong>Play</strong> to watch the numerical explosion
        </div>
      )}

      {isExploded && (
        <div style={{
          padding: '8px 12px', marginBottom: '12px',
          background: '#2a0000', border: '1px solid #f44',
          borderRadius: '6px', color: '#f44', fontSize: '13px',
          fontFamily: 'monospace',
        }}>
          ████ Numerical explosion ████  (values &gt; 10⁶)
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Loading...</div>
      ) : result ? (
        <>
          <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>
            t = {t.toFixed(3)} · frame {frameIdx + 1}/{result.frames.length}
            {isExploded && <span style={{ color: '#f44', marginLeft: '12px' }}>⚠ Exploded!</span>}
          </div>
          <WaveCanvas u={uNow} x={x} height={220} />

          <div style={{ display: 'flex', gap: '8px', margin: '12px 0', justifyContent: 'center' }}>
            <button onClick={() => setPlaying(p => !p)} disabled={frameIdx >= result.frames.length - 1} style={btnStyle(false)}>
              {playing ? '⏸ Pause' : '▶ Play'}
            </button>
            <button onClick={runSimulation} style={btnStyle(true)}>Reset</button>
          </div>

          <div style={{
            padding: '10px',
            background: '#1a1d27',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#666',
          }}>
            <strong style={{ color: '#e0e0e0' }}>CFL Condition:</strong> The finite-difference scheme is
            stable only when <strong style={{ color: '#4af' }}>C = v·Δt/Δx ≤ 1</strong>.<br />
            When C &gt; 1, small errors grow exponentially each time step.<br />
            This is not a bug — it's a mathematical fact you can now <em>feel</em>.
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

export default Exp4Stability;
