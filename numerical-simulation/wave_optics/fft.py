"""Centered 2D FFT / IFFT."""

import numpy as np


def fft2c(U):
    """Centered 2D FFT: ifftshift -> fft2 -> fftshift."""
    return np.fft.fftshift(np.fft.fft2(np.fft.ifftshift(U)))


def ifft2c(A):
    """Centered 2D IFFT: ifftshift -> ifft2 -> fftshift."""
    return np.fft.fftshift(np.fft.ifft2(np.fft.ifftshift(A)))
