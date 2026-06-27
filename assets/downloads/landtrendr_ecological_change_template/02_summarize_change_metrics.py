"""按年份汇总 LandTrendr 扰动和恢复 GeoTIFF。"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd
import rasterio


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DISTURBANCE = (
    BASE_DIR / "data" / "demo_landtrendr_disturbance.tif"
)
DEFAULT_RECOVERY = BASE_DIR / "data" / "demo_landtrendr_recovery.tif"
DEFAULT_OUTPUT_DIR = BASE_DIR / "output"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="汇总 LandTrendr 变化年份、面积、幅度和持续时间。"
    )
    parser.add_argument(
        "--disturbance",
        type=Path,
        default=DEFAULT_DISTURBANCE,
        help="扰动指标多波段 GeoTIFF。",
    )
    parser.add_argument(
        "--recovery",
        type=Path,
        default=DEFAULT_RECOVERY,
        help="恢复指标多波段 GeoTIFF。",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="结果输出文件夹。",
    )
    return parser.parse_args()


def read_named_bands(
    path: Path,
    prefix: str,
) -> tuple[dict[str, np.ndarray], float]:
    if not path.exists():
        raise FileNotFoundError(f"找不到文件：{path}")

    required = [
        f"{prefix}_yod",
        f"{prefix}_end_year",
        f"{prefix}_pre_nbr",
        f"{prefix}_post_nbr",
        f"{prefix}_mag",
        f"{prefix}_dur",
        f"{prefix}_rate",
        f"{prefix}_dsnr",
    ]

    with rasterio.open(path) as src:
        if src.crs is None or not src.crs.is_projected:
            raise ValueError(
                f"{path.name} 必须使用投影坐标系，才能按像元面积统计。"
            )
        try:
            _, unit_factor = src.crs.linear_units_factor
        except (AttributeError, TypeError):
            unit_factor = None
        if unit_factor is None or not np.isclose(unit_factor, 1.0):
            raise ValueError(f"{path.name} 的投影线性单位必须为米。")

        descriptions = list(src.descriptions)
        missing = [name for name in required if name not in descriptions]
        if missing:
            raise ValueError(
                f"{path.name} 缺少波段描述：" + ", ".join(missing)
            )

        arrays = {}
        for name in required:
            band_index = descriptions.index(name) + 1
            arrays[name] = src.read([band_index]).astype(float)[0]

        nodata = src.nodata
        if nodata is not None:
            for name in arrays:
                arrays[name][arrays[name] == nodata] = np.nan

        pixel_area_m2 = abs(
            src.transform.a * src.transform.e
            - src.transform.b * src.transform.d
        )

    return arrays, pixel_area_m2 / 10_000.0


def summarize(
    path: Path,
    prefix: str,
    change_type: str,
) -> tuple[pd.DataFrame, dict]:
    arrays, pixel_area_ha = read_named_bands(path, prefix)

    yod = arrays[f"{prefix}_yod"]
    valid = np.isfinite(yod) & (yod > 0)
    rounded_yod = np.zeros(yod.shape, dtype=int)
    rounded_yod[valid] = np.rint(yod[valid]).astype(int)
    years = np.unique(rounded_yod[valid])

    rows = []
    for year in sorted(years.tolist()):
        year_mask = valid & (rounded_yod == year)
        rows.append(
            {
                "change_type": change_type,
                "year": year,
                "event_pixels": int(year_mask.sum()),
                "area_ha": float(year_mask.sum() * pixel_area_ha),
                "mean_magnitude": float(
                    np.nanmean(arrays[f"{prefix}_mag"][year_mask])
                ),
                "median_duration_years": float(
                    np.nanmedian(arrays[f"{prefix}_dur"][year_mask])
                ),
                "mean_rate_per_year": float(
                    np.nanmean(arrays[f"{prefix}_rate"][year_mask])
                ),
                "mean_dsnr": float(
                    np.nanmean(arrays[f"{prefix}_dsnr"][year_mask])
                ),
                "mean_pre_nbr": float(
                    np.nanmean(arrays[f"{prefix}_pre_nbr"][year_mask])
                ),
                "mean_post_nbr": float(
                    np.nanmean(arrays[f"{prefix}_post_nbr"][year_mask])
                ),
            }
        )

    table = pd.DataFrame(rows)
    if table.empty:
        overall = {
            "change_type": change_type,
            "event_pixels": 0,
            "total_area_ha": 0.0,
            "earliest_year": np.nan,
            "latest_year": np.nan,
            "mean_magnitude": np.nan,
            "mean_duration_years": np.nan,
            "mean_dsnr": np.nan,
        }
    else:
        overall = {
            "change_type": change_type,
            "event_pixels": int(valid.sum()),
            "total_area_ha": float(valid.sum() * pixel_area_ha),
            "earliest_year": int(years.min()),
            "latest_year": int(years.max()),
            "mean_magnitude": float(
                np.nanmean(arrays[f"{prefix}_mag"][valid])
            ),
            "mean_duration_years": float(
                np.nanmean(arrays[f"{prefix}_dur"][valid])
            ),
            "mean_dsnr": float(
                np.nanmean(arrays[f"{prefix}_dsnr"][valid])
            ),
        }

    return table, overall


def main() -> None:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    disturbance_table, disturbance_overall = summarize(
        args.disturbance,
        "dist",
        "disturbance",
    )
    recovery_table, recovery_overall = summarize(
        args.recovery,
        "rec",
        "recovery",
    )

    disturbance_csv = args.output_dir / "disturbance_by_year.csv"
    recovery_csv = args.output_dir / "recovery_by_year.csv"
    overall_csv = args.output_dir / "overall_summary.csv"

    disturbance_table.to_csv(
        disturbance_csv,
        index=False,
        encoding="utf-8-sig",
    )
    recovery_table.to_csv(
        recovery_csv,
        index=False,
        encoding="utf-8-sig",
    )
    pd.DataFrame(
        [disturbance_overall, recovery_overall]
    ).to_csv(overall_csv, index=False, encoding="utf-8-sig")

    print("年度扰动统计：")
    print(disturbance_table.to_string(index=False))
    print("\n年度恢复统计：")
    print(recovery_table.to_string(index=False))
    print("\n输出文件：")
    print(f"  {disturbance_csv}")
    print(f"  {recovery_csv}")
    print(f"  {overall_csv}")


if __name__ == "__main__":
    main()
