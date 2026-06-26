# pylandstats 土地利用景观格局指数示例模板

这是一份博客配套模板，用于演示如何从土地利用/覆被分类栅格计算景观格局指数，并整理成生态系统服务、土壤保持或碳汇研究可用的表格。

## 文件说明

| 文件 | 作用 |
|---|---|
| `requirements.txt` | Python 依赖 |
| `01_create_demo_landcover.py` | 生成合成土地利用分类栅格 |
| `02_compute_landscape_metrics.py` | 使用 pylandstats 计算 class 和 landscape 指标 |
| `03_prepare_change_table.py` | 整理多年份景观指数变化表 |

## 安装

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

如果 Windows 下安装地理依赖不顺利，建议使用 Conda：

```bash
conda create -n landscape python=3.11
conda activate landscape
conda install -c conda-forge rasterio geopandas pandas numpy matplotlib
pip install pylandstats
```

## 运行

```bash
python 01_create_demo_landcover.py
python 02_compute_landscape_metrics.py
python 03_prepare_change_table.py
```

输出文件：

```text
data/landcover_2000.tif
data/landcover_2010.tif
data/landcover_2020.tif
output/class_metrics.csv
output/landscape_metrics.csv
output/landscape_metric_change.csv
```

## 土地利用分类示例

| 值 | 类型 |
|---|---|
| 1 | 林地 |
| 2 | 草地 |
| 3 | 耕地 |
| 4 | 建设用地 |
| 5 | 水体 |

真实研究中，可以替换为 CLCD、GlobeLand30、ESA WorldCover、FROM-GLC 或自己的土地利用分类结果。
