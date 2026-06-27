"""在运行 InVEST 前检查栅格和碳库表是否匹配。"""

from pathlib import Path

import numpy as np
import pandas as pd
import rasterio

from config import CALCULATE_SEQUESTRATION
from config import CARBON_POOLS_PATH
from config import LULC_ALTERNATE_PATH
from config import LULC_BASELINE_PATH


REQUIRED_COLUMNS = {
    "lucode",
    "c_above",
    "c_below",
    "c_soil",
    "c_dead",
}


def check_exists(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(
            f"缺少文件：{path}\n"
            "如果正在使用演示数据，请先运行 python 01_create_demo_inputs.py"
        )


def raster_codes(path: Path) -> tuple[set[int], dict]:
    with rasterio.open(path) as src:
        if src.count != 1:
            raise ValueError(f"{path.name} 必须是单波段栅格，当前波段数为 {src.count}")
        if src.crs is None or not src.crs.is_projected:
            raise ValueError(f"{path.name} 必须使用投影坐标系，且线性单位应为米")
        try:
            _, unit_factor = src.crs.linear_units_factor
        except (AttributeError, TypeError):
            unit_factor = None
        if unit_factor is None or not np.isclose(unit_factor, 1.0):
            raise ValueError(f"{path.name} 的投影坐标线性单位必须为米")

        data = src.read(1)
        valid = np.ones(data.shape, dtype=bool)
        if src.nodata is not None:
            valid &= data != src.nodata
        if np.issubdtype(data.dtype, np.floating):
            valid &= np.isfinite(data)

        values = data[valid]
        if values.size == 0:
            raise ValueError(f"{path.name} 没有有效像元")
        if not np.allclose(values, np.round(values)):
            raise ValueError(f"{path.name} 的土地利用编码必须是整数")

        profile = {
            "crs": src.crs,
            "transform": src.transform,
            "width": src.width,
            "height": src.height,
            "res": src.res,
        }
        return set(np.unique(values).astype(int).tolist()), profile


def compare_grids(base_profile: dict, alt_profile: dict) -> None:
    fields = ("crs", "transform", "width", "height", "res")
    differences = [
        field for field in fields if base_profile[field] != alt_profile[field]
    ]
    if differences:
        raise ValueError(
            "两期土地利用栅格没有严格对齐，差异字段："
            + ", ".join(differences)
        )


def main() -> None:
    check_exists(LULC_BASELINE_PATH)
    check_exists(CARBON_POOLS_PATH)
    if CALCULATE_SEQUESTRATION:
        check_exists(LULC_ALTERNATE_PATH)

    base_codes, base_profile = raster_codes(LULC_BASELINE_PATH)
    all_codes = set(base_codes)

    if CALCULATE_SEQUESTRATION:
        alt_codes, alt_profile = raster_codes(LULC_ALTERNATE_PATH)
        compare_grids(base_profile, alt_profile)
        all_codes |= alt_codes
    else:
        alt_codes = set()

    table = pd.read_csv(CARBON_POOLS_PATH)
    table.columns = [column.strip().lower() for column in table.columns]
    missing_columns = REQUIRED_COLUMNS - set(table.columns)
    if missing_columns:
        raise ValueError(
            "碳库表缺少字段：" + ", ".join(sorted(missing_columns))
        )

    if table["lucode"].duplicated().any():
        duplicates = table.loc[table["lucode"].duplicated(), "lucode"].tolist()
        raise ValueError(f"碳库表的 lucode 不能重复：{duplicates}")
    if not np.allclose(table["lucode"], np.round(table["lucode"])):
        raise ValueError("碳库表的 lucode 必须是整数")

    pool_columns = ["c_above", "c_below", "c_soil", "c_dead"]
    if table[pool_columns].isna().any().any():
        raise ValueError("四个碳库字段不能有空值")
    if (table[pool_columns] < 0).any().any():
        raise ValueError("碳库密度不能为负数")

    table_codes = set(table["lucode"].astype(int).tolist())
    missing_codes = all_codes - table_codes
    if missing_codes:
        raise ValueError(
            "以下土地利用编码没有对应的碳库参数："
            + ", ".join(map(str, sorted(missing_codes)))
        )

    print("输入检查通过。")
    print(f"  基准情景编码：{sorted(base_codes)}")
    if CALCULATE_SEQUESTRATION:
        print(f"  替代情景编码：{sorted(alt_codes)}")
    print(f"  栅格大小：{base_profile['width']} × {base_profile['height']}")
    print(f"  像元大小：{base_profile['res']}")
    print(f"  坐标系：{base_profile['crs']}")
    print("  碳库单位应为 t C/ha；请在正式研究中核查参数来源。")


if __name__ == "__main__":
    main()
