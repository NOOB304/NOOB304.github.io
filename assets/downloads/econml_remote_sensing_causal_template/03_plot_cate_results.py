from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns


RESULT_FILE = Path("output/cate_results.csv")
OUTPUT_DIR = Path("output")
OUTPUT_DIR.mkdir(exist_ok=True)


def main():
    if not RESULT_FILE.exists():
        raise FileNotFoundError("请先运行：python 02_fit_causal_forest.py")

    data = pd.read_csv(RESULT_FILE)
    sns.set_theme(style="whitegrid")

    plt.figure(figsize=(7, 4))
    sns.histplot(data["cate_estimated"], bins=40, kde=True)
    plt.xlabel("Estimated CATE")
    plt.ylabel("Pixel-year count")
    plt.title("Distribution of heterogeneous treatment effects")
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "cate_distribution.png", dpi=300)
    plt.close()

    data["human_pressure_group"] = pd.qcut(
        data["human_pressure"],
        q=4,
        labels=["low", "medium-low", "medium-high", "high"],
    )

    plt.figure(figsize=(7, 4))
    sns.boxplot(data=data, x="human_pressure_group", y="cate_estimated")
    plt.xlabel("Human pressure group")
    plt.ylabel("Estimated CATE")
    plt.title("CATE heterogeneity along human pressure gradient")
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "cate_by_human_pressure.png", dpi=300)
    plt.close()

    print("图表已保存到 output 文件夹")


if __name__ == "__main__":
    main()
