"""汇总 InVEST Carbon 栅格，避免把密度值直接当作区域总量。"""

from pathlib import Path

import numpy as np
import pandas as pd
import rasterio

from config import ALTERNATE_YEAR
from config import BASELINE_YEAR
from config import CALCULATE_SEQUESTRATION
from config import RESULTS_SUFFIX
from config import WORKSPACE_DIR


def output_path(stem: str) -> Path:
    suffix = f"_{RESULTS_SUFFIX}" if RESULTS_SUFFIX else ""
    return WORKSPACE_DIR / f"{stem}{suffix}.tif"


def summarize_raster(path: Path, label: str) -> dict:
    if not path.exists():
        raise FileNotFoundError(
            f"找不到输出：{path}\n请先运行 python 03_run_invest_carbon.py"
        )

    with rasterio.open(path) as src:
        data = src.read(1, masked=True)
        values = data.compressed().astype(float)
        if values.size == 0:
            raise ValueError(f"{path.name} 没有有效像元")

        pixel_area_m2 = abs(
            src.transform.a * src.transform.e
            - src.transform.b * src.transform.d
        )
        pixel_area_ha = pixel_area_m2 / 10_000.0

    return {
        "output": label,
        "filename": path.name,
        "valid_pixels": int(values.size),
        "area_ha": float(values.size * pixel_area_ha),
        "mean_tC_per_ha": float(values.mean()),
        "min_tC_per_ha": float(values.min()),
        "max_tC_per_ha": float(values.max()),
        "total_tC": float(values.sum() * pixel_area_ha),
        "positive_area_ha": float((values > 0).sum() * pixel_area_ha),
        "negative_area_ha": float((values < 0).sum() * pixel_area_ha),
    }


def main() -> None:
    rows = [
        summarize_raster(
            output_path("c_storage_bas"),
            "baseline_carbon_storage",
        )
    ]

    if CALCULATE_SEQUESTRATION:
        rows.append(
            summarize_raster(
                output_path("c_storage_alt"),
                "alternate_carbon_storage",
            )
        )
        change = summarize_raster(
            output_path("c_change_bas_alt"),
            "carbon_storage_change",
        )
        years = ALTERNATE_YEAR - BASELINE_YEAR
        if years <= 0:
            raise ValueError("ALTERNATE_YEAR 必须晚于 BASELINE_YEAR")
        change["mean_annual_change_tC_per_year"] = (
            change["total_tC"] / years
        )
        rows.append(change)

    table = pd.DataFrame(rows)
    output_csv = WORKSPACE_DIR / "carbon_output_summary.csv"
    table.to_csv(output_csv, index=False, encoding="utf-8-sig")

    columns = [
        "output",
        "mean_tC_per_ha",
        "total_tC",
        "positive_area_ha",
        "negative_area_ha",
    ]
    print(table[columns].to_string(index=False))
    print(f"\n汇总表已保存：{output_csv}")
    if CALCULATE_SEQUESTRATION:
        print(
            "提示：平均年变化量只是两个土地利用情景之间的总变化除以年数，"
            "不代表模型模拟了年度碳循环过程。"
        )


if __name__ == "__main__":
    main()
