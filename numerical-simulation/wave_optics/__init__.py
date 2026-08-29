"""wave_optics: numerical wave-optics utilities.

Public API (also re-exported as top-level names):

- :mod:`wave_optics.grids`         — ``make_grid``, ``freq_grid``, ``k_freq_grid``
- :mod:`wave_optics.fft`           — ``fft2c``, ``ifft2c``
- :mod:`wave_optics.propagation`   — ``asm``, ``fraunhofer``,
  ``fresnel_fft``, ``fresnel_tf``
- :mod:`wave_optics.visualization` — ``visualize``, ``visualize_grid``
- :mod:`wave_optics.error_metrics` — ``mean_squared_error``
- :mod:`wave_optics.sanity_check`  — ``propagation_sanity_check`` (the only
  one that prints), plus the pure helpers ``grid_info``,
  ``field_support_info``, ``output_grid_info``, ``propagation_regime``,
  ``representative_distances``
"""

from .grids import make_grid, freq_grid, k_freq_grid
from .fft import fft2c, ifft2c
from .propagation import (
    asm,
    fraunhofer,
    fresnel_fft,
    fresnel_tf,
)
from .visualization import visualize, visualize_grid
from .error_metrics import mean_squared_error
from .sanity_check import (
    field_support_info,
    grid_info,
    output_grid_info,
    propagation_regime,
    propagation_sanity_check,
    representative_distances,
)

__all__ = [
    "make_grid",
    "freq_grid",
    "k_freq_grid",
    "fft2c",
    "ifft2c",
    "asm",
    "fraunhofer",
    "fresnel_fft",
    "fresnel_tf",
    "visualize",
    "visualize_grid",
    "mean_squared_error",
    "grid_info",
    "propagation_sanity_check",
    "field_support_info",
    "output_grid_info",
    "propagation_regime",
    "representative_distances",
]
