import numpy as np


def field_support_info(U, dx, dy, threshold=1e-3):
    """Return the effective field support inside the numerical window."""

    amplitude = np.abs(U)

    if amplitude.size == 0 or amplitude.max() == 0:
        return None

    mask = amplitude >= threshold * amplitude.max()
    iy, ix = np.where(mask)

    if len(ix) == 0:
        return None

    Ny, Nx = U.shape

    dx = abs(dx)
    dy = abs(dy)

    x_min = ix.min()
    x_max = ix.max()
    y_min = iy.min()
    y_max = iy.max()

    width_x = (x_max - x_min + 1) * dx
    width_y = (y_max - y_min + 1) * dy

    Lx = Nx * dx
    Ly = Ny * dy

    margin_left = x_min * dx
    margin_right = (Nx - 1 - x_max) * dx
    margin_bottom = y_min * dy
    margin_top = (Ny - 1 - y_max) * dy

    return {
        "field_width_x": width_x,
        "field_width_y": width_y,
        "occupancy_x": width_x / Lx,
        "occupancy_y": width_y / Ly,

        "margin_left": margin_left,
        "margin_right": margin_right,
        "margin_bottom": margin_bottom,
        "margin_top": margin_top,

        "min_margin_x": min(margin_left, margin_right),
        "min_margin_y": min(margin_bottom, margin_top),
    }