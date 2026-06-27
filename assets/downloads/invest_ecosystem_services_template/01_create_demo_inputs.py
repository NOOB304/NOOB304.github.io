"""生成可用于跑通 InVEST Carbon 流程的小型演示数据。"""

from pathlib import Path

import numpy as np
import pandas as pd
import rasterio
from rasterio.transform import from_origin

from config import CARBON_POOLS_PATH
from config import DATA_DIR
from config import LULC_ALTERNATE_PATH
from config import LULC_BASELINE_PATH


def write_lulc(path: Path, array: np.ndarray) -> None:
    """写出单波段、整数型、带投影的土地利用 GeoTIFF。"""
    profile = {
        "driver": "GTiff",
        "height": array.shape[0],
        "width": array.shape[1],
        "count": 1,
        "dtype": "uint8",
        "crs": "EPSG:32650",
        "transform": from_origin(500_000, 3_500_000, 100, 100),
        "nodata": 0,
        "compress": "lzw",
    }
    with rasterio.open(path, "w", **profile) as dst:
        dst.write(array.astype("uint8"), 1)
        dst.set_band_description(1, "land_use_land_cover_code")


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # 1=林地，2=灌丛，3=草地，4=耕地，5=建设用地。
    baseline = np.array(
        [
            [1, 1, 1, 2, 2, 3, 3, 4, 4, 4],
            [1, 1, 2, 2, 2, 3, 3, 4, 4, 4],
            [1, 1, 2, 2, 3, 3, 3, 4, 4, 5],
            [1, 2, 2, 3, 3, 3, 4, 4, 5, 5],
            [2, 2, 3, 3, 3, 4, 4, 4, 5, 5],
            [2, 3, 3, 3, 4, 4, 4, 5, 5, 5],
            [3, 3, 3, 4, 4, 4, 5, 5, 5, 5],
            [3, 3, 4, 4, 4, 5, 5, 5, 5, 5],
            [3, 4, 4, 4, 5, 5, 5, 5, 5, 5],
            [4, 4, 4, 5, 5, 5, 5, 5, 5, 5],
        ],
        dtype=np.uint8,
    )

    alternate = baseline.copy()

    # 演示两种相反变化：部分耕地恢复为林草地，同时有少量建设用地扩张。
    alternate[0:3, 7:9] = 3
    alternate[2:5, 6:8] = 1
    alternate[6:9, 2:4] = 2
    alternate[5:8, 6:9] = 5

    write_lulc(LULC_BASELINE_PATH, baseline)
    write_lulc(LULC_ALTERNATE_PATH, alternate)

    # 以下数值是教学用假设，不代表任何真实地区的碳密度。
    carbon_pools = pd.DataFrame(
        [
            (1, "forest", 120.0, 30.0, 80.0, 10.0),
            (2, "shrub", 35.0, 12.0, 65.0, 4.0),
            (3, "grassland", 8.0, 5.0, 55.0, 2.0),
            (4, "cropland", 5.0, 2.0, 45.0, 1.0),
            (5, "built_up", 1.0, 0.5, 20.0, 0.0),
        ],
        columns=[
            "lucode",
            "lulc_name",
            "c_above",
            "c_below",
            "c_soil",
            "c_dead",
        ],
    )
    carbon_pools.to_csv(CARBON_POOLS_PATH, index=False, encoding="utf-8")

    print("演示输入已生成：")
    print(f"  基准土地利用：{LULC_BASELINE_PATH}")
    print(f"  替代土地利用：{LULC_ALTERNATE_PATH}")
    print(f"  碳库参数表：  {CARBON_POOLS_PATH}")
    print("注意：所有碳库数值均为教学用假设。")


if __name__ == "__main__":
    main()

