---
title: "从点位数据到空间预测：Python 随机森林完整入门流程"
date: 2026-06-27 00:49:17 +0800
article_id: "001"
permalink: /posts/2026/06/python-random-forest-point-to-surface-prediction/
lang: zh
author_profile: true
comments: false
share: false
tags:
  - Python
  - 随机森林
  - 空间预测
  - 机器学习
excerpt: "从环境安装、Excel 文件准备、模型训练、精度评价到新区域预测，整理一个适合生态与地理数据分析的随机森林点到面预测流程。"
---

在生态学、地理学和环境科学研究中，我们常常只有一批点位观测数据，但真正关心的是更大区域上的连续空间格局。例如：已经采集了一批样点的某个生态指标，同时也准备好了这些样点对应的气候、土壤、地形或人类活动因子，那么能不能训练一个模型，把点位关系推广到整个研究区？

这就是常说的“点到面”预测：用点位样本建立目标变量与环境因子之间的统计关系，再把这个关系应用到没有实测值的区域格网或样本表上。

本文整理一个相对完整的 Python 随机森林流程，尽量讲清楚：

- 需要安装什么环境；
- 需要准备哪些 Excel 文件；
- 每个文件应该是什么格式；
- 如何训练模型、评价模型；
- 如何把模型用于新区域预测；
- 输出文件怎么继续用于后续制图或栅格转换。

本文不会从 Python 语法零基础讲起，但会把每一步需要做什么说明清楚。只要你已经能打开命令行、能编辑 `.py` 文件，就可以照着改。

## 1. 这个流程适合什么问题？

本文示例使用随机森林回归模型，适合下面这种数据结构：

- 你有一个连续型目标变量，例如 `Ea`、碳汇量、土壤碳密度、植被指数变化量等；
- 你有一批解释变量，例如温度、降水、海拔、坡度、土地利用、土壤属性等；
- 每一个样点都有目标变量和解释变量；
- 另有一个更大范围的表格或栅格像元表，里面有同样的解释变量，但没有目标变量；
- 你想预测这些没有实测值位置上的目标变量。

简单说，就是：

```text
已有样点：环境因子 A-P + 实测 Ea  →  训练模型
新区域：环境因子 A-P             →  预测 Ea
```

这里用 `Ea` 作为目标变量名，只是为了演示。正式使用时可以换成你的真实变量名。

## 2. 建议的文件夹结构

先新建一个项目文件夹，例如：

```text
E:\land_rf_project
```

建议把文件整理成下面这样：

```text
land_rf_project/
├─ data/
│  ├─ training_set.xlsx
│  ├─ test_set.xlsx
│  └─ prediction_grid.xlsx
├─ output/
│  ├─ model/
│  ├─ figures/
│  └─ tables/
└─ scripts/
   ├─ 01_train_random_forest.py
   └─ 02_predict_new_area.py
```

各文件夹用途如下：

| 文件夹 | 用途 |
|---|---|
| `data/` | 放输入数据，包括训练集、测试集和待预测数据 |
| `output/model/` | 保存训练好的模型文件 |
| `output/figures/` | 保存模型评价图 |
| `output/tables/` | 保存测试集预测结果和新区域预测结果 |
| `scripts/` | 放 Python 脚本 |

这种结构的好处是：输入、输出、代码分开，后面复查或换数据时不容易乱。

## 3. 安装 Python 环境

建议使用 Python 3.10 或更高版本。Windows 用户可以在命令行里输入：

```bash
python --version
```

如果能看到类似下面的结果，说明 Python 已经安装好：

```text
Python 3.10.11
```

如果系统提示找不到 `python`，可以先安装 Python，或者使用 Anaconda / Miniconda。这里给出最通用的 `venv` 方式。

进入项目文件夹：

```bash
cd /d E:\land_rf_project
```

创建虚拟环境：

```bash
python -m venv .venv
```

激活虚拟环境：

```bash
.venv\Scripts\activate
```

激活成功后，命令行前面通常会出现 `(.venv)`。然后安装依赖：

```bash
python -m pip install -U pip
python -m pip install pandas numpy matplotlib scikit-learn optuna openpyxl joblib
```

这些包分别做什么？

| 包 | 作用 |
|---|---|
| `pandas` | 读取和输出 Excel 表 |
| `numpy` | 数组计算 |
| `matplotlib` | 绘图 |
| `scikit-learn` | 随机森林、交叉验证、评价指标 |
| `optuna` | 自动调参 |
| `openpyxl` | 让 pandas 读取 `.xlsx` 文件 |
| `joblib` | 保存和读取模型 |

安装完成后，可以检查一下：

```bash
python -c "import pandas, sklearn, optuna; print('environment ok')"
```

如果输出：

```text
environment ok
```

说明环境基本可用。

## 4. 需要准备哪些文件？

本文需要三个 Excel 文件。

### 4.1 训练集：`training_set.xlsx`

训练集必须同时包含：

- 样点编号；
- 可选的经纬度；
- 环境因子列；
- 目标变量列。

示例格式如下：

| site_id | lon | lat | A | B | C | ... | P | Ea |
|---|---:|---:|---:|---:|---:|---|---:|---:|
| S001 | 106.51 | 27.83 | 12.3 | 800 | 4.2 | ... | 0.65 | 1.28 |
| S002 | 107.20 | 28.10 | 11.8 | 920 | 3.9 | ... | 0.72 | 1.41 |

其中：

- `A` 到 `P` 是环境因子列；
- `Ea` 是目标变量；
- `site_id`、`lon`、`lat` 不是模型必须使用的列，但建议保留，方便检查结果。

正式分析时，不建议一直用 `A`、`B`、`C` 这种列名。最好换成有意义的变量名，例如：

```text
MAT, MAP, elevation, slope, soil_ph, soc, ndvi
```

本文用 `A` 到 `P`，只是为了和示例代码保持简洁。

### 4.2 测试集：`test_set.xlsx`

测试集格式必须和训练集一致，也要包含 `A` 到 `P` 以及 `Ea`。

它的作用不是参与训练，而是检验模型对未参与训练样本的预测能力。

示例：

| site_id | lon | lat | A | B | C | ... | P | Ea |
|---|---:|---:|---:|---:|---:|---|---:|---:|
| T001 | 105.90 | 26.70 | 13.1 | 760 | 4.8 | ... | 0.61 | 1.02 |

如果你现在只有一个完整样点表，也可以先在 Excel 或 Python 中拆成训练集和测试集，例如 75% 做训练，25% 做测试。但如果样点有明显空间聚集，最好按区域或空间块拆分，而不是完全随机拆分。

### 4.3 待预测数据：`prediction_grid.xlsx`

这个文件是要外推预测的新区域数据。它不需要有 `Ea`，但必须有训练时使用过的全部环境因子列。

示例：

| pixel_id | lon | lat | A | B | C | ... | P |
|---|---:|---:|---:|---:|---:|---|---:|
| G000001 | 100.05 | 20.05 | 14.2 | 1100 | 5.1 | ... | 0.74 |
| G000002 | 100.15 | 20.05 | 14.1 | 1095 | 5.0 | ... | 0.73 |

注意：

- `prediction_grid.xlsx` 的环境因子列必须和训练集一致；
- 列名要一致；
- 单位要一致；
- 空间分辨率和坐标系统最好在前处理阶段已经对齐；
- 如果后面要转回栅格，建议保留 `pixel_id`、`lon`、`lat` 或行列号。

## 5. 第一个脚本：训练随机森林模型

把下面代码保存为：

```text
scripts/01_train_random_forest.py
```

代码中最常需要修改的是：

- `PROJECT_DIR`：你的项目文件夹；
- `FEATURE_COLUMNS`：环境因子列名；
- `TARGET_COLUMN`：目标变量列名。

```python
from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import numpy as np
import optuna
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    explained_variance_score,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import KFold


# =========================
# 1. 路径设置
# =========================

# 修改为你的项目文件夹
PROJECT_DIR = Path(r"E:\land_rf_project")

DATA_DIR = PROJECT_DIR / "data"
OUTPUT_DIR = PROJECT_DIR / "output"
MODEL_DIR = OUTPUT_DIR / "model"
FIGURE_DIR = OUTPUT_DIR / "figures"
TABLE_DIR = OUTPUT_DIR / "tables"

TRAIN_FILE = DATA_DIR / "training_set.xlsx"
TEST_FILE = DATA_DIR / "test_set.xlsx"

MODEL_FILE = MODEL_DIR / "random_forest_Ea.joblib"
FIGURE_FILE = FIGURE_DIR / "Ea_observed_vs_predicted.pdf"
TEST_OUTPUT_FILE = TABLE_DIR / "test_set_with_prediction.xlsx"


# 如果输出文件夹不存在，就自动创建
MODEL_DIR.mkdir(parents=True, exist_ok=True)
FIGURE_DIR.mkdir(parents=True, exist_ok=True)
TABLE_DIR.mkdir(parents=True, exist_ok=True)


# =========================
# 2. 变量列名设置
# =========================

# 环境因子列。实际使用时可以改成你的真实变量名。
FEATURE_COLUMNS = [
    "A", "B", "C", "D",
    "E", "F", "G", "H",
    "I", "J", "K", "L",
    "M", "N", "O", "P",
]

# 目标变量列
TARGET_COLUMN = "Ea"


def read_model_table(path: Path, need_target: bool = True):
    """读取 Excel 表，并检查模型需要的列是否存在。"""
    data = pd.read_excel(path)

    required_columns = FEATURE_COLUMNS.copy()
    if need_target:
        required_columns.append(TARGET_COLUMN)

    missing_columns = [col for col in required_columns if col not in data.columns]
    if missing_columns:
        raise ValueError(f"{path.name} 缺少必要列: {missing_columns}")

    # 简单处理缺失值：删除特征或目标变量为空的行
    before_rows = len(data)
    data = data.dropna(subset=required_columns).copy()
    after_rows = len(data)

    if after_rows < before_rows:
        print(f"{path.name}: 删除缺失值行 {before_rows - after_rows} 行")

    X = data[FEATURE_COLUMNS].to_numpy()

    if need_target:
        y = data[TARGET_COLUMN].to_numpy()
        return data, X, y

    return data, X


# =========================
# 3. 读取训练集和测试集
# =========================

train_df, X_train, y_train = read_model_table(TRAIN_FILE, need_target=True)
test_df, X_test, y_test = read_model_table(TEST_FILE, need_target=True)

print(f"训练集样本数: {len(train_df)}")
print(f"测试集样本数: {len(test_df)}")
print(f"环境因子数量: {len(FEATURE_COLUMNS)}")


# =========================
# 4. 用 Optuna 自动调参
# =========================

# 只在训练集内部做 5 折交叉验证
cv = KFold(n_splits=5, shuffle=True, random_state=2026)


def objective(trial):
    """Optuna 会反复调用这个函数，并寻找平均 R² 最高的参数组合。"""
    params = {
        "n_estimators": trial.suggest_int("n_estimators", 200, 1000),
        "max_depth": trial.suggest_int("max_depth", 3, 30),
        "min_samples_split": trial.suggest_int("min_samples_split", 2, 10),
        "min_samples_leaf": trial.suggest_int("min_samples_leaf", 1, 5),
        "max_features": trial.suggest_float("max_features", 0.4, 1.0),
        "random_state": 2026,
        "n_jobs": -1,
    }

    fold_scores = []

    for train_index, valid_index in cv.split(X_train):
        X_fold_train = X_train[train_index]
        X_fold_valid = X_train[valid_index]
        y_fold_train = y_train[train_index]
        y_fold_valid = y_train[valid_index]

        model = RandomForestRegressor(**params)
        model.fit(X_fold_train, y_fold_train)

        valid_pred = model.predict(X_fold_valid)
        fold_scores.append(r2_score(y_fold_valid, valid_pred))

    return float(np.mean(fold_scores))


study = optuna.create_study(direction="maximize")
study.optimize(objective, n_trials=80)

best_params = study.best_params
best_params.update({
    "random_state": 2026,
    "n_jobs": -1,
})

print("最优参数:")
print(best_params)


# =========================
# 5. 用最优参数训练最终模型
# =========================

rf_model = RandomForestRegressor(**best_params)
rf_model.fit(X_train, y_train)


# =========================
# 6. 在测试集上评价模型
# =========================

y_pred = rf_model.predict(X_test)

mae = mean_absolute_error(y_test, y_pred)
mse = mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse)
evs = explained_variance_score(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print("\n测试集评价指标:")
print(f"MAE : {mae:.4f}")
print(f"MSE : {mse:.4f}")
print(f"RMSE: {rmse:.4f}")
print(f"EVS : {evs:.4f}")
print(f"R²  : {r2:.4f}")


# 把预测值写回测试集表格，方便逐点检查
test_df[f"{TARGET_COLUMN}_pred"] = y_pred
test_df.to_excel(TEST_OUTPUT_FILE, index=False)


# =========================
# 7. 绘制真实值-预测值散点图
# =========================

plt.rc("font", family="Times New Roman", size=14)

fig, ax = plt.subplots(figsize=(7, 7), dpi=150)
ax.scatter(y_test, y_pred, s=28, color="black", alpha=0.75)

axis_min = min(np.min(y_test), np.min(y_pred))
axis_max = max(np.max(y_test), np.max(y_pred))

ax.plot(
    [axis_min, axis_max],
    [axis_min, axis_max],
    linestyle="--",
    color="royalblue",
    linewidth=1.5,
)

ax.set_xlim(axis_min, axis_max)
ax.set_ylim(axis_min, axis_max)
ax.set_aspect("equal", adjustable="box")
ax.set_xlabel(f"Observed {TARGET_COLUMN}")
ax.set_ylabel(f"Predicted {TARGET_COLUMN}")
ax.set_title("Random forest: observed vs. predicted")

fig.tight_layout()
fig.savefig(FIGURE_FILE, bbox_inches="tight")
plt.close(fig)


# =========================
# 8. 保存模型
# =========================

# 不只保存模型，也保存列名和评价指标。
# 这样下一次外推预测时，可以自动检查列名是否一致。
model_bundle = {
    "model": rf_model,
    "feature_columns": FEATURE_COLUMNS,
    "target_column": TARGET_COLUMN,
    "best_params": best_params,
    "metrics": {
        "MAE": mae,
        "MSE": mse,
        "RMSE": rmse,
        "EVS": evs,
        "R2": r2,
    },
}

joblib.dump(model_bundle, MODEL_FILE)

print("\n输出文件:")
print(f"模型文件: {MODEL_FILE}")
print(f"测试集预测表: {TEST_OUTPUT_FILE}")
print(f"评价图: {FIGURE_FILE}")
```

运行方法：

```bash
python scripts\01_train_random_forest.py
```

如果运行成功，会得到三个主要输出：

| 输出文件 | 说明 |
|---|---|
| `output/model/random_forest_Ea.joblib` | 训练好的随机森林模型 |
| `output/tables/test_set_with_prediction.xlsx` | 测试集真实值与预测值 |
| `output/figures/Ea_observed_vs_predicted.pdf` | 真实值—预测值散点图 |

## 6. 怎么看模型效果？

脚本会输出几个常见指标：

| 指标 | 含义 | 判断方向 |
|---|---|---|
| `MAE` | 平均绝对误差 | 越小越好 |
| `MSE` | 均方误差 | 越小越好 |
| `RMSE` | 均方根误差，和目标变量单位一致 | 越小越好 |
| `EVS` | 解释方差分数 | 越接近 1 越好 |
| `R²` | 决定系数 | 越接近 1 越好 |

不要只看 `R²`。如果样点数量少、空间聚集强，随机拆分测试集可能会高估模型能力。更严格的做法是按区域或空间块验证。

同时建议打开 `Ea_observed_vs_predicted.pdf` 看散点图：

- 点越接近 1:1 虚线，说明预测越接近真实值；
- 如果高值普遍被低估，低值普遍被高估，说明模型可能存在回归到均值的问题；
- 如果某些点偏离很大，建议回到原始样点检查是否有异常值。

## 7. 第二个脚本：预测新区域

训练好模型后，就可以用新区域环境因子表进行外推预测。

把下面代码保存为：

```text
scripts/02_predict_new_area.py
```

```python
from pathlib import Path

import joblib
import pandas as pd


# =========================
# 1. 路径设置
# =========================

PROJECT_DIR = Path(r"E:\land_rf_project")

DATA_DIR = PROJECT_DIR / "data"
MODEL_DIR = PROJECT_DIR / "output" / "model"
TABLE_DIR = PROJECT_DIR / "output" / "tables"

MODEL_FILE = MODEL_DIR / "random_forest_Ea.joblib"
PREDICT_FILE = DATA_DIR / "prediction_grid.xlsx"
OUTPUT_FILE = TABLE_DIR / "prediction_grid_with_Ea.xlsx"

TABLE_DIR.mkdir(parents=True, exist_ok=True)


# =========================
# 2. 读取模型
# =========================

bundle = joblib.load(MODEL_FILE)

model = bundle["model"]
feature_columns = bundle["feature_columns"]
target_column = bundle["target_column"]


# =========================
# 3. 读取待预测数据
# =========================

predict_df = pd.read_excel(PREDICT_FILE)

missing_columns = [col for col in feature_columns if col not in predict_df.columns]
if missing_columns:
    raise ValueError(f"待预测数据缺少环境因子列: {missing_columns}")


# 如果环境因子有缺失值，这些行无法直接预测
valid_mask = predict_df[feature_columns].notna().all(axis=1)

result_df = predict_df.copy()
result_df[f"{target_column}_pred"] = pd.NA


# 只对环境因子完整的行进行预测
X_new = predict_df.loc[valid_mask, feature_columns].to_numpy()
result_df.loc[valid_mask, f"{target_column}_pred"] = model.predict(X_new)


# 输出预测结果
result_df.to_excel(OUTPUT_FILE, index=False)

print(f"待预测总行数: {len(result_df)}")
print(f"成功预测行数: {valid_mask.sum()}")
print(f"因缺失值跳过行数: {(~valid_mask).sum()}")
print(f"预测结果已保存: {OUTPUT_FILE}")
```

运行：

```bash
python scripts\02_predict_new_area.py
```

输出文件：

```text
output/tables/prediction_grid_with_Ea.xlsx
```

这个文件会保留原来的所有列，并新增一列：

```text
Ea_pred
```

这就是模型预测的新区域目标变量值。

## 8. 预测结果怎么转回空间图？

这一步取决于你的 `prediction_grid.xlsx` 是怎么来的。

如果它是从栅格像元转换来的表格，通常应该保留以下至少一种空间定位信息：

| 字段 | 用途 |
|---|---|
| `lon`, `lat` | 用经纬度重新插值或转点图层 |
| `row`, `col` | 用行列号还原到原始栅格 |
| `pixel_id` | 与原始栅格像元编号匹配 |

机器学习脚本本身只负责生成预测值，不负责自动变成 `.tif`。要转回栅格，需要根据你前处理时保留的空间索引，用 R、Python、ArcGIS 或 QGIS 重新关联。

如果你后续还要做制图，建议 `prediction_grid.xlsx` 至少保留：

```text
pixel_id, lon, lat, A, B, C, ..., P, Ea_pred
```

这样无论转点图层还是转栅格，都比较方便。

## 9. 常见报错和解决办法

### 9.1 `ModuleNotFoundError`

例如：

```text
ModuleNotFoundError: No module named 'optuna'
```

说明当前环境没有安装这个包。先确认虚拟环境已经激活，然后安装：

```bash
python -m pip install optuna
```

### 9.2 Excel 文件找不到

例如：

```text
FileNotFoundError: training_set.xlsx
```

检查三件事：

1. `PROJECT_DIR` 是否写对；
2. Excel 文件名是否完全一致；
3. 文件是否真的放在 `data/` 文件夹里。

### 9.3 缺少必要列

例如：

```text
training_set.xlsx 缺少必要列: ['P', 'Ea']
```

说明 Excel 表中没有这些列名。注意列名必须完全一致，包括大小写、空格和特殊符号。

### 9.4 预测结果全都很接近

这不一定是代码错，可能是：

- 目标变量本身变化范围小；
- 训练样本覆盖的环境梯度不足；
- 重要解释变量缺失；
- 随机森林对极端高值或低值有回归到均值的倾向。

建议检查训练样本的目标变量分布，以及新区域环境因子是否超出训练样本范围。

## 10. 使用前最好做的几个检查

**第一，检查单位是否一致。**

例如训练集降水是 `mm/year`，预测区却是 `mm/month`，模型不会报错，但结果会完全不可信。

**第二，检查空间尺度是否一致。**

如果目标变量来自样点尺度，而环境因子来自很粗的栅格，模型能运行，但解释时要承认尺度差异。

**第三，检查新区域是否超出训练样本环境范围。**

可以比较训练集和待预测数据中每个变量的最小值、最大值。如果新区域大量超出训练范围，就属于强外推。

**第四，不要把机器学习预测直接等同于机制解释。**

随机森林擅长拟合非线性关系，但它首先是经验预测模型。若要解释机制，还需要结合变量重要性、偏依赖图、生态过程认识以及独立验证。

## 11. 小结

“点到面”的随机森林预测，核心流程可以概括为：

```text
准备点位样本
→ 匹配环境因子
→ 拆分训练集和测试集
→ 训练随机森林
→ 检验模型效果
→ 保存模型
→ 输入新区域环境因子
→ 输出空间预测表
→ 根据空间索引转回地图
```

真正决定结果是否可靠的，往往不是代码本身，而是样点代表性、环境因子质量、空间匹配精度和验证方案。代码只是把流程跑通；能不能用于科学问题，还要回到数据和生态过程本身。
