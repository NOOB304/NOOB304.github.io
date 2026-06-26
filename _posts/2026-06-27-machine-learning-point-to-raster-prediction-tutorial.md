---
title: "从 0 入门：用机器学习把点位数据预测成栅格图"
date: 2026-06-27
permalink: /posts/2026/06/machine-learning-point-to-raster-prediction-tutorial/
redirect_from:
  - /posts/2026/06/gpp-machine-learning-raster-prediction-tutorial/
lang: zh
author_profile: true
comments: false
share: false
tags:
  - Python
  - 机器学习
  - 栅格预测
  - 遥感
  - 空间预测
excerpt: "基于一个点位到栅格的机器学习代码包，完整拆解样本 CSV、模型训练、参数寻优、精度评价、GeoTIFF 批量预测和结果检查流程。"
---

这篇文章整理的是一个通用的“点位/表格样本 → 机器学习模型 → 栅格空间预测”流程：先用已有样本训练回归模型，再把训练好的模型应用到 GeoTIFF 栅格上，得到连续空间上的预测图。

原始代码包的文件名以 `GPP` 命名，但方法并不只适用于 GPP。只要你的研究对象是连续型数值变量，并且同时拥有样本点表格和对应的栅格解释变量，就可以套用这套框架。例如：GPP、NPP、植被覆盖度、LAI、NDVI、土壤有机碳、碳储量、地表温度、水质指标、生态质量指数等，都可以按同样思路处理。

原始代码包里包含六类机器学习模型：随机森林、XGBoost、LightGBM、CatBoost、支持向量机和高斯过程回归。它们的整体逻辑高度相似：读取样本表格、划分训练集和测试集、网格搜索最优参数、保存模型和评价指标，最后再用对应的栅格预测脚本批量输出每一期的预测图。

## 配套代码下载

先下载这个附件，再按照后文步骤配置数据和运行脚本：

[下载配套代码包：rasterml_point_to_raster_template.zip](https://noob304.github.io/assets/downloads/rasterml_point_to_raster_template.zip){: .btn .btn--primary}

如果按钮无法打开，也可以复制下面的直链到浏览器：

```text
https://noob304.github.io/assets/downloads/rasterml_point_to_raster_template.zip
```

这个附件不是原始数据包，也不包含训练结果或 `.pkl` 模型；它是一份整理后的通用模板，里面包含 `config.py`、`01_check_inputs.py`、`02_train_model.py`、`03_predict_raster.py`、`04_compare_metrics.py`、`requirements.txt` 和样本表模板。后文提到的脚本都在这个附件里。

本文会从零开始讲清楚：

- 需要安装什么环境；
- 每个输入文件应该是什么格式；
- 原代码包里的脚本分别负责什么；
- 如何训练模型、保存模型和评价精度；
- 如何把模型应用到 2000—2020 年逐月栅格，或其它时间尺度的栅格；
- 常见报错应该怎么排查。

这不是一篇只贴代码的记录，而是把代码背后的流程拆开讲。小白照着做，至少能知道自己每一步在处理什么东西。

## 1. 这个项目到底在做什么？

可以把整个流程理解为一句话：

```text
用已有样本学习 Y 与 X1-X5 的关系，然后把这个关系推广到每一个栅格像元。
```

在这套代码中，样本数据表叫 `datasite.csv`，它的列结构是：

```csv
Month,Y,X1,X2,X3,X4,X5
1,0,0,10.860001,0,14,0
2,0,0,5.3099999,0,9,0
3,0,12.3,9.4599991,0,8.9700003,1.1
4,37.89037254,17.5,33.489998,29.999998,22.389999,43.700001
```

其中：

| 字段 | 含义 |
|---|---|
| `Month` | 月份或分组编号，原始代码中取值 1 到 12，用来做分层抽样 |
| `Y` | 需要预测的目标变量，可以替换成任何连续型指标 |
| `X1` 到 `X5` | 解释变量，也就是模型用来预测 `Y` 的输入因子 |

原始数据共有 912 行，每个月 76 条样本。这个结构很整齐，所以代码里用了 `stratify=months`，确保训练集和测试集中每个月份都有样本，而不是某些月份被随机分没了。

建模完成后，代码会读取这样的栅格文件：

```text
x1_200001.tif
x2_200001.tif
x3_200001.tif
x4_200001.tif
x5_200001.tif

x1_200002.tif
x2_200002.tif
...
x5_202012.tif
```

也就是说，每一个时间片都需要 5 个输入栅格，分别对应训练表里的 `X1` 到 `X5`。模型会对每个像元读取这 5 个值，预测该像元的目标变量，然后输出：

```text
Prediction_2000_01.tif
Prediction_2000_02.tif
...
Prediction_2020_12.tif
```

整体流程可以画成这样：

```text
datasite.csv
  ├─ Month
  ├─ Y，也就是目标变量
  └─ X1-X5
      ↓
训练机器学习模型
      ↓
trained_model.pkl
      ↓
x1-x5 GeoTIFF
      ↓
逐像元预测
      ↓
Prediction_YYYY_MM.tif
```

## 2. 原始代码包结构解析

代码包的核心文件大致如下：

| 文件或文件夹 | 作用 |
|---|---|
| `datasite.csv` | 样本表，包含 `Month`、`Y`、`X1` 到 `X5` |
| `GPP_RF.py` | 训练随机森林模型，文件名里的 GPP 可以理解为原始案例名 |
| `GPP_xgboost.py` | 训练 XGBoost 模型 |
| `GPP_lgb.py` | 训练 LightGBM 模型 |
| `GPP_CAT.py` | 训练 CatBoost 模型 |
| `GPP_SVM.py` | 训练支持向量机模型 |
| `GPP_GPR.py` | 训练高斯过程回归模型 |
| `GPP_RF_raster.py` | 使用随机森林模型进行栅格预测 |
| `GPP_xgboost_raster.py` | 使用 XGBoost 模型进行栅格预测 |
| `GPP_Lgb_raster.py` | 使用 LightGBM 模型进行栅格预测 |
| `GPP_CAT_raster.py` | 使用 CatBoost 模型进行栅格预测 |
| `GPP_SVM_raster.py` | 使用 SVM 模型进行栅格预测 |
| `GPP_GPR_raster.py` | 使用 GPR 模型进行栅格预测 |
| `ML_RF/`、`ML_XGB/` 等 | 保存各模型的参数、评价指标、训练集、测试集和 `.pkl` 模型 |
| `重命名数据.m` | MATLAB 预处理脚本，用来把不同来源或不同变量的栅格统一命名为 `x1_YYYYMM.tif` 到 `x5_YYYYMM.tif` |

从 MATLAB 脚本可以看出，原始案例中的 5 个输入栅格来自 5 套 GPP 产品或数据源；但换成其它研究时，它们也可以是气候、地形、土壤、人类活动或遥感指数等变量：

| 变量名 | 原始数据来源 |
|---|---|
| `X1` / `x1` | 原始案例：MODIS GPP；通用理解：第 1 个解释变量 |
| `X2` / `x2` | 原始案例：PML-V2 GPP；通用理解：第 2 个解释变量 |
| `X3` / `x3` | 原始案例：CEDAR GPP；通用理解：第 3 个解释变量 |
| `X4` / `x4` | 原始案例：GOSIF GPP；通用理解：第 4 个解释变量 |
| `X5` / `x5` | 原始案例：TL-LUE GPP；通用理解：第 5 个解释变量 |

这里的关键不是变量一定要叫这些名字，而是训练表格和栅格文件必须一一对应。表格里用 `X1` 到 `X5`，栅格预测时就必须有 `x1_年月.tif` 到 `x5_年月.tif`。

## 3. 安装 Python 环境

建议使用 Python 3.10 或更高版本。Windows 用户可以先打开 PowerShell，检查是否已经安装 Python：

```bash
python --version
```

如果能看到类似下面的输出，说明 Python 已安装：

```text
Python 3.10.11
```

如果没有安装，可以去 Python 官网下载安装包。安装时一定要勾选 `Add python.exe to PATH`，否则命令行可能找不到 Python。

然后新建一个项目文件夹，例如：

```text
D:\Project-RasterML
```

进入项目文件夹：

```bash
cd D:\Project-RasterML
```

创建虚拟环境：

```bash
python -m venv .venv
```

激活虚拟环境：

```bash
.\.venv\Scripts\Activate.ps1
```

如果 PowerShell 提示不允许执行脚本，可以临时放开当前用户权限：

```bash
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

激活成功后，命令行前面通常会出现 `(.venv)`。

接着安装需要的 Python 包：

```bash
python -m pip install --upgrade pip
pip install pandas numpy scikit-learn joblib rasterio xgboost lightgbm catboost matplotlib
```

如果你使用本文提供的配套代码包，也可以进入解压后的脚本目录，直接安装 `requirements.txt`：

```bash
cd D:\Project-RasterML\scripts
pip install -r requirements.txt
```

其中：

| 包名 | 用途 |
|---|---|
| `pandas` | 读取和保存 CSV 表格 |
| `numpy` | 数组计算 |
| `scikit-learn` | 训练随机森林、SVM、GPR，划分数据集，计算评价指标 |
| `joblib` | 保存和读取 `.pkl` 模型 |
| `rasterio` | 读取和写出 GeoTIFF 栅格 |
| `xgboost` | XGBoost 模型 |
| `lightgbm` | LightGBM 模型 |
| `catboost` | CatBoost 模型 |
| `matplotlib` | 后续画图可用，原始代码里 XGBoost 脚本导入过 |

如果 `rasterio` 在 Windows 上安装失败，可以改用 Anaconda 或 Miniconda：

```bash
conda create -n rasterml python=3.10
conda activate rasterml
conda install -c conda-forge rasterio pandas numpy scikit-learn
pip install xgboost lightgbm catboost joblib matplotlib
```

环境装好后，建议先运行附件里的检查脚本：

```bash
cd D:\Project-RasterML\scripts
python 01_check_inputs.py
```

这个脚本会检查 `datasite.csv` 的列名是否完整，也会检查第一期 `x1-x5` 栅格是否存在、空间信息是否一致。这样可以在训练前提前发现路径、列名、栅格对齐等问题。

## 4. 推荐的文件夹结构

原始代码里使用了很多绝对路径，例如：

```python
D:/Project-RasterML/SiteData/datasite.csv
D:/Project-RasterML/grid_datasite/ALL/
```

这在自己的电脑上能跑，但换一台电脑就要改很多地方。为了新手不迷路，建议先按下面的结构整理：

```text
D:\Project-RasterML
├─ SiteData
│  ├─ datasite.csv
│  ├─ ML_RF
│  ├─ ML_XGB
│  ├─ ML_LGB
│  ├─ ML_CAT
│  ├─ ML_SVM
│  └─ ML_GPR
├─ grid_datasite
│  ├─ ALL
│  │  ├─ x1_200001.tif
│  │  ├─ x2_200001.tif
│  │  ├─ x3_200001.tif
│  │  ├─ x4_200001.tif
│  │  ├─ x5_200001.tif
│  │  └─ ...
│  ├─ Result_RF
│  ├─ Result_XGB
│  ├─ Result_LGB
│  ├─ Result_CAT
│  ├─ Result_SVM
│  └─ Result_GPR
└─ scripts
   ├─ config.py
   ├─ 01_check_inputs.py
   ├─ 02_train_model.py
   ├─ 03_predict_raster.py
   ├─ 04_compare_metrics.py
   └─ requirements.txt
```

其中最重要的是两个输入位置：

- `SiteData/datasite.csv`：样本训练表；
- `grid_datasite/ALL/`：准备好的分期输入栅格。
- `scripts/`：放置本文配套代码包中的脚本文件。

## 5. 准备样本表格 `datasite.csv`

样本表格必须是 CSV 格式，不能直接用 Excel 的 `.xlsx`。如果你现在手里是 Excel 文件，可以在 Excel 里另存为 CSV。

最低要求如下：

| 要求 | 说明 |
|---|---|
| 文件名 | `datasite.csv` |
| 编码 | 建议 UTF-8 |
| 必须列 | `Month,Y,X1,X2,X3,X4,X5` |
| `Month` | 分组列；原始代码是 1 到 12 的月份，也可以改成季节、年份或样本类型 |
| `Y` | 目标变量，不能是文本 |
| `X1-X5` | 输入变量，必须是数值 |
| 缺失值 | 建议提前删除或填补 |

为什么要有 `Month`？因为原始案例是逐月生态遥感数据，有明显季节性。如果随机划分训练集和测试集时不管月份，可能某些月份在测试集中太少，评价结果不稳定。原代码使用了：

```python
train_test_split(
    X, y, months,
    test_size=0.2,
    stratify=months,
    random_state=42
)
```

这里的 `stratify=months` 就是按月份分层抽样，让 1 月到 12 月的样本比例尽量保持一致。换成其它数据时，如果没有月份，也可以把这一列改成其它分组变量；如果没有必要分层，可以去掉 `stratify=months`。

## 6. 准备栅格输入文件

栅格预测阶段要求每个时间片或每个待预测区域都有 5 个输入文件。以 2000 年 1 月为例：

```text
x1_200001.tif
x2_200001.tif
x3_200001.tif
x4_200001.tif
x5_200001.tif
```

2000 年 2 月则是：

```text
x1_200002.tif
x2_200002.tif
x3_200002.tif
x4_200002.tif
x5_200002.tif
```

注意，这里的 `YYYYMM` 必须是 6 位数字。月份小于 10 时要补 0，比如 1 月写成 `01`，不能写成 `1`。

所有输入栅格还必须满足：

- 行列数一致；
- 空间分辨率一致；
- 坐标系一致；
- 像元位置严格对齐；
- NoData 值尽量统一；
- 每个像元的 `x1-x5` 顺序必须和训练表中的 `X1-X5` 一致。

原始 MATLAB 脚本 `重命名数据.m` 的作用，就是把不同文件夹、不同命名规则的数据统一整理成这个格式。它的核心逻辑是：

```text
读取 5 个解释变量的同一期栅格
  ↓
转换成 double 数组
  ↓
按统一投影参考写出
  ↓
保存为 x1_YYYYMM.tif 到 x5_YYYYMM.tif
```

如果你不使用 MATLAB，也可以用 Python、ArcGIS、QGIS 或 R 完成同样的事情。重点不是工具，而是最终文件名、变量顺序和空间对齐必须正确。

## 7. 训练随机森林模型

先从随机森林开始，因为它对数据尺度不太敏感，不需要像 SVM 那样强依赖标准化，适合做入门版本。

配套代码包里已经提供了训练脚本 `02_train_model.py`。如果只想先跑通随机森林，可以在 `scripts` 文件夹中运行：

```bash
python 02_train_model.py --model rf
```

下面这段代码是随机森林训练部分的核心逻辑，主要用于帮助理解脚本在做什么。实际运行时不需要再手动新建一遍，直接使用附件里的 `02_train_model.py` 即可。

```python
from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV, KFold, train_test_split


# 1. 项目路径
# 如果你的项目不在 D:/Project-RasterML，需要改这里
PROJECT_DIR = Path(r"D:/Project-RasterML")
SITE_DIR = PROJECT_DIR / "SiteData"
DATA_FILE = SITE_DIR / "datasite.csv"
OUT_DIR = SITE_DIR / "ML_RF"
OUT_DIR.mkdir(parents=True, exist_ok=True)


# 2. 字段设置
FEATURES = ["X1", "X2", "X3", "X4", "X5"]
TARGET = "Y"
MONTH_COL = "Month"


def safe_mape(y_true, y_pred):
    """计算 MAPE，但自动跳过真实值为 0 的样本。"""
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)

    mask = y_true != 0
    if mask.sum() == 0:
        return np.nan

    return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100


def regression_metrics(y_true, y_pred):
    """汇总常见回归评价指标。"""
    return {
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "r2": float(r2_score(y_true, y_pred)),
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "mape": float(safe_mape(y_true, y_pred)),
    }


# 3. 读取数据
data = pd.read_csv(DATA_FILE)

# 简单检查列名是否完整
required_cols = [MONTH_COL, TARGET] + FEATURES
missing_cols = [col for col in required_cols if col not in data.columns]
if missing_cols:
    raise ValueError(f"datasite.csv 缺少这些列：{missing_cols}")

# 删除缺失值。正式研究中也可以根据需要改成插值或其他填补方法
data = data.dropna(subset=required_cols).copy()

X = data[FEATURES]
y = data[TARGET]
months = data[MONTH_COL]


# 4. 划分训练集和测试集
X_train, X_test, y_train, y_test, months_train, months_test = train_test_split(
    X,
    y,
    months,
    test_size=0.2,
    stratify=months,
    random_state=42,
)


# 5. 定义随机森林和参数网格
base_model = RandomForestRegressor(random_state=42)

param_grid = {
    "n_estimators": [100, 200, 300],
    "max_depth": [10, 20, None],
    "min_samples_split": [2, 5, 10],
    "min_samples_leaf": [1, 2, 4],
    "bootstrap": [True, False],
}

kfold = KFold(n_splits=5, shuffle=True, random_state=42)

grid_search = GridSearchCV(
    estimator=base_model,
    param_grid=param_grid,
    cv=kfold,
    scoring="neg_mean_squared_error",
    n_jobs=-1,
    verbose=1,
)


# 6. 开始训练
grid_search.fit(X_train, y_train)
best_model = grid_search.best_estimator_

print("最优参数：")
print(grid_search.best_params_)


# 7. 训练集和测试集预测
y_pred_train = best_model.predict(X_train)
y_pred_test = best_model.predict(X_test)

metrics = {
    "train": regression_metrics(y_train, y_pred_train),
    "test": regression_metrics(y_test, y_pred_test),
}


# 8. 保存结果
pd.DataFrame([grid_search.best_params_]).to_csv(
    OUT_DIR / "optimized_params.csv",
    index=False,
)

with open(OUT_DIR / "model_metrics.json", "w", encoding="utf-8") as f:
    json.dump(metrics, f, ensure_ascii=False, indent=2)

X_train.to_csv(OUT_DIR / "X_train.csv", index=False)
X_test.to_csv(OUT_DIR / "X_test.csv", index=False)
y_train.to_frame("Y").to_csv(OUT_DIR / "y_train.csv", index=False)
y_test.to_frame("Y").to_csv(OUT_DIR / "y_test.csv", index=False)

pd.DataFrame({"y_pred_train": y_pred_train}).to_csv(
    OUT_DIR / "y_pred_train.csv",
    index=False,
)
pd.DataFrame({"y_pred_test": y_pred_test}).to_csv(
    OUT_DIR / "y_pred_test.csv",
    index=False,
)

joblib.dump(best_model, OUT_DIR / "trained_model.pkl")

print(f"模型和结果已保存到：{OUT_DIR}")
```

运行方式：

```bash
cd D:\Project-RasterML\scripts
python 02_train_model.py --model rf
```

如果运行成功，`SiteData/ML_RF/` 里会出现这些文件：

| 输出文件 | 含义 |
|---|---|
| `optimized_params.csv` | 网格搜索得到的最优参数 |
| `model_metrics.json` | 训练集和测试集评价指标 |
| `trained_model.pkl` | 保存好的模型 |
| `X_train.csv`、`X_test.csv` | 划分后的自变量 |
| `y_train.csv`、`y_test.csv` | 划分后的真实值 |
| `y_pred_train.csv`、`y_pred_test.csv` | 模型预测值 |

## 8. 评价指标怎么理解？

原始代码计算了四类指标：

| 指标 | 含义 | 越大越好还是越小越好 |
|---|---|---|
| RMSE | 均方根误差，对大误差更敏感 | 越小越好 |
| R² | 决定系数，表示模型解释能力 | 越接近 1 越好 |
| MAE | 平均绝对误差 | 越小越好 |
| MAPE | 平均绝对百分比误差 | 越小越好 |

但是这里有一个很重要的坑：原始 `datasite.csv` 里 `Y` 存在 0 值，所以直接计算：

```python
np.mean(np.abs((y_true - y_pred) / y_true)) * 100
```

会出现除以 0，结果变成 `Infinity`。因此，在正式论文或报告中，不建议直接使用原始代码的 MAPE 结果。可以选择：

- 跳过 `Y=0` 的样本再计算 MAPE；
- 使用 MAE、RMSE、R² 作为主要指标；
- 或者改用 SMAPE 等对 0 更稳健的百分比误差指标。

在这个代码包已有结果中，各模型测试集表现如下：

| 模型 | 测试集 R² | 测试集 RMSE | 测试集 MAE | 简单解读 |
|---|---:|---:|---:|---|
| CatBoost | 0.864 | 38.08 | 25.16 | 现有结果中略优 |
| Random Forest | 0.855 | 39.31 | 25.58 | 稳定，适合作为基准模型 |
| XGBoost | 0.853 | 39.57 | 25.86 | 与随机森林接近 |
| LightGBM | 0.840 | 41.22 | 26.96 | 表现也可用 |
| SVM | -0.015 | 103.87 | 85.05 | 当前设置下效果较差 |
| GPR | -0.925 | 143.06 | 99.87 | 当前设置下泛化效果很差 |

注意：代码包里 `ML_RF` 文件夹下还出现了一个 `lgb_model_metrics.json`，内容和 LightGBM 的指标一致，应该是结果文件误放或复制时留下的，不影响随机森林模型本身。

从这些结果看，如果只是想得到一个可靠的初版图，可以优先使用 CatBoost、随机森林或 XGBoost；如果继续使用 SVM 和 GPR，建议先做标准化、重新设计参数范围，并检查样本量是否适合。

## 9. 六类模型的区别在哪里？

原代码中的六个训练脚本结构基本一样，主要差别是模型和参数网格。

| 脚本 | 模型 | 主要参数 |
|---|---|---|
| `GPP_RF.py` | `RandomForestRegressor` | 树数量、最大深度、最小分裂样本数 |
| `GPP_xgboost.py` | `XGBRegressor` | 树数量、深度、学习率、采样比例 |
| `GPP_lgb.py` | `LGBMRegressor` | 叶子数、深度、学习率、树数量 |
| `GPP_CAT.py` | `CatBoostRegressor` | 迭代次数、深度、学习率、L2 正则 |
| `GPP_SVM.py` | `SVR` | C、gamma、epsilon、核函数 |
| `GPP_GPR.py` | `GaussianProcessRegressor` | alpha、核函数常数、长度尺度 |

例如随机森林的参数网格是：

```python
param_grid = {
    "n_estimators": [100, 200, 300],
    "max_depth": [10, 20, None],
    "min_samples_split": [2, 5, 10],
    "min_samples_leaf": [1, 2, 4],
    "bootstrap": [True, False],
}
```

XGBoost 的参数网格是：

```python
param_grid = {
    "n_estimators": [50, 100, 200],
    "max_depth": [3, 5, 7],
    "learning_rate": [0.01, 0.1, 0.2],
    "subsample": [0.6, 0.8, 1.0],
    "colsample_bytree": [0.6, 0.8, 1.0],
}
```

CatBoost 的参数网格是：

```python
param_grid = {
    "iterations": [100, 200, 300],
    "depth": [4, 6, 10],
    "learning_rate": [0.01, 0.1, 0.2],
    "l2_leaf_reg": [1, 3, 5],
    "border_count": [32, 50, 100],
}
```

如果你是第一次跑，建议不要一上来就把所有模型都跑一遍。更稳妥的顺序是：

1. 先跑随机森林，确认数据、路径和输出都没有问题；
2. 再跑 CatBoost 或 XGBoost，对比精度；
3. 最后再考虑 SVM、GPR 这类更依赖标准化和参数设置的模型。

## 10. 用训练好的模型预测 GeoTIFF 栅格

训练脚本得到 `.pkl` 模型后，就可以进入栅格预测阶段。

原始代码的基本思路是：

```text
读取 trained_model.pkl
  ↓
循环 year = 2000 到 2020
  ↓
循环 month = 1 到 12
  ↓
读取 x1-x5 五个 GeoTIFF
  ↓
把二维栅格拉平成一维像元表
  ↓
model.predict()
  ↓
把预测结果重新 reshape 成二维栅格
  ↓
写出 Prediction_YYYY_MM.tif
```

下面给出一个更适合新手使用的随机森林栅格预测脚本。它比原始代码多做了几件事：

- 用 `Path` 管理路径；
- 检查 5 个输入栅格是否存在；
- 检查行列数、坐标系、仿射变换是否一致；
- 处理 NoData 和 NaN；
- 输出压缩 GeoTIFF。

配套代码包里已经提供了 `03_predict_raster.py`。下面仍然给出随机森林栅格预测的核心代码，便于理解逐像元预测的过程。实际运行时直接使用附件里的脚本即可。

```python
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import rasterio


# 1. 路径设置
PROJECT_DIR = Path(r"D:/Project-RasterML")
MODEL_FILE = PROJECT_DIR / "SiteData" / "ML_RF" / "trained_model.pkl"
INPUT_DIR = PROJECT_DIR / "grid_datasite" / "ALL"
OUTPUT_DIR = PROJECT_DIR / "grid_datasite" / "Result_RF"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# 2. 变量设置
FEATURES = ["X1", "X2", "X3", "X4", "X5"]
RASTER_PREFIXES = ["x1", "x2", "x3", "x4", "x5"]
YEARS = range(2000, 2021)
MONTHS = range(1, 13)
OUT_NODATA = -9999.0


def build_raster_paths(year, month):
    """生成某一年某一月的 5 个输入栅格路径。"""
    ym = f"{year}{month:02d}"
    return [INPUT_DIR / f"{prefix}_{ym}.tif" for prefix in RASTER_PREFIXES]


def read_aligned_rasters(paths):
    """读取 5 个已经对齐的栅格，并检查空间信息是否一致。"""
    arrays = []
    nodata_values = []

    with rasterio.open(paths[0]) as ref:
        profile = ref.profile.copy()
        ref_shape = ref.shape
        ref_crs = ref.crs
        ref_transform = ref.transform
        arrays.append(ref.read(1).astype("float32"))
        nodata_values.append(ref.nodata)

    for path in paths[1:]:
        with rasterio.open(path) as src:
            if src.shape != ref_shape:
                raise ValueError(f"{path.name} 的行列数和第一个栅格不一致")
            if src.crs != ref_crs:
                raise ValueError(f"{path.name} 的坐标系和第一个栅格不一致")
            if src.transform != ref_transform:
                raise ValueError(f"{path.name} 的像元位置和第一个栅格不一致")

            arrays.append(src.read(1).astype("float32"))
            nodata_values.append(src.nodata)

    return arrays, profile, nodata_values


def predict_one_month(model, year, month):
    """预测单个月份，并写出 GeoTIFF。"""
    paths = build_raster_paths(year, month)

    missing = [path for path in paths if not path.exists()]
    if missing:
        raise FileNotFoundError(f"缺少输入栅格：{missing}")

    arrays, profile, nodata_values = read_aligned_rasters(paths)

    # shape: 行 × 列 × 变量数
    stack = np.stack(arrays, axis=-1)
    rows, cols, n_features = stack.shape

    # 拉平成：像元数 × 变量数
    flat = stack.reshape(-1, n_features)

    # 有效像元判断：不能有 NaN，也不能等于各自的 NoData
    valid = np.isfinite(flat).all(axis=1)
    for i, nodata in enumerate(nodata_values):
        if nodata is not None:
            valid &= flat[:, i] != nodata

    # 先全部填成 NoData，只对有效像元预测
    pred_flat = np.full(flat.shape[0], OUT_NODATA, dtype="float32")

    if valid.sum() > 0:
        X_pred = pd.DataFrame(flat[valid], columns=FEATURES)
        pred_flat[valid] = model.predict(X_pred).astype("float32")

    pred = pred_flat.reshape(rows, cols)

    profile.update(
        driver="GTiff",
        count=1,
        dtype="float32",
        nodata=OUT_NODATA,
        compress="lzw",
    )

    output_file = OUTPUT_DIR / f"Prediction_{year}_{month:02d}.tif"
    with rasterio.open(output_file, "w", **profile) as dst:
        dst.write(pred, 1)

    print(f"完成：{output_file}")


def main():
    model = joblib.load(MODEL_FILE)

    for year in YEARS:
        for month in MONTHS:
            predict_one_month(model, year, month)


if __name__ == "__main__":
    main()
```

运行：

```bash
cd D:\Project-RasterML\scripts
python 03_predict_raster.py --model rf
```

如果一切正常，`grid_datasite/Result_RF/` 中会生成 252 个栅格文件：

```text
21 年 × 12 月 = 252 个 GeoTIFF
```

## 11. 为什么要把栅格拉平成一张表？

机器学习模型训练时看到的数据是表格：

| X1 | X2 | X3 | X4 | X5 |
|---:|---:|---:|---:|---:|
| 0 | 10.86 | 0 | 14 | 0 |
| 12.3 | 9.46 | 0 | 8.97 | 1.1 |
| 17.5 | 33.49 | 30.00 | 22.39 | 43.70 |

但是 GeoTIFF 是二维矩阵：

```text
行 × 列
```

如果一个栅格是 1000 行、1000 列，就有 1,000,000 个像元。每个像元都有 `x1-x5` 五个值。为了让模型预测，我们需要把它变成：

```text
1,000,000 行 × 5 列
```

这一步就是：

```python
flat = stack.reshape(-1, n_features)
```

预测完成后，模型输出的是一列结果：

```text
1,000,000 个预测值
```

再把它变回原来的行列结构：

```python
pred = pred_flat.reshape(rows, cols)
```

这就是“逐像元预测”的本质。

## 12. 如何切换到 CatBoost、XGBoost 或 LightGBM？

切换模型需要改两个地方：

1. 训练脚本里的模型和参数网格；
2. 栅格预测脚本里的模型文件路径和输出文件夹。

例如使用 CatBoost 时，训练阶段的模型可以写成：

```python
from catboost import CatBoostRegressor

base_model = CatBoostRegressor(random_state=42, silent=True)

param_grid = {
    "iterations": [100, 200, 300],
    "depth": [4, 6, 10],
    "learning_rate": [0.01, 0.1, 0.2],
    "l2_leaf_reg": [1, 3, 5],
    "border_count": [32, 50, 100],
}
```

模型保存路径改成：

```python
OUT_DIR = SITE_DIR / "ML_CAT"
joblib.dump(best_model, OUT_DIR / "trained_model.pkl")
```

栅格预测脚本中对应改成：

```python
MODEL_FILE = PROJECT_DIR / "SiteData" / "ML_CAT" / "trained_model.pkl"
OUTPUT_DIR = PROJECT_DIR / "grid_datasite" / "Result_CAT"
```

其它部分基本不用动，因为所有模型的输入都是同样的 `X1-X5`。

## 13. 常见问题与排查方法

### 13.1 `ModuleNotFoundError`

例如：

```text
ModuleNotFoundError: No module named 'rasterio'
```

说明当前环境没有安装对应包。先确认虚拟环境是否已经激活，然后安装：

```bash
pip install rasterio
```

如果是 `xgboost`、`lightgbm`、`catboost` 缺失，就分别安装对应包。

### 13.2 找不到 `datasite.csv`

常见报错：

```text
FileNotFoundError: D:\Project-RasterML\SiteData\datasite.csv
```

检查三件事：

- 文件名是否真的是 `datasite.csv`；
- 文件是否放在 `SiteData` 文件夹；
- 脚本里的 `PROJECT_DIR` 是否和你的真实路径一致。

### 13.3 找不到某个月的栅格

例如：

```text
缺少输入栅格：x3_200007.tif
```

说明 `grid_datasite/ALL/` 里缺少 2000 年 7 月的 `x3` 文件。检查命名时尤其注意月份补零：

```text
正确：x3_200007.tif
错误：x3_20007.tif
```

### 13.4 栅格大小不一致

如果出现：

```text
行列数和第一个栅格不一致
```

说明 5 个输入栅格没有对齐。需要在 ArcGIS、QGIS、GDAL 或 MATLAB 中统一：

- 投影；
- 分辨率；
- 行列数；
- 像元原点；
- 空间范围。

机器学习不会自动解决空间错位问题。如果输入栅格没有严格对齐，预测结果就没有意义。

### 13.5 MAPE 是无穷大

这是因为 `Y` 中有 0。原始结果中的 MAPE 都是 `Infinity`，不适合作为主要判断依据。优先看 RMSE、MAE 和 R²。

### 13.6 SVM 或 GPR 效果很差

SVM 和 GPR 对数据尺度、参数和样本数量比较敏感。原代码里没有对 `X1-X5` 做标准化，因此 SVM/GPR 效果差并不意外。

如果要认真比较这些模型，建议改成流水线：

```python
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVR

base_model = Pipeline([
    ("scaler", StandardScaler()),
    ("svr", SVR()),
])
```

然后参数名要写成：

```python
param_grid = {
    "svr__C": [0.1, 1, 10, 100],
    "svr__epsilon": [0.01, 0.1, 0.2],
    "svr__gamma": ["scale", "auto"],
}
```

## 14. 结果出来后怎么检查？

预测完成后，不要急着直接用于论文制图，建议先做几项检查：

1. 在 QGIS 或 ArcGIS 中打开几个输出 `Prediction_YYYY_MM.tif`；
2. 检查坐标系是否正确；
3. 检查空间范围是否和输入栅格一致；
4. 检查 NoData 区域是否合理；
5. 检查数值范围是否明显异常；
6. 随机抽几个月，看季节变化是否符合常识；
7. 与原始产品或站点观测做散点图对比。

如果你的目标变量是 GPP、NPP、NDVI 这类具有季节变化的生态变量，还可以特别检查：

- 冬季是否普遍偏低；
- 生长季是否偏高；
- 水体、裸地等区域是否出现异常高值；
- 不同年份之间是否存在明显断层。

如果输出图看起来“满屏噪点”或者“整幅图几乎一个值”，通常不是模型突然坏了，而是输入栅格、NoData、变量顺序或尺度出了问题。

## 15. 后续可以怎样改进？

这套代码已经能完成基本建模和制图，但如果要做成更稳健的科研流程，可以继续改进：

- 把路径、年份、模型类型写进单独的配置文件；
- 增加日志文件，记录每次运行时间和参数；
- 增加特征重要性分析；
- 对大栅格使用分块预测，避免一次性占用太多内存；
- 对 SVM/GPR 增加标准化；
- 使用空间交叉验证或时间外推验证，避免随机划分过于乐观；
- 对每月结果做年尺度、生长季尺度或多年平均统计；
- 计算不同模型之间的不确定性范围。

如果只是入门，先把“站点表格 → 模型 → 栅格预测”这条线跑通就足够了。跑通之后再优化精度、制图和论文表达，效率会高很多。

## 16. 一个最小可复现清单

最后把需要准备的东西列成清单：

```text
1. Python 环境
   - pandas
   - numpy
   - scikit-learn
   - joblib
   - rasterio
   - xgboost / lightgbm / catboost，可选

2. 样本表格
   - D:\Project-RasterML\SiteData\datasite.csv
   - 必须包含 Month,Y,X1,X2,X3,X4,X5

3. 输入栅格
   - D:\Project-RasterML\grid_datasite\ALL\x1_200001.tif
   - D:\Project-RasterML\grid_datasite\ALL\x2_200001.tif
   - ...
   - 一直到 x5_202012.tif

4. 训练脚本
   - scripts\02_train_model.py

5. 预测脚本
   - scripts\03_predict_raster.py

6. 输出结果
   - SiteData\ML_RF\trained_model.pkl
   - SiteData\ML_RF\model_metrics.json
   - grid_datasite\Result_RF\Prediction_YYYY_MM.tif
```

这套流程的核心思想其实很朴素：表格负责学习关系，栅格负责提供空间位置。只要训练表中的 `X1-X5` 和栅格中的 `x1-x5` 含义一致，机器学习模型就可以把样本尺度的关系推广到整个研究区。
