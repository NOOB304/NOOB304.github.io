---
title: "顶会论文拆解｜DIP如何分开变量的独立贡献、交互和依赖"
date: 2026-07-03 23:10:00 +0800
article_id: "010"
permalink: /posts/2026/07/dip-feature-contribution-raster-code/
lang: zh
author_profile: true
comments: false
share: false
tags:
  - DIP
  - 特征贡献
  - 可解释机器学习
  - 变量交互
  - EBM
  - 栅格分析
  - 生态模型
excerpt: "拆解AISTATS 2025提出的DIP贡献分解，解释训练与验证为何不可省，并给出从多变量栅格到总体贡献表和逐像元贡献图的Python改造代码。"
---

变量贡献图经常只有一列排名。X1 是 0.32，X2 是 0.21，X3 是 0.08。图很好画，解释却容易含糊。X1 是自己就能预测 Y，还是必须和 X2 一起出现才有用？X1 和 X3 会不会携带了同一部分信息，只是模型把功劳分给了其中一个？

DIP 处理的正是这层混淆。它把一个变量的重要性拆成单独贡献、交互贡献和变量依赖带来的贡献。这项工作发表于 AISTATS 2025，准确说是一篇机器学习与统计学习会议论文，而不是期刊论文。

这篇文章先按原论文解释 DIP，再把作者面向表格数据的思路改成栅格代码。代码允许读入任意研究区的多变量 GeoTIFF，输出研究区总体 DIP 表格、预测栅格、逐变量贡献栅格、百分比栅格和两两交互栅格。

## 配套代码

[下载DIP栅格贡献分析代码](/assets/downloads/dip_raster_contribution_template.zip){: .btn .btn--primary}

源码目录也可以直接查看：

[raster_contributions.py](/assets/downloads/dip_raster_contribution_template/raster_contributions.py)

代码没有限定研究区域，也不会自动下载数据。它要求各期 X 与 Y 栅格已经对齐。逐像元结果和严格 DIP 的边界会在后文说明。

## 论文信息

| 项目 | 内容 |
|---|---|
| 题目 | Disentangling Interactions and Dependencies in Feature Attributions |
| 作者 | Gunnar König、Eric Günther、Ulrike von Luxburg |
| 会议 | The 28th International Conference on Artificial Intelligence and Statistics |
| 年份 | 2025 |
| 论文集 | PMLR 258: 2134–2142 |
| 论文 | [PMLR页面](https://proceedings.mlr.press/v258/konig25a.html) |
| 作者代码 | [gcskoenig/dipd](https://github.com/gcskoenig/dipd) |
| 实验代码 | [gcskoenig/aistats_2025_DIP](https://github.com/gcskoenig/aistats_2025_DIP) |

论文讨论的是 global loss-based feature attribution，也就是用预测损失衡量变量在整个数据集上的贡献。它与解释某一个样本的 SHAP 不是同一个问题。

## 一张重要性图为什么不够

论文首页用房价数据给了一个很直观的例子。左图是普通 LOCO 重要性，右图把同一个分数拆开。灰色是变量单独使用时的贡献，绿色是交互贡献，紫色是变量依赖带来的贡献。每根柱子的方向表示正负，最后加到黑色横线上，得到原来的 LOCO 分数。

![论文Figure 1展示普通变量重要性与DIP分解](/images/dip-contribution/dip-figure-1-original.png)

*图源：König et al. (2025) Figure 1。原图用于论文解读。*

经度和纬度单独看时没有想象中那么强，但两者组合能够确定位置，所以交互贡献很大。距海远近单独就有预测价值，却能被经纬度部分替代，因此它的最终 LOCO 分数被冗余信息压低。

这正是传统排名容易漏掉的内容。一个变量最终分数小，可能是真的没用，也可能是它很有用，但其他变量已经提供了相似信息。一个变量最终分数大，也可能不是它自己厉害，而是它与其他变量配合后才有用。

## DIP分解的不是原始数值

DIP 分解的是预测能力，不是把几张 X 栅格直接按比例切开。

论文把一组变量 \(X_S\) 的预测能力写成：

\[
v(S)=\operatorname{Var}\left(E[Y\mid X_S]\right)
\]

它表示知道 \(X_S\) 后，能够解释多少 Y 的变化。真实的条件期望 \(E[Y\mid X_S]\) 不可直接观察，所以实际计算必须根据 X 和 Y 拟合模型。

假设把变量分成 A 和 B 两组。两组联合后的合作部分为：

\[
\Psi(A,B)=v(A\cup B)-v(A)-v(B)
\]

如果 \(\Psi=0\)，不能马上断定两组变量没有合作。正向交互和负向冗余可能正好抵消，最终仍然等于零。论文的重要贡献就在这里，它继续把 \(\Psi\) 拆开。

## 纯交互是怎样提取出来的

论文先拟合允许全部关系的模型：

\[
f(X_A,X_B)
\]

然后拟合一个不允许 A 与 B 跨组交互的 groupwise additive model：

\[
g(X_A,X_B)=g_A(X_A)+g_B(X_B)
\]

两者之差：

\[
h=f-g
\]

就是跨组纯交互。A 组内部可以有自己的复杂关系，B 组内部也可以有，禁止的只是 A 与 B 之间的交互。

交互盈余定义为：

\[
\operatorname{Int}(A,B)=\operatorname{Var}(h)
\]

理论上它不小于零，表示只有把两组变量放在一起才能得到的预测信息。

## 依赖项不等于相关系数

论文将主效应依赖写成：

\[
\operatorname{Dep}(A,B)
=
\operatorname{CP}(A,B)
+
2\operatorname{Cov}(g_A,g_B)
\]

\(\operatorname{CP}\) 是 cross-predictability，表示 A 的有效预测部分能在多大程度上被 B 替代，反过来也一样。协方差项允许出现抑制效应。两个变量单独看关系不强，控制另一个变量后反而变得清楚，就属于这种情况。

所以，X1 与 X2 相关系数很高，不代表它们一定有很大的 DIP 依赖贡献。DIP 关注的是与 Y 有关的那部分信息是否重叠，而不是 X 之间是否简单相关。论文附录专门构造了强相关但依赖贡献为零的例子。

完整分解为：

\[
v(A\cup B)
=
v(A)+v(B)
+
\operatorname{Int}(A,B)
-
\operatorname{Dep}(A,B)
\]

这里有一个容易看反的符号。论文公式中减去的是 \(\operatorname{Dep}\)。配套代码的 CSV 为了让各列直接相加，输出的是依赖对结果的有符号贡献，也就是 \(-\operatorname{Dep}\)。因此：

```text
standalone + interaction + dependency = net_loco
```

CSV 中 `dependency` 为负，通常表示信息重复；它为正时，常见解释是抑制关系被解除，两组变量一起使用反而揭示了额外信息。

## 论文里的四个例子

![论文Figure 2展示四种合作情形](/images/dip-contribution/dip-figure-2-original.png)

*图源：König et al. (2025) Figure 2。*

Figure 2 把几种容易混淆的情况放在了一起。

Example 3 最值得注意。DGP1 没有交互，也没有变量依赖。DGP2 同时存在交互和依赖，但两者对预测能力的影响正好抵消。两组数据用普通 value function 或重要性分数看起来相同，DIP 才能把它们分开。

Example 7 中，两项学习行为都能预测考试成绩，而且彼此相关。任何一个变量都能替代另一个变量的一部分信息，所以联合贡献小于两个单独贡献之和。这是典型冗余。

Example 8 没有显式交互，但两个变量放在一起后更有用。单看其中一个变量时，它与另一个变量的相关关系掩盖了自身作用。论文把这种情况联系到回归分析中的 enhancement 或 suppression。

Example 9 加入了 XOR 形式的纯交互。单变量模型无法得到这部分信息，只有联合模型可以，因此绿色交互盈余直接增加了联合预测能力。

这四个例子解释了一个事实：相同的最终重要性分数，背后可能是完全不同的数据关系。

## 真实数据里发生了什么

论文使用 Wine Quality 和 California Housing 两个数据集，并以十折交叉验证估计分数。所有分数除以 Y 的方差，因此可以理解为标准化预测贡献。

![论文Figure 3展示真实数据应用](/images/dip-contribution/dip-figure-3-original.png)

*图源：König et al. (2025) Figure 3。*

在 Wine Quality 数据中，residual sugar 的 LOCO 分数较高，但它单独使用时的贡献不大，较多信息来自合作。citric acidity 的最终分数不高，DIP 却显示它具有明显的单独预测能力，只是和其他变量存在冗余。

California Housing 的经度和纬度主要通过交互发挥作用。ocean proximity 单独可用，但能被其余变量部分替代。这与 Figure 1 的直觉一致。

论文还报告了计算时间。在作者的 M3 Pro 电脑上，Wine Quality 和 California Housing 的 LOCO-DIP 分解各约十分钟，SAGE-DIP 约一个半小时。高维数据会更慢，因为每个变量都要与其余变量比较，SAGE 还要处理大量变量子集。

## DIP为什么必须训练和验证

“贡献分解”听起来像一个直接套在数据上的公式，但 DIP 不是这样计算的。它至少需要拟合：

```text
只使用A的模型
只使用B的模型
使用A和B的完整模型
使用A和B但禁止跨组交互的模型
```

预测只是一把尺子，最终目的仍然是分解贡献。DIP 不是用来替代时序预测模型的算法，但它必须借助机器学习估计未知的 \(E[Y\mid X]\)。

验证数据也不能省。复杂模型可以记住训练样本，让无关变量在训练集上表现得很重要。论文附录明确要求模型在训练集拟合，在不重叠的测试集计算经验风险。作者真实数据实验使用十折交叉验证。

对于栅格数据，随机拆像元还不够。相邻像元过于相似，随机划分会把几乎相同的位置同时放进训练和验证。配套代码改成空间块划分，同一空间块在所有时期中只能进入训练侧或验证侧。

## DIP与偏相关、LMG和SHAP的区别

| 方法 | 主要回答什么 | 能否处理非线性 | 交互与依赖 |
|---|---|---:|---|
| 偏相关 | 控制其他变量后的线性相关 | 否 | 不分解 |
| LMG | 在线性回归中分配 \(R^2\) | 通常不能 | 将共享解释量按顺序平均 |
| SHAP | 某个已训练模型为何给出这个预测 | 可以 | 需要额外交互算法，相关变量仍棘手 |
| DIP | 全局预测贡献由单独作用、交互和依赖各占多少 | 可以 | 直接分开 |

DIP 并不是“新版 SHAP”。SHAP 常用于解释一个具体模型或一个具体样本，DIP 更接近对数据中全局预测信息的拆账。

它也不是因果推断。DIP 能说某个变量包含有助于预测 Y 的信息，不能单凭这个结果说人为改变 X 必然造成 Y 改变。

## 原作者代码为什么不能直接吃栅格

官方 `dipd` 接收 Pandas DataFrame，默认在表格内部划分训练和测试。栅格用户还需要处理：

```text
多张GeoTIFF按时期配对
逐像元构造X和Y
剔除共同无效值
大栅格分块读取
空间独立验证
将局部结果恢复为GeoTIFF
```

配套代码把这些步骤写进一个 Python 文件。用户只改路径和变量名，不需要手工把栅格导出为 CSV。

## 这版代码改了什么

第一处改动是输入。训练目录中每个变量一个文件夹，同一期 X 和 Y 使用相同文件名。研究区可以是一个样地、流域、国家或全球，代码不读取行政边界。

第二处改动是抽样。高分辨率大范围栅格可能有数千万像元，全部放进 EBM 没有必要。代码逐块读取，并用随机键保留有限训练样本；输出贡献图时仍遍历全部有效像元。

第三处改动是验证。代码使用空间块作为分组，而不是随机拆散像元。同一地点跨时期也保持在同一侧，减少空间泄漏。

第四处改动是输出。严格 DIP 只给总体分解，论文没有定义逐像元依赖贡献。代码因此保留两套结果：

```text
dip_global_summary.csv
整个研究区的DIP总体贡献

allocated_effect_<变量>.tif
EBM对每个像元的局部加性贡献
```

逐像元栅格来自 EBM 的 `eval_terms`。根据 InterpretML 文档，各项局部得分与截距相加等于回归预测值。它们和 DIP 使用同一类模型，但不能把逐像元图称为“逐像元 DIP 依赖贡献”。

## 输入文件怎样摆放

最简单的目录如下：

```text
history/
├─ temperature/
│  ├─ 2001.tif
│  └─ 2002.tif
├─ precipitation/
│  ├─ 2001.tif
│  └─ 2002.tif
├─ radiation/
│  ├─ 2001.tif
│  └─ 2002.tif
└─ Y/
   ├─ 2001.tif
   └─ 2002.tif
```

`2001.tif` 也可以换成月份或其他时期名称。同一期所有文件必须同名。栅格还要具有相同投影、分辨率、范围、行列数和像元位置。代码会检查这些条件，但不会自动重投影或重采样。

历史训练必须有 Y。解释另一批数据时，`EXPLAIN_ROOT` 可以指向只有 X 的目录。

## 需要修改的代码

打开 `raster_contributions.py`，修改用户配置区：

```python
TRAIN_ROOT = Path(r"D:\my_rasters\history")
EXPLAIN_ROOT = TRAIN_ROOT
OUTPUT_DIR = Path(r"D:\my_rasters\results")

TARGET_NAME = "Y"

FEATURE_NAMES = [
    "temperature",
    "precipitation",
    "radiation",
]
```

没有历史滞后变量时保持：

```python
VARIABLE_GROUPS = {}
```

安装依赖并运行：

```powershell
python -m pip install -r requirements-contribution.txt
python raster_contributions.py
```

代码默认最多抽取 20 万条训练样本：

```python
MAX_TOTAL_TRAIN_SAMPLES = 200_000
```

这个设置只限制模型训练样本。贡献图仍覆盖所有有效像元。

其余常用设置也集中在同一区域：

| 参数 | 默认值 | 用途 |
|---|---:|---|
| `SPATIAL_BLOCK_SIZE_PIXELS` | 64 | 将相邻像元合并成空间块 |
| `VALIDATION_FRACTION` | 0.30 | 每次拿出 30% 的空间块验证，其余 70% 训练 |
| `DIP_CV_REPEATS` | 3 | 重复三次空间划分，报告均值和标准差 |
| `R2_THRESHOLD` | 0.70 | 低于该精度时停止输出贡献图 |
| `MAX_FEATURES_FOR_ALL_PAIRWISE_INTERACTIONS` | 15 | 限制全部两两交互的变量数，避免计算量失控 |

这些默认值适合先跑通流程，并不意味着所有数据都应使用 64 像元的空间块。空间块应大于明显的空间自相关范围；如果邻近像元在几十公里内都十分相似，块尺度就不能只按电脑是否跑得动来定。

## 滞后变量到底是什么

滞后变量就是以前的同一个变量。若 Y 是年度数据：

```text
temperature_t       当年气温
temperature_lag1    前一年气温
temperature_lag2    前两年气温
```

若 Y 是月度数据，`lag1` 就是前一个月。

使用滞后变量时，可把同一类变量的多个时期放进一组：

```python
FEATURE_NAMES = [
    "temperature_t",
    "temperature_lag1",
    "temperature_lag2",
    "precipitation_t",
    "precipitation_lag1",
    "radiation",
]

VARIABLE_GROUPS = {
    "temperature": [
        "temperature_t",
        "temperature_lag1",
        "temperature_lag2",
    ],
    "precipitation": [
        "precipitation_t",
        "precipitation_lag1",
    ],
    "radiation": ["radiation"],
}
```

此时 `temperature` 的 DIP 分数代表当期和历史气温的整体贡献。代码不会自动制造滞后栅格，这些输入需要提前准备。

## 怎样判断是否存在滞后

贡献分解和滞后窗口选择是两个问题。先比较预测精度：

| 模型 | 输入 |
|---|---|
| M0 | 当期 X |
| M1 | 当期 X 与前一期 X |
| M2 | 当期 X 与前两期 X |

假设独立验证结果为：

| 模型 | \(R^2\) | RMSE |
|---|---:|---:|
| M0 | 0.60 | 105 |
| M1 | 0.70 | 89 |
| M2 | 0.67 | 94 |

M1 明显最好，年度数据可以概括为存在约一年的滞后响应。更稳妥的论文表述是：

> 引入前一年变量后，模型取得最高的空间独立验证精度，表明前一年条件包含当期变量之外的额外预测信息，结果支持约一年的滞后响应。

如果 M0 为 0.700、M1 为 0.702，这种差异不足以支撑明确结论。精度比较负责选窗口，DIP 再负责解释选中窗口中的变量贡献来自哪里。

当前栅格贡献代码接收已经准备好的滞后变量，不会自动完成 M0、M1、M2 搜索。不要根据一张 DIP 表格反推最佳滞后期。

## 输出目录

假设输入包含 `2001.tif` 和 `2002.tif`：

```text
results/
├─ dip_global_summary.csv
├─ dip_details_by_split.csv
├─ spatial_validation_metrics.csv
├─ result_metadata.json
├─ ebm_contribution_model.joblib
├─ 2001/
│  ├─ prediction.tif
│  ├─ allocated_effect_temperature.tif
│  ├─ allocated_effect_precipitation.tif
│  ├─ allocated_effect_radiation.tif
│  ├─ percent_temperature.tif
│  ├─ percent_precipitation.tif
│  ├─ percent_radiation.tif
│  ├─ main_effect_temperature.tif
│  ├─ interaction_temperature__precipitation.tif
│  └─ ...
└─ 2002/
   └─ 同样的一组GeoTIFF
```

## 总体DIP表格怎么看

`dip_global_summary.csv` 中最重要的列如下：

| 字段 | 解释 |
|---|---|
| `standalone_mean` | 变量组单独使用时的标准化预测能力 |
| `interaction_mean` | 变量组与其余变量之间的交互贡献 |
| `dependency_mean` | 依赖带来的有符号贡献，负值多为冗余 |
| `net_loco_mean` | 从完整模型移除该变量组后损失的净预测能力 |
| `*_std` | 多次空间划分之间的波动 |

假设得到：

| group | standalone_mean | interaction_mean | dependency_mean | net_loco_mean |
|---|---:|---:|---:|---:|
| temperature | 0.18 | 0.09 | -0.06 | 0.21 |

读法是：

```text
0.18 + 0.09 - 0.06 = 0.21
```

气温组单独包含约 0.18 的标准化预测信息，与其他变量的交互贡献约 0.09，冗余信息抵消约 0.06，最终净贡献约 0.21。

不同变量的 `net_loco_mean` 不必加到 1。LOCO 会重复计算共享信息，DIP 的目的正是把这种合作和冗余显露出来。

## 贡献栅格怎么看

`prediction.tif` 是模型预测的 Y，单位与 Y 相同。

`allocated_effect_temperature.tif` 表示每个像元上气温组将预测值向上或向下推动多少。正值提高预测，负值降低预测。模型截距保存在 `result_metadata.json`，并满足：

\[
\text{prediction}
=
\text{intercept}
+
\sum_j \text{allocated effect}_j
\]

`percent_temperature.tif` 使用绝对值计算：

\[
P_j=
\frac{|C_j|}{\sum_k|C_k|}
\times100\%
\]

同一像元中所有变量的百分比加起来为 100%。百分比没有方向，必须与 `allocated_effect` 一起看。

`main_effect_temperature.tif` 只保留主效应。`interaction_temperature__precipitation.tif` 是两变量的原始交互项。

有两种正确的求和方式：

```text
截距 + 全部allocated_effect = prediction
```

或者：

```text
截距 + 全部main_effect + 全部interaction = prediction
```

`allocated_effect` 已经平均分配了交互项，不能再把 interaction 栅格加一次。

## 精度不足时会发生什么

默认设置为：

```python
R2_THRESHOLD = 0.70
STOP_IF_BELOW_THRESHOLD = True
```

如果多次空间验证的平均 \(R^2\) 低于 0.70，程序仍保存 DIP 表格和验证指标，但停止输出逐像元贡献图。原因很简单：模型本身没有学好时，漂亮的贡献地图也不值得解释。

如果研究问题允许较低阈值，可以修改 `R2_THRESHOLD`。不要为了让代码通过而反复下调阈值，阈值应在分析前确定。

## 论文方法部分可以怎样写

下面是一段通用写法，变量名和数值需要换成真实设置：

> We stacked temporally matched predictor and response rasters on a common grid and retained pixels with complete observations across all variables. To reduce spatial leakage, model evaluation used spatially blocked splits, with all observations from the same block assigned exclusively to either training or validation data. Predictive contributions were quantified using the DIP decomposition under squared-error loss. Explainable boosting machines were fitted for the full predictor set, each focal variable group, the remaining variables, and a groupwise additive model excluding cross-group interactions. Predictive-power components were evaluated on held-out spatial blocks and normalized by the variance of the response.

中文写法可以更直接：

> 将同期 X 与 Y 栅格对齐后按像元构造样本，并仅保留所有变量均有效的像元。采用空间分块方式划分训练集和验证集，同一空间块的全部时期只能进入其中一侧。基于平方损失和 EBM 模型计算 DIP 分解，将每个变量组的净预测贡献拆分为单独贡献、交互贡献及变量依赖带来的有符号贡献。所有分数均在未参与训练的空间块上计算，并以 Y 的方差标准化。

## 结果部分可以怎样写

以下数字只是格式示例：

> 空间独立验证的平均 \(R^2\) 为 0.74。变量 A 的净预测贡献最高，为 0.21，其中单独贡献、交互贡献和依赖贡献分别为 0.18、0.09 和 −0.06。负的依赖贡献表明变量 A 与其余预测因子共享部分预测信息。变量 B 的单独贡献较低，但交互贡献较高，说明其预测价值主要在与其他变量联合使用时出现。

涉及滞后时可以写：

> 与仅使用当期变量的模型相比，加入前一期变量后，空间独立验证 \(R^2\) 由 0.60 提高至 0.70，且 RMSE 由 105 降至 89。加入更早时期的变量未进一步改善精度，结果支持约一个时间步的滞后响应。DIP 分解显示，该滞后变量组的额外预测信息主要来自单独贡献，而非与同期变量的交互。

不要把“预测贡献”直接改成“因果贡献”。如果研究使用的是观测栅格，建议保留“预测信息”“关联”或“响应”等词。

## 这套改造能回答什么

它可以回答：

```text
哪个变量单独就能预测Y
哪个变量主要依赖与其他变量交互
哪些变量包含重复预测信息
不同位置上哪个变量对模型预测影响更大
```

它不能单独回答：

```text
改变X是否一定导致Y变化
精确的生态机制是什么
某个像元的变量依赖贡献是多少
最佳滞后窗口是多少
```

最后一项需要另外比较 M0、M1、M2。DIP 应放在窗口选择之后，而不是用一张贡献图代替滞后检验。

## 参考资料

1. König, G., Günther, E., & von Luxburg, U. (2025). [Disentangling Interactions and Dependencies in Feature Attributions](https://proceedings.mlr.press/v258/konig25a.html). AISTATS, PMLR 258, 2134–2142.
2. [DIP官方Python包](https://github.com/gcskoenig/dipd)
3. [论文实验代码](https://github.com/gcskoenig/aistats_2025_DIP)
4. [ExplainableBoostingRegressor文档](https://interpret.ml/docs/python/api/ExplainableBoostingRegressor.html)
