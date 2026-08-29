import numpy as np

from ..grids import k_freq_grid


def asm(U0, z, wavelength, dx, dy):
    """Angular Spectrum Method. Output grid is the same as the input grid."""
    Ny, Nx = U0.shape
    k = 2 * np.pi / wavelength

    KX, KY, _, _ = k_freq_grid(Nx, Ny, dx, dy)

    # fft2 is unshifted, so the frequency grid must use the same order
    KX = np.fft.ifftshift(KX)
    KY = np.fft.ifftshift(KY)

    KZ = np.sqrt(k**2 - KX**2 - KY**2 + 0j)
    H = np.exp(1j * KZ * z)

    U0_f = np.fft.fft2(U0)
    Uz = np.fft.ifft2(U0_f * H)

    return Uz
