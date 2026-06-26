import json

import pandas as pd

import config


def main():
    rows = []

    for model_dir in sorted(config.SITE_DIR.glob("ML_*")):
        metrics_file = model_dir / "model_metrics.json"
        if not metrics_file.exists():
            continue

        with open(metrics_file, "r", encoding="utf-8") as f:
            metrics = json.load(f)

        rows.append(
            {
                "model": metrics.get("model", model_dir.name),
                "rmse_train": metrics["train"]["rmse"],
                "r2_train": metrics["train"]["r2"],
                "mae_train": metrics["train"]["mae"],
                "mape_train": metrics["train"]["mape"],
                "rmse_test": metrics["test"]["rmse"],
                "r2_test": metrics["test"]["r2"],
                "mae_test": metrics["test"]["mae"],
                "mape_test": metrics["test"]["mape"],
            }
        )

    if not rows:
        raise FileNotFoundError("没有找到任何 model_metrics.json，请先训练模型。")

    result = pd.DataFrame(rows).sort_values("r2_test", ascending=False)
    output_file = config.SITE_DIR / "model_comparison.csv"
    result.to_csv(output_file, index=False)

    print(result)
    print(f"\n模型对比表已保存：{output_file}")


if __name__ == "__main__":
    main()
