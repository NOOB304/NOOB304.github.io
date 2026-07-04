---
title: "顶会论文拆解｜TimePro时序预测与生态学建模思路"
date: 2026-07-01 20:10:00 +0800
article_id: "009"
permalink: /posts/2026/07/timepro-ecology-npp-forecasting-code/
lang: zh
author_profile: true
comments: false
share: false
tags:
  - TimePro
  - 时序预测
  - 深度学习
  - 多变量时序
  - 生态模型
  - Mamba
  - 栅格预测
excerpt: "拆解ICML 2025 TimePro的multi-delay、HyperMamba与time-tune机制，给出通用多变量时序预测代码，并讨论站点划分、历史目标、稀疏观测、栅格递推和生态学建模思路。"
---

气候变量对植被生产力的影响很少整齐地发生在同一个时间点。高温可能当月就抑制光合作用，降水可能先补充土壤水分，再影响后续几个月的生长；一次干旱结束后，NPP 也不一定立刻恢复。把当期温度、当期降水和当期 NPP 塞进一张表做随机森林，当然能得到一个模型，但这些滞后和累积效应基本被压扁了。

TimePro研究的是多变量长序列预测中的multi-delay，也就是不同变量影响目标的时间区间并不相同。论文发表于ICML 2025。

原论文使用电力、汇率和天气等规则序列。这里把任务改成多个X预测一个Y，并按站点划分训练集和验证集，训练完成后还可以读取GeoTIFF做空间预测。

## 配套PY代码

[下载timepro_ecology_forecast.py](/assets/downloads/timepro_ecology_forecast/timepro_ecology_forecast.py)

[下载依赖清单](/assets/downloads/timepro_ecology_forecast/requirements.txt)

训练、自动调参、70%/30%站点划分、M0/M1/M2比较和GeoTIFF预测都写在同一个PY文件中。

采用推荐CSV列名时，只需要修改`STATION_CSV`和`OUTPUT_DIR`。月尺度与年尺度由`TIME_SCALE`切换。

## 一、TimePro研究的任务

| 项目 | 内容 |
|---|---|
| 题目 | TimePro — Efficient Multivariate Long-term Time Series Forecasting with Variable- and Time-Aware Hyper-state |
| 作者 | Xiaowen Ma, Zhen-Liang Ni, Shuai Xiao, Xinghao Chen |
| 会议 | The 42nd International Conference on Machine Learning，ICML 2025 |
| 论文集 | PMLR 267，42096–42111 |
| 官方论文 | [PMLR页面](https://proceedings.mlr.press/v267/ma25p.html) |
| arXiv全文 | [arXiv 2505.20774](https://arxiv.org/abs/2505.20774) |
| 官方代码 | [xwmaxwma/TimePro](https://github.com/xwmaxwma/TimePro) |

原论文处理标准的多变量长序列预测。

```text
历史输入  X ∈ R^(L×N)
预测输出  Ŷ ∈ R^(H×N)
```

`L`是回看窗口，`N`是变量数，`H`是预测长度。它的原始任务更接近下面这种形式。

```text
过去96个时间点的全部变量
→
未来96/192/336/720个时间点的全部变量
```

原版是多变量输入、多变量输出。生态建模更常见的是气候、地形或土壤变量预测一个Y，任务定义和输出层都要随之修改。

## 二、不同变量的延迟不同

论文里的multi-delay指不同预测变量的变化传递到目标变量时，存在不同且不均匀的时间延迟。

生态数据中常见的情况包括下面几种。

```text
温度异常       → 当月或当季NPP变化
降水增加       → 经土壤水分补给后影响后续NPP
辐射变化       → 可能在同期影响光合碳输入
前期干旱       → 即使降水恢复，植被仍存在遗留效应
```

普通的行级回归可以写成

```text
A_t, B_t, C_t, D_t → Y_t
```

它只能看到同期变量。加入时间窗口后，样本变成

```text
A_(t-11…t), B_(t-11…t), C_(t-11…t), D_(t-11…t)
→ Y_t
```

所有变量共用同一种时间摘要时，模型容易漏掉“降水看前3个月、温度看当月、土壤水分看前1个月”这样的差异。TimePro先建模变量关系，再根据各变量内部的时间位置调整状态。

TimePro会自适应选择内部特征中的时间位置，但论文没有直接输出“降水滞后3个月”这种生态参数。明确估计生态滞后期还需要分布滞后回归或因果滞后方法。

## 三、TimePro模型结构

![TimePro论文结构拆解](/images/timepro-ecology/timepro-paper-architecture.svg)

从输入到输出，TimePro依次经过下面这些步骤。

```text
多变量历史序列
→ RevIN
→ 每个变量单独切重叠patch
→ 多层ProBlock
→ 每个变量的特征展平
→ 线性投影到未来H个时间点
```

TimePro采用encoder-only结构，通过线性投影一次输出未来序列。

### 1. RevIN处理分布变化

时间序列的训练期和测试期经常不在同一个数值范围。TimePro在输入端使用可逆实例归一化RevIN，对每个样本进行中心化和标准化，预测完成后再反归一化。

不同站点的NPP均值、温度背景和降水量级可能差异很大，RevIN可以缓解这类数值分布漂移。生态区差异、传感器偏差和超出历史范围的未来气候仍要单独处理。

### 2. 每个变量单独切时间片

TimePro先把每个单变量序列切成重叠patch，并保留下面三个维度。

```text
变量维 N
时间片维 P
特征维 D
```

例如，12个月温度可以切成若干个3个月窗口。降水、辐射和土壤水分也分别切片。后续模块仍能区分变量和时间片，细粒度时间结构得以保留。

patch长度需要根据数据调整。论文在基准数据上常用16到32，生态月数据只有12或24个月回看时不能直接照搬。

### 3. ProBlock处理两类信息

每个ProBlock包含两个部分。

```text
HyperMamba  建模变量关系，并用关键时间位置调节状态
TimeFFN     继续处理变量内部的时间特征
```

两部分都有残差连接。多个ProBlock叠加后，模型再把每个变量的patch特征展平，通过线性层直接预测未来H个时间点。

## 四、HyperMamba沿变量维扫描

HyperMamba决定了TimePro如何同时处理变量关系和时间位置。

### 1. 沿变量维扫描

Mamba常被用来沿时间轴扫描长序列。TimePro让HyperMamba沿变量维扫描，使状态携带变量之间的关系。官方实现还将通道拆成两部分，分别正向和反向扫描变量，再合并两个方向。

TimePro把变量序列当作扫描对象，时间信息保留在每个变量的patch特征中。

### 2. plain state缺少时间位置信息

只沿变量维扫描得到的plain state，主要知道不同变量如何关联，却不知道某个变量内部哪些时间片更重要。

论文指出plain state存在下面的问题。

```text
变量关系不是固定的；
它会随变量内部的局部时间变化而改变。
```

例如，降水与NPP的关系在湿润期和连续干旱之后可能完全不同。只保留一个统一的“降水状态”，会把这些差别平均掉。

### 3. time tune重建hyper-state

Hyper-scan先获得plain state，然后恢复patch与变量构成的二维结构。接下来，time tune网络学习偏移量，在这个“时间片×变量”网格中自适应采样重要位置。

论文采用可微的线性插值。官方代码中使用DCNv4的3×3动态稀疏算子，复杂度分析把采样点数设为9。采样后的特征通过线性映射融合，得到同时感知变量关系和局部时间变化的hyper-state。

最后，hyper-state与另一条经过SiLU激活的门控分支相乘，得到增强后的变量特征。

HyperMamba先处理变量关系，time tune再选择各变量内部的时间位置。

### 4. 计算量随变量数线性增长

变量自注意力的计算量通常随变量数近似二次增长。TimePro沿变量维做选择性扫描，计算量随变量数线性增长。time tune只采样少量位置，论文把采样点数视为常数。

生态模型常常只有4到10个气候变量，计算量并非主要矛盾。更有用的是让不同变量保留各自的时间结构。

## 五、基准实验和消融结果

作者在ECL、Exchange、Weather、Solar-Energy以及ETT的4个子集上实验，共8条基准序列。主要实验使用固定回看窗口96，比较多个长预测长度，并报告MSE和MAE。

部分平均MSE见下表。

| 数据集 | TimePro | S-Mamba | SOFTS | iTransformer | 说明 |
|---|---|---|---|---|---|
| ECL | 0.169 | 0.170 | 0.174 | 0.178 | TimePro最低 |
| Exchange | 0.352 | 0.367 | 0.361 | 0.360 | TimePro最低 |
| Weather | 0.251 | 0.251 | 0.255 | 0.258 | 与S-Mamba接近 |
| Solar-Energy | 0.232 | 0.240 | 0.229 | 0.233 | SOFTS略低 |
| ETTm1 | 0.391 | 0.398 | 0.393 | 0.407 | TimePro最低 |
| ETTh1 | 0.438 | 0.455 | 0.449 | 0.454 | TimePro最低 |

论文统计TimePro在16个“数据集×指标”平均结果中获得12个第一、2个第二。Weather上的提升约为2%到3%，ETTm1上的MAE也只差几个百分点。它在部分数据集上占优，换成生态CSV后的表现仍要重新验证。

time tune的消融结果见下表。

| 版本 | Exchange MSE | ETTh1 MSE |
|---|---|---|
| 非自适应时间融合 | 0.360 | 0.451 |
| 自适应time tune | 0.352 | 0.438 |

自适应time tune带来了小幅提升。论文中的相关矩阵图说明HyperMamba处理后的变量相关结构更接近预测标签序列，生态滞后和因果关系还需要单独检验。

效率实验使用Nvidia V100 GPU。在回看96、预测720、batch size 16的ECL设置下，论文报告TimePro具有较少参数和显存占用，推理速度约为PatchTST的2.7倍、TimesNet的14.4倍。这组速度只对应论文中的硬件和基准配置。

## 六、官方代码的安装门槛

官方仓库使用下面的安装命令。

```bash
conda create --name timepro python=3.9
pip install -r requirements.txt
cd selective_scan
pip install .
```

依赖中锁定了PyTorch 2.0与CUDA 11.7，还需要编译selective scan和DCNv4。官方仓库同时包含Python、CUDA、C++和C。Windows用户经常会卡在编译器、CUDA版本和二进制兼容上。

官方任务和生态任务还有几处差别。

| 原版TimePro | 气候—NPP任务 |
|---|---|
| 规则、连续的多变量序列 | 多站点数据，可能缺年、缺月 |
| 主要做M→M多变量未来预测 | 多个X预测一个Y |
| 历史窗口和预测长度固定 | X窗口与历史Y长度应分别选择 |
| 随时间切分基准序列 | 需要按站点留出，防止空间泄漏 |
| 输出规则时间序列 | 最终还要做GeoTIFF空间预测 |

配套代码保留分变量时间片、时间窗口和变量交互，模型结构改写为纯PyTorch。

## 七、多X预测单Y的样本写法

代码预测目标时刻`t`的NPP。

```text
X输入  X[t-x_window+1…t]
Y输入  Y[t-y_lags…t-1]
标签   Y_t
```

目标期的气候`X_t`可以进入输入，因为预测时这些驱动数据已经给定。真实`Y_t`不能进入输入，历史Y最多截止到`t-1`。

`x_window`和`y_lags`分别搜索。气候可能需要看过去12个月，历史NPP可能只需要看1到3期。

![TimePro思想迁移到生态NPP预测](/images/timepro-ecology/timepro-ecology-adaptation.svg)

## 八、单文件模型的四条分支

配套模型名为`TimeProLSTMFusion`，主要有四条信息通路。

### 1. X-patch分支

每个气候变量沿时间窗口切成重叠patch。时间Transformer在每个变量内部学习长短期变化，变量Transformer再处理温度、降水、辐射、土壤水分之间的关系。

这条分支借用了TimePro“保留变量与细时间结构”的思想，但没有复刻HyperMamba和DCNv4。

### 2. X-LSTM分支

patch会压缩时间细节。为保留逐时间点的局部变化，代码并行增加一条X-LSTM分支。

X-LSTM用于补充patch表示可能丢失的逐时间点信息，效果需要通过消融实验判断。

### 3. 独立Y-LSTM分支

历史NPP单独进入Y-LSTM，不和目标期X强行对齐。`y_lags=0`时关闭这条分支。

独立的Y分支可以避免把`Y_t`误放进输入，气候窗口与历史Y长度也可以分别设置。

### 4. 门控融合与单目标输出

模型把X-patch、X-LSTM、历史Y和当期X四类表示自适应融合，最后输出一个`Y_t`。它解决的是多X到单Y回归，不再预测所有输入变量的未来值。

## 九、M0 M1 M2消融比较

时间窗口是否有用要靠消融实验判断。代码先比较下面三个模型。

```text
M0  当期X → Y_t
M1  时间窗口X → Y_t
M2  时间窗口X + 历史Y → Y_t
```

M0回答普通回归是否已经足够。M1相对M0的提升，才是时间窗口带来的证据。M2相对M1的提升，表示历史NPP记忆提供了额外信息。

如果M0、M1、M2表现差不多，就没有必要把“时序深度学习”写成主要创新。一个简单模型能做好的事情，没必要硬套TimePro。

## 十、月尺度和年尺度设置

单文件代码通过一行设置切换时间尺度。

```python
TIME_SCALE = "monthly"  # 月尺度
# TIME_SCALE = "annual"  # 年尺度
```

月尺度默认搜索

```python
x_window = [1, 3, 6, 12, 24]
y_lags = [0, 1, 3, 6, 12]
```

年尺度默认搜索

```python
x_window = [1, 2, 3, 5]
y_lags = [0, 1, 2, 3]
```

月尺度不天然优于年尺度。它保留生长季和月际滞后，也带来更强的季节自相关与观测噪声；年尺度更稳定，但样本少，而且把关键月份平均掉了。

如果Y只有年度NPP，而气候X有连续月数据，可以使用下面的任务。

```text
过去12或24个月的月气候序列
→
当年总NPP
```

这能保留季节信息，又不要求月NPP连续。当前单文件代码先支持月→月和年→年，月气候→年NPP仍需要另外定义跨频率样本。

## 十一、70%/30%按站点划分

同一站点的相邻月份高度相似。如果随机拆行，某站点1月进入训练集、2月进入验证集，模型几乎见过验证站点。R²很容易虚高。

代码按站点分组。

```text
70%站点  训练池
  ├─ 内部训练站点
  └─ 内部调参站点

30%站点  最终独立验证
```

参数搜索从未访问最终30%站点。最优参数确定后，模型用全部70%站点重新训练，再对30%陌生站点报告总体R²、RMSE、MAE和逐站点R²。

这种切分检验模型能否迁移到未参与训练的站点。

如果研究目标还包括未来年份外推，最好再增加时间方向的验证，例如留出最后若干年。空间留站点和时间留年份解决的是两个不同问题。

## 十二、模拟数据检查

模拟数据中加入了同期气候、滞后降水、滞后土壤水分和历史Y效应。

| 版本 | M0内部R² | M1内部R² | M2内部R² | 最终独立站点R² | 最优窗口 |
|---|---|---|---|---|---|
| 月尺度 | 0.8980 | 0.9692 | 0.9867 | 0.9835 | 12个月X + 3个月Y |
| 年尺度 | 0.7296 | 0.8670 | 0.9536 | 0.9496 | 3年X + 1年Y |

这组模拟数据用于检查时间对齐、自动调参和模型存取。单文件代码在找不到CSV时会直接报告路径错误，不会自动生成演示数据。

模拟结果不代表真实NPP也能超过0.9。年尺度实验的总体R²为0.9496，逐站点R²中位数却只有0.7148。总站点合并后的指标可能被站点差异抬高，正式研究还要报告逐站点结果。

## 十三、稀疏站点和时间断裂

很多生态站点只有10年或20年记录。不同站点可能覆盖相同年份，也可能中间缺年。这时需要区分两件事。

### 1. 多站点共享年份

同一年有100个站点并不冲突。模型可以把数据视为站点—年份面板。

```text
Y_(i,t) = f(X_(i,t-L+1…t), S_i)
```

`i`表示站点，`S_i`表示海拔、土壤、植被类型、经纬度等静态属性。每个站点贡献自己的样本，模型学习跨站点共享的响应规律。

这类做法常被口头称为“空间换时间”，但空间样本不能真的替代时间动力学。站点A的2010年不能接在站点B的2011年后面组成序列。空间站点增加的是不同环境背景下的样本，不是同一地点的连续记忆。

### 2. 时间断裂的处理

如果某站点只有2010、2011、2015年，2011和2015不能当作相邻年份。代码会按日期间隔切分序列。

```text
读取TIME_SCALE
→
按真实时间间隔切分每个站点
→
只在同一连续片段内生成窗口
```

因此，2011年和2015年不会被错误拼成相邻年份。这个保守处理会舍弃过短片段，但不会伪造时间连续性。

生态监测数据还可以整理成稀疏面板。

```text
每一个有真实Y的站点—年份
＋该年份之前连续12/24个月的栅格气候X
＋海拔、土壤、植被类型等静态变量
→
该站点该年的Y
```

即使历史Y缺失，这个样本仍然可以使用。连续气候窗口可以来自ERA5、CRU或已经整理好的气候栅格，而不是要求站点自身每个月都有记录。

利用零散历史Y时还要输入观测间隔和缺失标记。

```text
最近一次Y
距上次观测的时间Δt
Y是否缺失的mask
```

处理好时间间隔和缺失标记后，再考虑time-aware LSTM、GRU-D或不规则时间Transformer。

## 十四、栅格递推预测

同一个PY文件中的栅格预测函数会从模型文件读取最优`x_window`和`y_lags`。

假设最优模型需要12个月X和3个月历史Y。预测2026年1月时使用下面的数据。

```text
X输入  2025年2月—2026年1月的气候栅格
Y输入  2025年10月—12月的NPP栅格
输出   2026年1月NPP
```

预测2026年2月时，2026年1月的预测NPP进入历史缓冲。

```text
X输入  2025年3月—2026年2月
Y输入  2025年11月、12月和预测的2026年1月
输出   2026年2月NPP
```

代码按栅格块读取，避免一次把整个研究区放进内存。它会检查各变量的投影、分辨率、范围和行列数是否一致，但不会自动重投影。

历史Y递推会积累误差。预测期越长，这个问题越明显。因此正式研究至少要同时保留一个不用历史Y的M1模型，比较它和M2在长预测期的稳定性。

## 十五、下载和运行

下载以下两个文件并放在同一个文件夹。

```text
timepro_ecology_forecast.py
requirements.txt
```

运行下面的命令安装依赖。

```powershell
python -m pip install -r requirements.txt
```

打开`timepro_ecology_forecast.py`，修改站点数据和结果目录。

```python
STATION_CSV = Path("data/station_data.csv")
OUTPUT_DIR = Path("timepro_results")
```

推荐CSV使用以下列名。

```csv
site_id,date,A,B,C,D,Y
S001,2015-01-01,10.2,51.0,130.1,0.42,503.2
S001,2015-02-01,11.8,63.2,141.5,0.46,528.7
S002,2015-01-01,8.1,47.5,125.4,0.39,471.6
```

此时`FEATURE_COLUMNS = []`会自动把A、B、C、D识别为X。列名不同时修改下面几行。

```python
SITE_COLUMN = "site_id"
TIME_COLUMN = "date"
TARGET_COLUMN = "Y"
FEATURE_COLUMNS = []
```

设置月尺度或年尺度。

```python
TIME_SCALE = "monthly"
# TIME_SCALE = "annual"
```

运行代码。

```powershell
python timepro_ecology_forecast.py
```

训练结束后生成下面这些文件。

```text
best_model.pt
metrics.json
parameter_trials.csv
held_out_predictions.csv
per_station_metrics.csv
station_split.csv
validation_scatter.png
validation_residuals.png
```

`R2_THRESHOLD`默认是0.70，可以直接在代码顶部修改。模型未达到阈值时仍会保存，但终端和 `metrics.json` 会明确写成 `FAILED_THRESHOLD`。

预测栅格时打开开关并修改三个目录。

```python
RUN_RASTER_PREDICTION = True

RASTER_HISTORY_DIR = Path("rasters/history")
RASTER_FUTURE_DIR = Path("rasters/future")
RASTER_OUTPUT_DIR = Path("rasters/predicted_Y")
```

历史目录保存模型需要的历史X与历史Y，未来目录保存各期X。

```text
history/
├─ A/
├─ B/
├─ C/
├─ D/
└─ Y/

future/
├─ A/
├─ B/
├─ C/
└─ D/
```

同一期变量必须使用相同文件名，例如各文件夹中都存在 `2026-01.tif`。文件名还应按时间排序，推荐使用 `YYYY-MM.tif` 或 `YYYY.tif`。

## 十六、先用简单模型的几种情况

以下数据更适合先用简单模型。

- 每个站点只有很少几个观测值，总有效样本不到数百；
- X和Y都严重断裂，又没有连续栅格气候补充；
- M0已经和M1、M2表现相同；
- 研究重点是效应量和置信区间；
- 需要证明某个气候因子造成了NPP变化。

TimePro、LSTM和Transformer学习的是预测关系。若要估计改变某个气候因子后响应变量会变化多少，还需要因果设计、自然实验、过程模型或更强的统计假设。

## 十七、生态数据的建模顺序

TimePro把一个具体问题单独建模。变量关系会随各变量内部的时间位置变化。

温度、降水、辐射、VPD和土壤水分可能对应不同的时间窗口。生态站点又常有记录断裂、变量少和空间差异大的问题，原版TimePro的规则序列假设不能原样照搬。

实际建模可以按下面的顺序比较。

```text
先用M0证明普通回归不够
再用M1证明时间窗口有增益
最后用M2检验历史NPP是否值得加入
```

稀疏站点不能硬拼成一条长序列。需要使用静态空间变量、时间间隔和缺失掩码构造面板模型。

## 参考资料

1. Ma, X., Ni, Z.-L., Xiao, S. & Chen, X. [TimePro — Efficient Multivariate Long-term Time Series Forecasting with Variable- and Time-Aware Hyper-state](https://proceedings.mlr.press/v267/ma25p.html). ICML 2025, PMLR 267，42096–42111.
2. TimePro官方代码 [github.com/xwmaxwma/TimePro](https://github.com/xwmaxwma/TimePro).
3. Gu, A. & Dao, T. [Mamba — Linear-Time Sequence Modeling with Selective State Spaces](https://arxiv.org/abs/2312.00752).
4. Kim, T. et al. [Reversible Instance Normalization for Accurate Time-Series Forecasting against Distribution Shift](https://openreview.net/forum?id=cGDAkQo1C0p). ICLR 2022.
5. Xiong, Y. et al. [Efficient Deformable ConvNets — Rethinking Dynamic and Sparse Operator for Vision Applications](https://openaccess.thecvf.com/content/CVPR2024/html/Xiong_Efficient_Deformable_ConvNets_Rethinking_Dynamic_and_Sparse_Operator_for_Vision_CVPR_2024_paper.html). CVPR 2024.
