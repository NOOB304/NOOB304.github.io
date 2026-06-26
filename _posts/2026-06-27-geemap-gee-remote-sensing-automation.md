---
title: "从 GEE 到论文数据表：用 geemap 批量提取 NDVI、NPP、ERA5 和土地利用变量"
date: 2026-06-27
permalink: /posts/2026/06/geemap-gee-remote-sensing-automation/
lang: zh
author_profile: true
comments: false
share: false
tags:
  - Google Earth Engine
  - geemap
  - 遥感自动化
  - NPP
  - ERA5
  - 数据生产线
excerpt: "介绍如何使用 geemap 和 Earth Engine Python API 将 GEE 云端遥感数据转化为论文可用的样点时间序列表、研究区 GeoTIFF 和多源驱动变量，为碳汇、生态恢复、因果分析和未来情景研究构建可复现数据生产线。"
---

遥感生态论文真正耗时的部分，往往不是模型本身，而是数据生产：下载 MODIS、Landsat、Sentinel、ERA5、土地利用产品，统一时间范围和空间范围，提取样点或分区统计，再整理成机器学习、因果分析或生态模型可用的表格。Google Earth Engine 解决了云端计算问题，但如果所有处理都停留在网页 Code Editor 里，脚本复用、批量任务管理和论文复现会变得很困难。

geemap 是一个面向 Google Earth Engine 的 Python 工具包，可以把 GEE 数据处理、地图可视化、样点提取和批量导出整合到 Python/Jupyter 工作流中。它不是某个单一生态模型，但非常适合构建遥感论文的数据入口：用 GEE 批量生成 NDVI、NPP、ERA5、土地利用和样点时间序列表，再接入 xclim、pylandstats、EconML、随机森林、SHAP 或地理探测器等后续方法。

## 配套代码下载

[下载配套代码包：geemap_gee_ecology_template.zip](/assets/downloads/geemap_gee_ecology_template.zip){: .btn .btn--primary}

如果按钮无法打开，也可以复制下面的直链：

```text
https://noob304.github.io/assets/downloads/geemap_gee_ecology_template.zip
```

附件提供 MODIS NDVI 样点提取、MODIS NPP 区域导出和 ERA5-Land 月尺度气候变量提取的模板脚本。由于 GEE 需要账号认证和网络访问，当前模板尚未在本机连接真实 Earth Engine 任务运行。

## 一、为什么关注这个代码

你的研究方向涉及植被碳汇、喀斯特生态系统、土地利用变化、土壤保持和生态系统服务，这些主题几乎都依赖多源遥感数据：

- MODIS NDVI、EVI、NPP、GPP；
- Landsat/Sentinel 长时间序列；
- ERA5-Land 温度、降水、蒸散发、土壤水分；
- ESA WorldCover、CLCD、GlobeLand30 等土地利用产品；
- SRTM/ASTER DEM、坡度、海拔；
- 研究区边界、样点、流域、行政区或生态分区。

如果每个产品都手动下载、裁剪、投影和统计，流程很难复现，也很难扩展到全国或全球尺度。geemap 的价值在于，它让 GEE 数据获取和处理进入 Python 脚本体系，便于与 pandas、geopandas、rasterio、xarray、scikit-learn 等工具衔接。

对论文来说，geemap 的意义不是“画一张在线地图”，而是建立一条可追踪的数据生产线：

```text
GEE 数据集
  ↓
Python/geemap 批处理
  ↓
样点时间序列表 / 区域统计表 / GeoTIFF
  ↓
机器学习、因果分析、生态模型和论文图表
```

## 二、代码项目简介

geemap 是 gee-community 维护的 Python 包，GitHub 项目说明将其定义为“用于 Google Earth Engine 交互式地理空间分析和可视化的 Python 包”。它基于 Earth Engine Python API，并提供更友好的地图交互、数据导出、矢量转换、影像下载和批处理辅助功能。许可证为 MIT，维护活跃，社区使用广泛。

与它相关的几个工具也值得记录：

| 项目 | 作用 |
|---|---|
| `earthengine-api` | Google 官方 Earth Engine Python/JavaScript API，所有 GEE Python 工作流基础 |
| `geemap` | 交互式地图、GEE 数据处理、导出和教学友好封装 |
| `geetools` | Earth Engine Python API 扩展工具，便于批处理 |
| `eemont` | 扩展 GEE 对象，简化指数计算、云掩膜和尺度因子处理 |

本文选择 geemap 作为主项目，因为它最适合作为“从 GEE 到论文数据表”的入口工具。

## 三、它能解决什么科研问题

### 1. 气候变化如何影响植被碳汇

可以用 geemap 批量提取 MODIS NPP/GPP、MODIS NDVI 和 ERA5-Land 气候变量，构建像元或样点尺度的长时间序列表。随后可用于分析温度、降水、VPD 或土壤水分对碳汇变化的影响。

### 2. 土地利用变化如何影响生态系统服务

可以从 GEE 中获取 ESA WorldCover、MODIS Land Cover 或其它土地利用产品，按年份导出研究区栅格，再接入 pylandstats 计算景观格局指标，或接入 InVEST/RUSLE 评估生态系统服务。

### 3. 人类活动和气候因子谁是主导因素

geemap 可以帮助同时提取遥感植被指标、气候变量、土地利用变量和夜间灯光等人类活动指标，构建统一样本表。这个表可以进入 Random Forest、XGBoost、SHAP、地理探测器或 EconML，比较不同驱动因素的作用。

### 4. 未来 SSP 情景下生态系统如何变化

GEE 本身不是 CMIP6 全流程工具，但它可以用于构建历史期遥感响应变量和部分气候/土地利用背景数据。未来期 CMIP6 数据可用 xclim/intake-esm 处理后，与 geemap 生成的历史样本表或训练数据衔接。

### 5. 遥感长时间序列如何做因果识别

因果分析需要结构化样本表。geemap 可以将 GEE 数据转换为“样点-年份”或“像元-年份”表，包含 `Y`、`T`、`W` 和 `X` 等变量，为 DoWhy/EconML 等方法提供数据基础。

## 四、核心方法原理

GEE 的核心对象包括：

| 对象 | 含义 |
|---|---|
| `ee.Image` | 单景影像或一个时间片的栅格 |
| `ee.ImageCollection` | 影像集合，如 MODIS NDVI 时间序列 |
| `ee.Feature` | 单个矢量要素，如一个样点 |
| `ee.FeatureCollection` | 样点、行政区、流域或研究区集合 |
| `Export` | 将云端计算结果导出到 Google Drive、Asset 或 Cloud Storage |

geemap 在这些对象之上提供更方便的 Python 接口。对论文数据生产来说，最常见的三类操作是：

```text
影像集合筛选 → 时间范围/区域/波段
  ↓
尺度因子与单位转换
  ↓
sampleRegions 或 reduceRegions
  ↓
导出 CSV 或 GeoTIFF
```

例如 MODIS NDVI 的原始值通常需要乘以尺度因子：

```python
ndvi = image.select("NDVI").multiply(0.0001)
```

ERA5-Land 温度常以 K 表示，需要转换为摄氏度：

```python
temp_c = image.select("temperature_2m").subtract(273.15)
```

降水可能以米为单位，需要转换为毫米：

```python
precip_mm = image.select("total_precipitation_sum").multiply(1000)
```

这些尺度和单位转换必须写进脚本，而不能只在论文方法中一句带过。否则不同数据源混合后很容易产生数量级错误。

## 五、代码结构与运行流程

配套代码包结构如下：

```text
geemap_gee_ecology_template/
├─ requirements.txt
├─ config.py
├─ 00_authenticate_gee.py
├─ 01_extract_modis_ndvi_points.py
├─ 02_export_modis_npp_roi.py
├─ 03_extract_era5_monthly_points.py
└─ templates/
   ├─ points_template.csv
   └─ aoi_template.geojson
```

安装依赖：

```bash
pip install -r requirements.txt
```

首次使用需要认证：

```bash
earthengine authenticate
```

或运行：

```bash
python 00_authenticate_gee.py
```

样点 CSV 至少需要包含：

```csv
id,lon,lat
P001,106.71,26.57
P002,108.33,27.72
```

运行 MODIS NDVI 样点时间序列提取：

```bash
python 01_extract_modis_ndvi_points.py
```

运行 MODIS NPP 研究区导出：

```bash
python 02_export_modis_npp_roi.py
```

运行 ERA5-Land 月尺度样点提取：

```bash
python 03_extract_era5_monthly_points.py
```

脚本默认将结果导出到 Google Drive。提交任务后，需要在 Earth Engine Tasks 或 Google Drive 中查看导出状态。

## 六、如何迁移到我的研究中

### 1. 用于 NPP/GPP 对气候因子的响应分析

可以用 geemap 提取 MODIS NPP/GPP 或 NDVI 时间序列，同时提取 ERA5-Land 温度、降水、土壤水分等变量，构建样点-年份表。这个表可用于随机森林、SHAP、EconML 或结构方程模型。

### 2. 用于喀斯特槽谷区生态系统碳汇未来预测

历史期可用 geemap 构建遥感响应变量和地表背景变量，未来期用 CMIP6/xclim 构建气候情景指标。两者结合后，可以训练碳汇响应模型并进行未来情景预测。

### 3. 用于土壤保持能力与降雨、NDVI、地形因子的分析

可以用 geemap 提取 NDVI/FVC 和 ERA5/CHIRPS 降水，再结合 DEM 生成坡度坡长因子，为 RUSLE 或土壤保持率模型准备输入。

### 4. 用于土地利用变化对生态系统服务的影响识别

可以批量导出土地利用产品，再用 pylandstats 计算景观格局指数，用 rasterstats 做分区统计，最终形成生态系统服务模型的驱动变量表。

### 5. 用于遥感长时间序列因果识别

因果分析需要明确处理变量和控制变量。geemap 可以自动提取生态工程区内外的 NDVI/NPP、气候、人类活动和土地利用变量，构建干预前后面板数据，为 DID、CausalImpact 或 CausalForestDML 提供输入。

## 七、可能形成的论文创新点

### 创新点 1：可复现的遥感数据生产线

将 GEE 数据处理从网页脚本转为 Python 项目，所有数据筛选、尺度转换、样点提取和导出任务都可以记录和复现。

### 创新点 2：多源遥感变量快速融合

用同一套样点或研究区同时提取 NDVI、NPP、ERA5、土地利用和人类活动指标，减少多源数据空间错位和时间不一致问题。

### 创新点 3：面向因果分析的样本表构建

通过 geemap 生成 `outcome-treatment-confounders` 结构化表，为生态恢复效果、土地利用变化影响和气候驱动归因提供数据基础。

### 创新点 4：生态恢复监测自动化

对石漠化治理区、退耕还林区或保护区，批量提取治理前后 NDVI/NPP/GPP 变化，实现长期监测流程自动化。

### 创新点 5：GEE 与本地 Python 方法库联动

GEE 负责云端遥感数据生产，本地 Python 负责 xclim 气候指标、pylandstats 景观指数、EconML 因果效应和 SHAP 解释，形成完整方法链。

## 八、复现建议与注意事项

### 账号和网络

geemap 和 Earth Engine API 需要 GEE 账号认证。若网络无法访问 Google 服务，脚本不能运行。团队复现时应记录使用的 GEE 项目、数据集版本和导出日期。

### 数据集版本

GEE 数据集会更新，论文中应写明数据集 ID，例如：

```text
MODIS/061/MOD13Q1
MODIS/061/MOD17A3HGF
ECMWF/ERA5_LAND/MONTHLY_AGGR
```

### 尺度因子和单位

MODIS 产品通常有尺度因子，ERA5 温度和降水也需要单位转换。单位错误会直接导致模型结果不可用。

### 导出任务限制

GEE 导出任务存在数量、像元数和任务队列限制。大区域长时间序列建议分年份、分区域提交任务，并保存任务清单。

### 结果解释风险

geemap 只是数据生产工具，不会自动解决遥感产品误差、云污染、传感器差异、尺度效应和样本偏差。正式论文中仍需做质量控制和不确定性分析。

## 九、结语

geemap 的科研价值，在于把 GEE 的云端遥感能力转化为可复现的 Python 数据生产线。对植被碳汇、喀斯特生态恢复、土地利用变化、土壤保持和生态系统服务研究来说，它可以承担“数据入口”的角色：快速、批量、可追踪地生成后续模型需要的样本表和栅格文件。

下一步可以把 geemap 与前面整理的 xclim、pylandstats、EconML 和随机森林点到面预测流程串联起来，形成一套完整的“遥感数据获取—指标构建—归因分析—空间预测—论文制图”工作流。

## 十、参考资料

1. geemap GitHub：<https://github.com/gee-community/geemap>
2. geemap 文档：<https://geemap.org/>
3. Earth Engine API GitHub：<https://github.com/google/earthengine-api>
4. Google Earth Engine 数据目录：<https://developers.google.com/earth-engine/datasets>
5. geetools GitHub：<https://github.com/gee-community/geetools>
6. eemont GitHub：<https://github.com/davemlz/eemont>
