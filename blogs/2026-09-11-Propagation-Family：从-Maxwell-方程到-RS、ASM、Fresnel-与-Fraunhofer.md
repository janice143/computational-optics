---
title: "Propagation Family：从 Maxwell 方程到 RS、ASM、Fresnel 与 Fraunhofer"
subtitle: "自由空间衍射模型的谱系、近似边界与数值实现"
description: "梳理自由空间衍射传播模型从 Maxwell 方程到 RS、ASM、Fresnel 与 Fraunhofer 的谱系、近似边界与数值实现。"
date: 2026-09-11
author: "Yanping Lan"
categories: [wave optics, diffraction, numerical methods]
toc: true
toc-depth: 3
code-fold: show
---

::: {.callout-note title="Runnable code"}
完整项目见 [GitHub 仓库](https://github.com/janice143/computational-optics)，相关代码按职责组织如下：

- 共享的空间、频率与波矢网格：[`grids.py`](../numerical-simulation/wave_optics/grids.py)。
- 传播模型：[`asm.py`](../numerical-simulation/wave_optics/propagation/asm.py)、[`fresnel_tf.py`](../numerical-simulation/wave_optics/propagation/fresnel_tf.py)、[`fresnel_fft.py`](../numerical-simulation/wave_optics/propagation/fresnel_fft.py) 与 [`fraunhofer.py`](../numerical-simulation/wave_optics/propagation/fraunhofer.py)。
- 完整实验与绘图流程：[`three-propagation-models-clean-version.ipynb`](../numerical-simulation/three-propagation-models-clean-version.ipynb)。
:::

## 导论：传播模型不是彼此独立的公式

自由空间衍射传播算法看起来很多，但它们并不是彼此独立的公式。把近似发生的位置标出来以后，整个 Propagation Family 实际上非常清楚：

$$
\text{Maxwell} \rightarrow \text{Vector Helmholtz} \rightarrow \text{Scalar Helmholtz}
$$

在 scalar Helmholtz 这一层，有两种等价的传播表述：

$$
\text{Rayleigh-Sommerfeld} \quad\Longleftrightarrow\quad \text{Angular Spectrum}
$$

然后再施加近轴近似：

$$
\text{Scalar Helmholtz} \xrightarrow{\text{paraxial}} \text{Fresnel} \xrightarrow{\text{far field}} \text{Fraunhofer}
$$

而 Direct Integration、FFT-DI、Shifted Fresnel 并不是新的物理理论：

$$
\text{RS} \rightarrow [ \begin{cases} \text{Direct Integration}\\ \text{FFT-DI} \end{cases} ]
$$

$$
\text{Fresnel} \rightarrow \text{Shifted Fresnel}.
$$

这篇文章重点不在“公式长什么样”，而在每一步究竟丢掉了什么物理信息，以及什么时候这个近似会失效。

---

## 一、物理起点：从 Maxwell 到 Scalar Helmholtz

### 起点：Maxwell 方程

考虑线性、均匀、各向同性、无自由电荷、无自由电流介质。

设时间依赖采用

$$
e^{-i\omega t}.
$$

频域 Maxwell 方程为：

$$
\nabla\times\mathbf E = i\omega\mu\mathbf H,
$$

$$
\nabla\times\mathbf H = -i\omega\epsilon\mathbf E,
$$

同时：

$$
\nabla\cdot(\epsilon\mathbf E)=0, \qquad \nabla\cdot(\mu\mathbf H)=0.
$$

如果介质均匀，即

$$
\epsilon=\text{const}, \qquad \mu=\text{const},
$$

那么：

$$
\nabla\cdot\mathbf E=0.
$$

对第一式取旋度：

$$
\nabla\times(\nabla\times\mathbf E)=i\omega\mu\nabla\times\mathbf H.
$$

代入

$$
\nabla\times\mathbf H=-i\omega\epsilon\mathbf E,
$$

得到：

$$
\nabla\times(\nabla\times\mathbf E)=\omega^2\mu\epsilon\mathbf E.
$$

利用恒等式：

$$
\nabla\times(\nabla\times\mathbf E)=\nabla(\nabla\cdot\mathbf E)-\nabla^2\mathbf E,
$$

以及

$$
\nabla\cdot\mathbf E=0,
$$

得到：

$$
-\nabla^2\mathbf E=\omega^2\mu\epsilon\mathbf E.
$$

因此：

$$
\nabla^2\mathbf E+k^2\mathbf E=0
$$

其中

$$
k=\omega\sqrt{\mu\epsilon}=\frac{2\pi n}{\lambda_0}.
$$

这就是 vector Helmholtz equation。磁场同样满足：

$$
\nabla^2\mathbf H+k^2\mathbf H=0.
$$

到目前为止，还没有进入 Fresnel、Fraunhofer，也没有做 paraxial approximation。

---

### 第一个真正重要的近似：Vector → Scalar

因为介质均匀，电场的每个 Cartesian component 都满足：

$$
\nabla^2 E_x+k^2E_x=0,
$$

$$
\nabla^2 E_y+k^2E_y=0,
$$

$$
\nabla^2 E_z+k^2E_z=0.
$$

于是我们把其中一个分量抽象为 $U(x,y,z)$，得到 scalar Helmholtz equation：

$$
\nabla^2 U+k^2U=0.
$$

但是这里要区分两个概念。

在均匀介质内部，“每个场分量满足 Helmholtz equation”本身并不是近似。真正的 scalar approximation 是：

> 我们不再同时求解完整的 $\mathbf E,\mathbf H$，而只用一个 scalar complex field $U$ 描述传播。

这样做意味着忽略或者弱化：

$$
\text{polarization coupling},
$$

$$
E_z,
$$

以及复杂边界引起的 vector effects。

因此 scalar diffraction 通常适用于：

$$
\text{feature size}\gg\lambda,
$$

并且不是极高 NA、强聚焦、亚波长结构、复杂介质界面的问题。

如果研究

$$
\text{high-NA focusing},
$$

$$
\text{nanophotonics},
$$

$$
\text{metasurfaces},
$$

$$
\text{subwavelength structures},
$$

通常就不能只靠 scalar propagation，而需要 FDTD、FEM、RCWA、vector Debye integral 等 Maxwell solver。

所以 Propagation Family 的第一条边界是：

$$
\text{Maxwell} \xrightarrow{\text{scalar approximation}} \text{Scalar Helmholtz}
$$

后面的 RS、ASM、Fresnel、Fraunhofer 全都在这条边界之后。

---

## 二、Scalar Helmholtz 的两种等价传播表述

### Scalar Helmholtz 怎么产生传播公式？

现在的问题变成：已知 $U(x',y',0)$，怎样求 $U(x,y,z)$？

Scalar Helmholtz：

$$
(\nabla^2+k^2)U=0
$$

对应的自由空间 Green's function 是：

$$
G(\mathbf r)=\frac{e^{ikr}}{4\pi r}
$$

因为它满足：

$$
(\nabla^2+k^2)G=-\delta(\mathbf r).
$$

Green's function 可以理解成：

> 一个点源产生什么场。

所以只要知道边界面上的场，就可以通过 Green's theorem，把整个传播问题写成边界积分。这一步最终得到 Rayleigh–Sommerfeld diffraction integral。

---

### Rayleigh–Sommerfeld：空间域中的 scalar propagation

设：

$$
r=\sqrt{(x-x')^2+(y-y')^2+z^2}.
$$

Rayleigh–Sommerfeld 第一类衍射积分可以写成：

$$
U(x,y,z)=\iint U(x',y',0)\,h_{\rm RS}(x-x',y-y',z)\,dx'dy',
$$

其中：

$$
h_{\rm RS}= \frac{1}{2\pi} \frac{e^{ikr}}{r} \frac{z}{r} \left(\frac{1}{r}-ik\right)
$$

也可以理解成 Green's function 对传播方向法向量的导数。

这里最重要的是：

$$
r=\sqrt{z^2+\Delta x^2+\Delta y^2}
$$

被完整保留下来了。没有做：

$$
r\approx z+\frac{\Delta x^2+\Delta y^2}{2z}.
$$

因此 RS 并不是 paraxial diffraction formula。只要 scalar Helmholtz model 本身成立，RS 能够处理相对大的传播角度。

所以：

$$
\text{RS 不要求 Fresnel 的近轴条件}
$$

但它仍然不是 Maxwell-exact。它的物理边界仍然是：

$$
\text{scalar diffraction}
$$

而不是 vector electromagnetic propagation。

---

## 三、Angular Spectrum：频域中的 Scalar Helmholtz 解

### Angular Spectrum：从另一个方向直接解 Helmholtz

现在回到：

$$
\nabla^2U+k^2U=0.
$$

不要用 Green's function，而是在 transverse plane 对 $x,y$ 做 Fourier transform：

$$
U(x,y,z)\leftrightarrow\tilde U(k_x,k_y,z).
$$

因为：

$$
\frac{\partial^2}{\partial x^2}\rightarrow-k_x^2,
$$

$$
\frac{\partial^2}{\partial y^2}\rightarrow-k_y^2,
$$

Helmholtz equation 变成：

$$
\frac{\partial^2\tilde U}{\partial z^2}+(k^2-k_x^2-k_y^2)\tilde U=0.
$$

定义：

$$
k_z=\sqrt{k^2-k_x^2-k_y^2}
$$

向 $+z$ 传播的解为：

$$
\tilde U(k_x,k_y,z)=\tilde U(k_x,k_y,0)e^{ik_zz}.
$$

因此：

$$
U(x,y,z)= \mathcal F^{-1} \left[ \mathcal F\{U_0\} e^{iz\sqrt{k^2-k_x^2-k_y^2}} \right].
$$

这就是 Angular Spectrum Method。

---

### ASM 还能自然看到 evanescent waves

如果：

$$
k_x^2+k_y^2<k^2,
$$

那么 $k_z\in\mathbb R$，对应 propagating plane wave：

$$
e^{ik_zz}.
$$

如果：

$$
k_x^2+k_y^2>k^2,
$$

则：

$$
k_z=i\alpha.
$$

传播项变成：

$$
e^{-\alpha z}.
$$

这就是 evanescent wave。因此 ASM 比 Fresnel 更清楚地暴露了：

$$
\text{propagating spectrum} + \text{evanescent spectrum}
$$

的结构。

不过对于普通毫米/厘米尺度自由空间光学，evanescent components 通常传播很短距离就衰减掉。

---

### RS 和 ASM 为什么其实是同一个物理模型？

RS：

$$
U_z=U_0*h_{\rm RS}
$$

是 spatial-domain representation。

ASM：

$$
\tilde U_z=\tilde U_0H_{\rm ASM}
$$

是 spatial-frequency representation。

二者本质上都是 scalar Helmholtz equation + outgoing-wave boundary condition 的解。因此可以理解为：

$$
\text{RS}\overset{\mathcal F}{\Longleftrightarrow}\text{ASM}
$$

一个是 Green-function / impulse-response view，一个是 plane-wave / transfer-function view。

所以在连续理论、正确边界条件和充分数值精度下：

$$
U_{\rm RS}=U_{\rm ASM}.
$$

如果程序结果差很多，通常应该先怀疑 sampling，而不是怀疑两种物理理论冲突。

---

## 四、统一传输函数模型：空域卷积与频域乘积

RS 与 ASM 分别给出了 scalar Helmholtz 传播的空域和频域表述。现在可以把两者放入同一个线性平移不变系统框架：传播形式本身是统一的，模型之间真正变化的是传播核或传输函数。

### 空域中的传播核

若点 $(x',y')$ 对输出点 $(x,y)$ 的影响只取决于坐标差，则传播可写成：

$$
U_z=U_0*h_z
$$

即：

$$
U(x,y,z)=\iint U_0(x',y')h_z(x-x',y-y')dx'dy'.
$$

其中 $h_z$ 是传播系统的 impulse response。对于 Rayleigh–Sommerfeld，传播核就是前面得到的 $h_{\rm RS}$。

### 傅里叶域中的传输函数

根据 convolution theorem：

$$
\mathcal F\{U_0*h_z\}=\mathcal F\{U_0\}\mathcal F\{h_z\}.
$$

定义传输函数：

$$
H_z=\mathcal F\{h_z\},
$$

传播便可以写成：

$$
\tilde U_z=\tilde U_0H_z,
$$

以及：

$$
U_z=\mathcal F^{-1}\left[\mathcal F\{U_0\}H_z\right].
$$

所以同一个传播过程具有两种等价表述：

$$
\text{空域卷积}\quad\Longleftrightarrow\quad\text{傅里叶域乘积}.
$$

RS 的 $h_{\rm RS}$ 与 ASM 的

$$
H_{\rm ASM}=\exp\left[iz\sqrt{k^2-k_x^2-k_y^2}\right]
$$

互为 Fourier transform。RS 和 ASM 因而不是两套冲突的理论，而是同一个 scalar Helmholtz 传播模型的空域与频域表示。

### Direct Integration：直接计算空域卷积

将 RS 的连续卷积离散化：

$$
U[m,n]\approx\sum_{p,q}U_0[p,q]h_{\rm RS}(x_m-x_p,y_n-y_q)\Delta x\Delta y
$$

就得到 Direct Integration。它没有增加新的物理近似，只是在对 RS integral 做 numerical quadrature。

对于 $N\times N$ 的输入和输出，每个 $N^2$ 输出点都要累加 $N^2$ 个输入点，因此计算量约为：

$$
O(N^4).
$$

DI 很慢，但没有 FFT 自带的 periodicity、circular convolution 和 frequency-grid mapping 问题，因此通常适合作为 numerical reference。

### FFT-DI：在频域计算同一个 RS 卷积

对 RS kernel 使用 convolution theorem：

$$
U_z=\mathcal F^{-1}\left[\mathcal F(U_0)\mathcal F(h_{\rm RS})\right]
$$

就得到 FFT-DI，计算量降低为：

$$
O(N^2\log N).
$$

因此 DI 和 FFT-DI 不是前后递进的物理近似，而是同一个 Rayleigh–Sommerfeld 模型的两种计算方法：

$$
\text{Rayleigh–Sommerfeld} \longrightarrow \begin{cases} \text{DI：空域直接积分}\\ \text{FFT-DI：频域快速卷积} \end{cases}
$$

### FFT-DI 引入的是数值假设，不是物理假设

DFT 隐含周期边界：

$$
u[n+N]=u[n].
$$

因此直接计算：

$$
IFFT\{FFT(U)FFT(h)\}
$$

得到的是 circular convolution，而物理上的 RS 是 linear convolution。为了避免 wrap-around，必须进行 zero padding，典型条件为：

$$
N_{\rm FFT}\ge N_U+N_h-1.
$$

所以 FFT-DI 的误差边界来自 sampling、finite window、zero padding 和 quadrature，而不是新的 diffraction approximation。

---

## 五、Fresnel：从空域和频域引入近轴近似

### 频域推导：近似 ASM 的传输函数

现在从 ASM 开始最清楚。

ASM：

$$
k_z=\sqrt{k^2-k_x^2-k_y^2}.
$$

提取 $k$：

$$
k_z=k\sqrt{1-\frac{k_x^2+k_y^2}{k^2}}.
$$

如果：

$$
k_x^2+k_y^2\ll k^2
$$

利用：

$$
\sqrt{1-\epsilon}\approx1-\frac{\epsilon}{2},
$$

得到：

$$
k_z\approx k-\frac{k_x^2+k_y^2}{2k}.
$$

因此 propagation transfer function $e^{ik_zz}$ 变成：

$$
H_F=e^{ikz}\exp\left[-i\frac{z}{2k}(k_x^2+k_y^2)\right].
$$

这就是 Fresnel propagation。

所以 Fresnel approximation 真正表达的是：

$$
k_\perp\ll k
$$

也就是：

$$
\sin\theta\ll1.
$$

这就是 paraxial approximation。

---

### 空域推导：近似 RS 的传播距离

RS 中：

$$
r=\sqrt{z^2+\rho^2},
$$

其中：

$$
\rho^2=(x-x')^2+(y-y')^2.
$$

写成：

$$
r=z\sqrt{1+\frac{\rho^2}{z^2}}.
$$

展开：

$$
r=z+\frac{\rho^2}{2z}-\frac{\rho^4}{8z^3}+\cdots
$$

Fresnel 只保留：

$$
r\approx z+\frac{\rho^2}{2z}.
$$

但是传播相位是 $kr$。所以真正判断误差大小的不是单纯 $\rho\ll z$，而是被丢掉的相位：

$$
\Delta\phi\approx\frac{k\rho^4}{8z^3}.
$$

需要：

$$
\frac{k\rho_{\max}^4}{8z^3}\ll1.
$$

这个条件比一句“$z$ 足够远”更准确。

---

### Fresnel 的空域卷积形式

经过这个近似：

$$
r\approx z+\frac{x^2+y^2}{2z}.
$$

同时 amplitude slowly varying：

$$
\frac{1}{r}\approx\frac{1}{z},
$$

以及：

$$
\frac{z}{r}\approx1.
$$

于是 RS kernel 简化成：

$$
h_F(x,y,z)= \frac{e^{ikz}}{i\lambda z} \exp\left[i\frac{k}{2z}(x^2+y^2)\right].
$$

因此：

$$
U_z=U_0*h_F.
$$

这是 Fresnel diffraction 的 convolution form。

---

### Fresnel 并不等于“近场”

这也是一个很常见的误解。

Fresnel 的真正条件是：

$$
\text{paraxial}
$$

而不是简单 $z$ 小。

一个系统即使传播距离很长，如果角度仍然很小，Fresnel 仍然可以非常准确。相反，如果存在大角度、高空间频率，即使距离不算特别短，$k_\perp/k$ 比较大，Fresnel 也可能失效。

所以更合理的理解是：

$$
\text{ASM/RS}\xrightarrow{\text{small angle}}\text{Fresnel}.
$$

---

## 六、Fraunhofer：从空域和频域走向远场

### 空域推导：忽略输入面的二次相位

Fresnel integral 可以写成：

$$
U(x,y,z)= \frac{e^{ikz}}{i\lambda z} e^{i\frac{k}{2z}(x^2+y^2)}
$$

$$
\times \iint U_0(x',y') e^{i\frac{k}{2z}(x'^2+y'^2)} e^{-i\frac{2\pi}{\lambda z}(xx'+yy')} dx'dy'.
$$

Fraunhofer approximation 再进一步认为，在整个输入 aperture 上：

$$
e^{i\frac{k}{2z}(x'^2+y'^2)}\approx1.
$$

假设 aperture 最大半径为 $a$，则最大附加相位：

$$
\Delta\phi_{\rm aperture}\approx\frac{ka^2}{2z}.
$$

要求：

$$
\frac{ka^2}{2z}\ll1.
$$

代入：

$$
k=\frac{2\pi}{\lambda},
$$

得到：

$$
z\gg\frac{\pi a^2}{\lambda}.
$$

不同教材根据允许的 phase error，会给出略有不同的常数，因此工程中经常简写成：

$$
z\gg\frac{a^2}{\lambda}.
$$

---

### 频域结果：远场是输入场的 Fourier transform

去掉输入 quadratic phase：

$$
U(x,y,z)\approx \frac{e^{ikz}}{i\lambda z} e^{i\frac{k}{2z}(x^2+y^2)}
$$

$$
\times \iint U_0(x',y')e^{-i2\pi(f_xx'+f_yy')}dx'dy',
$$

其中：

$$
f_x=\frac{x}{\lambda z},\qquad f_y=\frac{y}{\lambda z}.
$$

因此：

$$
U(x,y,z)\propto \mathcal F\{U_0\} \left(\frac{x}{\lambda z},\frac{y}{\lambda z}\right).
$$

所以 Fraunhofer pattern 就是 aperture 的 Fourier transform。

---

### Lens：在有限距离实现 Fourier transform

Fraunhofer condition：

$$
z\gg\frac{a^2}{\lambda}
$$

针对的是：

$$
\text{free-space propagation}.
$$

如果加入 thin lens：

$$
t_L(x,y)=\exp\left[-i\frac{k}{2f}(x^2+y^2)\right],
$$

lens 的 quadratic phase 可以和传播中的 quadratic phase 抵消。结果是在后焦面 $z=f$ 直接得到输入场的 Fourier transform。

因此实验室里不需要真的传播几十米甚至几百米才能观察 far-field diffraction。Lens 实际上实现了：

$$
\text{finite-distance Fourier transform}.
$$

---

## 七、总结：模型谱系、适用边界与选择方法

### 最终 Propagation Family

现在可以把整个关系重新画成：

$$
\text{Maxwell Equations}
$$

$$
\downarrow
$$

均匀、线性、各向同性、无源、单色场

$$
\text{Vector Helmholtz}
$$

$$
\downarrow\quad\text{scalar approximation}
$$

$$
\text{Scalar Helmholtz}
$$

从这里分成两个等价表示：

$$
[ \begin{array}{ccc} \text{Spatial domain} && \text{Spatial-frequency domain}\$$4pt] \downarrow && \downarrow\\ \text{Rayleigh-Sommerfeld} && \text{Angular Spectrum}\\ \downarrow &&\\ \text{DI / FFT\text{-}DI} && \end{array} ]
$$

然后施加：

$$
k_\perp\ll k
$$

得到：

$$
\text{Fresnel}
$$

数值实现可以有：

$$
\text{one-step},\quad\text{two-step},\quad\text{multi-step},\quad\text{shifted Fresnel}.
$$

继续增加 far-field 条件：

$$
\frac{ka^2}{2z}\ll1
$$

得到：

$$
\text{Fraunhofer}.
$$

---

### 各模型的“前提—丢失信息—失效边界”

| 模型 | 核心方程 | 新增假设 | 主要失效场景 |
|---|---|---|---|
| Maxwell | $\nabla\times E,\nabla\times H$ | 基本电磁理论 | 通常作为最完整模型 |
| Vector Helmholtz | $\nabla^2\mathbf E+k^2\mathbf E=0$ | 单色、均匀、线性、各向同性、无源区域 | 强非均匀介质等 |
| Scalar Helmholtz | $\nabla^2U+k^2U=0$ | 忽略显著 vector/polarization coupling | 高 NA、亚波长、纳米光学 |
| RS | Green-function integral | scalar Helmholtz | 同 scalar approximation |
| ASM | $H=e^{ik_zz}$ | scalar Helmholtz | 物理上同 RS；数值上易受 sampling 影响 |
| Fresnel | $k_z\approx k-k_\perp^2/2k$ | paraxial | large angle / high spatial frequency |
| Fraunhofer | $U\propto\mathcal F(U_0)$ | Fresnel + far field | Fresnel/near-field diffraction |
| Shifted Fresnel | scaled Fresnel FFT | 与 Fresnel 相同 | 无法解决 non-paraxial propagation |
| DI | 离散 RS integral | 数值 quadrature | 计算量巨大 |
| FFT-DI | FFT convolution | DFT sampling/padding | aliasing、wrap-around、有限窗口 |

---

### 最重要的一条判断链

以后遇到任何 propagation 问题，不应该第一反应问：

> “用 ASM 还是 Fresnel？”

更合理的是先判断你在哪一层。

如果 polarization、high NA、subwavelength structure 已经重要：

$$
\text{Scalar model 本身就不成立}
$$

应该回 Maxwell solver。

如果 scalar optics 成立，但存在明显大角度传播：

$$
\text{RS / ASM}
$$

更适合。

如果：

$$
k_\perp\ll k,
$$

也就是传播主要沿 optical axis：

$$
\text{Fresnel}
$$

可以成立。

如果进一步：

$$
\frac{ka^2}{2z}\ll1,
$$

则：

$$
\text{Fraunhofer}.
$$

而 DI、FFT-DI、Shifted Fresnel、one-step Fresnel 这些问题，已经不是新的物理层级，而是在确定物理模型之后：

$$
\text{How do we compute it numerically?}
$$

这也是 `waveprop` 后面真正开始变得有价值的地方：从这里开始，问题不再是“公式会不会”，而是如何保证离散计算真的逼近上面的连续物理模型。
