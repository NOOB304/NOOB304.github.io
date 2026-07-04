from pathlib import Path

import joblib
import pandas as pd


# 用户配置
PROJECT_DIR = Path(r"D:\your_project")


DATA_DIR = PROJECT_DIR / "data"
MODEL_FILE = PROJECT_DIR / "output" / "model" / "random_forest_model.joblib"
OUTPUT_DIR = PROJECT_DIR / "output" / "tables"
PREDICT_FILE = DATA_DIR / "prediction_grid.xlsx"
OUTPUT_FILE = OUTPUT_DIR / "prediction_grid_with_prediction.xlsx"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

bundle = joblib.load(MODEL_FILE)
model = bundle["model"]
feature_columns = bundle["feature_columns"]
target_column = bundle["target_column"]

data = pd.read_excel(PREDICT_FILE)
missing = [
    column for column in feature_columns if column not in data.columns
]
if missing:
    raise ValueError(f"待预测数据缺少环境因子列 {missing}")

valid = data[feature_columns].notna().all(axis=1)
result = data.copy()
result[f"{target_column}_pred"] = pd.NA
result.loc[valid, f"{target_column}_pred"] = model.predict(
    data.loc[valid, feature_columns].to_numpy()
)
result.to_excel(OUTPUT_FILE, index=False)

print(f"总行数 {len(result)}")
print(f"成功预测 {int(valid.sum())}")
print(f"结果已保存到 {OUTPUT_FILE}")
