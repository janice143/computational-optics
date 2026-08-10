/**
 * Wave simulation Web Worker.
 * Runs Python/Pyodide physics in a separate thread so it never blocks the UI.
 */

import { loadPyodide } from 'pyodide';

const PYTHON_CODE = `
import numpy as np

def initial_gaussian(x, center=0.0, sigma=0.5, amplitude=1.0):
    return amplitude * np.exp(-((x - center) ** 2) / (2 * sigma ** 2))

def initial_triangle(x, center=0.0, width=1.0, amplitude=1.0):
    half_w = width / 2
    y = np.zeros_like(x)
    left = center - half_w
    right = center + half_w
    mask = (x >= left) & (x <= right)
    y[mask] = amplitude * (1.0 - np.abs(x[mask] - center) / half_w)
    return y

def initial_square(x, center=0.0, width=0.5, amplitude=1.0):
    half_w = width / 2
    y = np.zeros_like(x)
    left = center - half_w
    right = center + half_w
    mask = (x >= left) & (x <= right)
    y[mask] = amplitude
    return y

def initial_sin(x, k=10.0, amplitude=1.0):
    return amplitude * np.sin(k * x)

def step_wave(u_prev, u_now, C):
    u_next = np.zeros_like(u_now)
    u_next[1:-1] = (2.0 * u_now[1:-1] - u_prev[1:-1]
                    + C * (u_now[:-2] - 2.0 * u_now[1:-1] + u_now[2:]))
    return u_next

def simulate_wave(x_list, v, dx, dt, steps, shape, center, sigma, width, k, amplitude):
    x = np.array(x_list)
    C = v * dt / dx

    if shape == "gaussian":
        u_now = initial_gaussian(x, center, sigma, amplitude)
    elif shape == "triangle":
        u_now = initial_triangle(x, center, width, amplitude)
    elif shape == "square":
        u_now = initial_square(x, center, width, amplitude)
    elif shape == "sin":
        u_now = initial_sin(x, k, amplitude)
    else:
        raise ValueError(f"Unknown shape: {shape}")

    u_prev = np.zeros_like(x)
    frames = [u_now.tolist()]
    times = [0.0]

    for step in range(steps):
        u_next = step_wave(u_prev, u_now, C)
        u_prev, u_now = u_now, u_next
        frames.append(u_now.tolist())
        times.append((step + 1) * dt)

    return {"frames": frames, "times": times, "C": float(C)}

def compute_curvature(u_list, dx):
    u = np.array(u_list)
    u_xx = np.zeros_like(u)
    u_xx[1:-1] = (u[:-2] + u[2:] - 2.0 * u[1:-1]) / (dx ** 2)
    return u_xx.tolist()
`;

type WorkerMessage =
  | { type: 'init'; id: number }
  | { type: 'simulate'; id: number; params: {
    x: number[]; v: number; dx: number; dt: number; steps: number;
    shape: string; center: number; sigma: number; width: number; k: number; amplitude: number;
  }}
  | { type: 'curvature'; id: number; u: number[]; dx: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pyodide: any = null;

async function init() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pyodide = await (loadPyodide as any)({
    // Point to jsDelivr CDN so Vite dev server doesn't interfere
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
  });
  await pyodide.loadPackage(['numpy']);
  await pyodide.runPythonAsync(PYTHON_CODE);
  self.postMessage({ type: 'ready' });
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  if (msg.type === 'init') {
    await init();
    self.postMessage({ type: 'init-ok', id: msg.id });
    return;
  }

  if (!pyodide) {
    self.postMessage({ type: 'error', id: msg.id, message: 'Pyodide not ready' });
    return;
  }

  const id = msg.id;

  if (msg.type === 'simulate') {
    try {
      const { params } = msg;
      const simulate = pyodide.globals.get('simulate_wave');
      const result = simulate(
        params.x, params.v, params.dx, params.dt, params.steps,
        params.shape, params.center, params.sigma, params.width, params.k, params.amplitude,
      );
      // toJs() returns nested Maps which fail postMessage cloning — convert explicitly
      const jsResult = {
        frames: Array.from(result.get('frames').toJs()),
        times: Array.from(result.get('times').toJs()),
        C: result.get('C'),
      };
      self.postMessage({ type: 'simulate-result', id, data: jsResult });
    } catch (err: unknown) {
      self.postMessage({ type: 'error', id, message: String(err) });
    }
    return;
  }

  if (msg.type === 'curvature') {
    try {
      const compute_curvature = pyodide.globals.get('compute_curvature');
      const result = compute_curvature(msg.u, msg.dx);
      self.postMessage({ type: 'curvature-result', id, data: Array.from(result.toJs()) });
    } catch (err: unknown) {
      self.postMessage({ type: 'error', id, message: String(err) });
    }
  }
};
