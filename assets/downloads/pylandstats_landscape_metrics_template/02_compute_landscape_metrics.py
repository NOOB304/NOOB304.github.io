from pathlib import Path

import pandas as pd
import pylandstats as pls


DATA_DIR = Path("data")
OUTPUT_DIR = Path("output")
OUTPUT_DIR.mkdir(exist_ok=True)

YEARS = [2000, 2010, 2020]


def main():
    class_rows = []
    landscape_rows = []

    for year in YEARS:
        raster_file = DATA_DIR / f"landcover_{year}.tif"
        if not raster_file.exists():
            raise FileNotFoundError(f"找不到土地利用栅格：{raster_file}")

        landscape = pls.Landscape(str(raster_file))

        class_metrics = landscape.compute_class_metrics_df(
            metrics=[
                "total_area",
                "proportion_of_landscape",
                "number_of_patches",
                "patch_density",
                "edge_density",
                "largest_patch_index",
            ]
        ).reset_index()
        class_metrics["year"] = year
        class_rows.append(class_metrics)

        landscape_metrics = landscape.compute_landscape_metrics_df(
            metrics=[
                "number_of_patches",
                "patch_density",
                "edge_density",
                "largest_patch_index",
                "shannon_diversity_index",
            ]
        ).reset_index(drop=True)
        landscape_metrics["year"] = year
        landscape_rows.append(landscape_metrics)

    class_table = pd.concat(class_rows, ignore_index=True)
    landscape_table = pd.concat(landscape_rows, ignore_index=True)

    class_table.to_csv(OUTPUT_DIR / "class_metrics.csv", index=False)
    landscape_table.to_csv(OUTPUT_DIR / "landscape_metrics.csv", index=False)

    print("class_metrics.csv 和 landscape_metrics.csv 已保存到 output 文件夹")


if __name__ == "__main__":
    main()
