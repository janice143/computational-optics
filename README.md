# Computational Optics Lab

A working notebook for translating optical models into inspectable Python experiments — field notes, numerical implementations, and the evidence needed to check whether a simulation represents the intended physical system.

The current focus is scalar wave propagation: connecting the Helmholtz equation, diffraction approximations, FFT conventions, physical coordinates, and quantitative comparisons in runnable Python.

## Articles

The published articles are hosted at:

**<https://janice143.github.io/computational-optics/>**

- [Numerical Wave Propagation from Scratch — Fresnel, Fraunhofer, and the Angular Spectrum Method](https://janice143.github.io/computational-optics/blogs/Numerical%20Wave%20Propagation%20from%20Scratch%2C%20Fresnel%2C%20Fraunhofer%2C%20and%20the%20Angular%20Spectrum%20Method.html) — derives three scalar propagation models, implements them with FFTs, and compares their approximation regimes and numerical pitfalls.
- [Why Numerical Optics Needs a Sanity Check Before Simulation](https://janice143.github.io/computational-optics/blogs/Why%20Numerical%20Optics%20Needs%20a%20Sanity%20Check%20Before%20Simulation.html) — an ablation study showing how FFT grid size and sampling can dominate the result of a wave-propagation simulation, and what sanity checks to run before trusting the output.

## Repository layout

```text
computational-optics/
├── blogs/                       # Article sources
├── numerical-simulation/
│   ├── wave_optics/             # wave_optics package: grids, FFT, propagation models, sanity checks
│   └── three-propagation-models-clean-version.ipynb
└── assets/figures/              # Generated figures, one subdirectory per article
```

## Regenerate figures

The article figures are produced by the experiment notebook's script form:

```bash
python numerical-simulation/three-propagation-models-clean-version.py \
  --output-dir assets/figures/wave-propagation
```

The committed figures are what the published site serves, so regeneration is only needed after changing the simulation code.