---
title: "从土地利用图到碳储量变化：用 InVEST 3.20 搭建可复现的生态系统服务评估流程"
date: 2026-06-27
permalink: /posts/2026/06/invest-carbon-ecosystem-services-automation/
lang: zh
author_profile: true
comments: false
share: false
tags:
  - InVEST
  - 生态系统服务
  - 碳储量
  - 土地利用
  - 情景模拟
  - Python
excerpt: "以 InVEST 3.20 Carbon 模型为例，讲清土地利用栅格、四类碳库参数表、Python 批处理、结果汇总与模型边界，并进一步讨论 SDR、水源产出和生境质量的扩展路线。"
---

## 摘要

土地利用变化会同时改变碳储量、土壤保持、水源产出和生境质量。InVEST 将这些生态系统服务拆分为可独立运行的空间模型，适合比较基准情景与规划、恢复或未来土地利用情景。本文以 3.20.0 版 Carbon Storage and Sequestration 模型为入口，从环境安装、GeoTIFF 和碳库 CSV 准备讲到 Python 批处理与结果汇总，并说明如何继续接入 SDR、Annual Water Yield 和 Habitat Quality。文中尤其区分土地利用引起的碳储量变化与 GPP、NEP 等动态碳通量，避免把一个简化情景模型解释成完整碳循环模型。

## 配套代码下载

[下载配套代码包：invest_ecosystem_services_template.zip](/assets/downloads/invest_ecosystem_services_template.zip){: .btn .btn--primary}

按钮无法打开时，可以复制下面的直链：

```text
https://noob304.github.io/assets/downloads/invest_ecosystem_services_template.zip
```

压缩包中包含环境文件、两个演示土地利用 GeoTIFF、碳库参数表、输入检查脚本、InVEST 调用脚本和结果汇总脚本。演示碳密度是为跑通流程而设置的假设值，不对应任何真实地区。

## 一、为什么关注这个代码

生态系统服务研究经常从土地利用/覆被数据出发，但“统计各类土地面积”与“估算生态功能变化”之间还隔着一层模型。林地增加多少，并不能直接回答碳储量增加多少；耕地减少多少，也不能直接说明泥沙输出下降多少。不同土地类型具有不同的碳密度、蒸散特征、根系深度、侵蚀控制能力和生境适宜性，还要考虑它们在空间上的位置。

这类问题通常需要比较两个或多个空间情景：

- 生态修复前与修复后；
- 现状土地利用与规划情景；
- 基准期与 SSP-RCP 未来土地利用；
- 石漠化治理区与对照情景；
- 耕地保护、退耕还林和建设扩张的不同组合。

InVEST 的特点是把生态系统服务模型做成相互独立的模块。研究不必一次运行全部模型，可以先根据问题选择 Carbon、SDR、Annual Water Yield 或 Habitat Quality，再把多个模型的结果放到同一套情景框架中比较。

对遥感生态研究而言，InVEST 最实用的地方是输入和输出都具有明确的空间含义。土地利用、气候、土壤和地形数据可以来自遥感或再分析产品；输出仍是 GeoTIFF 或分区统计表，后续可以继续做热点识别、权衡分析、驱动归因和未来情景比较。

## 二、代码项目简介

InVEST 是 Natural Capital Alliance 维护的开源生态系统服务模型套件。项目使用 Apache-2.0 许可证，3.20.0 版发布于 2026 年 6 月 11 日。官方同时提供图形界面的 InVEST Workbench、命令行工具和 `natcap.invest` Python 包。

项目地址：

- GitHub：<https://github.com/natcap/invest>
- 软件主页：<https://naturalcapitalproject.stanford.edu/software>
- 用户手册：<https://storage.googleapis.com/releases.naturalcapitalproject.org/invest-userguide/latest/en/index.html>
- Python API 文档：<https://invest.readthedocs.io/>

InVEST 包含多种陆地、淡水、海岸与海洋生态系统服务模型。与遥感生态环境研究关系较紧密的几个模块如下。

| 模型 | 主要输入 | 主要输出 | 适合的问题 |
|---|---|---|---|
| Carbon Storage and Sequestration | 土地利用、四类碳库密度 | 碳储量密度、情景间碳储量变化 | 土地利用变化与碳储量 |
| Sediment Delivery Ratio（SDR） | DEM、降雨侵蚀力、土壤可蚀性、土地利用、C/P 因子 | 土壤流失、泥沙输出、泥沙拦截 | 土壤保持与流域泥沙 |
| Annual Water Yield | 年降水、参考蒸散、土壤有效含水量、土地利用、流域 | 年产水量与流域汇总 | 水源产出与土地利用情景 |
| Habitat Quality | 土地利用、威胁因子、敏感性和可达性 | 生境退化、生境质量、生境稀有性 | 生态恢复与生物多样性代理指标 |

本文把 Carbon 作为入门模型，原因很简单：它需要的输入少，公式透明，最适合先建立一套可复现的“数据准备—模型运行—结果检查”流程。学会这套结构后，再扩展到 SDR 或水源产出会顺手很多。

### 相关底层项目

InVEST 的空间计算依赖两个 Natural Capital Alliance 项目：

- `pygeoprocessing`：提供栅格重分类、对齐、卷积、分区统计和水文计算等地理处理函数；
- `taskgraph`：负责计算任务依赖、并行调度和结果缓存。

这两个项目很适合做高级二次开发，但不建议初学者先从底层 API 开始。直接调用 InVEST 模型可以减少单位、输出命名和任务依赖方面的错误。

## 三、它能解决什么科研问题

### 1. 土地利用变化会造成多少碳储量增减

给定基准期和替代情景的土地利用图，Carbon 模型可以把每种土地类型对应的地上、地下、土壤和死有机质碳密度映射到像元，再计算情景之间的差值。

常见问题包括：

- 林地恢复能否抵消建设用地扩张造成的碳损失；
- 耕地转林地、草地或灌丛后，碳储量变化在哪里最明显；
- 不同 SSP 土地利用情景下，区域碳储量格局如何重组；
- 生态保护红线内外的碳储量变化是否存在差异。

### 2. 石漠化治理的空间收益是否集中在少数区域

喀斯特区的治理成效具有明显空间异质性。同样是植被恢复，土层厚度、岩性、坡位和水分条件不同，碳密度参数也可能不同。可以先按生态分区或环境梯度细化土地利用类别，再运行 InVEST，比较不同治理单元的碳储量变化。

例如，不把所有林地都编码为一个类别，而是区分：

```text
11  喀斯特低覆盖幼龄林
12  喀斯特高覆盖恢复林
13  非喀斯特成熟林
```

这种细分能减少“同一土地类型只有一个碳密度”带来的过度简化，但前提是每个细分类别都有可靠参数。

### 3. 土地利用方案之间是否存在生态系统服务权衡

单独运行 Carbon 只能看到碳储量。如果把同一组土地利用情景继续输入 SDR、Annual Water Yield 和 Habitat Quality，就可以比较：

- 碳储量增加是否伴随泥沙输出下降；
- 造林情景是否提高碳储量但改变年产水量；
- 建设扩张是否同时造成碳损失和生境质量下降；
- 哪些区域能够同时获得多项生态系统服务增益。

这时研究重点从单一服务评价转向多服务协同与权衡。

### 4. 未来情景下生态系统服务如何变化

PLUS、FLUS、CA-Markov 或土地利用情景数据可以提供未来 LULC。CMIP6 则可以为水源产出、土壤侵蚀等模型提供未来气候输入。两类情景结合后，可以区分：

- 仅土地利用变化的影响；
- 仅气候变化的影响；
- 气候与土地利用共同变化的影响。

Carbon 模型本身不会读取温度和降水，但可以作为多模型情景实验中的土地利用碳储量模块。

## 四、核心方法原理

### 1. 四类碳库

InVEST Carbon 为每个土地利用类别设置四类碳密度：

- \(c_{above}\)：地上生物量碳；
- \(c_{below}\)：地下生物量碳；
- \(c_{soil}\)：土壤有机碳；
- \(c_{dead}\)：枯落物和死有机质碳。

土地利用类别 \(j\) 的总碳密度为：

\[
D_j=c_{above,j}+c_{below,j}+c_{soil,j}+c_{dead,j}
\]

单位统一为 \(t\ C/ha\)。若像元 \(x\) 的面积为 \(A_x\) 公顷，像元碳储量为：

\[
C_x=D_j \times A_x
\]

InVEST 3.15.0 之后，Carbon 的主要栅格输出使用每公顷单位。因此，不能直接把所有像元值相加就当作区域总碳储量；应乘以像元面积。配套的 `04_summarize_outputs.py` 已经处理了这一步。

### 2. 情景间碳储量变化

替代情景与基准情景的差值为：

\[
\Delta C_x=C_{x,alt}-C_{x,bas}
\]

- \(\Delta C_x>0\)：碳储量增加；
- \(\Delta C_x<0\)：碳储量损失；
- \(\Delta C_x=0\)：碳储量不变。

官方文档将正变化称为 sequestered carbon，但模型并没有模拟逐年的碳吸收过程。它比较的是两个土地利用情景在固定碳密度假设下的储量差。

如果基准情景为 2020 年，替代情景为 2030 年，可以计算：

\[
\overline{\Delta C}_{annual}=\frac{\Delta C}{2030-2020}
\]

这个数值只是情景总变化的年均化表达，不等于 GPP、NEP、NBP，也不能证明碳储量按线性路径逐年变化。

### 3. 模型最重要的假设

Carbon 模型假定同一土地利用类别内的碳密度固定。只要像元分类不变，模型就不会产生碳储量变化。它不会模拟：

- 树木生长和林龄变化；
- 光合作用、呼吸和分解；
- 温度、降水、VPD 或 CO₂ 浓度变化；
- 土壤碳周转与碳库之间的转移；
- 扰动后的恢复轨迹。

因此，它适合评估土地利用情景造成的碳储量差异，不适合替代 CASA、BEPS、Biome-BGC、过程模型或基于通量观测的年度碳汇估算。

## 五、代码结构与运行流程

### 1. 先选择安装路线

初学者可以先安装 InVEST Workbench，熟悉模型界面和输入字段。需要批量处理多个年份、流域或情景时，再使用 Python API。

InVEST 官方推荐用 conda 或 mamba 安装 Python 包，因为它依赖 GDAL。Windows 下直接 `pip install natcap.invest` 经常卡在 GDAL 编译环节。

安装 Miniforge 后，打开 Miniforge Prompt 或 PowerShell：

```powershell
mamba create -n invest-carbon -c conda-forge python=3.11 natcap.invest=3.20.0 rasterio pandas
mamba activate invest-carbon
```

没有 mamba 时可以改用 conda：

```powershell
conda create -n invest-carbon -c conda-forge python=3.11 natcap.invest=3.20.0 rasterio pandas
conda activate invest-carbon
```

确认安装版本：

```powershell
python -c "from importlib.metadata import version; print(version('natcap.invest'))"
```

本文代码针对 3.20.0。很多旧教程使用 `lulc_cur_path`、`lulc_fut_path` 等参数，而 3.20.0 的 Carbon 模型使用：

```text
lulc_bas_path
lulc_alt_path
carbon_pools_path
calc_sequestration
do_valuation
```

如果复制旧版参数名，当前模型会在参数验证阶段报错。

### 2. 下载并解压模板

下载：

```text
https://noob304.github.io/assets/downloads/invest_ecosystem_services_template.zip
```

解压后会看到：

```text
invest_ecosystem_services_template/
├─ README.md
├─ environment.yml
├─ requirements.txt
├─ config.py
├─ 01_create_demo_inputs.py
├─ 02_validate_inputs.py
├─ 03_run_invest_carbon.py
├─ 04_summarize_outputs.py
├─ data/
│  ├─ carbon_pools.csv
│  ├─ lulc_baseline_2020.tif
│  └─ lulc_alternate_2030.tif
└─ workspace/
```

### 3. 土地利用栅格需要满足什么条件

基准与替代土地利用栅格建议使用单波段整数型 GeoTIFF。

| 检查项 | 要求 |
|---|---|
| 数据类型 | 整数分类栅格 |
| 波段数 | 1 |
| 坐标系 | 投影坐标系，线性单位为米 |
| 分类编码 | 每个有效编码都能在碳库 CSV 中找到 |
| 两期对齐 | 投影、范围、分辨率、行列数和网格原点一致 |
| NoData | 明确设置，且不能与有效分类编码混淆 |

“同样是 30 m 分辨率”不代表两幅图已经对齐。只要像元原点错开半格，逐像元差值就会产生大片伪变化。正式运行前应在 QGIS、ArcGIS 或 Python 中以基准栅格为捕捉栅格完成对齐。

### 4. 碳库参数表是什么格式

`carbon_pools.csv` 至少需要五个数值字段：

```csv
lucode,lulc_name,c_above,c_below,c_soil,c_dead
1,forest,120.0,30.0,80.0,10.0
2,shrub,35.0,12.0,65.0,4.0
3,grassland,8.0,5.0,55.0,2.0
4,cropland,5.0,2.0,45.0,1.0
5,built_up,1.0,0.5,20.0,0.0
```

`lulc_name` 只是为了阅读方便，模型真正依赖的是 `lucode` 和四个碳库字段。碳库单位必须是元素碳的吨每公顷，即 `t C/ha`，不能把 `t CO₂/ha` 直接填入。

参数来源可以包括：

- 区域森林资源清查；
- 土壤剖面和土壤数据库；
- 同气候区、同植被类型的实测文献；
- IPCC 指南中的默认参数；
- 经过单位统一和适用性筛选的公开数据集。

碳密度参数往往是结果中最大的不确定性来源之一。正式论文不应只给一张参数表，还应说明数据来源、年份、空间代表性和单位换算。

### 5. 配置路径和情景

所有路径与开关集中在 `config.py`：

```python
LULC_BASELINE_PATH = DATA_DIR / "lulc_baseline_2020.tif"
LULC_ALTERNATE_PATH = DATA_DIR / "lulc_alternate_2030.tif"
CARBON_POOLS_PATH = DATA_DIR / "carbon_pools.csv"

BASELINE_YEAR = 2020
ALTERNATE_YEAR = 2030
CALCULATE_SEQUESTRATION = True
RUN_VALUATION = False
```

教程默认关闭经济估值。碳价、折现率和价格变化率都需要明确依据，不能为了“让模型输出更多结果”而随便填写。

### 6. 生成演示数据

进入解压目录后运行：

```powershell
python 01_create_demo_inputs.py
```

脚本会生成两个 10 × 10 像元的小型 GeoTIFF。基准情景包括林地、灌丛、草地、耕地和建设用地；替代情景同时设置局部植被恢复和建设扩张，用来演示正、负碳储量变化。

使用真实数据时不需要运行这一步，直接把自己的栅格和 CSV 放进 `data/` 并修改 `config.py`。

### 7. 先做输入体检

```powershell
python 02_validate_inputs.py
```

脚本检查：

- 文件是否存在；
- 栅格是否单波段、整数编码和投影坐标；
- 两期栅格是否严格对齐；
- 四个碳库字段是否完整；
- 碳密度是否存在空值或负数；
- 土地利用编码是否都能在参数表中找到。

输入检查通过后，才进入模型运行。把错误挡在模型前面，比面对一长串 GDAL 日志省事得多。

### 8. 调用 InVEST 3.20 Carbon 模型

核心代码如下：

```python
from natcap.invest.carbon import carbon

args = {
    "workspace_dir": "workspace",
    "results_suffix": "demo",
    "n_workers": -1,
    "lulc_bas_path": "data/lulc_baseline_2020.tif",
    "lulc_alt_path": "data/lulc_alternate_2030.tif",
    "carbon_pools_path": "data/carbon_pools.csv",
    "calc_sequestration": True,
    "do_valuation": False,
}

messages = carbon.validate(args)
if messages:
    raise ValueError(messages)

output_registry = carbon.execute(args)
```

配套脚本使用绝对路径，并会打印 InVEST 版本和主要输出：

```powershell
python 03_run_invest_carbon.py
```

`n_workers=-1` 表示同步运行，适合初次调试。大范围数据跑通后，可以根据 CPU 和内存情况调整并行设置。

### 9. 输出文件怎么读

启用 `results_suffix="demo"` 后，主要输出为：

| 输出文件 | 含义 | 单位 |
|---|---|---|
| `c_storage_bas_demo.tif` | 基准情景总碳储量密度 | t C/ha |
| `c_storage_alt_demo.tif` | 替代情景总碳储量密度 | t C/ha |
| `c_change_bas_alt_demo.tif` | 替代情景减基准情景 | t C/ha |
| `raster_values_summary_demo.csv` | InVEST 输出总量汇总 | 见表内单位 |

结果汇总脚本会根据像元面积把密度换算成区域总量：

```powershell
python 04_summarize_outputs.py
```

它还会统计：

- 有效面积；
- 平均、最小和最大碳密度；
- 区域总碳储量；
- 正变化区和负变化区面积；
- 两个情景之间的平均年变化量。

输出保存在：

```text
workspace/carbon_output_summary.csv
```

## 六、如何迁移到遥感生态研究

### 1. 土地利用变化与植被碳储量

以多期 CLCD、GlobeLand30、ESA WorldCover 或自分类土地利用图为输入，统一分类体系后计算各期碳储量。若研究重点是长期演变，可把相邻年份两两比较，并分析碳损失和恢复的空间转移。

一条可行的技术路线是：

```text
土地利用分类与精度评价
→ 四类碳库参数整理
→ 多期 InVEST Carbon
→ 碳储量变化热点
→ 气候、人类活动和地形驱动归因
```

### 2. 喀斯特生态恢复与石漠化治理

将石漠化等级、植被恢复阶段或土层条件纳入土地利用细分类别，比较治理前后碳储量变化。再叠加坡度、岩性、土层厚度、降水和人类活动数据，可以识别治理收益较高和恢复受限的区域。

这里需要防止一个常见错误：InVEST 输出高值并不自动证明治理产生了因果效应。若要回答“治理是否导致碳储量增加”，还要设置合理对照区，并使用 DID、匹配、因果森林或中断时间序列等识别方法。

### 3. 农田碳汇与土地利用转换

农田并不是一个固定碳密度类别。灌溉条件、轮作制度、秸秆还田、耕作方式和土壤类型都会影响碳库。可以按农业管理方式或生态区细分耕地编码，再评估：

- 耕地占补平衡对区域碳储量的影响；
- 耕地转林草地的碳收益；
- 建设占用高碳农田造成的损失；
- 不同未来土地利用方案下农田碳储量风险。

如果研究对象是年际净碳汇，应把 InVEST 的土地利用碳储量变化与遥感 GPP/NPP、土壤呼吸或过程模型结果分开报告。

### 4. 多生态系统服务协同与权衡

使用同一套基准和替代土地利用情景，分别运行 Carbon、SDR、Annual Water Yield 和 Habitat Quality。输出标准化后，可以构建：

- 多服务协同指数；
- 权衡矩阵；
- 生态系统服务簇；
- 冷热点分区；
- Pareto 最优土地利用方案。

不同生态系统服务的单位和意义不同，不能把原始值直接相加。标准化、权重设置和空间尺度都应进行敏感性分析。

### 5. SSP 情景下生态系统服务变化

未来土地利用情景可由 PLUS、FLUS、CA-Markov 或公开 SSP-LULC 数据提供。未来气候驱动可由 CMIP6 经偏差订正和重采样后提供。建议至少设置三组实验：

```text
实验 A：现状气候 + 未来土地利用
实验 B：未来气候 + 现状土地利用
实验 C：未来气候 + 未来土地利用
```

Carbon 主要响应土地利用输入；SDR 和水源产出还会响应降水、蒸散等气候驱动。这样的实验设计更容易区分土地利用变化与气候变化的相对贡献。

## 七、可能形成的论文创新点

### 创新点 1：把碳储量情景与因果识别分开

先用 InVEST 构建不同土地利用情景下的碳储量变化，再用 DID、Causal Forest 或匹配方法评估生态工程的实际净效应。前者回答“如果土地利用按情景变化，会发生什么”，后者回答“历史治理是否造成了变化”，两类证据相互补充。

### 创新点 2：为喀斯特地貌建立分区碳密度参数

把岩性、土层厚度、海拔或水热条件引入土地利用细分类别，建立喀斯特与非喀斯特、不同恢复阶段的碳库参数体系。重点不在于增加分类数量，而在于检验这种分区是否显著降低参数偏差。

### 创新点 3：多模型联合识别生态恢复的协同区与权衡区

Carbon、SDR、Habitat Quality 和水源产出使用相同情景运行后，可识别“碳储量与土壤保持同时增加”的协同区，以及“造林增碳但减少产水”的权衡区。再结合保护成本或治理难度，可以形成更接近规划决策的问题。

### 创新点 4：把碳库参数不确定性显式传递到空间结果

为每个土地利用类别设置参数分布，而不是只使用单一均值。通过 Monte Carlo 重复运行，输出像元或分区尺度的中位数、置信区间和结论稳定性。这样可以判断热点位置是否对碳密度参数敏感。

### 创新点 5：连接土地利用模拟与生态系统服务优化

先生成多个土地利用方案，再批量运行 InVEST，比较碳储量、生境质量、土壤保持和产水。以生态收益、粮食安全、建设需求和实施成本为多目标约束，筛选 Pareto 前沿方案，而不是只展示一个未来情景。

## 八、复现建议与注意事项

### 1. 本文代码的验证状态

配套模板的 Python 语法、演示 GeoTIFF 生成和输入检查脚本已在本机运行通过。Carbon 调用参数、字段名和输出名按 InVEST 3.20.0 官方 `MODEL_SPEC` 与用户手册逐项核对。

本次本机测试未完成 InVEST 端到端执行：conda 安装 3.20.0 时在包完整性校验阶段报告 `datastack.py` 缺失，PyPI 安装又受 GDAL 与网络依赖影响。因此，本文不把示例描述为“完整复现成功”。读者运行时应优先使用官方 Workbench 安装包或官方文档推荐的 conda/mamba 环境。

### 2. 先检查单位

- 土地利用编码：整数；
- 碳密度：`t C/ha`；
- 坐标单位：米；
- 栅格输出：3.15.0 以后主要为 `t C/ha`；
- CO₂ 与 C 换算：若确有需要，\(1\ t\ C = 44/12\ t\ CO₂\)。

不要在同一张碳库表中混用 `kg C/m²`、`Mg C/ha` 和 `t CO₂/ha`。

### 3. 不要忽略分类误差

土地利用误分类会直接改变碳密度映射。正式论文至少应报告分类精度，并讨论高碳类别与低碳类别之间的混淆。例如林地误分为灌丛，对碳储量结果的影响通常比草地与低覆盖耕地之间的混淆更大。

### 4. 参数必须有空间代表性

直接把全球默认碳密度用于区域研究，模型能运行，但结果未必可信。可按生态区、气候带、林龄、管理方式或土壤类型细化参数，并用独立生物量、土壤碳或清查数据验证。

### 5. 情景栅格必须严格对齐

基准和替代 LULC 的分类体系、像元大小和网格位置必须一致。分类编码含义变化尤其危险：若基准图中的 `2` 是林地，而未来图中的 `2` 是草地，模型不会知道编码语义已经改变。

### 6. 避免把模型差值写成观测事实

`c_change_bas_alt.tif` 是情景差值。它依赖土地利用图和碳密度参数，不是通量塔、样地复测或大气反演得到的观测碳汇。论文中应使用“情景模拟”“潜在变化”“土地利用驱动的储量差”等准确表述。

### 7. 做敏感性与不确定性分析

至少可以检验：

- 四类碳库参数上下浮动；
- 不同土地利用分类精度；
- 不同未来土地利用模型；
- 不同 SSP 情景；
- 不同空间分辨率和分区参数方案。

如果热点区在多数参数组合下都稳定出现，结论会比单次运行更有说服力。

### 8. 安装报错怎么处理

遇到 `No module named osgeo`、GDAL 编译失败或 DLL 冲突时，不建议继续在原环境里反复 `pip install`。新建一个只用于 InVEST 的 conda/mamba 环境通常更省时间。

若 conda 报告包完整性校验失败，可以：

1. 改用 InVEST Workbench 官方安装包；
2. 更新 conda/mamba 并使用严格的 `conda-forge` 通道；
3. 在独立环境中先安装匹配版本的 GDAL，再按官方 Python 安装文档处理；
4. 保留完整报错和 InVEST 参数日志，便于定位版本问题。

## 九、结语

InVEST Carbon 的计算并不复杂，难点主要在模型之前和之后：土地利用图是否可信，碳密度参数是否适合研究区，两个情景是否可比，输出是否被正确解释。把这些环节写进脚本和输入检查，比单纯“跑出一张碳储量图”更接近可复现研究。

Carbon 适合作为 InVEST 的第一站。下一步可以在同一套土地利用情景上增加 SDR、Annual Water Yield 和 Habitat Quality，再把多项服务放进协同、权衡和情景优化框架。对喀斯特生态恢复、土地利用变化、土壤保持和区域环境安全研究而言，这条路线比孤立运行单个模型更有方法延展性。

## 十、参考资料

1. Natural Capital Alliance. InVEST 3.20.0. DOI: <https://doi.org/10.60793/natcap-invest-3.20.0>
2. InVEST GitHub：<https://github.com/natcap/invest>
3. InVEST 软件主页：<https://naturalcapitalproject.stanford.edu/software>
4. Carbon Storage and Sequestration 用户手册：<https://storage.googleapis.com/releases.naturalcapitalproject.org/invest-userguide/latest/en/carbonstorage.html>
5. InVEST Python 安装说明：<https://invest.readthedocs.io/en/latest/installing.html>
6. InVEST Python 批处理教程：<https://invest.readthedocs.io/en/latest/scripting.html>
7. Sediment Delivery Ratio 用户手册：<https://storage.googleapis.com/releases.naturalcapitalproject.org/invest-userguide/latest/en/sdr.html>
8. Annual Water Yield 用户手册：<https://storage.googleapis.com/releases.naturalcapitalproject.org/invest-userguide/latest/en/annual_water_yield.html>
9. Habitat Quality 用户手册：<https://storage.googleapis.com/releases.naturalcapitalproject.org/invest-userguide/latest/en/habitat_quality.html>
10. pygeoprocessing GitHub：<https://github.com/natcap/pygeoprocessing>
11. taskgraph GitHub：<https://github.com/natcap/taskgraph>
12. Sharp R, Tallis HT, Ricketts T, et al. InVEST User’s Guide. The Natural Capital Project.

