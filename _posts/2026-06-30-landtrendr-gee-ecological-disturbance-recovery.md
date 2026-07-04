---
title: "LandTrendr与GEE生态退化及恢复年份识别"
date: 2026-06-30 18:30:00 +0800
article_id: "008"
permalink: /posts/2026/06/landtrendr-gee-ecological-disturbance-recovery/
lang: zh
author_profile: true
comments: false
share: false
tags:
  - LandTrendr
  - Google Earth Engine
  - Landsat
  - 变化检测
  - 生态恢复
  - 长时间序列
excerpt: "从 Landsat Collection 2 年度序列出发，完整拆解 LandTrendr 的断点拟合、扰动和恢复事件提取、参数筛选、GeoTIFF 导出与验证流程。"
---

## 摘要

两期遥感影像只能说明起点与终点不同，却很难回答变化发生在哪一年、持续多久、是突发扰动还是缓慢退化，以及植被后来是否恢复。LandTrendr 将年度 Landsat 光谱序列拟合为若干分段直线，可从断点和变化段中提取扰动年份、幅度、持续时间、恢复速率等信息。本文基于 Google Earth Engine 内置 LandTrendr API，给出不依赖外部模块的完整单文件脚本，涵盖 Landsat 5/7/8/9 预处理、年度 NBR 合成、扰动与恢复筛选、最小斑块过滤、结果导出和本地面积统计，并讨论它在喀斯特生态恢复、植被碳汇和土地利用变化研究中的适用边界。

## 配套代码下载

[下载配套代码包：landtrendr_ecological_change_template.zip](/assets/downloads/landtrendr_ecological_change_template.zip){: .btn .btn--primary}

按钮无法打开时，可以复制下面的直链：

```text
https://noob304.github.io/assets/downloads/landtrendr_ecological_change_template.zip
```

压缩包中包含完整 GEE JavaScript、模拟扰动和恢复 GeoTIFF、本地统计脚本、环境文件及人工验证点模板。GEE 主脚本没有 `require()` 外部依赖，后文涉及的每个脚本都在附件中。

## 一、为什么关注这个代码

生态恢复和土地退化研究经常使用两期或多期遥感影像做差值：

```text
NDVI_2020 - NDVI_2000
土地利用_2020 - 土地利用_2000
NPP_2020 - NPP_2000
```

这种做法容易理解，也适合描述净变化，但它会丢失过程。

假设两个像元在 2000—2020 年的 NDVI 都增加了 0.15：

- 像元 A 在 2005 年突降，随后用了十多年恢复；
- 像元 B 从 2000 年开始缓慢变绿，中间没有明显扰动。

终点减起点相同，生态含义却完全不同。前者可能经历火灾、采伐、石漠化加剧或工程扰动，后者可能对应自然演替、封育或持续管理。

长时间序列变化检测希望回答更具体的问题：

- 变化何时开始；
- 变化是突然发生还是持续多年；
- 扰动幅度有多大；
- 扰动后是否恢复；
- 恢复需要多少年；
- 同一像元是否经历多次事件。

LandTrendr 正是为这类问题设计的。它最初用于 Landsat 森林扰动与恢复检测，后来被实现到 Google Earth Engine，可以在云端处理大范围年度序列。

## 二、代码项目简介

### 1. LT-GEE

[LT-GEE](https://github.com/eMapR/LT-GEE) 是 LandTrendr 的 Google Earth Engine 实现与工具库。项目由 eMapR 团队维护，代码示例使用 Apache-2.0 许可证，文档使用 CC BY 4.0。截至 2026 年 6 月 27 日，仓库约有 228 stars、70 forks；主仓库最近一次代码推送在 2024 年，GEE 仍提供内置的 LandTrendr API。

项目提供：

- Landsat 年度合成；
- NBR、NDVI、TCW 等指数转换；
- LandTrendr 参数封装；
- 变化段提取；
- 扰动年份、幅度和持续时间制图；
- 像元轨迹显示与结果导出。

官方 LT-GEE 模块通常这样调用：

```javascript
var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js');
```

这种方式很方便，但初学者容易不知道模块内部做了什么，也会遇到公共仓库权限、路径变化或脚本缺失问题。因此，本文附件按官方 API 和 LT-GEE 的开源实现重新组织为单文件版本，直接调用：

```javascript
ee.Algorithms.TemporalSegmentation.LandTrendr(...)
```

Landsat 预处理、年度合成和结果数组拆解都写在同一个 `.js` 文件中。压缩包同时保留 Apache-2.0 许可证及 LT-GEE 归属说明。

### 2. 同类方法怎么选

本轮同时检查了 CCDC、BFAST 和 COLD/pyxccd。

| 方法 | 时间序列形式 | 主要特点 | 更适合的场景 | 上手难度 |
|---|---|---|---|---|
| LandTrendr | 每年一景或一个年度合成 | 分段线性轨迹，直观表达扰动与恢复 | Landsat 长期生态退化、恢复、采伐、火灾 | 中等 |
| CCDC | 全部清晰观测 | 谐波回归连续拟合，可检测季节性序列断点 | 连续土地覆盖变化和分类 | 较高 |
| BFAST | 规则时间序列 | 分离趋势、季节和残差并检测结构突变 | MODIS、月尺度指数、点位或中小规模栅格 | 中等 |
| COLD / pyxccd | 密集多光谱观测 | C/C++ 核心、连续监测、近实时与多传感器 | HLS、Sentinel-2、近实时大规模监测 | 高 |

几个项目的当前状态也值得注意：

- [gee-ccdc-tools](https://github.com/parevalo/gee-ccdc-tools) 提供 CCDC 结果处理工具，MIT 许可证；
- [bfast2/bfast](https://github.com/bfast2/bfast) 仍在维护，适合 R 时间序列分析，GPL-2.0；
- 原 `pycold` 仓库已明确停止维护；
- [pyxccd](https://github.com/Remote-Sensing-of-Land-Resource-Lab/pyxccd) 是当前替代项目，支持 COLD、S-CCD、HLS、Sentinel-2 和近实时更新，Apache-2.0。

如果目标是先把“遥感长时间序列—变化年份—恢复轨迹”跑通，LandTrendr 的数据准备和结果解释更直观，因此作为本篇教程的重点。

## 三、它能解决什么科研问题

### 1. 生态恢复从哪一年开始

退耕还林、石漠化治理、矿山修复和封山育林通常有明确的实施期，但遥感响应未必与工程年份完全同步。LandTrendr 可以定位 NBR 或 NDVI 轨迹的恢复段，比较：

- 工程实施年份；
- 遥感恢复起始年份；
- 达到稳定状态所需时间；
- 工程区与对照区的恢复差异。

### 2. 退化是突发事件还是长期过程

短时间内大幅下降可能对应火灾、采伐、建设占用或极端干旱。持续多年的缓慢下降则可能对应土壤退化、水分限制、反复扰动或植被衰退。

变化幅度和持续时间一起使用，能把“变化了多少”扩展为“以什么方式变化”。

### 3. 扰动后是否真正恢复

植被指数回升不一定回到扰动前水平。可以进一步计算：

$$
R=\frac{NBR_{post-recovery}-NBR_{post-disturbance}}
{NBR_{pre-disturbance}-NBR_{post-disturbance}}
$$

其中 $R=1$ 表示恢复到扰动前光谱水平，$R<1$ 表示尚未完全恢复，$R>1$ 则表示超过原水平。这个指标仍然是光谱恢复程度，不等同于生态功能或碳储量完全恢复。

### 4. 不同地貌区的恢复速度是否一致

将 LandTrendr 恢复年份、持续时间和速率与岩性、坡度、土层厚度、降水、干旱指数和土地利用叠加，可以比较：

- 喀斯特与非喀斯特区；
- 峰丛洼地与槽谷区；
- 不同石漠化等级；
- 不同降水和土壤水分背景。

### 5. 生态系统碳汇变化是否与扰动同步

LandTrendr 给出光谱事件时间，可以用来定义 GPP、NPP、NEP 或碳储量分析的事件窗口：

```text
扰动前 5 年
→ 扰动发生年
→ 扰动后 1—3 年
→ 恢复阶段
```

这样可以比较碳汇指标在不同阶段的响应，而不是只做整个研究期的线性趋势。

## 四、核心方法原理

### 1. NBR

归一化燃烧指数 NBR 定义为：

$$
NBR=\frac{NIR-SWIR2}{NIR+SWIR2}
$$

健康植被通常具有较高近红外反射率和较低短波红外反射率，因此 NBR 对植被损失、火灾和水分变化较敏感。LandTrendr 也可以使用 NDVI、NDMI、TCW 或单波段，但不同指数对扰动类型的响应不同。

### 2. 年度合成

本文脚本将 Landsat 5、7、8 和 9 的地表反射率统一命名，并对 QA_PIXEL 中的填充值、膨胀云、卷云、云、云影和雪进行掩膜。每年使用固定季节内的中值影像生成一个年度合成。

```text
Landsat Collection 2 Level 2
        ↓
云、云影、雪和饱和像元掩膜
        ↓
固定季节年度中值合成
        ↓
NBR 年度序列
```

年度窗口必须保持一致。若某些年份使用生长季峰值，另一些年份使用休眠期影像，LandTrendr 很可能把物候差异识别为变化。

### 3. 分段线性拟合

LandTrendr 用若干顶点把年度序列划分为线性变化段。对某一段 $s$：

$$
\hat y_t=a_s+b_s t,\quad t_s \le t \le t_{s+1}
$$

顶点数量越多，模型越能追踪短期变化，但也更容易把噪声拟合成事件。`maxSegments`、`spikeThreshold`、`pvalThreshold` 和 `recoveryThreshold` 共同控制模型复杂度和变化段选择。

GEE 返回的 `LandTrendr` 数组有四行：

```text
第 1 行：年份
第 2 行：原始观测值
第 3 行：分段拟合值
第 4 行：是否为顶点，1 或 0
```

只有顶点之间的变化才构成候选变化段。

### 4. 为什么要把 NBR 乘以 -1

GEE LandTrendr 假定第一波段“数值增加代表扰动，数值下降代表恢复”。自然方向的 NBR 通常在植被损失后下降，因此脚本使用：

```javascript
var ltIndex = nbr.multiply(-1000).rename('LT_index');
```

这样：

- 翻转 NBR 增加：植被扰动；
- 翻转 NBR 下降：植被恢复。

`1000` 只是数值缩放，便于与常见 LandTrendr 参数和输出幅度对应，不改变断点位置。

### 5. 变化段指标

对相邻两个顶点：

$$
\Delta = \hat y_{end}-\hat y_{start}
$$

$$
Duration=t_{end}-t_{start}
$$

$$
Rate=\frac{|\Delta|}{Duration}
$$

附件将幅度重新转换到原始 NBR 的 0—1 尺度，并把扰动和恢复幅度都表达为正数。

变化幅度与噪声之比 DSNR 为：

$$
DSNR=\frac{|\Delta|}{RMSE}
$$

DSNR 越大，变化幅度相对于拟合误差越明显。但它不是显著性概率，也不能代替独立验证。

### 6. 从所有变化段中选择一个事件

一个像元可能包含多个扰动和恢复段。教程分别选择：

- 幅度最大的扰动段；
- 幅度最大的恢复段。

随后按年份、幅度、持续时间、DSNR 和最小斑块面积过滤。最终得到的不是“所有变化”，而是满足规则的最大事件。

## 五、代码结构与运行流程

### 1. 解压附件

```text
landtrendr_ecological_change_template/
├─ landtrendr_complete.js
├─ 01_create_demo_change_rasters.py
├─ 02_summarize_change_metrics.py
├─ validation_points_template.csv
├─ data/
└─ output/
```

GEE 分析只需要 `landtrendr_complete.js`。Python 文件负责在本地汇总导出的 GeoTIFF。

### 2. 打开 Earth Engine Code Editor

访问：

<https://code.earthengine.google.com/>

新建脚本，把 `landtrendr_complete.js` 全部复制进去。脚本使用 GEE 公共 Landsat Collection 2 数据，不需要先下载原始影像。

### 3. 修改研究区

模板使用一个小矩形：

```javascript
var AOI = ee.Geometry.Rectangle([109.08, 27.62, 109.18, 27.72]);
```

如果 GEE 左侧 Imports 已经有绘制的 `geometry`，可以改为：

```javascript
var AOI = geometry;
```

也可以读取 Asset：

```javascript
var AOI = ee.FeatureCollection(
  'projects/项目名称/assets/study_area'
).geometry();
```

第一次不要直接跑全省或全国。先在小范围检查年度影像数量、云掩膜、NBR 轨迹和参数。

### 4. 修改时间和季节

```javascript
var START_YEAR = 1990;
var END_YEAR = 2025;

var START_MONTH = 6;
var START_DAY = 1;
var END_MONTH = 9;
var END_DAY = 30;
```

南方多云区可以适当扩大季节窗口，但窗口过宽会混入物候差异。若研究区跨越多个气候带，最好分区确定时间窗口。

### 5. Landsat 波段统一

Landsat 5/7 与 Landsat 8/9 的波段编号不同，脚本统一为：

```text
blue, green, red, nir, swir1, swir2
```

Collection 2 Level 2 地表反射率缩放为：

```javascript
reflectance = DN * 0.0000275 - 0.2
```

这一步不能省略。直接用 DN 计算 NBR 会得到错误的尺度和跨传感器关系。

### 6. 运行参数

```javascript
var RUN_PARAMS = {
  maxSegments: 6,
  spikeThreshold: 0.9,
  vertexCountOvershoot: 3,
  preventOneYearRecovery: true,
  recoveryThreshold: 0.25,
  pvalThreshold: 0.05,
  bestModelProportion: 0.75,
  minObservationsNeeded: 6
};
```

参数含义：

| 参数 | 作用 | 调整风险 |
|---|---|---|
| `maxSegments` | 最大变化段数量 | 太大容易过拟合，太小会漏掉多次变化 |
| `spikeThreshold` | 抑制单年尖峰 | 太低可能抹掉真实突发事件 |
| `preventOneYearRecovery` | 是否禁止一年内完全恢复 | 可减少云残留或异常值造成的伪恢复 |
| `recoveryThreshold` | 限制过快恢复 | 需要根据生态恢复速度调整 |
| `pvalThreshold` | 模型选择阈值 | 影响顶点保留 |
| `minObservationsNeeded` | 最少有效观测年份 | 过低会增加不稳定拟合 |

这些默认值来自 LT-GEE 教学示例，可作为起点，不能替代研究区验证。

### 7. 变化筛选

```javascript
var MIN_DIST_MAG = 0.15;
var MAX_DIST_DUR = 4;
var MIN_REC_MAG = 0.10;
var MIN_REC_DUR = 2;
var MAX_REC_DUR = 10;
var MIN_DSNR = 2.0;
var MIN_PATCH_PIXELS = 11;
```

这里把扰动定义为 NBR 至少下降 0.15、持续不超过 4 年且 DSNR 不低于 2。恢复则要求 NBR 至少增加 0.10，持续 2—10 年。

在 30 m 分辨率下，11 个像元约为 0.99 ha。最小斑块过滤可以减少椒盐噪声，但也会删除真实的小尺度治理斑块。

### 8. 检查图表

脚本会在 Console 输出两张点位图表：

- 年度 NBR 原始合成序列；
- LandTrendr 拟合 NBR 序列。

如果拟合线明显忽略真实变化，或把单年异常拟合成断点，应先调整云掩膜、季节窗口和年度影像数量，再考虑 LandTrendr 参数。

### 9. 运行导出任务

点击 `Run` 后，Tasks 面板会出现：

```text
LandTrendr_disturbance_metrics
LandTrendr_recovery_metrics
```

导出的扰动 GeoTIFF 包含：

| 波段 | 含义 |
|---|---|
| `dist_yod` | 扰动首次可确认年份 |
| `dist_end_year` | 扰动段结束年份 |
| `dist_pre_nbr` | 扰动前拟合 NBR |
| `dist_post_nbr` | 扰动后拟合 NBR |
| `dist_mag` | NBR 下降幅度 |
| `dist_dur` | 扰动持续年数 |
| `dist_rate` | 年均变化幅度 |
| `dist_dsnr` | 幅度与拟合 RMSE 之比 |

恢复结果使用 `rec_` 前缀。

### 10. 本地统计

安装环境：

```powershell
mamba env create -f environment.yml
mamba activate landtrendr-summary
```

先运行模拟结果：

```powershell
python 01_create_demo_change_rasters.py
python 02_summarize_change_metrics.py
```

统计真实 GEE 导出文件：

```powershell
python 02_summarize_change_metrics.py `
  --disturbance data/landtrendr_disturbance_metrics.tif `
  --recovery data/landtrendr_recovery_metrics.tif `
  --output-dir output_real
```

输出包括各年份变化面积、平均幅度、中位持续时间、平均速率、平均 DSNR 以及总体汇总。

## 六、如何迁移到遥感生态研究

### 1. 喀斯特生态恢复轨迹

以石漠化治理区、退耕还林区或封育区为研究对象，提取每个像元的最大扰动与恢复事件，再按岩性、坡位、土层厚度和干湿条件分组。

可以回答：

- 哪些区域恢复启动更早；
- 恢复持续时间是否受水分限制；
- 同样的治理措施在不同地貌单元中是否具有不同轨迹；
- 已变绿区域是否仍存在反复扰动。

### 2. 碳汇对扰动的阶段性响应

用 LandTrendr 年份定义事件窗口，再提取 GPP、NPP、LAI 或碳储量：

```text
扰动前基线
→ 扰动发生
→ 短期损失
→ 恢复启动
→ 恢复稳定
```

然后比较不同阶段的碳汇变化。LandTrendr 的 NBR 变化只负责确定事件时间，不应直接被称为碳汇损失。

### 3. 土地利用变化与生态系统服务

把 LandTrendr 扰动年份与土地利用转换年份、InVEST 碳储量或 SDR 结果结合，可以识别：

- 光谱扰动发生后土地利用是否真的改变；
- 林地转耕地或建设用地造成的生态服务损失；
- 恢复斑块的碳储量与土壤保持服务是否同步恢复。

### 4. 生态工程成效评估

LandTrendr 可以帮助定义干预年份，但不能单独完成因果识别。更稳妥的流程是：

```text
LandTrendr 定位变化年份
→ 工程边界和实施年份核对
→ 匹配处理区与对照区
→ DID / Causal Forest / 中断时间序列
→ 估计工程净效应
```

这样可以避免把同期气候改善或自然演替全部归因于工程治理。

### 5. 多次扰动与恢复循环

教程只导出最大扰动和最大恢复。若研究对象存在反复火灾、采伐或干旱，应保留所有变化段，构建：

- 扰动次数；
- 相邻事件间隔；
- 第一次恢复时间；
- 二次退化概率；
- 恢复稳定性。

这会比“最大变化段”更接近生态系统韧性研究。

## 七、可能形成的论文创新点

### 创新点 1：事件感知的碳汇归因

先用 LandTrendr 定位扰动和恢复年份，再按事件阶段分析 GPP/NPP 对气候和人类活动的响应。与整段时间做一个趋势相比，这种设计能区分扰动前稳定期、突变期和恢复期。

### 创新点 2：扰动—恢复不对称

同时比较扰动幅度、扰动速度、恢复幅度和恢复时长，检验“快速损失、缓慢恢复”是否普遍存在，以及这种不对称如何随地貌、水分和治理方式变化。

### 创新点 3：把遥感断点用于因果研究的时间定位

政策或工程记录的年份不一定等于生态响应年份。可以分别使用行政实施年份和 LandTrendr 响应年份建立模型，检验结论对干预时间定义是否敏感。

### 创新点 4：多指数一致性变化检测

分别使用 NBR、NDVI、NDMI 和 TCW 运行 LandTrendr。只有多个指数在相近年份出现一致断点时，才判定为高置信变化；指数响应不一致的区域则单独分析。

### 创新点 5：参数不确定性进入空间结论

对 `maxSegments`、幅度阈值、持续时间和 DSNR 进行组合试验，统计每个像元被识别为变化的频率。最终输出“变化概率或稳定性图”，而不是只展示一套参数的确定性结果。

## 八、复现建议与注意事项

### 1. 本文代码的验证状态

附件中的 GEE JavaScript 已通过标准 JavaScript 语法检查，所有 LandTrendr 参数、数组结构和变化段提取逻辑均按 GEE 官方 API 与 LT-GEE 源码核对。本次未使用真实 Earth Engine 账号提交云端导出任务，因此没有声称 GEE 端到端运行完成。

本地 Python 部分已完整运行：模拟 GeoTIFF 生成、波段读取、投影检查、面积换算和年度汇总均通过。模拟结果不能用于任何真实研究结论。

### 2. 云残留比参数问题更常见

南方多云区的单年异常常来自云、薄云、云影和观测不足。看到异常断点时，先检查原始影像数量和年度合成，再调整 LandTrendr 参数。

### 3. Landsat 7 SLC-off

2003 年后的 Landsat 7 存在扫描线缺失。多景年度合成可以缓解空缺，但云多或影像少的年份仍可能残留条带和缺口。应检查每年清晰观测次数。

### 4. 传感器差异

Landsat 5/7 与 8/9 的光谱响应并不完全一致。本文统一了波段和缩放系数，但没有额外做跨传感器回归校正。若研究区在传感器切换年份出现大范围同步断点，需要进行交叉传感器敏感性检查。

### 5. 年度合成会牺牲季节信息

LandTrendr 使用年度序列，适合多年轨迹。若科学问题关注季节突变、短期干旱或作物物候，CCDC、BFAST、S-CCD 或月/旬尺度方法可能更合适。

### 6. 最大事件会隐藏其它事件

每个像元只保留最大扰动时，较小但生态意义重要的事件会被忽略。多次火灾、采伐—恢复—再采伐等研究必须保留完整变化段。

### 7. NBR 变化不是变化原因

LandTrendr 识别的是光谱轨迹，不会自动区分火灾、采伐、城市扩张、干旱、病虫害或治理。原因判定需要土地利用、火点、气候、夜间灯光、工程边界和高分影像等辅助证据。

### 8. 必须做参考数据验证

可以使用 TimeSync、Google Earth 历史影像、高分辨率影像、火灾记录或工程档案建立验证样本。除了变化/未变化精度，还应评价事件年份误差，并明确是否允许 ±1 年。

### 9. 面积统计要使用投影坐标

经纬度栅格的像元面积随纬度变化，不能直接用行列数乘固定面积。附件统计脚本要求投影坐标且单位为米。跨纬度大区域应使用等面积投影或逐像元面积。

## 九、结语

LandTrendr 把“某两个年份不同”改写成一条可分析的变化轨迹：什么时候发生扰动、变化持续多久、后来有没有恢复。对生态恢复、石漠化治理、森林扰动和土地利用变化研究来说，这些时间信息可以直接改变后续的样本划分、事件窗口和因果设计。

它仍然只是变化检测工具。可靠结论依赖年度影像质量、参数敏感性、参考数据验证和生态背景解释。把 LandTrendr 与 GPP/NPP、气候、人类活动、工程边界、InVEST 和因果分析结合，才有可能从“检测到变化”进一步回答“变化意味着什么、由什么造成、是否具有持续生态效应”。

## 十、参考资料

1. LT-GEE GitHub：<https://github.com/eMapR/LT-GEE>
2. LT-GEE Guide：<https://emapr.github.io/LT-GEE/>
3. Google Earth Engine LandTrendr API：<https://developers.google.com/earth-engine/apidocs/ee-algorithms-temporalsegmentation-landtrendr>
4. Kennedy RE, Yang Z, Cohen WB. Detecting trends in forest disturbance and recovery using yearly Landsat time series: 1. LandTrendr—Temporal segmentation algorithms. Remote Sensing of Environment, 2010, 114: 2897–2910. <https://doi.org/10.1016/j.rse.2010.07.008>
5. Kennedy RE, Yang Z, Gorelick N, et al. Implementation of the LandTrendr Algorithm on Google Earth Engine. Remote Sensing, 2018, 10: 691. <https://doi.org/10.3390/rs10050691>
6. Google Earth Engine CCDC API：<https://developers.google.com/earth-engine/apidocs/ee-algorithms-temporalsegmentation-ccdc>
7. Arévalo P, Bullock EL, Woodcock CE, Olofsson P. A Suite of Tools for Continuous Land Change Monitoring in Google Earth Engine. Frontiers in Climate, 2020. <https://doi.org/10.3389/fclim.2020.576740>
8. Zhu Z, Woodcock CE. Continuous change detection and classification of land cover using all available Landsat data. Remote Sensing of Environment, 2014, 144: 152–171. <https://doi.org/10.1016/j.rse.2014.01.011>
9. BFAST GitHub：<https://github.com/bfast2/bfast>
10. Verbesselt J, Hyndman R, Newnham G, Culvenor D. Detecting trend and seasonal changes in satellite image time series. Remote Sensing of Environment, 2010, 114: 106–115. <https://doi.org/10.1016/j.rse.2009.08.014>
11. pyxccd GitHub：<https://github.com/Remote-Sensing-of-Land-Resource-Lab/pyxccd>
12. Zhu Z, Zhang J, Yang Z, et al. Continuous monitoring of land disturbance based on Landsat time series. Remote Sensing of Environment, 2020, 238: 111116. <https://doi.org/10.1016/j.rse.2019.03.009>
13. Ye S, Rogan J, Zhu Z, Eastman JR. A near-real-time approach for monitoring forest disturbance using Landsat time series: stochastic continuous change detection. Remote Sensing of Environment, 2021, 252: 112167. <https://doi.org/10.1016/j.rse.2020.112167>
