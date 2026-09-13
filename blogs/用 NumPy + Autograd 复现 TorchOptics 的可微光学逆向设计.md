---
title: "用 NumPy + Autograd 复现 TorchOptics 的可微光学逆向设计"
subtitle: "从可微 ASM、模式重叠损失到 Adam 优化三块相位调制器"
description: "不用 PyTorch，从头搭建可微 Fourier optics 链路，理解光场传播如何接入自动微分与逆向设计。"
date: 2026-09-14
author: "Yanping Lan"
categories: [differentiable optics, inverse design, Python, automatic differentiation]
toc: true
toc-depth: 3
code-fold: show
---

::: {.callout-note title="Runnable code"}
完整项目见 [GitHub 仓库](https://github.com/janice143/computational-optics)，代码按职责组织如下：

- 完整可运行实验：[`autograd-inverse-design.ipynb`](../numerical-simulation/autograd-inverse-design.ipynb)，包含可微 ASM、Gaussian 输入与目标场、mode-overlap loss、Autograd 梯度、Adam 优化，以及最终光场和三张相位图的可视化。
- 正文中的代码片段均摘自该 notebook，并按计算链路拆分讲解。
:::

最近在学习论文 [*TorchOptics: An open-source Python library for differentiable Fourier optics simulations*](https://arxiv.org/abs/2411.18591)。

## 一、问题场景：用三块相位调制器完成光束变换

### 优化目标

> 给定一个输入光场和目标光场，不再人工设计每一块相位板，而是把相位分布当成待优化参数，通过光场传播、loss 和梯度下降，自动寻找合适的 phase profile。

论文 Figure 4 给出了一个很小但非常完整的例子：

$$
\text{Gaussian beam}
\rightarrow
M_1
\rightarrow P
\rightarrow
M_2
\rightarrow P
\rightarrow
M_3
\rightarrow P
\rightarrow
\text{four Gaussian beams}.
$$

### 光学系统布局

其中三块 phase modulator 分别位于

$$
z=0,\quad 0.2,\quad 0.4\ {\rm m},
$$

目标平面位于

$$
z=0.6\ {\rm m}.
$$

### 数值参数

论文使用 $250\times250$ 的采样网格、$10\,\mu{\rm m}$ pixel spacing、$700\,{\rm nm}$ 波长和 $150\,\mu{\rm m}$ Gaussian waist，并用 Adam、$lr=0.1$ 训练 400 iterations。

### 初始条件与待优化参数

输入是 waist 为 $150\,\mu{\rm m}$ 的单束 Gaussian，目标是在四个指定位置形成四束 Gaussian。三块调制器的 phase profile

$$
\phi_1(x,y),\quad \phi_2(x,y),\quad \phi_3(x,y)
$$

均从零相位开始，因此初始系统只是让输入 Gaussian 在自由空间传播 $0.6\,{\rm m}$。优化要寻找这三张 phase map，使输出 complex field 与目标 mode 尽可能重合。

---

## 二、整体思路：把传播模型接入梯度优化

TorchOptics 用 PyTorch 把这些步骤全部封装好了。但如果只调用：

```python
loss.backward()
optimizer.step()
```

其实很难真正理解 inverse design 到底发生了什么。

所以这次我不用 TorchOptics，而是只使用：

```text
NumPy
Autograd
Matplotlib
```

自己搭出完整链路：

$$
\boxed{
\text{phase}
\rightarrow
\text{optical propagation}
\rightarrow
\text{output field}
\rightarrow
\text{loss}
\rightarrow
\text{gradient}
\rightarrow
\text{Adam}
}
$$

这里真正想验证的并不是能不能重新造一个 TorchOptics，而是：

> 一个普通的 Fourier optics simulator，到底怎样变成一个可以做 inverse design 的 simulator？

---

### 从 forward simulation 到 inverse design

以前写光场传播时，我解决的问题通常是：

$$
U_0(x,y)
\overset{P}{\longrightarrow}
U_z(x,y).
$$

输入场、传播距离和系统参数都是已知的，我们只计算输出。

例如 Angular Spectrum Method：

$$
U_z
=
\mathcal F^{-1}
\left[
\mathcal F(U_0)
H_z
\right],
$$

其中 transfer function 为

$$
H_z(k_x,k_y)
=
\exp
\left[
iz\sqrt{k^2-k_x^2-k_y^2}
\right].
$$

这属于典型的 forward problem：

$$
\boxed{\text{已知 optical system，求 output}}
$$

inverse design 则反过来了。

我们知道输入：

$$
U_{\rm in},
$$

也知道希望得到的目标：

$$
U_{\rm target},
$$

但是不知道中间的 phase modulator 应该长什么样。

于是：

$$
\phi_1(x,y),\quad
\phi_2(x,y),\quad
\phi_3(x,y)
$$

变成待求参数。

问题就变成：

$$
\boxed{
\text{寻找 }
\phi_1,\phi_2,\phi_3
\text{，使 }
U_{\rm out}
\approx U_{\rm target}
}
$$

这已经和训练神经网络非常像了。

只是我们训练的不是 neural-network weight，而是一个真实光学系统中的 phase profile。

---

## 三、建立可优化的光学问题

### 三平面 phase modulator 的 forward model

每块 phase modulator 的 transmission function 为

$$
M_j(x,y)
=
e^{i\phi_j(x,y)}.
$$

所以通过一块 phase-only SLM 后：

$$
U'(x,y)
=
U(x,y)e^{i\phi_j(x,y)}.
$$

三块调制器组成的完整 forward model 为：

$$
U_1
=
U_{\rm in}e^{i\phi_1},
$$

$$
U_2
=
P_{z}(U_1)e^{i\phi_2},
$$

$$
U_3
=
P_{z}(U_2)e^{i\phi_3},
$$

最后

$$
U_{\rm out}
=
P_{z}(U_3).
$$

用代码写出来反而非常简单：

```python
def forward(U_in, phi1, phi2, phi3, H):
    U = phase_modulate(U_in, phi1)

    U = propagate(U, H)
    U = phase_modulate(U, phi2)

    U = propagate(U, H)
    U = phase_modulate(U, phi3)

    U = propagate(U, H)
    return U
```

这里的 `H` 是传播距离为 $0.2\,{\rm m}$ 的 ASM transfer function；三段自由空间传播使用同一个 `H`。`phase_modulate()` 与 `propagate()` 会在后文分别定义。这个函数就是整个 inverse-design forward model。

---

### 输入 Gaussian beam

输入使用 Gaussian field：

$$
U(x,y)
=
C
\exp
\left[
-\frac{
(x-x_0)^2+(y-y_0)^2
}{w_0^2}
\right].
$$

注意这里定义的是 field amplitude，而不是 intensity。

因此：

$$
I(x,y)=|U(x,y)|^2.
$$

代码：

```python
def gaussian_beam(w0, C, X, Y, x0=0.0, y0=0.0):
    R2 = (X - x0)**2 + (Y - y0)**2
    return C * np.exp(-R2 / w0**2)
```

采用论文参数：

```python
wavelength = 700e-9

Nx = 250
Ny = 250

dx = 10e-6
dy = 10e-6

w0 = 150e-6
```

所以整个 simulation window 为

$$
L=N\Delta x
=
250\times10\,\mu{\rm m}
=
2.5\,{\rm mm}.
$$

---

### 构造 four-Gaussian target

论文 Listing 2 并没有直接生成 target，而是：

```python
target_field = Field(torch.load("target.pt"), z=0.6)
```

也就是说，论文没有在 Listing 2 中给出四个 Gaussian 的具体位置参数。

因此这里并不是逐像素恢复论文的 `target.pt`，而是自己构造一个等价任务：

$$
U_{\rm target}
=
\sum_{j=1}^{4}
G_j(x,y).
$$

四个 Gaussian 分别位于：

$$
(-d,-d),\quad
(-d,d),\quad
(d,-d),\quad
(d,d).
$$

这里取：

$$
d=0.5\,{\rm mm}.
$$

代码：

```python
def four_gaussian_target(X, Y, offset, waist, C):
    centers = [
        (-offset, -offset),
        (-offset, +offset),
        (+offset, -offset),
        (+offset, +offset),
    ]

    U = np.zeros_like(X, dtype=np.complex128)

    for x0, y0 in centers:
        U += gaussian_beam(
            waist,
            C,
            X,
            Y,
            x0,
            y0,
        )

    return U
```

因此这里的目标是：

$$
\boxed{
\text{single Gaussian}
\rightarrow
\text{four Gaussian beams}
}
$$

---

### 归一化输入场与目标场

如果直接比较两个 field，它们的总功率也会影响 loss。

但现在真正关心的是：

> 输出 field 的 spatial mode 是否和 target 一样？

因此先定义 optical power：

$$
P
=
\iint |U(x,y)|^2dxdy.
$$

离散化以后：

$$
P
\approx
\sum_{m,n}
|U_{mn}|^2
\Delta x\Delta y.
$$

于是做 normalization：

```python
def normalize(U):
    power = (
        np.sum(np.abs(U)**2)
        * dx
        * dy
    )

    return U / np.sqrt(power)
```

这样：

$$
\iint |U|^2dxdy=1.
$$

输入场和 target 都进行归一化。

---

### Phase modulator 与零相位初始化

Phase-only modulator 不改变 amplitude，只改变 phase：

$$
U_{\rm out}
=
U_{\rm in}
e^{i\phi}.
$$

所以代码只有一行：

```python
def phase_modulate(U, phi):
    return U * anp.exp(1j * phi)
```

一开始我们完全不知道 phase profile 应该是什么，因此初始化：

```python
phi1 = np.zeros((Ny, Nx))
phi2 = np.zeros((Ny, Nx))
phi3 = np.zeros((Ny, Nx))
```

此时：

$$
e^{i\phi}=1.
$$

三块 SLM 什么都没有做。

因此最初的 optical system 实际上只是：

$$
\text{Gaussian}
\rightarrow
0.6\,{\rm m\ free\ space}.
$$

显然不可能自动变成四个 Gaussian。

接下来就需要优化。

---

## 四、构建可微的前向传播

### Differentiable ASM

我这里使用 Angular Spectrum Method 作为 propagation backend。

先把输入场变换到 spatial-frequency domain：

$$
A(k_x,k_y)
=
\mathcal F\{U(x,y)\}.
$$

自由空间传播会给每个 plane-wave component 加上不同 phase：

$$
A_z
=
A_0H_z,
$$

其中

$$
H_z
=
\exp(i k_z z),
$$

以及

$$
k_z
=
\sqrt{
k^2-k_x^2-k_y^2
}.
$$

最后：

$$
U_z
=
\mathcal F^{-1}(A_z).
$$

关键不在 ASM 本身。

关键在于现在：

$$
U
$$

依赖：

$$
\phi_1,\phi_2,\phi_3.
$$

因此 FFT 也必须存在于 automatic differentiation 的 computational graph 中。

这里将固定的 frequency grid 和 transfer function 用普通 NumPy 预先计算，而依赖 phase 的传播路径使用 `autograd.numpy`：

```python
import numpy as np
import autograd.numpy as anp
```

而不能在 differentiable path 中调用普通：

```python
numpy.fft.fft2
```

否则 `grad()` 会把 phase 包装成 `ArrayBox`，普通 NumPy FFT 并不知道怎样处理它。

Autograd 官方文档说明它支持大部分 NumPy FFT 操作以及 complex number differentiation，因此这种包含 complex FFT 的 real-valued objective 可以进行 reverse-mode differentiation。

传播距离、波长和采样网格在优化过程中保持不变，因此先在 computational graph 外构造 $H$：

```python
def make_asm_transfer_function(
    Nx, Ny, dx, dy, wavelength, z
):
    fx = np.fft.fftshift(np.fft.fftfreq(Nx, d=dx))
    fy = np.fft.fftshift(np.fft.fftfreq(Ny, d=dy))
    FX, FY = np.meshgrid(fx, fy)

    k = 2 * np.pi / wavelength
    KX = 2 * np.pi * FX
    KY = 2 * np.pi * FY
    KZ = np.sqrt(
        (k**2 - KX**2 - KY**2).astype(np.complex128)
    )

    return np.exp(1j * z * KZ)


H = make_asm_transfer_function(
    Nx=Nx,
    Ny=Ny,
    dx=dx,
    dy=dy,
    wavelength=wavelength,
    z=propagation_distance,
)
```

这里的 `Nx`、`Ny`、`dx`、`dy`、`wavelength` 和 `propagation_distance` 就是问题场景中已经给出的数值参数。随后才定义可微的 FFT 传播：

```python
def fft2c(U):
    return anp.fft.fftshift(
        anp.fft.fft2(
            anp.fft.ifftshift(U)
        )
    )


def ifft2c(A):
    return anp.fft.fftshift(
        anp.fft.ifft2(
            anp.fft.ifftshift(A)
        )
    )


def propagate(U, H):
    A = fft2c(U)
    return ifft2c(A * H)
```

于是 computational graph 变成：

$$
\phi
\rightarrow
e^{i\phi}
\rightarrow
FFT
\rightarrow
H
\rightarrow
IFFT
\rightarrow
U_{\rm out}.
$$

这一步完成以后，普通 Fourier-optics simulator 就变成了一个 differentiable simulator。

---

## 五、定义目标函数

### Mode-overlap loss

接下来需要回答一个问题：

> 怎么判断 output 和 target 有多接近？

最直接的方法可能是 intensity MSE：

$$
\|I_{\rm out}-I_{\rm target}\|^2.
$$

但论文并不是这样做的。

它优化的是两个 complex fields 的 mode overlap。论文 loss 为：

$$
L
=
1-
\left|
\iint
U_{\rm out}(x,y)
U_{\rm target}^*(x,y)
dxdy
\right|^2.
$$

为了让实现对 field power 更稳健，我这里显式写成 normalized overlap：

$$
\eta
=
\frac{
|\langle U_t,U_o\rangle|^2
}{
\langle U_o,U_o\rangle
\langle U_t,U_t\rangle
}.
$$

然后：

$$
\boxed{
L=1-\eta
}
$$

其中：

$$
0\le\eta\le1.
$$

当 output 完全等于 target mode：

$$
\eta=1,
$$

因此：

$$
L=0.
$$

代码：

```python
def mode_overlap(U_out, U_target, dx, dy):
    inner = (
        anp.sum(
            anp.conj(U_target)
            * U_out
        )
        * dx
        * dy
    )

    power_out = (
        anp.sum(anp.abs(U_out)**2)
        * dx
        * dy
    )

    power_target = (
        anp.sum(anp.abs(U_target)**2)
        * dx
        * dy
    )

    eta = (
        anp.abs(inner)**2
        / (power_out * power_target)
    )

    return anp.real(eta)
```

这里优化的不是简单的 intensity pattern。

而是 complex optical mode：

$$
\boxed{
\text{amplitude + phase}
}
$$

这也是 mode overlap 相比 intensity MSE 更重要的一点。

---

### Objective function

整个 optical system 现在已经可以看成一个函数：

$$
U_{\rm out}
=
F(
\phi_1,\phi_2,\phi_3
).
$$

再把 output 送进 loss：

$$
L
=
L(
U_{\rm out},
U_{\rm target}
).
$$

于是最终：

$$
\boxed{
L=L(\phi_1,\phi_2,\phi_3)
}
$$

代码：

```python
def objective(phi1, phi2, phi3, U_in, U_target, H, dx, dy):
    U_out = forward(U_in, phi1, phi2, phi3, H)
    eta = mode_overlap(U_out, U_target, dx, dy)
    return 1.0 - eta
```

这里把输入场、目标场、传播传输函数和积分采样间隔全部显式列出，避免 objective 依赖正文中没有交代的隐式全局状态。

---

## 六、从梯度到参数更新

### Automatic differentiation

我们需要：

$$
\frac{\partial L}{\partial\phi_1},
\qquad
\frac{\partial L}{\partial\phi_2},
\qquad
\frac{\partial L}{\partial\phi_3}.
$$

每个 $\phi$ 都是一个：

$$
250\times250
$$

matrix。

也就是说单块 phase modulator 就有：

$$
62500
$$

个 optimization variables。

三块一共：

$$
187500
$$

个变量。

手推这样的 gradient 显然没有必要。

Autograd 可以直接根据 computational graph 使用 reverse-mode automatic differentiation。

```python
grad_phi1 = grad(objective, 0)
grad_phi2 = grad(objective, 1)
grad_phi3 = grad(objective, 2)

objective_args = (U_in, U_target, H, dx, dy)

g1 = grad_phi1(phi1, phi2, phi3, *objective_args)
g2 = grad_phi2(phi1, phi2, phi3, *objective_args)
g3 = grad_phi3(phi1, phi2, phi3, *objective_args)
```

`grad(objective, 0)`、`grad(objective, 1)` 和 `grad(objective, 2)` 分别指定对前三个 phase 参数求导；其余参数只作为 forward calculation 所需的固定量传入。

$$
g_1
=
\nabla_{\phi_1}L,
$$

$$
g_2
=
\nabla_{\phi_2}L,
$$

$$
g_3
=
\nabla_{\phi_3}L.
$$

至此最重要的链路已经跑通：

$$
\boxed{
\phi
\rightarrow
e^{i\phi}
\rightarrow
FFT
\rightarrow
propagation
\rightarrow
U_{\rm out}
\rightarrow
L
\rightarrow
\nabla_\phi L
}
$$

---

### Adam 更新 phase

最后只剩 optimizer。

我没有再引入 PyTorch，而是简单实现了一遍 Adam。

对于 gradient $g_t$：

$$
m_t
=
\beta_1m_{t-1}
+
(1-\beta_1)g_t,
$$

$$
v_t
=
\beta_2v_{t-1}
+
(1-\beta_2)g_t^2.
$$

经过 bias correction：

$$
\hat m_t
=
\frac{m_t}{1-\beta_1^t},
$$

$$
\hat v_t
=
\frac{v_t}{1-\beta_2^t}.
$$

最后：

$$
\phi_{t+1}
=
\phi_t
-
\alpha
\frac{
\hat m_t
}{
\sqrt{\hat v_t}+\epsilon
}.
$$

代码：

```python
class Adam:
    def __init__(
        self,
        shape,
        lr=0.1,
        beta1=0.9,
        beta2=0.999,
        eps=1e-8,
    ):
        self.lr = lr
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps

        self.m = np.zeros(shape)
        self.v = np.zeros(shape)
        self.t = 0

    def update(self, x, g):
        self.t += 1

        self.m = (
            self.beta1 * self.m
            + (1 - self.beta1) * g
        )

        self.v = (
            self.beta2 * self.v
            + (1 - self.beta2) * g**2
        )

        m_hat = (
            self.m
            / (1 - self.beta1**self.t)
        )

        v_hat = (
            self.v
            / (1 - self.beta2**self.t)
        )

        return (
            x
            - self.lr
            * m_hat
            / (
                np.sqrt(v_hat)
                + self.eps
            )
        )
```

三块 phase modulator 分别维护自己的 Adam state：

```python
adam1 = Adam(phi1.shape, lr=0.1)
adam2 = Adam(phi2.shape, lr=0.1)
adam3 = Adam(phi3.shape, lr=0.1)
```

---

### Optimization loop

最终训练循环其实已经非常接近 neural-network training：

```python
objective_args = (U_in, U_target, H, dx, dy)

for i in range(num_iterations):
    loss = objective(phi1, phi2, phi3, *objective_args)

    g1 = grad_phi1(phi1, phi2, phi3, *objective_args)
    g2 = grad_phi2(phi1, phi2, phi3, *objective_args)
    g3 = grad_phi3(phi1, phi2, phi3, *objective_args)

    phi1 = adam1.update(phi1, g1)
    phi2 = adam2.update(phi2, g2)
    phi3 = adam3.update(phi3, g3)
```

其中 `num_iterations=400`，三个 `Adam` 实例分别保存三张 phase map 的一阶矩和二阶矩状态。

$$
\text{Gaussian}
$$

经过当前三块 phase masks，

得到：

$$
U_{\rm out}.
$$

计算它与：

$$
U_{\rm target}
$$

之间的 mode mismatch，

再沿着：

$$
-\nabla_\phi L
$$

方向调整所有 SLM pixels。

然后重新传播。

不断重复。

---

## 七、理解优化结果

### 怎样理解训练后的三张 phase map

最终得到：

$$
\phi_1(x,y),
\qquad
\phi_2(x,y),
\qquad
\phi_3(x,y).
$$

它们通常看起来并不像某种简单 lens 或 grating。

这是正常的。

因为 optimizer 并没有被告知：

> 第一块负责分束，第二块负责聚焦，第三块负责修正。

它只知道最终 objective：

$$
U_{\rm out}
\rightarrow
U_{\rm target}.
$$

因此三块 phase mask 会联合工作。

可以理解为：

$$
M_1,M_2,M_3
$$

共同构成了一个 spatial-mode transformation。

第一块产生新的 spatial-frequency components，传播过程中这些频率分量积累不同 phase，第二和第三块继续重新组织 amplitude 和 phase，最终让目标 plane 上的 complex field 尽可能接近指定 target。

这就是 multi-plane light conversion 背后的基本思想之一。

---

## 八、边界、差异与实现注意点

### 与原论文的差异：这里固定使用 ASM

需要特别说明一点。

论文给出的 propagation-method selection criterion 为：

$$
z_{\rm critical}
=
\frac{L\Delta x}{\lambda}.
$$

当前：

$$
L=2.5\,{\rm mm},
$$

$$
\Delta x=10\,\mu{\rm m},
$$

$$
\lambda=700\,{\rm nm}.
$$

因此：

$$
z_{\rm critical}
\approx35.7\,{\rm mm}.
$$

而每次 propagation distance 为：

$$
z=200\,{\rm mm}.
$$

也就是说：

$$
z>z_{\rm critical}.
$$

按照论文的规则，TorchOptics 在这种情况下默认更倾向使用 Direct Integration，而不是 ASM。论文 Listing 2 没有显式指定 propagation method，而是让 `System` 自己处理。

所以这篇文章更准确的表述是：

> 用 NumPy + Autograd 重写 TorchOptics Figure 4 的 inverse-design architecture，并使用自己实现的 ASM 作为 differentiable propagation backend。

它不是 Figure 4 的逐像素数值复刻。

如果之后把 `propagate()` 换成 differentiable DI，其余 optimization pipeline 完全不需要改变。

这一点实际上也很好地体现了系统设计：

$$
\boxed{
\text{propagation model}
\quad\text{和}\quad
\text{optimization framework}
}
$$

是两个可以独立替换的模块。

---

### 为什么优化中的 phase 可以超过 $2\pi$

训练过程中我没有执行：

```python
phi = phi % (2 * np.pi)
```

因为真正进入 forward model 的是：

$$
e^{i\phi}.
$$

而：

$$
e^{i(\phi+2\pi n)}
=
e^{i\phi}.
$$

所以数学上：

$$
\phi
$$

和：

$$
\phi+2\pi
$$

完全等价。

因此 optimization 时允许 phase 自由变化没有问题。

最终显示或映射到实际 SLM 时，再使用：

$$
\phi_{\rm SLM}
=
\phi\bmod2\pi.
$$

---

## 九、总结：从 forward optics 到 inverse design

以前学习 Fourier optics 时，重点通常是：

$$
U_0
\rightarrow
U_z.
$$

也就是：

> 光经过一个系统以后会变成什么？

但 inverse design 把问题变成了：

$$
\text{target}
\rightarrow
\text{system parameters}.
$$

也就是：

> 我想得到这个结果，中间的光学系统应该长什么样？

真正连接这两个问题的并不是某个新的 diffraction formula。

Forward physics 仍然是：

$$
FFT
\rightarrow
H
\rightarrow
IFFT.
$$

新增的其实只有三个东西：

$$
\boxed{
\text{objective}
+
\text{gradient}
+
\text{optimizer}
}
$$

也就是说：

$$
\boxed{
\text{Differentiable Optics}
=
\text{Forward Optics}
+
\text{Automatic Differentiation}
}
$$

forward model 决定：

$$
\text{一个设计会产生什么结果};
$$

loss 定义：

$$
\text{什么结果算好};
$$

gradient 告诉我们：

$$
\text{参数往哪个方向修改};
$$

optimizer 则不断执行这个修改。

这次真正从头写完之后，TorchOptics 里面：

```python
loss.backward()
optimizer.step()
```

这两行代码背后的物理和计算过程也就不再是黑盒了。


