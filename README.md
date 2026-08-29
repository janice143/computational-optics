# Computational Optics Lab

A Quarto website for field notes and reproducible numerical experiments in computational optics.

## Quick start

### 1. Install Quarto

On macOS with Homebrew:

```bash
brew install --cask quarto
quarto --version
```

For Windows, Linux, or a manual macOS installation, use the [official Quarto installation guide](https://quarto.org/docs/get-started/).

### 2. Get the repository

```bash
git clone https://github.com/janice143/computational-optics.git
cd computational-optics
```

If the repository is already on your machine, open a terminal in its root directory instead.

### 3. Start the local website

```bash
quarto preview
```

Quarto opens the site in a browser and automatically refreshes it when `_quarto.yml`, `index.qmd`, or an article changes. Press `Ctrl+C` in the terminal to stop the preview server.

## Common commands

| Command | Purpose |
| --- | --- |
| `quarto preview` | Start the local site with automatic reload. |
| `quarto preview --render all` | Fully render every page before starting the preview. |
| `quarto preview --port 4200` | Start the preview on a fixed port. |
| `quarto preview --no-browser` | Start the preview without opening a browser. |
| `quarto render` | Build the complete static site into `_site/`. |
| `quarto render index.qmd` | Render only the home page. |
| `quarto render blogs/article.qmd` | Render one article while editing it. |

Before publishing, always run a complete build:

```bash
quarto render
```

The generated static HTML, styles, search index, and copied assets are written to `_site/`. This directory is generated output and is not committed to Git.

## Write a field note

Add a `.qmd` or `.md` file under `blogs/` with Quarto front matter:

```yaml
---
title: "Article title"
subtitle: "Optional subtitle"
description: "A short summary used by the article listing."
date: 2026-08-28
categories: [wave optics, Python]
image: ../assets/figures/example.png
---
```

The home-page listing discovers articles in `blogs/` automatically. Use `draft: true` in the front matter when an article should remain visible in local preview but should not appear on the published site.

## Regenerate the figures

Python is not required to preview or render the current website. It is only needed when regenerating the numerical figures.

Create an isolated Python environment and install the dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Generate all figures used by the current propagation article:

```bash
python numerical-simulation/three-propagation-models-clean-version.py \
  --output-dir assets/figures
```

To run the simulation interactively and display the Matplotlib windows instead:

```bash
python numerical-simulation/three-propagation-models-clean-version.py
```

When finished, leave the virtual environment with:

```bash
deactivate
```

## Project structure

```text
computational-optics/
├── _quarto.yml               # Site configuration
├── index.qmd                  # Home page and article listing
├── blogs/                     # Markdown and Quarto field notes
├── numerical-simulation/
│   ├── grids.py               # Spatial, frequency, and wavevector grids
│   ├── propagation/           # ASM, two Fresnel forms, and Fraunhofer
│   ├── comparison/            # Interpolation and error metrics
│   └── three-propagation-models-clean-version.py
├── assets/figures/            # Generated figures used by articles
├── tests/                      # Numerical-module unit tests
├── requirements.txt           # Python simulation dependencies
└── .github/workflows/         # GitHub Pages publishing workflow
```

Run the numerical-module tests from the repository root:

```bash
python -m unittest discover -s tests -v
```

## Publish

Pushing to `master` runs the Quarto workflow in `.github/workflows/publish.yml` and publishes the rendered site to the `gh-pages` branch.

If this is the repository's first Pages deployment, allow read/write workflow permissions under **Settings → Actions → General**, then confirm the `gh-pages` branch under **Settings → Pages**.

The expected public URL is:

```text
https://janice143.github.io/computational-optics/
```

## Troubleshooting

- `quarto: command not found`: restart the terminal after installation, then run `quarto --version`.
- Preview port already in use: choose another port, for example `quarto preview --port 4201`.
- A global configuration change is not visible: stop the preview and restart it with `quarto preview --render all`.
- A figure does not render: check that its path is relative to the article file and that the file exists under `assets/figures/`.
