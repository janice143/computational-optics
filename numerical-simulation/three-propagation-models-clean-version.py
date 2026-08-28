"""
Compare three propagation models (ASM, Fresnel, Fraunhofer) on a square
aperture. Plain-matplotlib rewrite of three-propagation-models-clean-version.ipynb:
no wave_optics.visualize / visualize_grid dependency.
"""

import numpy as np
import matplotlib.pyplot as plt


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def mse(a, b):
    return np.mean((a - b) ** 2)


def show_intensity(ax, field, x_axis, y_axis, title):
    """Draw |field|^2 on a given matplotlib axis."""
    ax.imshow(
        np.abs(field) ** 2,
        extent=[x_axis.min(), x_axis.max(), y_axis.min(), y_axis.max()],
        origin="lower",
        aspect="auto",
        cmap="gray",
    )
    ax.set_xlabel("x (mm)")
    ax.set_ylabel("y (mm)")
    ax.set_title(title)


def compare_cross_section_intensity(ax, p_asm, p_fresnel, p_fraunhofer, x, x_far):
    ax.plot(x * 1000, p_asm, label="ASM")
    ax.plot(x * 1000, p_fresnel, label="Fresnel")
    ax.plot(x_far * 1000, p_fraunhofer, label="Fraunhofer")
    ax.set_xlabel("x (mm)")
    ax.set_ylabel("Intensity")
    ax.set_title("Central cross-section intensity")
    ax.grid()
    ax.legend()


# --------------------------------------------------------------------------- #
# propagation models
# --------------------------------------------------------------------------- #
def fresnel(U0, z, wavelength, dx, dy):
    Ny, Nx = U0.shape
    k = 2 * np.pi / wavelength

    fx = np.fft.fftfreq(Nx, d=dx)
    fy = np.fft.fftfreq(Ny, d=dy)
    FX, FY = np.meshgrid(fx, fy)

    H = np.exp(1j * k * z) * np.exp(-1j * np.pi * wavelength * z * (FX**2 + FY**2))

    U0_f = np.fft.fft2(U0)
    Uz = np.fft.ifft2(U0_f * H)

    return Uz


def fraunhofer(U0, z, wavelength, dx, dy):
    Ny, Nx = U0.shape
    k = 2 * np.pi / wavelength

    fx = np.fft.fftshift(np.fft.fftfreq(Nx, d=dx))
    fy = np.fft.fftshift(np.fft.fftfreq(Ny, d=dy))

    x_out = wavelength * z * fx
    y_out = wavelength * z * fy
    X_out, Y_out = np.meshgrid(x_out, y_out)

    spectrum = np.fft.fftshift(np.fft.fft2(np.fft.ifftshift(U0))) * dx * dy

    prefactor = (
        np.exp(1j * k * z)
        / (1j * wavelength * z)
        * np.exp(1j * k / (2 * z) * (X_out**2 + Y_out**2))
    )

    Uz = prefactor * spectrum

    return Uz, x_out, y_out


def asm(U0, z, wavelength, dx, dy):
    Ny, Nx = U0.shape

    k = 2 * np.pi / wavelength

    fx = np.fft.fftfreq(Nx, d=dx)
    fy = np.fft.fftfreq(Ny, d=dy)

    kx = 2 * np.pi * fx
    ky = 2 * np.pi * fy

    KX, KY = np.meshgrid(kx, ky)

    KZ = np.sqrt(k**2 - KX**2 - KY**2 + 0j)

    H = np.exp(1j * KZ * z)

    U0_f = np.fft.fft2(U0)
    Uz = np.fft.ifft2(U0_f * H)

    return Uz


# --------------------------------------------------------------------------- #
# experiment
# --------------------------------------------------------------------------- #
def main():
    # --- physical / numerical parameters -----------------------------------
    Nx = 512
    Ny = 512

    dx = 2e-6
    dy = 2e-6

    wavelength = 532e-9

    ax = 100e-6
    ay = 100e-6

    x = (np.arange(Nx) - Nx // 2) * dx
    y = (np.arange(Ny) - Ny // 2) * dy

    X, Y = np.meshgrid(x, y)

    x_mm = x * 1000
    y_mm = y * 1000

    # --- initial field: square aperture ------------------------------------
    U0 = ((np.abs(X) <= ax / 2) & (np.abs(Y) <= ay / 2)).astype(float)

    plt.figure()
    plt.imshow(
        U0,
        extent=[x.min(), x.max(), y.min(), y.max()],
        origin="lower",
        aspect="auto",
        cmap="gray",
    )
    plt.colorbar()
    plt.xlabel("x")
    plt.ylabel("y")
    plt.title("Initial square aperture")
    plt.show()

    # --- propagation distances --------------------------------------------
    print(f"z_diff = {ax**2 / wavelength} mm")

    z_list = [1e-3, 10e-3, 100e-3]

    error_af = []
    error_ff = []
    data1 = []

    # --- propagate and compare 2D intensities -----------------------------
    for z in z_list:
        U_asm = asm(U0, z, wavelength, dx, dy)
        U_fresnel = fresnel(U0, z, wavelength, dx, dy)
        U_fraunhofer, x_far, y_far = fraunhofer(U0, z, wavelength, dx, dy)

        I_asm = np.abs(U_asm) ** 2
        I_asm /= I_asm.max()

        I_fresnel = np.abs(U_fresnel) ** 2

        I_fraunhofer = np.abs(U_fraunhofer) ** 2
        I_fraunhofer /= I_fraunhofer.max()

        fig, axes = plt.subplots(1, 3, figsize=(15, 5))
        show_intensity(
            axes[0], U_asm, x_mm, y_mm, f"ASM, z = {z} m"
        )
        show_intensity(
            axes[1], U_fresnel, x_mm, y_mm, f"Fresnel, z = {z} m"
        )
        show_intensity(
            axes[2], U_fraunhofer, x_far * 1000, y_far * 1000, f"Fraunhofer, z = {z} m"
        )
        plt.tight_layout()
        plt.show()

        mid = Ny // 2

        p_asm = I_asm[mid, :]
        p_fresnel = I_fresnel[mid, :]
        p_fraunhofer = I_fraunhofer[mid, :]
        data1.append([z, p_asm.copy(), p_fresnel.copy(), p_fraunhofer.copy(), x_far.copy()])

        # ASM vs Fresnel
        error_af.append(mse(p_asm, p_fresnel))

        # Fraunhofer -> common physical coordinates
        p_far_interp = np.interp(x, x_far, p_fraunhofer, left=np.nan, right=np.nan)

        valid = np.isfinite(p_far_interp)

        error_ff.append(mse(p_fresnel[valid], p_far_interp[valid]))

    # --- central cross-sections at each distance --------------------------
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    for axi, d in enumerate(data1):
        compare_cross_section_intensity(axes[axi], d[1], d[2], d[3], x, d[4])
        axes[axi].set_title(f"z = {d[0]} m")
    plt.tight_layout()
    plt.show()

    # --- error analysis ----------------------------------------------------
    plt.figure()
    plt.semilogx(z_list, error_af, label="ASM vs Fresnel")
    plt.semilogx(z_list, error_ff, label="Fresnel vs Fraunhofer")
    plt.xlabel("Propagation distance z [m]")
    plt.ylabel("MSE")
    plt.legend()
    plt.show()


if __name__ == "__main__":
    main()