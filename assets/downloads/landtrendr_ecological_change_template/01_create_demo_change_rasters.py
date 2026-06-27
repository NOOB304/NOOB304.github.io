"""生成模拟 LandTrendr 多波段结果，供本地统计脚本练习。"""

from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_origin


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

DISTURBANCE_PATH = DATA_DIR / "demo_landtrendr_disturbance.tif"
RECOVERY_PATH = DATA_DIR / "demo_landtrendr_recovery.tif"

NODATA = -9999.0
HEIGHT = 60
WIDTH = 60


def empty_layers() -> dict[str, np.ndarray]:
    return {
        "yod": np.full((HEIGHT, WIDTH), NODATA, dtype=np.float32),
        "end_year": np.full((HEIGHT, WIDTH), NODATA, dtype=np.float32),
        "pre_nbr": np.full((HEIGHT, WIDTH), NODATA, dtype=np.float32),
        "post_nbr": np.full((HEIGHT, WIDTH), NODATA, dtype=np.float32),
        "mag": np.full((HEIGHT, WIDTH), NODATA, dtype=np.float32),
        "dur": np.full((HEIGHT, WIDTH), NODATA, dtype=np.float32),
        "rate": np.full((HEIGHT, WIDTH), NODATA, dtype=np.float32),
        "dsnr": np.full((HEIGHT, WIDTH), NODATA, dtype=np.float32),
    }


def assign_patch(
    layers: dict[str, np.ndarray],
    rows: slice,
    cols: slice,
    year: int,
    duration: int,
    pre_nbr: float,
    magnitude: float,
    dsnr: float,
    change_type: str,
) -> None:
    if change_type == "disturbance":
        post_nbr = pre_nbr - magnitude
    elif change_type == "recovery":
        post_nbr = pre_nbr + magnitude
    else:
        raise ValueError("change_type 必须是 disturbance 或 recovery")

    layers["yod"][rows, cols] = year
    layers["end_year"][rows, cols] = year + duration - 1
    layers["pre_nbr"][rows, cols] = pre_nbr
    layers["post_nbr"][rows, cols] = post_nbr
    layers["mag"][rows, cols] = magnitude
    layers["dur"][rows, cols] = duration
    layers["rate"][rows, cols] = magnitude / duration
    layers["dsnr"][rows, cols] = dsnr


def write_metrics(
    path: Path,
    layers: dict[str, np.ndarray],
    prefix: str,
) -> None:
    names = [
        f"{prefix}_yod",
        f"{prefix}_end_year",
        f"{prefix}_pre_nbr",
        f"{prefix}_post_nbr",
        f"{prefix}_mag",
        f"{prefix}_dur",
        f"{prefix}_rate",
        f"{prefix}_dsnr",
    ]

    profile = {
        "driver": "GTiff",
        "height": HEIGHT,
        "width": WIDTH,
        "count": len(names),
        "dtype": "float32",
        "crs": "EPSG:32649",
        "transform": from_origin(500_000, 3_100_000, 30, 30),
        "nodata": NODATA,
        "compress": "lzw",
    }

    arrays = [
        layers["yod"],
        layers["end_year"],
        layers["pre_nbr"],
        layers["post_nbr"],
        layers["mag"],
        layers["dur"],
        layers["rate"],
        layers["dsnr"],
    ]

    with rasterio.open(path, "w", **profile) as dst:
        for band_index, (name, array) in enumerate(
            zip(names, arrays),
            start=1,
        ):
            dst.write(array, band_index)
            dst.set_band_description(band_index, name)


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    disturbance = empty_layers()
    assign_patch(
        disturbance,
        slice(5, 20),
        slice(8, 25),
        year=1998,
        duration=2,
        pre_nbr=0.72,
        magnitude=0.28,
        dsnr=4.2,
        change_type="disturbance",
    )
    assign_patch(
        disturbance,
        slice(25, 43),
        slice(30, 52),
        year=2009,
        duration=1,
        pre_nbr=0.66,
        magnitude=0.22,
        dsnr=3.1,
        change_type="disturbance",
    )
    assign_patch(
        disturbance,
        slice(45, 56),
        slice(6, 28),
        year=2019,
        duration=3,
        pre_nbr=0.61,
        magnitude=0.18,
        dsnr=2.5,
        change_type="disturbance",
    )

    recovery = empty_layers()
    assign_patch(
        recovery,
        slice(7, 18),
        slice(10, 23),
        year=2002,
        duration=6,
        pre_nbr=0.40,
        magnitude=0.24,
        dsnr=3.3,
        change_type="recovery",
    )
    assign_patch(
        recovery,
        slice(27, 41),
        slice(32, 50),
        year=2012,
        duration=5,
        pre_nbr=0.43,
        magnitude=0.20,
        dsnr=2.8,
        change_type="recovery",
    )
    assign_patch(
        recovery,
        slice(46, 55),
        slice(8, 26),
        year=2022,
        duration=3,
        pre_nbr=0.46,
        magnitude=0.13,
        dsnr=2.2,
        change_type="recovery",
    )

    write_metrics(DISTURBANCE_PATH, disturbance, "dist")
    write_metrics(RECOVERY_PATH, recovery, "rec")

    print("模拟结果已生成：")
    print(f"  {DISTURBANCE_PATH}")
    print(f"  {RECOVERY_PATH}")
    print("这些数据只用于练习后处理，不代表真实遥感变化。")


if __name__ == "__main__":
    main()
