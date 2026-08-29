def output_grid_info(
    method,
    Nx,
    Ny,
    dx,
    dy,
    wavelength,
    z,
):
    """Return the native output sampling of a propagation method."""

    method = method.lower()

    dx = abs(dx)
    dy = abs(dy)
    z = abs(z)

    if method in ("asm", "fresnel_tf"):
        dx_out = dx
        dy_out = dy

    elif method in ("fraunhofer", "fresnel_single_fft"):
        dx_out = wavelength * z / (Nx * dx)
        dy_out = wavelength * z / (Ny * dy)

    else:
        raise ValueError(
            f"Unknown propagation method: {method}"
        )

    Lx_out = Nx * dx_out
    Ly_out = Ny * dy_out

    return {
        "method": method,

        "Nx": Nx,
        "Ny": Ny,

        "dx_out": dx_out,
        "dy_out": dy_out,

        "Lx_out": Lx_out,
        "Ly_out": Ly_out,

        "x_half": Lx_out / 2,
        "y_half": Ly_out / 2,
    }