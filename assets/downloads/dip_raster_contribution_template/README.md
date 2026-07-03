# DIP栅格贡献分析代码

这是一份普通 Python 源代码，不是打包程序。代码不会限定研究区，也不会自动下载数据。

## 文件

- `raster_contributions.py`　主代码
- `requirements-contribution.txt`　贡献分析所需依赖
- `requirements-raster.txt`　栅格读取依赖
- `requirements.txt`　基础依赖

## 输入目录

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

同一期的 X 和 Y 必须同名。所有栅格必须已经对齐，代码不会自动重投影或重采样。

## 修改位置

打开 `raster_contributions.py`，修改用户配置区中的：

```python
TRAIN_ROOT = Path(r"D:\your_data\history")
EXPLAIN_ROOT = TRAIN_ROOT
OUTPUT_DIR = Path(r"D:\your_data\contribution_results")

TARGET_NAME = "Y"
FEATURE_NAMES = [
    "temperature",
    "precipitation",
    "radiation",
]
```

没有滞后变量时保持：

```python
VARIABLE_GROUPS = {}
```

## 安装与运行

```powershell
python -m pip install -r requirements-contribution.txt
python raster_contributions.py
```

## 主要输出

- `dip_global_summary.csv`　整个研究区的总体 DIP 分解
- `spatial_validation_metrics.csv`　空间独立验证结果
- `prediction.tif`　Y 的预测结果
- `allocated_effect_<变量>.tif`　每个像元上变量推动预测升高或降低的数值
- `percent_<变量>.tif`　每个像元的相对贡献百分比
- `main_effect_<变量>.tif`　不含交互分配的主效应
- `interaction_<变量1>__<变量2>.tif`　逐像元交互项

严格的 DIP 是总体贡献分解。逐像元 GeoTIFF 来自同一 EBM 模型的局部加性贡献，不是逐像元 DIP 依赖项。

## 代码状态

本模板按公开论文公式和 InterpretML 的 EBM 接口整理，未随附任何真实数据，也没有承诺特定精度。实际结果取决于输入数据、变量设计、空间分块尺度和模型拟合质量。
