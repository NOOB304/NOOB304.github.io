from pathlib import Path

import pandas as pd


OUTPUT_DIR = Path("output")
LANDSCAPE_FILE = OUTPUT_DIR / "landscape_metrics.csv"


def main():
    if not LANDSCAPE_FILE.exists():
        raise FileNotFoundError("请先运行：python 02_compute_landscape_metrics.py")

    table = pd.read_csv(LANDSCAPE_FILE).sort_values("year")
    first = table.iloc[0]
    last = table.iloc[-1]

    rows = []
    for col in table.columns:
        if col == "year":
            continue
        rows.append(
            {
                "metric": col,
                "start_year": int(first["year"]),
                "end_year": int(last["year"]),
                "start_value": first[col],
                "end_value": last[col],
                "absolute_change": last[col] - first[col],
                "relative_change_percent": (last[col] - first[col]) / first[col] * 100
                if first[col] != 0
                else None,
            }
        )

    change = pd.DataFrame(rows)
    change.to_csv(OUTPUT_DIR / "landscape_metric_change.csv", index=False)
    print("景观指数变化表已保存：output/landscape_metric_change.csv")
    print(change)


if __name__ == "__main__":
    main()
