"""Visualization helpers for complex 2D fields."""

import matplotlib.pyplot as plt
import numpy as np


def visualize(
    U,
    x,
    y,
    mode="intensity",
    title="",
    ax=None,
    xlim=None,
    ylim=None,
    xlabel=None,
    ylabel=None,
):
    """Plot a complex 2D field ``U`` on coordinate axes ``(x, y)``.

    Modes
    -----
    - ``"intensity"``:        |U|^2
    - ``"normal_intensity"``:  |U|^2 normalized to peak 1
    - ``"abs"``:              |U|
    - ``"phase"``:            angle(U), colormap ``twilight``, range [-π, π]
    - ``"real"``:             Re(U)
    - ``"imag"``:             Im(U)

    Returns the ``AxesImage`` so callers can attach a colorbar.
    """
    if ax is None:
        ax = plt.gca()

    if mode == "normal_intensity":
        data = np.abs(U) ** 2
        data = data / data.max()
        cmap = "gray"
        vmin = vmax = None
    elif mode == "intensity":
        data = np.abs(U) ** 2
        cmap = "gray"
        vmin = vmax = None
    elif mode == "abs":
        data = np.abs(U)
        cmap = "gray"
        vmin = vmax = None
    elif mode == "phase":
        data = np.angle(U)
        cmap = "twilight"
        vmin, vmax = -np.pi, np.pi
    elif mode == "real":
        data = np.real(U)
        cmap = "gray"
        vmin = vmax = None
    elif mode == "imag":
        data = np.imag(U)
        cmap = "gray"
        vmin = vmax = None
    else:
        raise ValueError(f"Unknown mode: {mode}")

    im = ax.imshow(
        data,
        extent=[x.min(), x.max(), y.min(), y.max()],
        origin="lower",
        cmap=cmap,
        vmin=vmin,
        vmax=vmax,
    )

    if xlim is not None:
        ax.set_xlim(xlim)
    if ylim is not None:
        ax.set_ylim(ylim)

    if xlabel is not None:
        ax.set_xlabel(xlabel)
    if ylabel is not None:
        ax.set_ylabel(ylabel)

    ax.set_title(title)

    return im


def visualize_grid(*visualizers, col=2):
    """Lay out multiple zero-arg callables as a grid of subplots.

    Each entry should be a ``lambda`` (or any no-arg callable) that draws
    into the current ``Axes`` (e.g. wrapping :func:`visualize`). Unused
    subplots are hidden.

    Example
    -------
    >>> visualize_grid(
    ...     lambda: visualize(U0, x, y, "intensity", "U0"),
    ...     lambda: visualize(Uz, x, y, "intensity", "Uz"),
    ...     col=2,
    ... )
    """
    n = len(visualizers)
    row = int(np.ceil(n / col))

    fig, axes = plt.subplots(row, col, figsize=(4 * col, 4 * row))
    axes = np.atleast_1d(axes).flatten()

    for i, fn in enumerate(visualizers):
        plt.sca(axes[i])
        fn()

    for i in range(n, len(axes)):
        axes[i].axis("off")

    plt.tight_layout()
    plt.show()
