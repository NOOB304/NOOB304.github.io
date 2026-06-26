---
title: "用随机森林把点位观测外推到空间面：一个 Python 工作流"
date: 2026-06-27
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
excerpt: "整理一个从点位观测样本训练随机森林模型，再把模型应用到区域环境因子表上的 Python 工作流。"
---

在生态学和地理数据分析里，我们经常会遇到一个很实际的问题：手里有一批点位观测数据，也有一套已经对齐好的气候或环境因子栅格，下一步想把点位上的关系外推到更大区域，得到连续空间上的预测结果。

这类问题可以概括为“点到面”的空间预测。本文整理一个基于 Python 随机森林回归的工作流：先用点位样本训练模型，再用训练好的模型预测没有观测值的区域因子表。这里不从 Python 基础讲起，默认你已经准备好了 Excel 表格，并且知道每一列环境因子的含义。

## 1. 数据约定

为了让代码尽量清楚，本文假设有三个文件：

- `training_set_with_data_augmentation.xlsx`：训练样本，包含环境因子列和目标变量列；
- `test_set.xlsx`：独立验证样本，格式与训练样本一致；
- `data.xlsx`：需要外推预测的新区域数据，只需要包含环境因子列。

这里用 `A` 到 `P` 表示 16 个环境因子列，用 `Ea` 表示要预测的目标变量。实际使用时，你可以把这些列名替换成真实变量名，例如 `MAT`、`MAP`、`SOC`、`pH` 等。

最重要的一点是：训练、验证和外推预测三个表里的环境因子列名必须一致，列的含义也必须一致。否则模型虽然能运行，但预测结果会失去解释意义。

## 2. 安装依赖

建议在独立的虚拟环境中运行：

```bash
python -m pip install -U pandas numpy matplotlib scikit-learn optuna openpyxl joblib
```

其中：

- `pandas` 负责读取和输出 Excel；
- `scikit-learn` 负责随机森林建模和评价指标；
- `optuna` 用来自动搜索较优参数；
- `matplotlib` 用来绘制真实值与预测值的散点图；
- `joblib` 用来保存和读取模型。

## 3. 训练、调参和评估模型

下面这个脚本完成四件事：

1. 读取训练集和测试集；
2. 用 Optuna 在训练集内部做交叉验证调参；
3. 用最优参数重新训练随机森林；
4. 在测试集上评估，并保存图件、预测表和模型文件。

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


# 工作目录：根据自己的文件位置修改
WORK_DIR = Path(r"E:\land")

TRAIN_FILE = WORK_DIR / "training_set_with_data_augmentation.xlsx"
TEST_FILE = WORK_DIR / "test_set.xlsx"
MODEL_FILE = WORK_DIR / "random_forest_Ea.joblib"
FIGURE_FILE = WORK_DIR / "Ea_true_vs_predicted.pdf"
TEST_OUTPUT = WORK_DIR / "test_set_with_prediction.xlsx"


# 环境因子列与目标变量列
FEATURE_COLUMNS = [
    "A", "B", "C", "D",
    "E", "F", "G", "H",
    "I", "J", "K", "L",
    "M", "N", "O", "P",
]
TARGET_COLUMN = "Ea"


def load_xy(path: Path):
    """读取 Excel，并拆分为特征矩阵 X 与目标变量 y。"""
    data = pd.read_excel(path)

    missing = [col for col in FEATURE_COLUMNS + [TARGET_COLUMN] if col not in data.columns]
    if missing:
        raise ValueError(f"{path.name} 缺少列: {missing}")

    X = data[FEATURE_COLUMNS].to_numpy()
    y = data[TARGET_COLUMN].to_numpy()
    return data, X, y


train_df, X_train, y_train = load_xy(TRAIN_FILE)
test_df, X_test, y_test = load_xy(TEST_FILE)


# 交叉验证只在训练集内部进行，测试集留到最后做独立评价
cv = KFold(n_splits=5, shuffle=True, random_state=2026)


def objective(trial):
    """Optuna 的目标函数：返回交叉验证平均 R²。"""
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
best_params.update({"random_state": 2026, "n_jobs": -1})
print("Best parameters:", best_params)


# 用最优参数在完整训练集上重新拟合
rf_model = RandomForestRegressor(**best_params)
rf_model.fit(X_train, y_train)


# 在独立测试集上检验模型表现
y_pred = rf_model.predict(X_test)

metrics = {
    "MAE": mean_absolute_error(y_test, y_pred),
    "MSE": mean_squared_error(y_test, y_pred),
    "RMSE": np.sqrt(mean_squared_error(y_test, y_pred)),
    "EVS": explained_variance_score(y_test, y_pred),
    "R2": r2_score(y_test, y_pred),
}

for name, value in metrics.items():
    print(f"{name}: {value:.4f}")


# 保存测试集预测结果，方便后续检查误差空间分布
test_df["Ea_pred"] = y_pred
test_df.to_excel(TEST_OUTPUT, index=False)


# 绘制真实值与预测值散点图
plt.rc("font", family="Times New Roman", size=14)
fig, ax = plt.subplots(figsize=(7, 7), dpi=150)

ax.scatter(y_test, y_pred, s=28, color="black", alpha=0.75)

axis_min = min(np.min(y_test), np.min(y_pred))
axis_max = max(np.max(y_test), np.max(y_pred))
ax.plot([axis_min, axis_max], [axis_min, axis_max], "--", color="royalblue", linewidth=1.5)

ax.set_xlim(axis_min, axis_max)
ax.set_ylim(axis_min, axis_max)
ax.set_aspect("equal", adjustable="box")
ax.set_xlabel("Observed Ea")
ax.set_ylabel("Predicted Ea")
ax.set_title("Random Forest: observed vs. predicted")

fig.tight_layout()
fig.savefig(FIGURE_FILE, bbox_inches="tight")
plt.close(fig)


# 保存模型，同时保存特征列名，避免外推时列顺序弄错
model_bundle = {
    "model": rf_model,
    "feature_columns": FEATURE_COLUMNS,
    "target_column": TARGET_COLUMN,
    "metrics": metrics,
}
joblib.dump(model_bundle, MODEL_FILE)

print(f"Model saved to: {MODEL_FILE}")
print(f"Test predictions saved to: {TEST_OUTPUT}")
print(f"Figure saved to: {FIGURE_FILE}")
```

这里我没有把 `random_state` 作为待搜索参数，而是固定为一个随机种子。随机种子本身并不是生态过程参数，把它固定下来更利于结果复现。真正需要调的是树的数量、树深、节点分裂条件等控制模型复杂度的参数。

## 4. 用训练好的模型预测新区域

当模型表现可以接受后，就可以把它应用到新的环境因子表上。这个表通常来自已经对齐分辨率和投影的栅格数据转换结果。表中可以包含经纬度、行列号、像元 ID 等辅助字段，但必须包含训练时使用的全部环境因子列。

```python
from pathlib import Path

import joblib
import pandas as pd


WORK_DIR = Path(r"E:\land")

MODEL_FILE = WORK_DIR / "random_forest_Ea.joblib"
PREDICT_FILE = WORK_DIR / "data.xlsx"
OUTPUT_FILE = WORK_DIR / "data_with_Ea_prediction.xlsx"


# 读取模型包
bundle = joblib.load(MODEL_FILE)
model = bundle["model"]
feature_columns = bundle["feature_columns"]


# 读取待预测数据
predict_df = pd.read_excel(PREDICT_FILE)

missing = [col for col in feature_columns if col not in predict_df.columns]
if missing:
    raise ValueError(f"待预测数据缺少特征列: {missing}")


# 保持训练时的特征列顺序
X_new = predict_df[feature_columns].to_numpy()
predict_df["Ea_pred"] = model.predict(X_new)


# 输出结果；原表中的经纬度、像元编号等辅助列会被保留
predict_df.to_excel(OUTPUT_FILE, index=False)

print(f"Prediction table saved to: {OUTPUT_FILE}")
```

如果后续要转回栅格，建议在 `data.xlsx` 中保留像元编号、行列号或经纬度信息。机器学习模型只负责给每一行环境因子生成预测值；至于如何还原为空间栅格，需要依赖这些空间索引字段。

## 5. 几个容易被忽略的检查

**第一，外推前要检查环境因子的取值范围。**
如果新区域中某些环境因子的取值远远超出训练样本范围，模型实际上是在“强外推”。随机森林对这种情况并不敏感地报错，但预测值可能并不可靠。

**第二，训练集和测试集不要只追求随机拆分。**
如果样点存在明显空间聚集，普通 K 折交叉验证可能高估模型表现。更严格的做法是按空间块或区域分组验证。

**第三，变量列名最好使用有意义的名称。**
`A` 到 `P` 在演示中很方便，但正式分析时建议改为真实变量名。这样后面做变量重要性分析、论文制图和结果解释时都会更清楚。

**第四，预测结果不是机制解释本身。**
随机森林很适合捕捉非线性关系，但它输出的是经验预测。若要解释生态机制，还需要结合变量重要性、偏依赖关系以及生态过程知识进行判断。

## 6. 小结

这个流程的核心并不复杂：用点位观测数据建立“环境因子—目标变量”的关系，再把这个关系应用到更大范围的环境因子表上。真正决定结果可信度的，往往不是代码有多长，而是样点代表性、环境因子质量、空间匹配精度以及验证方案是否合理。

代码只是把流程跑通；判断模型能不能用于科学问题，还需要回到数据和生态过程本身。
