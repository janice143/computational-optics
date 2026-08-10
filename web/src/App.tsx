import React, { useState, useEffect } from 'react';
import { waveCore } from './physics/waveCore';
import Exp1Curvature from './components/Experiment1Curvature';
import Exp2StepByStep from './components/Experiment2StepByStep';
import Exp3Propagation from './components/Experiment3Propagation';
import Exp4Stability from './components/Experiment4Stability';

const TABS = [
  { id: 'curvature', label: '1 · Curvature', component: Exp1Curvature },
  { id: 'step', label: '2 · Finite Diff', component: Exp2StepByStep },
  { id: 'propagate', label: '3 · Propagation', component: Exp3Propagation },
  { id: 'stability', label: '4 · CFL Explosion', component: Exp4Stability },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('curvature');
  const [pyodideReady, setPyodideReady] = useState(false);

  useEffect(() => {
    waveCore.init();
    const check = setInterval(() => {
      if (waveCore.isReady()) {
        setPyodideReady(true);
        clearInterval(check);
      }
    }, 100);
    return () => clearInterval(check);
  }, []);

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component ?? Exp1Curvature;

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: '#e0e0e0' }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px 0',
        borderBottom: '1px solid #1e2433',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#4af' }}>
            Computational Optics Lab
          </h1>
          <span style={{ fontSize: '13px', color: '#555' }}>Part 1 · Wave Equation</span>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                background: activeTab === tab.id ? '#13172a' : 'transparent',
                color: activeTab === tab.id ? '#4af' : '#555',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #4af' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === tab.id ? 500 : 400,
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pyodide status bar */}
      <div style={{
        padding: '6px 24px',
        background: pyodideReady ? '#0d1f1a' : '#1f1a0d',
        color: pyodideReady ? '#4f8' : '#fa0',
        fontSize: '12px',
        fontFamily: 'monospace',
      }}>
        {pyodideReady
          ? '● Pyodide ready — Python physics loaded in Web Worker'
          : '◌ Loading Pyodide (first load ~5 MB WebAssembly)...'}
      </div>

      {/* Active experiment */}
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <ActiveComponent />
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '40px',
        padding: '16px 24px',
        borderTop: '1px solid #1a1f2e',
        color: '#444',
        fontSize: '12px',
        textAlign: 'center',
      }}>
        Computational Optics Lab · Python via{' '}
        <span style={{ color: '#555' }}>Pyodide</span> + WebAssembly
      </div>
    </div>
  );
};

export default App;
