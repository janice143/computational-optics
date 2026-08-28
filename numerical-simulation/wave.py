"""
Wave equation physics core.
Shared between notebooks and the interactive web experiment.
"""

import numpy as np


def initial_gaussian(x, center=0.0, sigma=0.5, amplitude=1.0):
    """Gaussian pulse initial condition."""
    return amplitude * np.exp(-((x - center) ** 2) / (2 * sigma ** 2))


def initial_triangle(x, center=0.0, width=1.0, amplitude=1.0):
    """Triangle wave initial condition."""
    half_w = width / 2
    y = np.zeros_like(x)
    left = center - half_w
    right = center + half_w
    mask = (x >= left) & (x <= right)
    y[mask] = amplitude * (1.0 - np.abs(x[mask] - center) / half_w)
    return y


def initial_square(x, center=0.0, width=0.5, amplitude=1.0):
    """Square wave initial condition."""
    half_w = width / 2
    y = np.zeros_like(x)
    left = center - half_w
    right = center + half_w
    mask = (x >= left) & (x <= right)
    y[mask] = amplitude
    return y


def initial_sin(x, k=10.0, amplitude=1.0):
    """Sinusoidal initial condition."""
    return amplitude * np.sin(k * x)


def step_wave(u_prev, u_now, C):
    """
    One step of the finite-difference wave equation update.

    u[i]^(n+1) = 2*u[i]^n - u[i]^(n-1) + C*(u[i-1]^n - 2*u[i]^n + u[i+1]^n)

    Parameters
    ----------
    u_prev : array_like
        Wave values at time step n-1
    u_now : array_like
        Wave values at time step n
    C : float
        CFL number = v * dt / dx

    Returns
    -------
    u_next : ndarray
        Wave values at time step n+1
    """
    u_next = np.zeros_like(u_now)
    # Interior points (Dirichlet boundary: assume u=0 at edges)
    u_next[1:-1] = (2.0 * u_now[1:-1] - u_prev[1:-1]
                    + C * (u_now[:-2] - 2.0 * u_now[1:-1] + u_now[2:]))
    return u_next


def simulate_wave(*, x, v, dx, dt, steps, shape="gaussian",
                  center=0.0, sigma=0.5, width=0.5, k=10.0, amplitude=1.0):
    """
    Run a full wave propagation simulation.

    Parameters
    ----------
    x : array_like
        Spatial grid (must be uniformly spaced)
    v : float
        Wave speed
    dx : float
        Spatial step size
    dt : float
        Temporal step size
    steps : int
        Number of time steps to simulate
    shape : str
        Initial shape: "gaussian", "triangle", "square", "sin"
    center : float
        Center position of the initial pulse
    sigma : float
        Width parameter for Gaussian
    width : float
        Width parameter for triangle/square
    k : float
        Wavenumber for sinusoidal
    amplitude : float
        Amplitude of the initial pulse

    Returns
    -------
    frames : ndarray
        Array of shape (steps+1, N) containing all frames
    times : ndarray
        Array of time values for each frame
    C : float
        CFL number used in simulation
    """
    C = v * dt / dx

    # Select initial condition function
    if shape == "gaussian":
        init_func = lambda x: initial_gaussian(x, center, sigma, amplitude)
    elif shape == "triangle":
        init_func = lambda x: initial_triangle(x, center, width, amplitude)
    elif shape == "square":
        init_func = lambda x: initial_square(x, center, width, amplitude)
    elif shape == "sin":
        init_func = lambda x: initial_sin(x, k, amplitude)
    else:
        raise ValueError(f"Unknown shape: {shape}")

    # Initialize
    u_prev = np.zeros_like(x)
    u_now = init_func(x)
    frames = [u_now.copy()]
    times = [0.0]

    # Time stepping
    for step in range(steps):
        u_next = step_wave(u_prev, u_now, C)
        u_prev, u_now = u_now, u_next
        frames.append(u_now.copy())
        times.append((step + 1) * dt)

    return np.array(frames), np.array(times), C


def compute_curvature(u, dx):
    """
    Compute second spatial derivative u_xx at each point.
    Used for Experiment 1 (curvature → acceleration).
    """
    u_xx = np.zeros_like(u)
    u_xx[1:-1] = (u[:-2] + u[2:] - 2.0 * u[1:-1]) / (dx ** 2)
    return u_xx
