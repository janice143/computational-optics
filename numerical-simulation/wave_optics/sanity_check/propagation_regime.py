"""Near-field / far-field classification from the diffraction distance."""

import numpy as np


def propagation_regime(
    characteristic_size,
    wavelength,
    z,
):
    """Return characteristic diffraction-scale information."""

    D = abs(characteristic_size)
    z_abs = abs(z)

    rep = representative_distances(D, wavelength)
    z_diff = rep["transition"]

    if z_abs == 0:
        ratio = 0.0
        fresnel_number = np.inf
    else:
        ratio = z_abs / z_diff
        fresnel_number = z_diff / z_abs

    if z_abs < rep["near"]:
        regime = "near"
    elif z_abs < rep["far"]:
        regime = "transition"
    else:
        regime = "far"

    return {
        "characteristic_size": D,
        "z": z,
        "z_diff": z_diff,
        "z_over_zdiff": ratio,
        "fresnel_number": fresnel_number,
        "representative_distances": rep,
        "regime": regime,
    }

def representative_distances(
    characteristic_size,
    wavelength,
):
    """One sample distance per regime, for sweeping a propagation model."""
    z_diff = characteristic_size**2 / wavelength

    return {
        "near": 0.1 * z_diff,
        "transition": z_diff,
        "far": 10 * z_diff,
    }
