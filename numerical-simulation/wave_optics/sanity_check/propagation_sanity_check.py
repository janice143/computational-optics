"""One-shot sanity report for a numerical propagation experiment."""

from .field_support_info import field_support_info
from .grid_sanity_check import grid_info
from .output_grid_info import output_grid_info
from .propagation_regime import propagation_regime


def propagation_sanity_check(
    U0,
    dx,
    dy,
    wavelength,
    z,
    method,
    characteristic_size=None,
    threshold=1e-3,
    Uz=None,
):
    """
    Print a sanity report for a numerical propagation experiment.

    Parameters
    ----------
    U0 : ndarray
        Input complex field.

    Uz : ndarray, optional
        Propagated complex field. If ``None``, the propagated-field-support
        section is skipped — useful as a pre-flight check before running
        the actual propagation.

    dx, dy : float
        Input-plane sampling intervals [m].

    wavelength : float
        Wavelength [m].

    z : float
        Propagation distance [m].

    method : str
        Propagation method, e.g.
        "asm", "fresnel_tf", "fraunhofer",
        or "fresnel_single_fft".

    characteristic_size : float, optional
        Characteristic transverse size used to estimate
        z_diff ~ D^2 / wavelength.

    threshold : float
        Relative amplitude threshold used by field_support_info.
    """

    Ny, Nx = U0.shape

    # =========================================================
    # 1. Input grid
    # =========================================================

    grid = grid_info(U0, dx, dy)

    print("\n=== Input Grid ===")

    print(f"Nx × Ny          : {grid['Nx']} × {grid['Ny']}")
    print(
        f"dx, dy           : "
        f"{grid['dx'] * 1e6:.3f}, "
        f"{grid['dy'] * 1e6:.3f} um"
    )
    print(
        f"Lx, Ly           : "
        f"{grid['Lx'] * 1e3:.3f}, "
        f"{grid['Ly'] * 1e3:.3f} mm"
    )

    print("\n--- Spatial frequency: cycles/m ---")

    print(
        f"dfx, dfy         : "
        f"{grid['dfx']:.3e}, "
        f"{grid['dfy']:.3e} 1/m"
    )
    print(
        f"Nyquist fx, fy   : "
        f"{grid['fx_nyquist']:.3e}, "
        f"{grid['fy_nyquist']:.3e} 1/m"
    )

    print("\n--- k-space: rad/m ---")

    print(
        f"dkx, dky         : "
        f"{grid['dkx']:.3e}, "
        f"{grid['dky']:.3e} rad/m"
    )
    print(
        f"Nyquist kx, ky   : "
        f"{grid['kx_nyquist']:.3e}, "
        f"{grid['ky_nyquist']:.3e} rad/m"
    )

    # =========================================================
    # 2. Input field support
    # =========================================================

    input_support = field_support_info(
        U0,
        dx,
        dy,
        threshold=threshold,
    )

    print("\n=== Input Field Support ===")
    _print_support(input_support)

    # =========================================================
    # 3. Propagation scale
    # =========================================================

    print("\n=== Propagation ===")

    print(f"method            : {method}")
    print(f"wavelength        : {wavelength * 1e9:.3f} nm")
    print(f"z                 : {z * 1e3:.3f} mm")

    if characteristic_size is not None:
        info = propagation_regime(
            characteristic_size,
            wavelength,
            z,
        )

        print(
            f"characteristic D  : "
            f"{info['characteristic_size'] * 1e6:.3f} um"
        )
        print(
            f"z_diff            : "
            f"{info['z_diff'] * 1e3:.3f} mm"
        )
        print(
            f"z / z_diff        : "
            f"{info['z_over_zdiff']:.3f}"
        )
        print(
            f"regime            : "
            f"{info['regime']}"
        )

    # =========================================================
    # 4. Output grid
    # =========================================================

    output_grid = output_grid_info(
        method,
        Nx,
        Ny,
        dx,
        dy,
        wavelength,
        z,
    )

    dx_out = output_grid["dx_out"]
    dy_out = output_grid["dy_out"]

    print("\n=== Output Grid ===")

    print(
        f"dx_out, dy_out    : "
        f"{dx_out * 1e6:.3f}, "
        f"{dy_out * 1e6:.3f} um"
    )
    print(
        f"Lx_out, Ly_out    : "
        f"{output_grid['Lx_out'] * 1e3:.3f}, "
        f"{output_grid['Ly_out'] * 1e3:.3f} mm"
    )
    print(
        f"x half-width      : "
        f"{output_grid['x_half'] * 1e3:.3f} mm"
    )
    print(
        f"y half-width      : "
        f"{output_grid['y_half'] * 1e3:.3f} mm"
    )

    # =========================================================
    # 5. Propagated field support
    # =========================================================

    if Uz is not None:
        output_support = field_support_info(
            Uz,
            dx_out,
            dy_out,
            threshold=threshold,
        )

        print("\n=== Propagated Field Support ===")
        _print_support(output_support)


def _print_support(info):
    """Pretty-print field-support information."""

    if info is None:
        print("empty field")
        return

    print(
        f"field width x     : "
        f"{info['field_width_x'] * 1e3:.3f} mm"
    )
    print(
        f"field width y     : "
        f"{info['field_width_y'] * 1e3:.3f} mm"
    )

    print(
        f"x occupancy       : "
        f"{info['occupancy_x']:.1%}"
    )
    print(
        f"y occupancy       : "
        f"{info['occupancy_y']:.1%}"
    )

    print(
        f"left / right      : "
        f"{info['margin_left'] * 1e3:.3f} / "
        f"{info['margin_right'] * 1e3:.3f} mm"
    )
    print(
        f"bottom / top      : "
        f"{info['margin_bottom'] * 1e3:.3f} / "
        f"{info['margin_top'] * 1e3:.3f} mm"
    )