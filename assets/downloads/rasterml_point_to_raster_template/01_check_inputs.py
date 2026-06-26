from pathlib import Path

import pandas as pd

try:
    import rasterio
except ImportError:
    rasterio = None

import config


def check_table():
    """检查样本表是否存在、字段是否完整、数值是否有缺失。"""
    if not config.DATA_FILE.exists():
        raise FileNotFoundError(f"找不到样本表：{config.DATA_FILE}")

    data = pd.read_csv(config.DATA_FILE)
    required_cols = [config.TARGET_COL] + list(config.FEATURES)

    if config.GROUP_COL is not None:
        required_cols.append(config.GROUP_COL)

    missing_cols = [col for col in required_cols if col not in data.columns]
    if missing_cols:
        raise ValueError(f"样本表缺少这些列：{missing_cols}")

    print("样本表检查通过")
    print(f"文件：{config.DATA_FILE}")
    print(f"行数：{len(data)}")
    print(f"目标变量：{config.TARGET_COL}")
    print(f"解释变量：{', '.join(config.FEATURES)}")

    na_count = data[required_cols].isna().sum()
    if na_count.sum() > 0:
        print("\n注意：以下字段存在缺失值，训练脚本会自动删除这些行：")
        print(na_count[na_count > 0])

    if config.GROUP_COL is not None:
        print(f"\n{config.GROUP_COL} 分组数量：")
        print(data[config.GROUP_COL].value_counts().sort_index())


def raster_paths_for_first_period():
    """生成第一个年份和月份对应的栅格路径，用来做快速检查。"""
    first_year = list(config.YEARS)[0]
    first_month = list(config.MONTHS)[0]
    ym = f"{first_year}{first_month:02d}"
    return [config.RASTER_INPUT_DIR / f"{prefix}_{ym}.tif" for prefix in config.RASTER_PREFIXES]


def check_first_rasters():
    """检查第一期输入栅格是否存在，并检查它们是否空间对齐。"""
    paths = raster_paths_for_first_period()
    missing = [path for path in paths if not path.exists()]

    if missing:
        print("\n以下第一期栅格不存在。若你暂时只想训练模型，可以先忽略这一项：")
        for path in missing:
            print(f"- {path}")
        return

    if rasterio is None:
        print("\n已找到第一期栅格，但未安装 rasterio，跳过空间一致性检查。")
        return

    with rasterio.open(paths[0]) as ref:
        ref_shape = ref.shape
        ref_crs = ref.crs
        ref_transform = ref.transform
        print("\n第一期栅格参考信息：")
        print(f"参考文件：{paths[0].name}")
        print(f"行列数：{ref_shape}")
        print(f"坐标系：{ref_crs}")

    for path in paths[1:]:
        with rasterio.open(path) as src:
            if src.shape != ref_shape:
                raise ValueError(f"{path.name} 的行列数不一致")
            if src.crs != ref_crs:
                raise ValueError(f"{path.name} 的坐标系不一致")
            if src.transform != ref_transform:
                raise ValueError(f"{path.name} 的像元位置不一致")

    print("第一期栅格空间一致性检查通过")


def main():
    print("开始检查输入文件...\n")
    check_table()
    check_first_rasters()
    print("\n检查完成")


if __name__ == "__main__":
    main()
