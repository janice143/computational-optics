import numpy as np

from ..grids import freq_grid, make_grid


def fresnel_fft(U0, z, wavelength, dx, dy):
    """Fresnel propagation with one FFT. Output grid scales with z."""
    Ny, Nx = U0.shape
    k = 2 * np.pi / wavelength

    X, Y, _, _ = make_grid(Nx, Ny, dx, dy)

    _, _, fx, fy = freq_grid(Nx, Ny, dx, dy)

    # output physical coordinates
    x_out = wavelength * z * fx
    y_out = wavelength * z * fy
    X_out, Y_out = np.meshgrid(x_out, y_out)

    chirp_in = np.exp(
        1j * k / (2 * z) * (X**2 + Y**2)
    )

    spectrum = (
        np.fft.fftshift(
            np.fft.fft2(
                np.fft.ifftshift(U0 * chirp_in)
            )
        )
        * dx * dy
    )

    prefactor = (
        np.exp(1j * k * z)
        / (1j * wavelength * z)
        * np.exp(
            1j * k / (2 * z)
            * (X_out**2 + Y_out**2)
        )
    )

    Uz = prefactor * spectrum

    return Uz, x_out, y_out
