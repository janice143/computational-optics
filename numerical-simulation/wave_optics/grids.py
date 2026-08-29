"""Centered spatial, frequency, and wavevector grids."""

import numpy as np


def make_grid(Nx, Ny, dx, dy=None):
    if dy is None:
        dy = dx

    x = (np.arange(Nx) - Nx // 2) * dx
    y = (np.arange(Ny) - Ny // 2) * dy
    X, Y = np.meshgrid(x, y)

    return X, Y, x, y


def freq_grid(Nx, Ny, dx, dy=None):
    if dy is None:
        dy = dx

    fx = np.fft.fftshift(np.fft.fftfreq(Nx, d=dx))
    fy = np.fft.fftshift(np.fft.fftfreq(Ny, d=dy))
    FX, FY = np.meshgrid(fx, fy)

    return FX, FY, fx, fy


def k_freq_grid(Nx, Ny, dx, dy=None):
    FX, FY, fx, fy = freq_grid(Nx, Ny, dx, dy)

    KX = 2 * np.pi * FX
    KY = 2 * np.pi * FY
    kx = 2 * np.pi * fx
    ky = 2 * np.pi * fy

    return KX, KY, kx, ky

