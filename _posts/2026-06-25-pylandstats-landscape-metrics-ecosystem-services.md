---
title: "pylandstats景观格局指数批量计算"
date: 2026-06-25 11:15:00 +0800
article_id: "005"
permalink: /posts/2026/06/pylandstats-landscape-metrics-ecosystem-services/
lang: zh
author_profile: true
comments: false
share: false
tags:
  - 土地利用
  - 景观格局
  - 生态系统服务
  - 土壤保持
  - Python
excerpt: "介绍如何使用 pylandstats 从土地利用/覆被分类栅格中计算斑块、类型和景观层级指标，并将景观破碎化、聚集度和多样性指标迁移到土壤保持、碳汇和生态系统服务研究中。"
---

土地利用变化研究不应只停留在“面积增加了多少、减少了多少”。同样的林地面积，如果一个区域呈连续成片分布，另一个区域呈破碎斑块分布，它们对生境质量、土壤保持、水源涵养、碳汇稳定性和生态系统服务的影响可能完全不同。对喀斯特生态系统、石漠化治理和生态修复评估来说，景观格局本身就是一种重要生态信息。

pylandstats 是一个用于计算景观格局指数的 Python 工具包，可以读取土地利用/覆被栅格，并计算 patch、class 和 landscape 层级的指标。它可以被理解为 Python 生态中的 FRAGSTATS 风格工具，适合把土地利用栅格转化为可进入机器学习、因果分析、生态系统服务模型和论文统计表的景观格局变量。

## 配套代码下载

[下载配套代码包：pylandstats_landscape_metrics_template.zip](/assets/downloads/pylandstats_landscape_metrics_template.zip){: .btn .btn--primary}

如果按钮无法打开，也可以复制下面的直链：

```text
https://noob304.github.io/assets/downloads/pylandstats_landscape_metrics_template.zip
```

附件包含一个合成土地利用栅格示例，用于演示如何计算 class 和 landscape 层级指标，并整理多年份变化表。当前示例尚未在真实土地利用数据上复现。

## 一、面积变化之外的空间格局

在土地利用变化、生态系统服务和生态恢复论文中，我们常见的变量包括林地面积、耕地面积、建设用地面积、水体面积等。这些变量很重要，但它们不能表达空间格局。例如：

- 林地面积相同，但破碎化程度不同，碳汇稳定性和生境连通性可能不同；
- 耕地面积相同，但坡耕地斑块分布不同，土壤侵蚀风险可能不同；
- 建设用地面积相同，但扩张形态不同，对生态系统服务的干扰强度不同；
- 石漠化治理区植被恢复面积增加，但如果斑块零散，生态功能恢复可能受限。

因此，在遥感生态论文中，景观格局指标可以作为连接“土地利用变化”和“生态过程响应”的桥梁。pylandstats 的价值就在于，它能把土地利用分类图转化为一组可量化、可批量计算、可进入模型的空间格局指标。

## 二、pylandstats能计算什么

pylandstats 是一个开源 Python 项目，用于在 Python 生态中计算景观格局指数。项目 README 说明它支持读取 GeoTIFF 等栅格数据，并提供 landscape analysis、spatiotemporal analysis、zonal analysis 和 spatial signature analysis 等功能。GitHub API 显示项目许可证为 GPL-3.0，近期仍有维护记录。

主要功能如下。

| 分析层级 | 典型指标 | 适合回答的问题 |
|---|---|---|
| Patch | 斑块面积、周长、形状 | 单个斑块是否破碎、复杂 |
| Class | 某类土地利用总面积、斑块数、最大斑块指数 | 林地、耕地、建设用地等类型格局如何变化 |
| Landscape | 全景观斑块密度、边缘密度、多样性指数 | 整个区域景观是否破碎、多样、聚集 |
| Zonal | 分区景观指数 | 行政区、流域、生态分区之间如何比较 |
| Spatiotemporal | 多年份景观指数变化 | 土地利用格局如何随时间演变 |

与传统 FRAGSTATS 相比，pylandstats 的优势在于可以嵌入 Python 自动化流程，与 rasterio、geopandas、pandas、scikit-learn、SHAP、EconML 等工具串联，适合批量处理多个年份、多个研究区或多个情景的土地利用栅格。

## 三、它能解决什么科研问题

### 1. 土地利用变化如何影响生态系统服务

生态系统服务不仅由土地利用面积决定，也受空间格局影响。林地是否连片、耕地是否破碎、建设用地是否扩张成团，都可能影响水源涵养、土壤保持、生境质量和碳储量。pylandstats 可以生成景观指数，作为生态系统服务模型的解释变量。

### 2. 土壤保持能力与景观破碎化之间有什么关系

土壤保持受坡度、降雨、植被覆盖和土地利用共同影响。若林地和草地破碎化严重，坡面径流和侵蚀过程可能增强。可将斑块密度、边缘密度、最大斑块指数等指标与 RUSLE 或土壤保持率结果耦合，分析景观格局对土壤保持的影响。

### 3. 喀斯特区生态恢复效果如何评估

喀斯特区生态恢复不能只看植被面积增加，也要看恢复斑块是否连通、是否聚集、是否形成稳定生态网络。pylandstats 可以用于比较治理前后林地/草地斑块数、最大斑块指数和景观多样性变化，评估生态恢复的空间质量。

### 4. 人类活动和气候因子谁是主导因素

土地利用格局指标可以作为人类活动影响的空间表达，与气候指标、地形因子和遥感植被指标共同进入模型。相比单纯建设用地面积，景观破碎化和边缘密度更能反映人类扰动的空间结构。

### 5. 未来 SSP 情景下生态系统如何变化

如果使用 PLUS、FLUS、CA-Markov 等模型得到未来土地利用情景，可以用 pylandstats 计算未来不同 SSP 下的景观格局指标，再评估生态系统服务或碳汇空间格局如何变化。

## 四、核心方法原理

景观格局指数的基本对象是分类栅格。例如：

```text
1 = 林地
2 = 草地
3 = 耕地
4 = 建设用地
5 = 水体
```

pylandstats 会识别每一类土地利用的斑块，并计算斑块面积、边界、数量和空间分布特征。

几个常用指标可以这样理解：

| 指标 | 生态含义 |
|---|---|
| Total Area | 某类土地利用总面积 |
| Proportion of Landscape | 某类占整个景观的比例 |
| Number of Patches | 斑块数量，数量越多通常表示更破碎 |
| Patch Density | 单位面积斑块数，用于比较不同区域破碎化 |
| Edge Density | 单位面积边界长度，反映边缘效应强度 |
| Largest Patch Index | 最大斑块占比，反映优势斑块程度 |
| Shannon Diversity Index | 景观类型多样性 |

这些指标不能机械解释。例如斑块数增加不一定总是坏事：在农田景观中，适度异质性可能提高生境多样性；但在森林恢复研究中，斑块过度破碎可能降低连通性。因此指标解释必须结合研究对象和生态过程。

## 五、代码结构与运行流程

配套代码包结构如下：

```text
pylandstats_landscape_metrics_template/
├─ requirements.txt
├─ 01_create_demo_landcover.py
├─ 02_compute_landscape_metrics.py
└─ 03_prepare_change_table.py
```

安装依赖：

```bash
pip install -r requirements.txt
```

如果 Windows 下地理依赖安装困难，建议使用 conda：

```bash
conda create -n landscape python=3.11
conda activate landscape
conda install -c conda-forge rasterio geopandas pandas numpy matplotlib
pip install pylandstats
```

运行：

```bash
python 01_create_demo_landcover.py
python 02_compute_landscape_metrics.py
python 03_prepare_change_table.py
```

输出文件包括：

```text
data/landcover_2000.tif
data/landcover_2010.tif
data/landcover_2020.tif
output/class_metrics.csv
output/landscape_metrics.csv
output/landscape_metric_change.csv
```

核心代码类似：

```python
import pylandstats as pls

landscape = pls.Landscape("data/landcover_2020.tif")

class_metrics = landscape.compute_class_metrics_df(
    metrics=[
        "total_area",
        "proportion_of_landscape",
        "number_of_patches",
        "patch_density",
        "edge_density",
        "largest_patch_index",
    ]
)
```

真实研究中，只需要把示例栅格替换成自己的土地利用产品，例如 CLCD、GlobeLand30、ESA WorldCover、FROM-GLC 或自分类结果。

## 六、如何迁移到遥感生态研究

### 1. 用于 NPP/GPP 对土地利用格局的响应分析

可以计算每个年份研究区内林地、草地、耕地和建设用地的景观指数，再与 NPP/GPP 年际变化耦合。相比只使用各类面积比例，景观破碎化和最大斑块指数能更好表达土地利用空间结构对碳汇的影响。

### 2. 用于喀斯特槽谷区生态系统碳汇未来预测

如果已有未来土地利用情景，可以计算未来景观格局指标，并将其与 CMIP6 气候指标共同作为碳汇预测模型输入。这样可以同时考虑气候变化和土地利用空间格局变化对碳汇潜力的影响。

### 3. 用于土壤保持能力与降雨、NDVI、地形因子的分析

土壤保持模型中可以加入林地破碎化、耕地斑块密度、边缘密度等变量，分析土地利用格局是否会增强或削弱植被覆盖对侵蚀控制的作用。

### 4. 用于土地利用变化对生态系统服务的影响识别

可以构建“面积变化 + 格局变化”的双维度解释框架。例如同样是林地增加，若最大斑块指数提高，可能说明恢复更集中；若斑块密度提高但最大斑块下降，可能说明恢复更零散。

### 5. 用于石漠化治理效果评估

石漠化治理常关注植被覆盖增加，但景观格局可以进一步回答：治理后恢复斑块是否连片？裸地或低覆盖斑块是否减少？林草地是否形成稳定生态网络？这些问题可以通过 pylandstats 指标定量表达。

## 七、进一步分析思路

### 1. 土地利用面积与景观格局

不仅统计林地、耕地、建设用地面积变化，还量化斑块数量、边缘密度、最大斑块指数和多样性指数，提升土地利用变化分析的空间表达能力。

### 2. 景观格局与生态系统服务耦合

将 pylandstats 指标作为解释变量，分析景观破碎化、聚集度和多样性对土壤保持、水源涵养、生境质量和碳储量的影响。

### 3. 生态恢复的空间质量

生态恢复效果不仅看面积，也看连通性和聚集度。可以用景观指数评价石漠化治理、退耕还林或封山育林的空间质量。

### 4. 景观指数进入归因模型

可以把景观格局指标与气候、人类活动、地形变量一起输入 Random Forest、XGBoost、SHAP、EconML 或地理探测器，分析土地利用空间结构对生态结果的独立贡献。

### 5. 未来土地利用情景的景观风险

将 PLUS、FLUS 或 CA-Markov 模拟的未来土地利用图转化为景观指数，评估不同 SSP 或规划情景下景观破碎化和生态系统服务风险。

## 八、复现建议与注意事项

### 运行环境

建议使用 conda 安装地理依赖，再用 pip 安装 pylandstats。Windows 下 rasterio/geopandas 直接 pip 安装可能失败。

### 数据准备

真实土地利用栅格需要注意：

- 必须是分类整数栅格；
- 不同年份要统一投影、分辨率、范围和分类体系；
- NoData 值要明确；
- 若比较多个区域，需保证像元大小一致；
- 分类精度会影响景观指数解释。

### 指标选择风险

景观指数很多，但论文中不要无节制堆叠。建议根据研究问题选择少量有机制含义的指标。例如：

- 碳汇研究：林地比例、最大斑块指数、斑块密度；
- 土壤保持：耕地斑块密度、边缘密度、坡耕地格局；
- 生境质量：景观多样性、连通性、破碎化；
- 石漠化治理：裸地/低覆盖类斑块变化、林草地聚集度。

### 许可证注意

pylandstats 使用 GPL-3.0 许可证。论文引用通常没有问题，但如果要二次开发并分发代码，需要注意 GPL 的开源要求。博客中介绍和使用时应保留项目来源与引用信息。

## 九、结语

pylandstats 将土地利用栅格转换为可批量分析的斑块、类型和景观层级指标。指标选择应与研究假设对应，并报告分类精度、空间分辨率和连通规则。

## 十、参考资料

1. pylandstats GitHub：<https://github.com/martibosch/pylandstats>
2. pylandstats 文档：<https://pylandstats.readthedocs.io/>
3. pylandstats 论文：Bosch M. PyLandStats: An open-source Pythonic library to compute landscape metrics. PLOS ONE, 2019.
4. geemap GitHub：<https://github.com/gee-community/geemap>
5. rasterstats GitHub：<https://github.com/perrygeo/python-rasterstats>
6. FRAGSTATS：<https://www.fragstats.org/>
