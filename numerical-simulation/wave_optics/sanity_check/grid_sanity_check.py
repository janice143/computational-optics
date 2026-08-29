import numpy as np


def grid_info(U, dx, dy):
    """Return spatial-grid and spatial-frequency-grid information."""

    Ny, Nx = U.shape

    dx = abs(dx)
    dy = abs(dy)

    # spatial grid
    Lx = Nx * dx
    Ly = Ny * dy

    # cycles / m
    dfx = 1 / Lx
    dfy = 1 / Ly

    fx_nyquist = 1 / (2 * dx)
    fy_nyquist = 1 / (2 * dy)

    # rad / m
    dkx = 2 * np.pi * dfx
    dky = 2 * np.pi * dfy

    kx_nyquist = np.pi / dx
    ky_nyquist = np.pi / dy

    return {
        "Nx": Nx,
        "Ny": Ny,

        "dx": dx,
        "dy": dy,

        "Lx": Lx,
        "Ly": Ly,

        "dfx": dfx,
        "dfy": dfy,

        "fx_nyquist": fx_nyquist,
        "fy_nyquist": fy_nyquist,

        "dkx": dkx,
        "dky": dky,

        "kx_nyquist": kx_nyquist,
        "ky_nyquist": ky_nyquist,
    }