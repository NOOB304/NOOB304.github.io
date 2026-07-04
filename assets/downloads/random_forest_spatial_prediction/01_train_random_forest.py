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


# 用户配置
PROJECT_DIR = Path(r"D:\your_project")
FEATURE_COLUMNS = [
    "A", "B", "C", "D",
    "E", "F", "G", "H",
    "I", "J", "K", "L",
    "M", "N", "O", "P",
]
TARGET_COLUMN = "Ea"
N_TRIALS = 80
RANDOM_SEED = 2026


DATA_DIR = PROJECT_DIR / "data"
OUTPUT_DIR = PROJECT_DIR / "output"
MODEL_DIR = OUTPUT_DIR / "model"
FIGURE_DIR = OUTPUT_DIR / "figures"
TABLE_DIR = OUTPUT_DIR / "tables"

TRAIN_FILE = DATA_DIR / "training_set.xlsx"
TEST_FILE = DATA_DIR / "test_set.xlsx"
MODEL_FILE = MODEL_DIR / "random_forest_model.joblib"
FIGURE_FILE = FIGURE_DIR / "observed_vs_predicted.pdf"
TEST_OUTPUT_FILE = TABLE_DIR / "test_set_with_prediction.xlsx"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
FIGURE_DIR.mkdir(parents=True, exist_ok=True)
TABLE_DIR.mkdir(parents=True, exist_ok=True)


def read_model_table(path: Path):
    data = pd.read_excel(path)
    required = FEATURE_COLUMNS + [TARGET_COLUMN]
    missing = [column for column in required if column not in data.columns]
    if missing:
        raise ValueError(f"{path.name}缺少必要列 {missing}")
    data = data.dropna(subset=required).copy()
    return (
        data,
        data[FEATURE_COLUMNS].to_numpy(),
        data[TARGET_COLUMN].to_numpy(),
    )


train_frame, x_train, y_train = read_model_table(TRAIN_FILE)
test_frame, x_test, y_test = read_model_table(TEST_FILE)
cv = KFold(n_splits=5, shuffle=True, random_state=RANDOM_SEED)


def objective(trial):
    params = {
        "n_estimators": trial.suggest_int("n_estimators", 200, 1000),
        "max_depth": trial.suggest_int("max_depth", 3, 30),
        "min_samples_split": trial.suggest_int(
            "min_samples_split", 2, 10
        ),
        "min_samples_leaf": trial.suggest_int("min_samples_leaf", 1, 5),
        "max_features": trial.suggest_float("max_features", 0.4, 1.0),
        "random_state": RANDOM_SEED,
        "n_jobs": -1,
    }
    scores = []
    for train_index, valid_index in cv.split(x_train):
        model = RandomForestRegressor(**params)
        model.fit(x_train[train_index], y_train[train_index])
        prediction = model.predict(x_train[valid_index])
        scores.append(r2_score(y_train[valid_index], prediction))
    return float(np.mean(scores))


study = optuna.create_study(direction="maximize")
study.optimize(objective, n_trials=N_TRIALS)
best_params = {
    **study.best_params,
    "random_state": RANDOM_SEED,
    "n_jobs": -1,
}

model = RandomForestRegressor(**best_params)
model.fit(x_train, y_train)
prediction = model.predict(x_test)

metrics = {
    "MAE": float(mean_absolute_error(y_test, prediction)),
    "MSE": float(mean_squared_error(y_test, prediction)),
    "RMSE": float(np.sqrt(mean_squared_error(y_test, prediction))),
    "EVS": float(explained_variance_score(y_test, prediction)),
    "R2": float(r2_score(y_test, prediction)),
}

test_frame[f"{TARGET_COLUMN}_pred"] = prediction
test_frame.to_excel(TEST_OUTPUT_FILE, index=False)

figure, axis = plt.subplots(figsize=(7, 7), dpi=150)
axis.scatter(y_test, prediction, s=28, color="black", alpha=0.75)
axis_min = min(float(np.min(y_test)), float(np.min(prediction)))
axis_max = max(float(np.max(y_test)), float(np.max(prediction)))
axis.plot(
    [axis_min, axis_max],
    [axis_min, axis_max],
    linestyle="--",
    color="royalblue",
)
axis.set_xlabel(f"Observed {TARGET_COLUMN}")
axis.set_ylabel(f"Predicted {TARGET_COLUMN}")
axis.set_aspect("equal", adjustable="box")
figure.tight_layout()
figure.savefig(FIGURE_FILE, bbox_inches="tight")
plt.close(figure)

joblib.dump(
    {
        "model": model,
        "feature_columns": FEATURE_COLUMNS,
        "target_column": TARGET_COLUMN,
        "best_params": best_params,
        "metrics": metrics,
    },
    MODEL_FILE,
)

print(metrics)
print(f"模型已保存到 {MODEL_FILE}")
