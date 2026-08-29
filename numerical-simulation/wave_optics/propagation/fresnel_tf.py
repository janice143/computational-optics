import numpy as np

from ..grids import freq_grid


def fresnel_tf(U0, z, wavelength, dx, dy):
    """Fresnel propagation with a transfer function."""
    Ny, Nx = U0.shape
    k = 2 * np.pi / wavelength

    FX, FY, _, _ = freq_grid(Nx, Ny, dx, dy)

    # fft2 is unshifted, so the frequency grid must use the same order
    FX = np.fft.ifftshift(FX)
    FY = np.fft.ifftshift(FY)

    H = np.exp(1j * k * z) * np.exp(
        -1j * np.pi * wavelength * z * (FX**2 + FY**2)
    )

    U0_f = np.fft.fft2(U0)
    Uz = np.fft.ifft2(U0_f * H)

    return Uz
