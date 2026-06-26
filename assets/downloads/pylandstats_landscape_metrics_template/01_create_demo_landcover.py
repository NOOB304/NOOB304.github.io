from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_origin


DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

YEARS = [2000, 2010, 2020]
WIDTH = 120
HEIGHT = 100
PIXEL_SIZE = 30


def smooth_random_landcover(seed, forest_shift=0.0, urban_shift=0.0):
    rng = np.random.default_rng(seed)
    base = rng.random((HEIGHT, WIDTH))

    landcover = np.zeros((HEIGHT, WIDTH), dtype="uint8")
    landcover[base < 0.32 + forest_shift] = 1  # forest
    landcover[(base >= 0.32 + forest_shift) & (base < 0.52)] = 2  # grass
    landcover[(base >= 0.52) & (base < 0.80 - urban_shift)] = 3  # cropland
    landcover[(base >= 0.80 - urban_shift) & (base < 0.94)] = 4  # built-up
    landcover[base >= 0.94] = 5  # water

    # 加入一个模拟城市扩张斑块。
    rr, cc = np.ogrid[:HEIGHT, :WIDTH]
    urban_patch = (rr - 70) ** 2 + (cc - 90) ** 2 < (10 + urban_shift * 40) ** 2
    landcover[urban_patch] = 4

    return landcover


def write_tif(array, path):
    transform = from_origin(104.0, 29.5, PIXEL_SIZE, PIXEL_SIZE)
    profile = {
        "driver": "GTiff",
        "height": array.shape[0],
        "width": array.shape[1],
        "count": 1,
        "dtype": "uint8",
        "crs": "EPSG:32648",
        "transform": transform,
        "nodata": 0,
        "compress": "lzw",
    }
    with rasterio.open(path, "w", **profile) as dst:
        dst.write(array, 1)


def main():
    settings = {
        2000: {"forest_shift": 0.00, "urban_shift": 0.00},
        2010: {"forest_shift": 0.04, "urban_shift": 0.04},
        2020: {"forest_shift": 0.08, "urban_shift": 0.08},
    }

    for i, year in enumerate(YEARS):
        arr = smooth_random_landcover(seed=42 + i, **settings[year])
        out_file = DATA_DIR / f"landcover_{year}.tif"
        write_tif(arr, out_file)
        print(f"已生成：{out_file}")


if __name__ == "__main__":
    main()
