import React, { useState, useEffect, useRef, useCallback } from 'react';
import { waveCore, SimulateParams, SimulateResult } from '../physics/waveCore';
import WaveCanvas from './WaveCanvas';

/**
 * Experiment 2: Step-by-step finite difference.
 *
 * Design:
 * - Show the INITIAL Gaussian clearly first, with its formula
 * - Step through time manually (Prev/Next) or auto-play
 * - Ghost curves (prev/next frame) are clearly labeled
 * - FD formula shown after pressing "Show Formula"
 */
const X = 80;
const SPATIAL_DOMAIN = 4.0;
const dx = SPATIAL_DOMAIN / (X - 1);
const x = Array.from({ length: X }, (_, i) => -SPATIAL_DOMAIN / 2 + i * dx);

const GAUSSIAN_CENTER = 0.0;  // Center at x=0 so it sits symmetrically
const GAUSSIAN_SIGMA = 0.35;

const Exp2StepByStep: React.FC = () => {
  const [phase, setPhase] = useState<'intro' | 'stepping'>('intro');
  const [result, setResult] = useState<SimulateResult | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<number | null>(null);

  const runSimulation = useCallback(async () => {
    setLoading(true);
    try {
      const params: SimulateParams = {
        x, v: 1.0, dx, dt: 0.01, steps: 200,
        shape: 'gaussian', center: GAUSSIAN_CENTER, sigma: GAUSSIAN_SIGMA,
        width: 0.5, k: 10, amplitude: 1.0,
      };
      const res = await waveCore.simulate(params);
      setResult(res);
      setFrameIdx(0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { runSimulation(); }, [runSimulation]);

  // Auto-play effect
  useEffect(() => {
    if (playing && result && frameIdx < result.frames.length - 1) {
      timerRef.current = window.setTimeout(() => {
        setFrameIdx(i => i + 1);
      }, 80);
    } else {
      setPlaying(false);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, result, frameIdx]);

  // Pre-compute global max for stable y-axis
  const globalUMax = result
    ? Math.max(...result.frames.flatMap(f => f.map(Math.abs)), 0.01)
    : 1.0;

  const C = result?.C ?? 0;
  const t = result?.times[frameIdx] ?? 0;
  const uNow = result?.frames[frameIdx] ?? [];
  const uPrev = frameIdx > 0 ? result?.frames[frameIdx - 1] : undefined;
  const uNext = result && frameIdx < result.frames.length - 1 ? result.frames[frameIdx + 1] : undefined;

  // Highlight a point near the leading edge of the pulse (right side)
  const HIGHLIGHT_IDX = Math.floor(x.length * 0.65);
  const hx = x[HIGHLIGHT_IDX];
  const u_i_n = uNow[HIGHLIGHT_IDX] ?? 0;
  const u_im1_n = uNow[HIGHLIGHT_IDX - 1] ?? 0;
  const u_ip1_n = uNow[HIGHLIGHT_IDX + 1] ?? 0;
  const u_i_nm1 = uPrev ? (uPrev[HIGHLIGHT_IDX] ?? 0) : 0;
  const u_i_np1 = uNext ? (uNext[HIGHLIGHT_IDX] ?? 0) : 0;
  const rhs = 2 * u_i_n - u_i_nm1 + C * (u_im1_n - 2 * u_i_n + u_ip1_n);

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: '16px', color: '#4af' }}>
        Experiment 2: The Finite Difference Formula
      </h2>
      <p style={{ margin: '0 0 16px', color: '#888', fontSize: '13px' }}>
        How does the wave equation become a step-by-step algorithm?
      </p>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Loading Pyodide...</div>
      ) : result ? (
        <>
          {/* Formula box — always visible */}
          <div style={{
            padding: '14px 16px',
            background: '#13192a',
            borderRadius: '8px',
            marginBottom: '14px',
            border: '1px solid #1e2a3a',
          }}>
            <div style={{ color: '#666', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              The Wave Equation (1D)
            </div>
            <div style={{ color: '#e0e0e0', fontFamily: 'monospace', fontSize: '15px', marginBottom: '10px' }}>
              ∂²u/∂t² = v² · ∂²u/∂x²
            </div>
            <div style={{ color: '#666', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Discretize: uᵢⁿ = u(xᵢ, tₙ)
            </div>
            <div style={{ color: '#e0e0e0', fontFamily: 'monospace', fontSize: '14px', marginBottom: '10px' }}>
              u<sub>i</sub><sup>n+1</sup> = 2u<sub>i</sub><sup>n</sup> - u<sub>i</sub><sup>n-1</sup> + C·(u<sub>i-1</sub><sup>n</sup> - 2u<sub>i</sub><sup>n</sup> + u<sub>i+1</sub><sup>n</sup>)
            </div>
            <div style={{ color: '#555', fontSize: '11px' }}>
              C = v·Δt/Δx &nbsp;·&nbsp; This scheme is stable only when C ≤ 1
            </div>
          </div>

          {/* Info row */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <div style={{ color: '#666', fontSize: '12px' }}>
              <span style={{ color: '#4af', fontFamily: 'monospace' }}>t = {t.toFixed(3)}</span>
              &nbsp;·&nbsp;
              <span style={{ color: '#4af', fontFamily: 'monospace' }}>C = {C.toFixed(3)}</span>
              &nbsp;·&nbsp;
              frame {frameIdx + 1}/{result.frames.length}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#888' }}>
                <span style={{ display: 'inline-block', width: '16px', height: '2px', background: '#4a9eff', opacity: 0.5 }} />uⁿ⁻¹ (prev)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#888' }}>
                <span style={{ display: 'inline-block', width: '16px', height: '3px', background: '#4af' }} />uⁿ (now)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#888' }}>
                <span style={{ display: 'inline-block', width: '16px', height: '2px', background: '#ff9a4a', opacity: 0.5 }} />uⁿ⁺¹ (next)
              </span>
            </div>
          </div>

          {/* Gaussian initial condition */}
          <div style={{
            padding: '10px 14px',
            background: '#111620',
            borderRadius: '6px',
            marginBottom: '10px',
            border: '1px solid #1a2030',
            fontFamily: 'monospace',
            fontSize: '12px',
          }}>
            <div style={{ color: '#888', marginBottom: '4px' }}>Initial condition (t = 0):</div>
            <div style={{ color: '#e0e0e0' }}>
              u(x, 0) = <strong style={{ color: '#4af' }}>exp(−(x−μ)² / 2σ²)</strong>
              &nbsp;&nbsp; μ = {GAUSSIAN_CENTER},&nbsp; σ = {GAUSSIAN_SIGMA}
            </div>
            <div style={{ color: '#555', fontSize: '11px', marginTop: '4px' }}>
              A Gaussian pulse centered at x = 0
            </div>
          </div>

          {/* Canvas */}
          <WaveCanvas
            u={uNow}
            x={x}
            highlightIdx={phase === 'stepping' ? HIGHLIGHT_IDX : undefined}
            uPrev={uPrev}
            uNext={uNext}
            globalUMax={globalUMax}
            label="Gaussian · blue=prev · orange=next"
            height={220}
          />

          {/* Controls */}
          <div style={{ display: 'flex', gap: '8px', margin: '12px 0', justifyContent: 'center' }}>
            <button onClick={() => { setPhase('intro'); setPlaying(false); setFrameIdx(i => Math.max(0, i - 1)); }}
              disabled={frameIdx === 0} style={btnStyle(false)}>◀ Prev</button>
            <button onClick={() => { setPlaying(p => !p); }}
              disabled={frameIdx >= result.frames.length - 1} style={btnStyle(false)}>
              {playing ? '⏸ Pause' : '▶ Play'}
            </button>
            <button onClick={() => { setPhase('stepping'); setPlaying(false); setFrameIdx(i => Math.min(result.frames.length - 1, i + 1)); }}
              disabled={frameIdx >= result.frames.length - 1} style={btnStyle(false)}>Next ▶</button>
            <button onClick={() => { runSimulation(); setFrameIdx(0); setPhase('intro'); setPlaying(false); }}
              style={btnStyle(true)}>Reset</button>
          </div>

          {/* Formula display — shown only in stepping mode */}
          {phase === 'stepping' && (
            <div style={{
              padding: '14px',
              background: '#1a1d27',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '12px',
            }}>
              <div style={{ color: '#888', marginBottom: '6px' }}>
                Update at x<sub>i</sub> = {hx.toFixed(2)} (right side of pulse):
              </div>
              <div style={{ color: '#e0e0e0', marginBottom: '6px' }}>
                u<sub>i</sub><sup>n+1</sup> = 2·u<sub>i</sub><sup>n</sup> − u<sub>i</sub><sup>n-1</sup>
                + C·(u<sub>i-1</sub><sup>n</sup> − 2·u<sub>i</sub><sup>n</sup> + u<sub>i+1</sub><sup>n</sup>)
              </div>
              <div style={{ color: '#4a9eff' }}>
                = 2·({u_i_n.toFixed(3)}) − ({u_i_nm1.toFixed(3)}) + {C.toFixed(3)}·(
                {u_im1_n.toFixed(3)} − 2·{u_i_n.toFixed(3)} + {u_ip1_n.toFixed(3)})
              </div>
              <div style={{ marginTop: '6px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ color: '#888' }}>u<sub>i</sub><sup>n−1</sup> = <span style={{ color: '#4a9eff' }}>{u_i_nm1.toFixed(3)}</span></span>
                <span style={{ color: '#888' }}>u<sub>i</sub><sup>n</sup> = <span style={{ color: '#4af' }}>{u_i_n.toFixed(3)}</span></span>
                <span style={{ color: '#888' }}>u<sub>i</sub><sup>n+1</sup> = <span style={{ color: '#ff9a4a' }}>{u_i_np1.toFixed(3)}</span></span>
                <span style={{ color: '#555' }}>LHS−RHS: {(u_i_np1 - rhs).toFixed(4)}</span>
              </div>
              <div style={{ marginTop: '8px', color: '#666', fontSize: '11px', borderTop: '1px solid #222', paddingTop: '8px' }}>
                <strong style={{ color: '#e0e0e0' }}>Intuition:</strong> The orange curve (uⁿ⁺¹) is predicted
                from the blue (uⁿ⁻¹) and the current neighbors. Press <strong style={{ color: '#4af' }}>Play ▶</strong> to animate.
              </div>
            </div>
          )}

          {phase === 'intro' && (
            <div style={{
              padding: '12px',
              background: '#1a1d27',
              borderRadius: '6px',
              color: '#666',
              fontSize: '12px',
              textAlign: 'center',
            }}>
              Press <strong style={{ color: '#4af' }}>Play ▶</strong> to animate, or{' '}
              <strong style={{ color: '#4af' }}>Next ▶</strong> to step one frame at a time.
            </div>
          )}
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

export default Exp2StepByStep;
