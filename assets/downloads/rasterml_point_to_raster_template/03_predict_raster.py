import argparse

import joblib
import numpy as np
import pandas as pd
import rasterio

import config


MODEL_DIR_NAMES = {
    "rf": "ML_RF",
    "xgb": "ML_XGB",
    "lgb": "ML_LGB",
    "cat": "ML_CAT",
    "svm": "ML_SVM",
    "gpr": "ML_GPR",
}


def build_raster_paths(year, month):
    """生成某一年某一月的输入栅格路径。"""
    ym = f"{year}{month:02d}"
    return [
        config.RASTER_INPUT_DIR / f"{prefix}_{ym}.tif"
        for prefix in config.RASTER_PREFIXES
    ]


def read_aligned_rasters(paths):
    """读取已经对齐的栅格，并检查空间信息是否一致。"""
    arrays = []
    nodata_values = []

    with rasterio.open(paths[0]) as ref:
        profile = ref.profile.copy()
        ref_shape = ref.shape
        ref_crs = ref.crs
        ref_transform = ref.transform
        arrays.append(ref.read(1).astype("float32"))
        nodata_values.append(ref.nodata)

    for path in paths[1:]:
        with rasterio.open(path) as src:
            if src.shape != ref_shape:
                raise ValueError(f"{path.name} 的行列数和第一个栅格不一致")
            if src.crs != ref_crs:
                raise ValueError(f"{path.name} 的坐标系和第一个栅格不一致")
            if src.transform != ref_transform:
                raise ValueError(f"{path.name} 的像元位置和第一个栅格不一致")

            arrays.append(src.read(1).astype("float32"))
            nodata_values.append(src.nodata)

    return arrays, profile, nodata_values


def predict_one_period(model, output_dir, year, month):
    """预测单个时间片，并写出 GeoTIFF。"""
    paths = build_raster_paths(year, month)

    missing = [path for path in paths if not path.exists()]
    if missing:
        raise FileNotFoundError(f"缺少输入栅格：{missing}")

    arrays, profile, nodata_values = read_aligned_rasters(paths)
    stack = np.stack(arrays, axis=-1)
    rows, cols, n_features = stack.shape
    flat = stack.reshape(-1, n_features)

    valid = np.isfinite(flat).all(axis=1)
    for i, nodata in enumerate(nodata_values):
        if nodata is not None:
            valid &= flat[:, i] != nodata

    pred_flat = np.full(flat.shape[0], config.OUT_NODATA, dtype="float32")

    if valid.sum() > 0:
        X_pred = pd.DataFrame(flat[valid], columns=config.FEATURES)
        pred_flat[valid] = model.predict(X_pred).astype("float32")

    pred = pred_flat.reshape(rows, cols)

    profile.update(
        driver="GTiff",
        count=1,
        dtype="float32",
        nodata=config.OUT_NODATA,
        compress="lzw",
    )

    output_file = output_dir / f"{config.OUTPUT_PREFIX}_{year}_{month:02d}.tif"
    with rasterio.open(output_file, "w", **profile) as dst:
        dst.write(pred, 1)

    print(f"完成：{output_file}")


def predict(model_name):
    """读取训练好的模型，并批量预测所有年份和月份。"""
    if model_name not in MODEL_DIR_NAMES:
        raise ValueError(f"模型名称必须是：{', '.join(MODEL_DIR_NAMES)}")

    model_dir = config.SITE_DIR / MODEL_DIR_NAMES[model_name]
    model_file = model_dir / "trained_model.pkl"

    if not model_file.exists():
        raise FileNotFoundError(
            f"找不到模型文件：{model_file}\n"
            f"请先运行：python 02_train_model.py --model {model_name}"
        )

    output_dir = config.RASTER_OUTPUT_BASE / f"Result_{model_name.upper()}"
    output_dir.mkdir(parents=True, exist_ok=True)
    model = joblib.load(model_file)

    for year in config.YEARS:
        for month in config.MONTHS:
            predict_one_period(model, output_dir, year, month)


def main():
    parser = argparse.ArgumentParser(description="使用训练好的模型批量预测 GeoTIFF")
    parser.add_argument(
        "--model",
        default=config.MODEL_NAME,
        choices=sorted(MODEL_DIR_NAMES),
        help="模型名称：rf, xgb, lgb, cat, svm, gpr",
    )
    args = parser.parse_args()
    predict(args.model)


if __name__ == "__main__":
    main()
