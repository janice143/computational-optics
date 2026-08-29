---
title: "Why Numerical Optics Needs a Sanity Check Before Simulation"
subtitle: "FFT grids, sampling, and what to check before interpreting the result"
description: "An ablation study showing how FFT grid size and sampling can dominate the result of a wave-propagation simulation, and what sanity checks to run before trusting the output."
date: 2026-08-30
author: "Yanping Lan"
categories: [wave optics, numerical methods, debugging, Python]
toc: true
toc-depth: 3
code-fold: show
---

::: {.callout-note title="Runnable code"}
The code is organized by responsibility:

- One-shot sanity report: [`propagation_sanity_check.py`](../numerical-simulation/wave_optics/sanity_check/propagation_sanity_check.py).
- Pure helpers (no print): [`grid_sanity_check.py`](../numerical-simulation/wave_optics/sanity_check/grid_sanity_check.py), [`field_support_info.py`](../numerical-simulation/wave_optics/sanity_check/field_support_info.py), [`output_grid_info.py`](../numerical-simulation/wave_optics/sanity_check/output_grid_info.py), and [`propagation_regime.py`](../numerical-simulation/wave_optics/sanity_check/propagation_regime.py).
- Complete runnable experiment and plotting workflow: [`three-propagation-models-clean-version.ipynb`](../numerical-simulation/three-propagation-models-clean-version.ipynb).
:::


Numerical wave propagation can fail even when the physical equation and the code are both correct.

While comparing Fresnel, Fraunhofer, and Angular Spectrum propagation, I encountered a result that initially looked reasonable but behaved incorrectly under quantitative comparison. The problem was not the diffraction theory itself. It came from the numerical grid used to represent the optical field.

This experiment led to a simple lesson:

$$
\boxed{
\text{correct propagation equation}
\neq
\text{reliable numerical simulation}
}
$$

Before interpreting a simulated optical field, the numerical sampling conditions should first be checked.


## 1. The Original Experiment

The experiment used a square aperture propagated with three methods:

- Angular Spectrum Method (ASM)
- Fresnel diffraction
- Fraunhofer diffraction

The initial parameters were approximately

$$
N=512,
\qquad
\Delta x=2\,\mu m,
\qquad
\lambda=532\,nm,
$$

with a square aperture of width

$$
a=100\,\mu m.
$$

The same field was propagated over several distances, and the normalized central intensity profiles were compared in **Figure 1**.

![[Pasted image 20260830005446.png]]

![[Pasted image 20260830005440.png]]
![[Pasted image 20260830005425.png]]
**Figure 1** compares the three propagation models at three representative distances. Each column corresponds to one propagation method—ASM, Fresnel, and Fraunhofer—while the three rows represent near-field ($z=1\,\mathrm{mm}$), transitional ($z=10\,\mathrm{mm}$), and far-field ($z=100\,\mathrm{mm}$) propagation.

At $z=1\,\mathrm{mm}$, ASM and Fresnel give nearly identical compact diffraction patterns, while the Fraunhofer model is not expected to be valid in this near-field regime. At $z=10\,\mathrm{mm}$, the ASM and Fresnel fields begin to spread and develop clearer diffraction structure, indicating the transition toward the far field.

At $z=100\,\mathrm{mm}$, the ASM and Fresnel fields have expanded to nearly fill the fixed computational window. The pattern appears truncated near the boundaries, with additional grid-like numerical structures visible across the field. Since the expected diffraction scale is already comparable to the numerical window size, the original grid is no longer sufficient to represent the propagated field reliably.

The Fraunhofer panels are plotted on their native output coordinates,
$$
x_{\mathrm{out}}=\lambda z f_x,
$$
so their apparent spatial extent should not be compared directly with the fixed output window used by ASM and transfer-function Fresnel propagation.

These observations suggested that the unexpected far-field behavior was caused not only by model approximation, but also by the numerical representation itself. This motivated a closer examination of the computational window, spatial-frequency sampling, and possible FFT boundary artifacts.



![[Pasted image 20260830010347.png]]
**Figure 2**. MSE between normalized central intensity profiles for ASM vs Fresnel and Fresnel vs Fraunhofer using the original $N=512$ grid. The unexpected increase in the Fresnel–Fraunhofer error at $z=100\,\mathrm{mm}$ indicates that numerical limitations begin to contaminate the far-field comparison.

Figure 2 shows the MSE between the normalized central intensity profiles produced by the three propagation models. ASM and Fresnel remain close at all three propagation distances, although their difference increases slightly at $z=100\,\mathrm{mm}$.  

The Fresnel–Fraunhofer comparison shows a more suspicious trend. The error is large at $z=1\,\mathrm{mm}$, drops to nearly zero at $z=10\,\mathrm{mm}$, but then increases again at $z=100\,\mathrm{mm}$. The large error in the near field is expected because the Fraunhofer approximation is not valid there. However, the increase at $100\,\mathrm{mm}$ is unexpected: as the propagation enters the far-field regime, Fraunhofer diffraction should approach the Fresnel result rather than diverge from it.

Together with the truncated field observed in Figure 1, this rebound suggests that the error at large propagation distance is dominated by the numerical representation rather than by the physical approximation itself. This motivated a closer examination of the computational window and spatial-frequency sampling.

对，后半段现在最大的问题不是内容错，而是从 Figure 2 之后突然变成了“教材式介绍 sampling”，把前面已经建立起来的故事线打断了。

而且有一个地方应该收紧：你目前通过 $N=512\rightarrow1024$ 的实验只能确定“原来的 numerical grid 不够稳定”，但因为这个操作同时改变了

$$
L=N\Delta x
$$

和

$$
\Delta f=\frac{1}{N\Delta x},
$$

还不能单独证明到底是 window size 还是 frequency resolution 哪一个占主导。所以文章最好不要过早下结论说就是 wrap-around 或 frequency undersampling。

我建议 Figure 2 后直接变成这个逻辑：

$$
\boxed{
\text{abnormal result}
\rightarrow
\text{check physical scale}
\rightarrow
\text{inspect numerical grid}
\rightarrow
\text{change }N
\rightarrow
\text{compare again}
\rightarrow
\text{generalize into sanity check}
}
$$

下面这部分可以直接替换你现在的 Section 2–8。

---

## 2. Diagnosing the Problem

The results in Figures 1 and 2 suggest that the propagation equations themselves are not the only source of error. The next question is therefore not *which propagation model is wrong*, but whether the numerical grid is capable of representing the propagated field.

### 2.1 Compare the Expected Physical Scale with the Numerical Window

For the square aperture used in this experiment, the first Fraunhofer zero along one direction is approximately

$$
x_1=\frac{\lambda z}{a}.
$$

At

$$
z=100\,\mathrm{mm},
$$

with

$$
a=100\,\mu m,
\qquad
\lambda=532\,nm,
$$

this gives

$$
x_1\approx0.532\,\mathrm{mm}.
$$

The original simulation used

$$
N=512,
\qquad
\Delta x=2\,\mu m,
$$

so the total computational window was

$$
L=N\Delta x=1.024\,\mathrm{mm},
$$

corresponding to approximately

$$
[-0.512,\,+0.512]\,\mathrm{mm}.
$$

The expected first diffraction zero is therefore already close to the boundary of the numerical window.

This agrees with the visual behavior in Figure 1: at $z=100\,\mathrm{mm}$, the ASM and Fresnel fields nearly fill the available computational domain.

---

### 2.2 The Numerical Parameters Are Coupled

The numerical grid is determined by several related quantities:

$$
L=N\Delta x,
$$

$$
\Delta f=\frac{1}{N\Delta x},
$$

and

$$
f_{\mathrm{Nyquist}}
=
\frac{1}{2\Delta x}.
$$

These quantities cannot be chosen independently.

If $\Delta x$ is kept fixed while $N$ is increased,

$$
N\uparrow
\quad\Rightarrow\quad
L\uparrow,
$$

while

$$
N\uparrow
\quad\Rightarrow\quad
\Delta f\downarrow.
$$

The simulation therefore gains both a larger physical window and a finer spatial-frequency grid.

The maximum representable spatial frequency,

$$
f_{\mathrm{Nyquist}},
$$

does not change, because it depends only on $\Delta x$.

This means that increasing $N$ does more than simply add pixels: it changes the numerical representation of the same physical system.

---

### 2.3 Output Coordinates Must Also Be Interpreted Correctly

The three propagation methods do not necessarily produce fields on the same native output coordinates.

For ASM and transfer-function Fresnel propagation,

$$
\Delta x_{\mathrm{out}}
=
\Delta x_{\mathrm{in}}.
$$

Fraunhofer diffraction instead maps spatial frequency to physical position through

$$
x_{\mathrm{out}}
=
\lambda z f_x.
$$

Therefore, two arrays with the same shape may correspond to different physical fields of view.

In the comparison above, the Fraunhofer field was converted to its physical output coordinates before the central profiles were compared. This avoids directly comparing pixel indices that represent different physical positions.

However, coordinate consistency alone does not guarantee that the underlying fields are adequately sampled.

---

## 3. A Simple Convergence Test

Rather than immediately modifying the propagation algorithms, I repeated the same experiment while changing only the number of samples:

$$
N=512
\rightarrow
N=1024.
$$

The following physical parameters were kept unchanged:

$$
\Delta x,
\qquad
\lambda,
\qquad
z,
\qquad
a.
$$

This is important: changing $N$ does **not** change whether the physical system is in the Fresnel or Fraunhofer regime. Those conditions are determined by physical quantities such as aperture size, wavelength, and propagation distance.

What changes is the numerical representation.

For $N=512$,

$$
L=1.024\,\mathrm{mm},
$$

while for $N=1024$,

$$
L=2.048\,\mathrm{mm}.
$$

At the same time,

$$
\Delta f
$$

is reduced by a factor of two.

![[Pasted image 20260830011858.png]]
![[Pasted image 20260830011910.png]]
![[Pasted image 20260830011916.png]]
**Figure 3**. Propagation results after increasing the grid size from $N=512$ to $N=1024$ while keeping $\Delta x$, wavelength, aperture size, and propagation distances unchanged. At $z=100\,\mathrm{mm}$, the ASM and Fresnel fields are now contained within the computational window and show substantially better agreement than in Figure 1.

Figure 3 shows the same propagation experiment repeated with $N=1024$, while keeping the physical parameters and spatial sampling interval $\Delta x$ unchanged. Compared with Figure 1, the most visible improvement occurs at $z=100\,\mathrm{mm}$. The ASM and Fresnel fields now fit comfortably inside the enlarged computational window instead of extending to the boundaries. Their overall diffraction envelopes also agree closely, with only weak residual grid-like structures remaining.

At $z=1\,\mathrm{mm}$ and $z=10\,\mathrm{mm}$, the ASM and Fresnel results remain nearly identical to each other, as in the original simulation. The main change therefore appears at the largest propagation distance, where the original $N=512$ grid was insufficient to represent the expanded field reliably.

Increasing $N$ from 512 to 1024 did not change the physical propagation regime. Instead, it doubled the computational window,
$$
L:1.024\,\mathrm{mm}\rightarrow2.048\,\mathrm{mm},
$$
while also reducing the spatial-frequency spacing,
$$
\Delta f=\frac{1}{N\Delta x},
$$
by a factor of two. The improved result therefore indicates that the abnormal far-field behavior in Figure 1 was strongly dependent on the numerical grid.

---

## 4. Corrected Comparison

The central intensity profiles were then recomputed using the larger grid.


![[Pasted image 20260830011955.png]]
**Figure 4**. Normalized central intensity profiles for ASM, Fresnel, and Fraunhofer propagation using $N=1024$. From left to right, the propagation distance increases from $1\,\mathrm{mm}$ to $100\,\mathrm{mm}$. Fraunhofer diffraction differs strongly in the near field but progressively approaches the Fresnel result as the system enters the far-field regime.

Figure 4 compares the normalized central intensity profiles after increasing the grid size to $N=1024$. The three panels correspond to $z=1\,\mathrm{mm}$, $10\,\mathrm{mm}$, and $100\,\mathrm{mm}$, respectively.
At $z=1\,\mathrm{mm}$, ASM and Fresnel remain close, while the Fraunhofer profile differs strongly in both width and structure. This is expected because the far-field approximation is not valid at such a short propagation distance.

At $z=10\,\mathrm{mm}$, the three profiles begin to approach one another. ASM and Fresnel still agree closely, while the Fraunhofer result captures the main central feature but does not yet reproduce all of the Fresnel diffraction structure.

At $z=100\,\mathrm{mm}$, the overall envelopes of all three methods become very similar. In particular, the Fraunhofer profile closely follows the Fresnel envelope, consistent with Fraunhofer diffraction being the far-field limit of Fresnel diffraction. The ASM and Fresnel curves still contain small high-frequency fluctuations around the smooth envelope, indicating that some residual numerical discretization effects remain.

The progression from left to right therefore shows the expected physical relationship:
$$
\boxed{
\text{ASM}\approx\text{Fresnel}
\quad\text{and, with increasing }z,\quad
\text{Fraunhofer}\rightarrow\text{Fresnel}.
}
$$

Compared with the original $N=512$ simulation, the corrected profiles also show that the large discrepancy observed at $z=100\,\mathrm{mm}$ was strongly influenced by the numerical grid rather than by the propagation models themselves.

![[Pasted image 20260830012407.png]]
**Figure 5**. Normalized central intensity profiles for ASM, Fresnel, and Fraunhofer propagation using $N=512$. From left to right, the propagation distance increases from $1\,\mathrm{mm}$ to $100\,\mathrm{mm}$. 


The corresponding MSE comparison also becomes more physically interpretable.

![[Pasted image 20260830012010.png]]
**Figure 6**. MSE between normalized central intensity profiles using $N=1024$. ASM and Fresnel remain closely matched over the tested propagation distances, while the Fresnel–Fraunhofer discrepancy decreases strongly as the field approaches the far-field regime. The small residual increase at $z=100\,\mathrm{mm}$ is substantially lower than that obtained with the original $N=512$ grid.

Figure 6 shows the MSE between the normalized central intensity profiles after increasing the grid size to $N=1024$.

The ASM–Fresnel error remains very small over all three propagation distances, although it increases slightly at $z=100\,\mathrm{mm}$. This is consistent with the close agreement between the two profiles observed in Figure 4, with only small residual numerical fluctuations remaining at the longest propagation distance.

The Fresnel–Fraunhofer comparison shows a much stronger dependence on propagation distance. At $z=1\,\mathrm{mm}$, the MSE is approximately $0.125$, reflecting the failure of the far-field approximation in the near field. At $z=10\,\mathrm{mm}$, the error drops to nearly zero as the Fraunhofer profile begins to approach the Fresnel result.

At $z=100\,\mathrm{mm}$, the error increases slightly again, but remains much smaller than in the original $N=512$ simulation. Combined with the profile comparison in Figure 4, this small rebound is more consistent with residual numerical discretization error than with a breakdown of the Fraunhofer approximation.

Most importantly, increasing $N$ substantially reduces the large far-field error observed with the original grid. This confirms that the previous rebound was strongly dependent on the numerical representation rather than being an inherent feature of the diffraction models.

---

## 5. What the Test Actually Proves

It is tempting to conclude that the original problem was caused by one specific numerical effect. However, increasing $N$ while keeping $\Delta x$ fixed changes two quantities simultaneously:

$$
L\uparrow
$$

and

$$
\Delta f\downarrow.
$$

Therefore, this experiment alone does not isolate whether the dominant error came from the finite computational window, insufficient frequency-grid resolution, or a combination of both.

What it does establish is more fundamental:

$$
\boxed{
\text{the original simulation was not numerically converged}.
}
$$

A numerical result should not be trusted if a reasonable change in the sampling grid substantially changes the physical result.

This leads naturally to the idea of a sanity check.

---

## 6. What Should Be Checked Before Simulation?

A numerical propagation experiment should begin with a few physical and numerical scale checks. Parameters such as $N$, $\Delta x$, aperture size, wavelength, and propagation distance are coupled, so they should not be selected independently.

### 6.1 Spatial Sampling

The physical size of the computational window is

$$
L=N\Delta x.
$$

The first question is whether the input field itself is adequately represented on this grid.

For example, a $100\,\mu m$ aperture sampled with

$$
\Delta x=2\,\mu m
$$

contains approximately 50 samples across its width, which is sufficient to represent its basic geometry.

For more complicated fields, rapidly varying amplitude or phase may require much finer sampling.

The basic questions are:

- Is the smallest spatial feature resolved by enough pixels?
- Does the input field occupy only a reasonable fraction of the total computational window?
- Is there enough empty space for the field to spread during propagation?

---

### 6.2 Computational Window

The total field of view is

$$
L=N\Delta x.
$$

This should be compared with the expected physical size of the propagated field.

For a square aperture of width $a$, the first Fraunhofer zero is approximately

$$
x_1\approx\frac{\lambda z}{a}.
$$

If $x_1$ becomes comparable to $L/2$, even the central diffraction structure is approaching the numerical boundary.

This is exactly what happened in the original $N=512$ simulation at $z=100\,\mathrm{mm}$.

---

### 6.3 Spatial-Frequency Sampling

The Fourier-frequency spacing is

$$
\Delta f=\frac{1}{N\Delta x},
$$

while the Nyquist limit is

$$
f_{\mathrm{Nyquist}}
=
\frac{1}{2\Delta x}.
$$

These quantities describe two different properties of the frequency grid:

$$
\Delta f
$$

controls how finely the spatial-frequency domain is sampled, while

$$
f_{\mathrm{Nyquist}}
$$

determines the maximum spatial frequency that can be represented.

Therefore,

$$
N\uparrow
$$

with fixed $\Delta x$ gives finer frequency resolution, while

$$
\Delta x\downarrow
$$

extends the representable frequency bandwidth.

Both may matter in wave-propagation simulations.

---

### 6.4 Propagation Regime

The propagation distances should also be chosen from physical scales rather than arbitrarily.

For an aperture with characteristic transverse width $D$, a useful diffraction distance is

$$
z_{\mathrm{diff}}
\sim
\frac{D^2}{\lambda}.
$$

This provides a rough scale separating different propagation regimes:

$$
z\ll z_{\mathrm{diff}}
$$

corresponds to relatively near-field propagation,

$$
z\sim z_{\mathrm{diff}}
$$

describes the transition region, and

$$
z\gg z_{\mathrm{diff}}
$$

approaches the Fraunhofer far field.

For the current experiment,

$$
D=100\,\mu m,
\qquad
\lambda=532\,nm,
$$

giving

$$
z_{\mathrm{diff}}
\approx
\frac{(100\times10^{-6})^2}{532\times10^{-9}}
\approx
18.8\,\mathrm{mm}.
$$

The three propagation distances were therefore selected deliberately:

$$
1\,\mathrm{mm}
\ll
18.8\,\mathrm{mm},
$$

$$
10\,\mathrm{mm}
\sim
18.8\,\mathrm{mm},
$$

and

$$
100\,\mathrm{mm}
\gg
18.8\,\mathrm{mm}.
$$

They approximately represent near-field, transitional, and far-field propagation.

This gives the comparison a physical meaning: the experiment is not simply testing three arbitrary values of $z$, but following the diffraction pattern across different propagation regimes.

---

### 6.5 Output Coordinates

Different numerical propagation methods may use different native output grids.

For ASM and transfer-function Fresnel propagation,

$$
\Delta x_{\mathrm{out}}
=
\Delta x_{\mathrm{in}},
$$

whereas Fraunhofer diffraction maps spatial frequency to physical position through

$$
x_{\mathrm{out}}
=
\lambda z f_x.
$$

Therefore, the following should always be checked before comparing two propagated fields:

- Do they cover the same physical region?
- Do they have the same physical sampling interval?
- If not, has one field been interpolated onto a common physical coordinate grid?

Array shape alone is not sufficient for comparison.

---

### 6.6 Numerical Convergence

Even if all analytical estimates appear reasonable, the final result should still be tested numerically.

A simple convergence test is to repeat the simulation while changing one numerical parameter, for example

$$
N=512,\quad1024,\quad2048,
$$

and compare the fields over the same physical region.

A reliable simulation should eventually satisfy approximately

$$
I_{N=1024}(x)
\approx
I_{N=2048}(x).
$$

If changing the numerical grid substantially changes the propagated field, the simulation has not yet converged.

Ideally, $N$ and $\Delta x$ should also be varied separately, because they control different numerical properties.

---

### 6.7 Basic Physical Consistency Checks

Several simple checks can also catch implementation errors:

- Does propagation over $z=0$ reproduce the input field?
- Does a symmetric input produce the expected symmetric diffraction pattern?
- Does the result agree with a known analytical case when one is available?
- Is the field approaching the numerical boundary?
- Are intensity normalization and physical units handled consistently?
- Do qualitatively different propagation methods agree where their validity ranges overlap?

These tests are inexpensive compared with interpreting an incorrect simulation.

---

A practical sanity-check sequence is therefore

$$
\boxed{
\text{input sampling}
\rightarrow
\text{window size}
\rightarrow
\text{frequency grid}
\rightarrow
\text{propagation regime}
\rightarrow
\text{output coordinates}
\rightarrow
\text{convergence test}
}
$$

The purpose is not to find one universally correct set of numerical parameters. It is to verify that the chosen grid is capable of representing the particular optical problem being simulated.
