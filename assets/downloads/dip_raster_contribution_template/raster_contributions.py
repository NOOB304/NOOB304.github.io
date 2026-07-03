from __future__ import annotations

"""
栅格变量贡献分析
================

这是一份普通 Python 源代码，不是打包程序。使用时只修改下方“用户配置区”，
然后自行运行本文件。

输入目录示例
------------

TRAIN_ROOT/
├─ temperature/
│  ├─ 2001.tif
│  ├─ 2002.tif
│  └─ ...
├─ precipitation/
│  ├─ 2001.tif
│  ├─ 2002.tif
│  └─ ...
├─ radiation/
│  ├─ 2001.tif
│  ├─ 2002.tif
│  └─ ...
└─ Y/
   ├─ 2001.tif
   ├─ 2002.tif
   └─ ...

同一期的所有文件必须同名，例如都叫 2001.tif。所有栅格必须已经具有相同的
投影、分辨率、范围、行列数和像元位置。

输出包括
--------

1. dip_global_summary.csv
   严格意义上的总体 DIP 分解，包括单独贡献、交互贡献、依赖贡献和净贡献。

2. 每一期的 prediction.tif
   模型预测值。

3. allocated_effect_<变量>.tif
   每个像元的有方向贡献，单位与 Y 相同。正值向上推动预测，负值向下推动预测。
   这些是 EBM 局部加性贡献，不是“逐像元 DIP 依赖贡献”。所有变量的
   allocated_effect 相加，再加模型截距，等于 prediction。

4. percent_<变量>.tif
   每个像元的相对贡献百分比。按绝对贡献计算，同一像元内所有变量合计 100%。

5. interaction_<变量1>__<变量2>.tif
   两个变量在每个像元上的交互项贡献。

重要边界
--------

DIP 是总体统计分解。它的变量依赖贡献由整批样本的方差和协方差定义，不能严谨
地变成逐像元栅格。因此，本代码同时输出：

* 整个研究区的 DIP 总体表格；
* 与 DIP 使用同一类 EBM 模型得到的逐像元局部贡献栅格。

两类结果不能混称为同一种统计量。
"""

import json
import math
import re
from contextlib import ExitStack
from itertools import combinations
from pathlib import Path
from typing import Iterable

import joblib
import numpy as np
import pandas as pd
import rasterio
from interpret.glassbox import ExplainableBoostingRegressor
from rasterio.windows import Window
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupShuffleSplit


# =============================================================================
# 用户配置区——通常只需要修改这里
# =============================================================================

# 历史训练数据。这里必须同时包含各个 X 文件夹和 Y 文件夹。
TRAIN_ROOT = Path(r"D:\your_data\history")

# 要生成贡献图的数据。默认与历史训练数据相同。
# 如果要解释另一批只有 X、没有 Y 的栅格，可以改成例如：
# EXPLAIN_ROOT = Path(r"D:\your_data\future")
EXPLAIN_ROOT = TRAIN_ROOT

# 结果保存位置。
OUTPUT_DIR = Path(r"D:\your_data\contribution_results")

# Y 栅格所在的文件夹名称。
TARGET_NAME = "Y"

# X 栅格文件夹名称，同时也是输出结果中的变量名称。
FEATURE_NAMES = [
    "temperature",
    "precipitation",
    "radiation",
]

# 变量分组。没有滞后变量时保持为空，程序会自动将每个 X 作为一组。
#
# 如果存在多个滞后栅格文件夹，可以写成：
# VARIABLE_GROUPS = {
#     "temperature": ["temperature_t", "temperature_lag1", "temperature_lag2"],
#     "precipitation": ["precipitation_t", "precipitation_lag1"],
#     "radiation": ["radiation"],
# }
#
# 每个 FEATURE_NAMES 中的变量必须且只能出现在一个组内。
VARIABLE_GROUPS: dict[str, list[str]] = {}

# 栅格文件匹配规则。
RASTER_PATTERN = "*.tif"

# 空间分块验证。相同空间块在所有年份中只会进入训练集或验证集的一边。
SPATIAL_BLOCK_SIZE_PIXELS = 64
VALIDATION_FRACTION = 0.30
DIP_CV_REPEATS = 3

# 为避免大范围高分辨率栅格耗尽内存，训练时均匀抽样。
MAX_TOTAL_TRAIN_SAMPLES = 200_000
READ_WINDOW_SIZE_PIXELS = 512

# EBM 参数。变量很多时两两交互会迅速增加。
MAX_FEATURES_FOR_ALL_PAIRWISE_INTERACTIONS = 15
EBM_MAX_BINS = 256
EBM_MAX_INTERACTION_BINS = 32
EBM_MAX_ROUNDS = 5_000
EBM_OUTER_BAGS = 8
EBM_LEARNING_RATE = 0.05
EBM_MIN_SAMPLES_LEAF = 8
N_JOBS = -2

# 验证阈值。低于阈值时默认停止，不输出可能误导的贡献图。
R2_THRESHOLD = 0.70
STOP_IF_BELOW_THRESHOLD = True

# 是否输出每一对变量的交互栅格。
WRITE_INTERACTION_RASTERS = True

# 输出设置。
OUTPUT_NODATA = -9999.0
OUTPUT_COMPRESS = "deflate"
RANDOM_SEED = 42


# =============================================================================
# 以下为计算代码，小白使用时不需要修改
# =============================================================================


def safe_name(value: str) -> str:
    """将变量名转换为适合文件名的形式。"""
    cleaned = re.sub(r"[^\w.-]+", "_", value.strip(), flags=re.UNICODE)
    return cleaned.strip("_.") or "variable"


def iter_windows(width: int, height: int, size: int) -> Iterable[Window]:
    """无论原始 TIFF 是否分块，都按固定窗口读取，避免一次加载整个研究区。"""
    for row_off in range(0, height, size):
        window_height = min(size, height - row_off)
        for col_off in range(0, width, size):
            window_width = min(size, width - col_off)
            yield Window(col_off, row_off, window_width, window_height)


def read_as_nan(source: rasterio.io.DatasetReader, window: Window) -> np.ndarray:
    """读取一个窗口，并把 nodata 和掩膜值转换为 NaN。"""
    return (
        source.read(1, window=window, masked=True)
        .filled(np.nan)
        .astype(np.float32)
    )


def assert_same_grid(
    source: rasterio.io.DatasetReader,
    reference: rasterio.io.DatasetReader,
    source_path: Path,
) -> None:
    """阻止错位栅格在不知情的情况下被逐像元拼接。"""
    problems: list[str] = []
    if source.width != reference.width or source.height != reference.height:
        problems.append("行列数不同")
    if source.crs != reference.crs:
        problems.append("坐标参考系不同")
    if source.transform != reference.transform:
        problems.append("分辨率、范围或像元位置不同")
    if problems:
        raise ValueError(
            f"栅格没有对齐：{source_path}\n"
            f"问题：{'；'.join(problems)}。\n"
            "请先在 GIS 软件中统一投影、分辨率、范围和像元对齐方式。"
        )


def require_feature_limit() -> None:
    if len(FEATURE_NAMES) > MAX_FEATURES_FOR_ALL_PAIRWISE_INTERACTIONS:
        raise ValueError(
            f"当前设置包含 {len(FEATURE_NAMES)} 个输入列，超过"
            f" {MAX_FEATURES_FOR_ALL_PAIRWISE_INTERACTIONS} 个变量的安全上限。"
            "DIP 需要拟合两两交互，变量过多会非常慢。请先合并滞后变量或筛选变量。"
        )


def resolve_variable_groups() -> dict[str, list[str]]:
    """生成互不重叠并覆盖全部输入列的变量组。"""
    groups = (
        {name: [name] for name in FEATURE_NAMES}
        if not VARIABLE_GROUPS
        else {name: list(columns) for name, columns in VARIABLE_GROUPS.items()}
    )
    flattened = [column for columns in groups.values() for column in columns]
    missing = sorted(set(FEATURE_NAMES) - set(flattened))
    unknown = sorted(set(flattened) - set(FEATURE_NAMES))
    duplicated = sorted(
        {column for column in flattened if flattened.count(column) > 1}
    )
    if missing or unknown or duplicated:
        raise ValueError(
            "VARIABLE_GROUPS 设置错误。\n"
            f"未分组变量：{missing}\n"
            f"不存在的变量：{unknown}\n"
            f"重复分组变量：{duplicated}"
        )
    return groups


def discover_training_periods() -> list[tuple[str, dict[str, Path], Path]]:
    """寻找所有具有完整 X 和 Y 的历史时期。"""
    target_dir = TRAIN_ROOT / TARGET_NAME
    target_files = sorted(target_dir.glob(RASTER_PATTERN))
    if not target_files:
        raise FileNotFoundError(
            f"没有在 {target_dir} 中找到 {RASTER_PATTERN}。"
        )

    periods: list[tuple[str, dict[str, Path], Path]] = []
    for target_path in target_files:
        feature_paths = {
            name: TRAIN_ROOT / name / target_path.name for name in FEATURE_NAMES
        }
        missing = [str(path) for path in feature_paths.values() if not path.exists()]
        if missing:
            raise FileNotFoundError(
                f"时期 {target_path.name} 缺少同名 X 栅格：\n"
                + "\n".join(missing)
            )
        periods.append((target_path.name, feature_paths, target_path))
    return periods


def discover_explain_periods() -> list[tuple[str, dict[str, Path]]]:
    """寻找需要输出贡献图的 X 栅格时期；这里不要求存在 Y。"""
    first_feature_dir = EXPLAIN_ROOT / FEATURE_NAMES[0]
    first_feature_files = sorted(first_feature_dir.glob(RASTER_PATTERN))
    if not first_feature_files:
        raise FileNotFoundError(
            f"没有在 {first_feature_dir} 中找到 {RASTER_PATTERN}。"
        )

    periods: list[tuple[str, dict[str, Path]]] = []
    for first_path in first_feature_files:
        feature_paths = {
            name: EXPLAIN_ROOT / name / first_path.name for name in FEATURE_NAMES
        }
        missing = [str(path) for path in feature_paths.values() if not path.exists()]
        if missing:
            raise FileNotFoundError(
                f"时期 {first_path.name} 缺少同名 X 栅格：\n"
                + "\n".join(missing)
            )
        periods.append((first_path.name, feature_paths))
    return periods


def keep_smallest_random_keys(
    old_keys: np.ndarray,
    old_x: np.ndarray,
    old_y: np.ndarray,
    old_groups: np.ndarray,
    new_keys: np.ndarray,
    new_x: np.ndarray,
    new_y: np.ndarray,
    new_groups: np.ndarray,
    capacity: int,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    流式保留随机键最小的样本。

    这样无需把整幅栅格放入内存，也能近似均匀地抽取像元。
    """
    keys = np.concatenate([old_keys, new_keys])
    x_values = np.concatenate([old_x, new_x], axis=0)
    y_values = np.concatenate([old_y, new_y])
    groups = np.concatenate([old_groups, new_groups])
    if len(keys) <= capacity:
        return keys, x_values, y_values, groups

    selected = np.argpartition(keys, capacity - 1)[:capacity]
    return (
        keys[selected],
        x_values[selected],
        y_values[selected],
        groups[selected],
    )


def sample_one_period(
    feature_paths: dict[str, Path],
    target_path: Path,
    capacity: int,
    random_seed: int,
    reference_grid: dict | None,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, dict]:
    """从一个时期的多张对齐栅格中流式抽取训练样本。"""
    rng = np.random.default_rng(random_seed)
    keys = np.empty(0, dtype=np.float64)
    x_sample = np.empty((0, len(FEATURE_NAMES)), dtype=np.float32)
    y_sample = np.empty(0, dtype=np.float32)
    group_sample = np.empty(0, dtype=np.int64)

    with ExitStack() as stack:
        target_source = stack.enter_context(rasterio.open(target_path))
        feature_sources = {
            name: stack.enter_context(rasterio.open(path))
            for name, path in feature_paths.items()
        }

        for name, source in feature_sources.items():
            assert_same_grid(source, target_source, feature_paths[name])

        current_grid = {
            "width": target_source.width,
            "height": target_source.height,
            "crs": target_source.crs,
            "transform": target_source.transform,
            "profile": target_source.profile.copy(),
        }
        if reference_grid is not None:
            if (
                current_grid["width"] != reference_grid["width"]
                or current_grid["height"] != reference_grid["height"]
                or current_grid["crs"] != reference_grid["crs"]
                or current_grid["transform"] != reference_grid["transform"]
            ):
                raise ValueError(
                    f"不同历史时期的栅格网格不一致：{target_path}"
                )

        block_columns = math.ceil(
            target_source.width / SPATIAL_BLOCK_SIZE_PIXELS
        )
        for window in iter_windows(
            target_source.width,
            target_source.height,
            READ_WINDOW_SIZE_PIXELS,
        ):
            y_window = read_as_nan(target_source, window).reshape(-1)
            x_window = np.column_stack(
                [
                    read_as_nan(feature_sources[name], window).reshape(-1)
                    for name in FEATURE_NAMES
                ]
            )
            valid = np.isfinite(y_window) & np.isfinite(x_window).all(axis=1)
            if not valid.any():
                continue

            flat_indices = np.flatnonzero(valid)
            local_rows, local_cols = np.divmod(flat_indices, int(window.width))
            global_rows = local_rows + int(window.row_off)
            global_cols = local_cols + int(window.col_off)
            spatial_groups = (
                global_rows // SPATIAL_BLOCK_SIZE_PIXELS
            ) * block_columns + (
                global_cols // SPATIAL_BLOCK_SIZE_PIXELS
            )

            new_x = x_window[valid].astype(np.float32)
            new_y = y_window[valid].astype(np.float32)
            new_keys = rng.random(len(new_y))
            keys, x_sample, y_sample, group_sample = keep_smallest_random_keys(
                keys,
                x_sample,
                y_sample,
                group_sample,
                new_keys,
                new_x,
                new_y,
                spatial_groups.astype(np.int64),
                capacity,
            )

    return x_sample, y_sample, group_sample, current_grid


def collect_training_samples(
    periods: list[tuple[str, dict[str, Path], Path]],
) -> tuple[np.ndarray, np.ndarray, np.ndarray, dict]:
    """按时期平衡抽样，并保证同一空间块跨年份使用相同分组编号。"""
    per_period_capacity = max(
        1, math.ceil(MAX_TOTAL_TRAIN_SAMPLES / len(periods))
    )
    x_parts: list[np.ndarray] = []
    y_parts: list[np.ndarray] = []
    group_parts: list[np.ndarray] = []
    reference_grid: dict | None = None

    for period_index, (period_name, feature_paths, target_path) in enumerate(
        periods
    ):
        print(f"抽取训练样本：{period_name}")
        x_part, y_part, groups_part, current_grid = sample_one_period(
            feature_paths,
            target_path,
            per_period_capacity,
            RANDOM_SEED + period_index,
            reference_grid,
        )
        if reference_grid is None:
            reference_grid = current_grid
        if len(y_part) == 0:
            raise ValueError(f"时期 {period_name} 没有共同有效像元。")
        x_parts.append(x_part)
        y_parts.append(y_part)
        group_parts.append(groups_part)

    x_values = np.concatenate(x_parts, axis=0)
    y_values = np.concatenate(y_parts)
    groups = np.concatenate(group_parts)

    if len(y_values) > MAX_TOTAL_TRAIN_SAMPLES:
        rng = np.random.default_rng(RANDOM_SEED)
        selected = rng.choice(
            len(y_values),
            size=MAX_TOTAL_TRAIN_SAMPLES,
            replace=False,
        )
        x_values = x_values[selected]
        y_values = y_values[selected]
        groups = groups[selected]

    if len(np.unique(groups)) < 3:
        raise ValueError(
            "有效空间块少于 3 个，无法进行空间独立验证。"
            "请减小 SPATIAL_BLOCK_SIZE_PIXELS。"
        )
    assert reference_grid is not None
    return x_values, y_values, groups, reference_grid


def pairwise_terms(feature_count: int) -> list[tuple[int, int]]:
    return list(combinations(range(feature_count), 2))


def fit_ebm(
    x_values: np.ndarray,
    y_values: np.ndarray,
    feature_names: list[str],
    interactions: list[tuple[int, int]] | int,
    random_seed: int,
) -> ExplainableBoostingRegressor:
    """拟合一个可输出逐项贡献的 EBM 回归模型。"""
    model = ExplainableBoostingRegressor(
        feature_names=feature_names,
        feature_types=["continuous"] * len(feature_names),
        interactions=interactions,
        max_bins=EBM_MAX_BINS,
        max_interaction_bins=EBM_MAX_INTERACTION_BINS,
        max_rounds=EBM_MAX_ROUNDS,
        outer_bags=EBM_OUTER_BAGS,
        learning_rate=EBM_LEARNING_RATE,
        min_samples_leaf=EBM_MIN_SAMPLES_LEAF,
        objective="rmse",
        n_jobs=N_JOBS,
        random_state=random_seed,
    )
    frame = pd.DataFrame(x_values, columns=feature_names)
    model.fit(frame, y_values)
    return model


def predict_model(
    model: ExplainableBoostingRegressor,
    x_values: np.ndarray,
    feature_names: list[str],
) -> np.ndarray:
    frame = pd.DataFrame(x_values, columns=feature_names)
    return np.asarray(model.predict(frame), dtype=np.float64)


def predictive_power(
    y_test: np.ndarray,
    prediction: np.ndarray,
    baseline_mse: float,
) -> float:
    """论文中的 v(S)：相对于训练集均值预测所减少的均方误差。"""
    return baseline_mse - mean_squared_error(y_test, prediction)


def remapped_pairs(original_indices: list[int]) -> list[tuple[int, int]] | int:
    """子模型中的全部两两交互使用从零开始的新列编号。"""
    pairs = pairwise_terms(len(original_indices))
    return pairs if pairs else 0


def within_group_pairs(
    groups: list[list[int]],
) -> list[tuple[int, int]] | int:
    """只允许组内交互，禁止组与组之间的交互。"""
    pairs: list[tuple[int, int]] = []
    for indices in groups:
        pairs.extend(combinations(indices, 2))
    return pairs if pairs else 0


def run_dip_cross_validation(
    x_values: np.ndarray,
    y_values: np.ndarray,
    spatial_groups: np.ndarray,
    variable_groups: dict[str, list[str]],
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    用空间分块验证计算总体 DIP 分解。

    对每个变量组 A 和其余变量 B，计算：

        v(A ∪ B) = v(A) + v(B) + interaction + dependency

    这里 dependency 是依赖对预测能力的“有符号贡献”：
    冗余通常为负，抑制效应也可能使其为正。
    """
    feature_to_index = {name: i for i, name in enumerate(FEATURE_NAMES)}
    group_indices = {
        group_name: [feature_to_index[name] for name in names]
        for group_name, names in variable_groups.items()
    }
    splitter = GroupShuffleSplit(
        n_splits=DIP_CV_REPEATS,
        test_size=VALIDATION_FRACTION,
        random_state=RANDOM_SEED,
    )
    detail_rows: list[dict[str, float | int | str]] = []
    metric_rows: list[dict[str, float | int]] = []

    for repeat, (train_index, test_index) in enumerate(
        splitter.split(x_values, y_values, groups=spatial_groups),
        start=1,
    ):
        print(f"DIP 空间验证：第 {repeat}/{DIP_CV_REPEATS} 次")
        x_train, x_test = x_values[train_index], x_values[test_index]
        y_train, y_test = y_values[train_index], y_values[test_index]

        full_model = fit_ebm(
            x_train,
            y_train,
            FEATURE_NAMES,
            pairwise_terms(len(FEATURE_NAMES)),
            RANDOM_SEED + repeat,
        )
        full_prediction = predict_model(full_model, x_test, FEATURE_NAMES)
        baseline_prediction = np.full_like(
            y_test, np.mean(y_train), dtype=np.float64
        )
        baseline_mse = mean_squared_error(y_test, baseline_prediction)
        target_variance = float(np.var(y_test))
        if target_variance <= 0:
            raise ValueError("验证集 Y 没有方差，无法计算贡献。")
        v_full = predictive_power(y_test, full_prediction, baseline_mse)

        metric_rows.append(
            {
                "repeat": repeat,
                "r2": float(r2_score(y_test, full_prediction)),
                "rmse": float(
                    mean_squared_error(y_test, full_prediction) ** 0.5
                ),
                "mae": float(mean_absolute_error(y_test, full_prediction)),
                "train_samples": int(len(train_index)),
                "validation_samples": int(len(test_index)),
            }
        )

        all_indices = list(range(len(FEATURE_NAMES)))
        for group_name, selected_indices in group_indices.items():
            rest_indices = [
                index for index in all_indices if index not in selected_indices
            ]
            if not rest_indices:
                raise ValueError(
                    f"变量组 {group_name} 包含了全部变量，无法与其余变量比较。"
                )

            selected_names = [FEATURE_NAMES[i] for i in selected_indices]
            rest_names = [FEATURE_NAMES[i] for i in rest_indices]

            selected_model = fit_ebm(
                x_train[:, selected_indices],
                y_train,
                selected_names,
                remapped_pairs(selected_indices),
                RANDOM_SEED + repeat,
            )
            rest_model = fit_ebm(
                x_train[:, rest_indices],
                y_train,
                rest_names,
                remapped_pairs(rest_indices),
                RANDOM_SEED + repeat,
            )
            groupwise_additive_model = fit_ebm(
                x_train,
                y_train,
                FEATURE_NAMES,
                within_group_pairs([selected_indices, rest_indices]),
                RANDOM_SEED + repeat,
            )

            selected_prediction = predict_model(
                selected_model,
                x_test[:, selected_indices],
                selected_names,
            )
            rest_prediction = predict_model(
                rest_model,
                x_test[:, rest_indices],
                rest_names,
            )
            additive_prediction = predict_model(
                groupwise_additive_model,
                x_test,
                FEATURE_NAMES,
            )

            v_selected = predictive_power(
                y_test, selected_prediction, baseline_mse
            )
            v_rest = predictive_power(y_test, rest_prediction, baseline_mse)
            v_additive = predictive_power(
                y_test, additive_prediction, baseline_mse
            )

            interaction = v_full - v_additive
            dependency = v_additive - v_selected - v_rest
            loco_net = v_full - v_rest
            reconstruction = v_selected + interaction + dependency

            detail_rows.append(
                {
                    "repeat": repeat,
                    "group": group_name,
                    "standalone": v_selected / target_variance,
                    "interaction": interaction / target_variance,
                    "dependency": dependency / target_variance,
                    "net_loco": loco_net / target_variance,
                    "rest_predictive_power": v_rest / target_variance,
                    "full_predictive_power": v_full / target_variance,
                    "identity_error": (
                        reconstruction - loco_net
                    ) / target_variance,
                }
            )

    details = pd.DataFrame(detail_rows)
    metrics = pd.DataFrame(metric_rows)
    value_columns = [
        "standalone",
        "interaction",
        "dependency",
        "net_loco",
        "rest_predictive_power",
        "full_predictive_power",
        "identity_error",
    ]
    summary = details.groupby("group")[value_columns].agg(["mean", "std"])
    summary.columns = [
        f"{column}_{statistic}" for column, statistic in summary.columns
    ]
    summary = summary.reset_index()
    return details, summary, metrics


def output_profile(
    template: rasterio.io.DatasetReader,
) -> dict:
    profile = template.profile.copy()
    profile.update(
        driver="GTiff",
        dtype="float32",
        count=1,
        nodata=OUTPUT_NODATA,
        compress=OUTPUT_COMPRESS,
        BIGTIFF="IF_SAFER",
    )
    return profile


def full_output_array(
    values: np.ndarray,
    valid: np.ndarray,
    height: int,
    width: int,
) -> np.ndarray:
    result = np.full(valid.size, OUTPUT_NODATA, dtype=np.float32)
    result[valid] = values.astype(np.float32)
    return result.reshape(height, width)


def model_term_layout(
    model: ExplainableBoostingRegressor,
) -> tuple[dict[int, int], dict[tuple[int, ...], int]]:
    """返回单变量项和交互项在 eval_terms 输出中的列位置。"""
    main_terms: dict[int, int] = {}
    interaction_terms: dict[tuple[int, ...], int] = {}
    for term_index, term_features in enumerate(model.term_features_):
        term = tuple(int(index) for index in term_features)
        if len(term) == 1:
            main_terms[term[0]] = term_index
        elif len(term) >= 2:
            interaction_terms[term] = term_index
    return main_terms, interaction_terms


def explain_one_period(
    model: ExplainableBoostingRegressor,
    period_name: str,
    feature_paths: dict[str, Path],
    variable_groups: dict[str, list[str]],
) -> None:
    """将一个时期的 EBM 局部贡献重新写回 GeoTIFF。"""
    period_dir = OUTPUT_DIR / safe_name(Path(period_name).stem)
    period_dir.mkdir(parents=True, exist_ok=True)
    feature_to_index = {name: i for i, name in enumerate(FEATURE_NAMES)}
    group_indices = {
        group_name: [feature_to_index[name] for name in names]
        for group_name, names in variable_groups.items()
    }
    main_terms, interaction_terms = model_term_layout(model)

    with ExitStack() as stack:
        feature_sources = {
            name: stack.enter_context(rasterio.open(path))
            for name, path in feature_paths.items()
        }
        template = feature_sources[FEATURE_NAMES[0]]
        for name, source in feature_sources.items():
            assert_same_grid(source, template, feature_paths[name])

        profile = output_profile(template)
        prediction_writer = stack.enter_context(
            rasterio.open(period_dir / "prediction.tif", "w", **profile)
        )
        effect_writers = {
            group_name: stack.enter_context(
                rasterio.open(
                    period_dir
                    / f"allocated_effect_{safe_name(group_name)}.tif",
                    "w",
                    **profile,
                )
            )
            for group_name in variable_groups
        }
        percent_writers = {
            group_name: stack.enter_context(
                rasterio.open(
                    period_dir / f"percent_{safe_name(group_name)}.tif",
                    "w",
                    **profile,
                )
            )
            for group_name in variable_groups
        }
        main_writers = {
            group_name: stack.enter_context(
                rasterio.open(
                    period_dir / f"main_effect_{safe_name(group_name)}.tif",
                    "w",
                    **profile,
                )
            )
            for group_name in variable_groups
        }
        interaction_writers: dict[tuple[int, ...], rasterio.io.DatasetWriter] = {}
        if WRITE_INTERACTION_RASTERS:
            for term in interaction_terms:
                term_name = "__".join(FEATURE_NAMES[index] for index in term)
                interaction_writers[term] = stack.enter_context(
                    rasterio.open(
                        period_dir / f"interaction_{safe_name(term_name)}.tif",
                        "w",
                        **profile,
                    )
                )

        for window in iter_windows(
            template.width,
            template.height,
            READ_WINDOW_SIZE_PIXELS,
        ):
            window_height = int(window.height)
            window_width = int(window.width)
            x_window = np.column_stack(
                [
                    read_as_nan(feature_sources[name], window).reshape(-1)
                    for name in FEATURE_NAMES
                ]
            )
            valid = np.isfinite(x_window).all(axis=1)
            if valid.any():
                x_valid = x_window[valid]
                frame = pd.DataFrame(x_valid, columns=FEATURE_NAMES)
                prediction = np.asarray(model.predict(frame))
                term_values = np.asarray(model.eval_terms(frame))

                feature_main = np.zeros(
                    (len(x_valid), len(FEATURE_NAMES)), dtype=np.float64
                )
                feature_allocated = np.zeros_like(feature_main)

                for feature_index, term_index in main_terms.items():
                    values = term_values[:, term_index]
                    feature_main[:, feature_index] += values
                    feature_allocated[:, feature_index] += values

                for term, term_index in interaction_terms.items():
                    values = term_values[:, term_index]
                    share = values / len(term)
                    for feature_index in term:
                        feature_allocated[:, feature_index] += share

                group_main = np.column_stack(
                    [
                        feature_main[:, indices].sum(axis=1)
                        for indices in group_indices.values()
                    ]
                )
                group_allocated = np.column_stack(
                    [
                        feature_allocated[:, indices].sum(axis=1)
                        for indices in group_indices.values()
                    ]
                )
                denominator = np.abs(group_allocated).sum(axis=1)
                group_percent = np.divide(
                    np.abs(group_allocated) * 100.0,
                    denominator[:, None],
                    out=np.zeros_like(group_allocated),
                    where=denominator[:, None] > 0,
                )
            else:
                prediction = np.empty(0, dtype=np.float64)
                term_values = np.empty(
                    (0, len(model.term_features_)), dtype=np.float64
                )
                group_main = np.empty(
                    (0, len(variable_groups)), dtype=np.float64
                )
                group_allocated = np.empty_like(group_main)
                group_percent = np.empty_like(group_main)

            prediction_writer.write(
                full_output_array(
                    prediction,
                    valid,
                    window_height,
                    window_width,
                ),
                1,
                window=window,
            )
            for group_position, group_name in enumerate(variable_groups):
                main_writers[group_name].write(
                    full_output_array(
                        group_main[:, group_position],
                        valid,
                        window_height,
                        window_width,
                    ),
                    1,
                    window=window,
                )
                effect_writers[group_name].write(
                    full_output_array(
                        group_allocated[:, group_position],
                        valid,
                        window_height,
                        window_width,
                    ),
                    1,
                    window=window,
                )
                percent_writers[group_name].write(
                    full_output_array(
                        group_percent[:, group_position],
                        valid,
                        window_height,
                        window_width,
                    ),
                    1,
                    window=window,
                )

            for term, writer in interaction_writers.items():
                writer.write(
                    full_output_array(
                        term_values[:, interaction_terms[term]],
                        valid,
                        window_height,
                        window_width,
                    ),
                    1,
                    window=window,
                )


def save_metadata(
    model: ExplainableBoostingRegressor,
    metrics: pd.DataFrame,
    variable_groups: dict[str, list[str]],
) -> None:
    intercept = float(np.asarray(model.intercept_).reshape(-1)[0])
    metadata = {
        "target": TARGET_NAME,
        "features": FEATURE_NAMES,
        "variable_groups": variable_groups,
        "intercept": intercept,
        "term_names": list(model.term_names_),
        "validation_r2_mean": float(metrics["r2"].mean()),
        "validation_r2_std": float(metrics["r2"].std()),
        "effect_definition": (
            "allocated_effect 为 EBM 主效应加上平均分配后的交互项；"
            "同一像元内所有 allocated_effect 加 intercept 等于 prediction。"
        ),
        "percent_definition": (
            "percent = abs(allocated_effect) / "
            "sum(abs(all allocated_effect)) * 100"
        ),
        "dip_boundary": (
            "DIP 是总体分解；逐像元 effect 和 percent 是 EBM 局部加性贡献，"
            "不是逐像元 DIP 依赖贡献。"
        ),
    }
    with (OUTPUT_DIR / "result_metadata.json").open(
        "w", encoding="utf-8"
    ) as file:
        json.dump(metadata, file, ensure_ascii=False, indent=2)


def main() -> None:
    require_feature_limit()
    variable_groups = resolve_variable_groups()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    training_periods = discover_training_periods()
    explain_periods = discover_explain_periods()
    x_values, y_values, spatial_groups, _ = collect_training_samples(
        training_periods
    )
    print(
        f"训练样本数：{len(y_values)}；"
        f"独立空间块数：{len(np.unique(spatial_groups))}"
    )

    dip_details, dip_summary, metrics = run_dip_cross_validation(
        x_values,
        y_values,
        spatial_groups,
        variable_groups,
    )
    dip_details.to_csv(
        OUTPUT_DIR / "dip_details_by_split.csv",
        index=False,
        encoding="utf-8-sig",
    )
    dip_summary.to_csv(
        OUTPUT_DIR / "dip_global_summary.csv",
        index=False,
        encoding="utf-8-sig",
    )
    metrics.to_csv(
        OUTPUT_DIR / "spatial_validation_metrics.csv",
        index=False,
        encoding="utf-8-sig",
    )

    mean_r2 = float(metrics["r2"].mean())
    print(f"空间独立验证平均 R²：{mean_r2:.4f}")
    if mean_r2 < R2_THRESHOLD and STOP_IF_BELOW_THRESHOLD:
        raise RuntimeError(
            f"平均 R²={mean_r2:.4f}，低于阈值 {R2_THRESHOLD:.2f}。"
            "DIP 表格已经保存，但程序按照设置停止输出贡献栅格。"
            "如仍需输出，请将 STOP_IF_BELOW_THRESHOLD 改为 False。"
        )

    print("使用全部抽样数据拟合最终 EBM。")
    final_model = fit_ebm(
        x_values,
        y_values,
        FEATURE_NAMES,
        pairwise_terms(len(FEATURE_NAMES)),
        RANDOM_SEED,
    )
    joblib.dump(final_model, OUTPUT_DIR / "ebm_contribution_model.joblib")
    save_metadata(final_model, metrics, variable_groups)

    for period_name, feature_paths in explain_periods:
        print(f"输出贡献栅格：{period_name}")
        explain_one_period(
            final_model,
            period_name,
            feature_paths,
            variable_groups,
        )

    print(f"完成。结果目录：{OUTPUT_DIR}")


if __name__ == "__main__":
    main()
