/**
 * TypeScript bridge to the Pyodide wave simulation Web Worker.
 */

import WaveWorker from './waveWorker?worker';

export interface SimulateParams {
  x: number[];
  v: number;
  dx: number;
  dt: number;
  steps: number;
  shape: string;
  center: number;
  sigma: number;
  width: number;
  k: number;
  amplitude: number;
}

export interface SimulateResult {
  frames: number[][];
  times: number[];
  C: number;
}

class WaveCore {
  private worker: Worker;
  private ready: boolean = false;
  private queue: Array<() => void> = [];

  constructor() {
    this.worker = new WaveWorker();
    this.worker.onmessage = this.handleMessage.bind(this);
    this.worker.onerror = (e) => console.error('Wave worker error:', e);
  }

  private handleMessage(e: MessageEvent) {
    const msg = e.data;
    if (msg.type === 'ready') {
      this.ready = true;
      this.queue.forEach((cb) => cb());
      this.queue = [];
    }
  }

  simulate(params: SimulateParams): Promise<SimulateResult> {
    return new Promise((resolve, reject) => {
      const id = Date.now() + Math.random();
      const handler = (e: MessageEvent) => {
        if (e.data.type === 'simulate-result' && e.data.id === id) {
          this.worker.removeEventListener('message', handler);
          resolve(e.data.data);
        }
        if (e.data.type === 'error' && e.data.id === id) {
          this.worker.removeEventListener('message', handler);
          reject(new Error(e.data.message));
        }
      };
      this.worker.addEventListener('message', handler);
      this.worker.postMessage({ type: 'simulate', id, params });
    });
  }

  computeCurvature(u: number[], dx: number): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const id = Date.now() + Math.random();
      const handler = (e: MessageEvent) => {
        if (e.data.type === 'curvature-result' && e.data.id === id) {
          this.worker.removeEventListener('message', handler);
          resolve(e.data.data);
        }
        if (e.data.type === 'error' && e.data.id === id) {
          this.worker.removeEventListener('message', handler);
          reject(new Error(e.data.message));
        }
      };
      this.worker.addEventListener('message', handler);
      this.worker.postMessage({ type: 'curvature', id, u, dx });
    });
  }

  isReady() {
    return this.ready;
  }

  init() {
    this.worker.postMessage({ type: 'init', id: 0 });
  }
}

export const waveCore = new WaveCore();
