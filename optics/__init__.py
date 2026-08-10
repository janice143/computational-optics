"""optics - shared physics core for the Computational Optics Lab."""
from .wave import (
    initial_gaussian,
    initial_triangle,
    initial_square,
    initial_sin,
    step_wave,
    simulate_wave,
    compute_curvature,
)

__all__ = [
    'initial_gaussian',
    'initial_triangle',
    'initial_square',
    'initial_sin',
    'step_wave',
    'simulate_wave',
    'compute_curvature',
]
