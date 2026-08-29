import numpy as np

from ..grids import freq_grid


def fraunhofer(U0, z, wavelength, dx, dy):
    """Fraunhofer far-field propagation."""
    Ny, Nx = U0.shape
    k = 2 * np.pi / wavelength

    _, _, fx, fy = freq_grid(Nx, Ny, dx, dy)
    x_out = wavelength * z * fx
    y_out = wavelength * z * fy
    X_out, Y_out = np.meshgrid(x_out, y_out)

    U0_f = (
        np.fft.fftshift(np.fft.fft2(np.fft.ifftshift(U0))) * dx * dy
    )
    prefactor = (
        np.exp(1j * k * z)
        / (1j * wavelength * z)
        * np.exp(1j * k / (2 * z) * (X_out**2 + Y_out**2))
    )

    Uz = prefactor * U0_f

    return Uz, x_out, y_out
