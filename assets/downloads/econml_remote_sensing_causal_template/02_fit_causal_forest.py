import json
from pathlib import Path

import numpy as np
import pandas as pd
from econml.dml import CausalForestDML
from sklearn.ensemble import RandomForestRegressor


DATA_FILE = Path("data/demo_pixel_panel.csv")
OUTPUT_DIR = Path("output")
OUTPUT_DIR.mkdir(exist_ok=True)

OUTCOME = "carbon_sink_change"
TREATMENT = "restoration_intensity"

# X 用来刻画因果效应异质性，也就是回答“哪里效应更强”
EFFECT_MODIFIERS = [
    "karst_index",
    "baseline_ndvi",
    "human_pressure",
    "elevation",
    "slope",
]

# W 用来控制混杂，也就是让处理变量和结果变量的比较更公平
CONFOUNDERS = [
    "precip_anomaly",
    "temp_anomaly",
    "baseline_ndvi",
    "human_pressure",
    "karst_index",
    "elevation",
    "slope",
    "year",
]


def main():
    if not DATA_FILE.exists():
        raise FileNotFoundError("请先运行：python 01_generate_demo_data.py")

    data = pd.read_csv(DATA_FILE)
    y = data[OUTCOME].to_numpy()
    t = data[TREATMENT].to_numpy()
    x = data[EFFECT_MODIFIERS]
    w = data[CONFOUNDERS]

    model_y = RandomForestRegressor(
        n_estimators=200,
        min_samples_leaf=20,
        random_state=42,
        n_jobs=-1,
    )
    model_t = RandomForestRegressor(
        n_estimators=200,
        min_samples_leaf=20,
        random_state=42,
        n_jobs=-1,
    )

    estimator = CausalForestDML(
        model_y=model_y,
        model_t=model_t,
        n_estimators=600,
        min_samples_leaf=30,
        max_depth=None,
        discrete_treatment=False,
        cv=3,
        random_state=42,
    )

    estimator.fit(Y=y, T=t, X=x, W=w)
    cate = estimator.effect(x)
    ate = float(np.mean(cate))

    result = data[
        [
            "pixel_id",
            "year",
            "lon",
            "lat",
            OUTCOME,
            TREATMENT,
            "true_effect_demo_only",
        ]
        + EFFECT_MODIFIERS
    ].copy()
    result["cate_estimated"] = cate
    result.to_csv(OUTPUT_DIR / "cate_results.csv", index=False)

    summary = {
        "outcome": OUTCOME,
        "treatment": TREATMENT,
        "n_samples": int(len(data)),
        "ate_estimated": ate,
        "cate_mean": float(np.mean(cate)),
        "cate_std": float(np.std(cate)),
        "cate_min": float(np.min(cate)),
        "cate_max": float(np.max(cate)),
    }
    with open(OUTPUT_DIR / "summary_metrics.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print("因果森林估计完成")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
