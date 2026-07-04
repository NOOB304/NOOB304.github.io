"""
TimePro-inspired 多变量时序预测单文件版

功能
----
1. 读取站点 CSV。
2. 按站点划分 70% 训练池和 30% 独立验证集。
3. 在训练池内部自动比较 M0、M1、M2 并搜索参数。
4. 保存模型、验证指标、预测表和诊断图。
5. 可选地把训练好的模型应用到多期 GeoTIFF。

这不是 EXE、GUI 或安装程序。一般只需修改下方“用户配置区”。
模型借鉴 TimePro 的分变量时间片思想，但不是 ICML 论文官方实现。
"""

from __future__ import annotations

import copy
import json
import math
import random
import time
from contextlib import ExitStack
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Sequence

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import torch
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from torch import nn
from torch.utils.data import DataLoader, Dataset


# =============================================================================
# 用户配置区
# =============================================================================

# 站点表格和训练结果目录。推荐使用绝对路径。
STATION_CSV = Path(r"D:\your_data\station_data.csv")
OUTPUT_DIR = Path(r"D:\your_data\timepro_results")

# monthly 表示月尺度，annual 表示年尺度。
TIME_SCALE = "monthly"

# CSV 列名。采用推荐格式时不需要修改。
SITE_COLUMN = "site_id"
TIME_COLUMN = "date"
TARGET_COLUMN = "Y"

# 留空时，自动把站点、时间和 Y 之外的数值列识别为 X。
# 也可以手动写成 ["temperature", "precipitation", "radiation"]。
FEATURE_COLUMNS: list[str] = []

# 训练、验证和自动调参设置。
TRAIN_STATION_RATIO = 0.70
RANDOM_SEED = 42
R2_THRESHOLD = 0.70
NUM_TRIALS = 6
MAX_EPOCHS = 40
EARLY_STOPPING_PATIENCE = 7
NUM_WORKERS = 0
DEVICE = "auto"

# 是否在训练结束后继续预测栅格。
RUN_RASTER_PREDICTION = False
RASTER_ONLY_IF_R2_PASSED = True

# 只有 RUN_RASTER_PREDICTION=True 时才会读取这些路径。
RASTER_HISTORY_DIR = Path(r"D:\your_data\rasters\history")
RASTER_FUTURE_DIR = Path(r"D:\your_data\rasters\future")
RASTER_OUTPUT_DIR = Path(r"D:\your_data\rasters\predicted_Y")
RASTER_PATTERN = "*.tif"
RASTER_OUTPUT_NODATA = -9999.0
RASTER_BATCH_PIXELS = 8192


# =============================================================================
# 数据读取与连续窗口
# =============================================================================


@dataclass
class Standardization:
    columns: list[str]
    mean: np.ndarray
    std: np.ndarray

    @classmethod
    def fit(
        cls,
        frame: pd.DataFrame,
        columns: Sequence[str],
    ) -> "Standardization":
        values = frame[list(columns)].to_numpy(dtype=np.float64)
        mean = np.nanmean(values, axis=0)
        std = np.nanstd(values, axis=0)
        std[std < 1e-8] = 1.0
        return cls(
            list(columns),
            mean.astype(np.float32),
            std.astype(np.float32),
        )

    def transform(self, values: np.ndarray) -> np.ndarray:
        return (values - self.mean) / self.std

    def inverse_y(self, values: np.ndarray) -> np.ndarray:
        return values * self.std[-1] + self.mean[-1]

    def to_dict(self) -> dict[str, Any]:
        return {
            "columns": self.columns,
            "mean": self.mean.tolist(),
            "std": self.std.tolist(),
        }


def validate_time_scale() -> None:
    if TIME_SCALE not in {"monthly", "annual"}:
        raise ValueError("TIME_SCALE 只能是 monthly 或 annual。")


def parse_time_column(series: pd.Series) -> pd.Series:
    if TIME_SCALE == "annual":
        text = series.astype(str).str.strip()
        if text.str.fullmatch(r"\d{4}").all():
            return pd.to_datetime(text, format="%Y")
    return pd.to_datetime(series, errors="raise")


def period_number(times: pd.Series) -> np.ndarray:
    if TIME_SCALE == "monthly":
        return (times.dt.year * 12 + times.dt.month).to_numpy(dtype=np.int64)
    return times.dt.year.to_numpy(dtype=np.int64)


def load_station_csv() -> tuple[pd.DataFrame, list[str]]:
    if not STATION_CSV.exists():
        raise FileNotFoundError(f"找不到站点 CSV：{STATION_CSV}")

    frame = pd.read_csv(STATION_CSV)
    required = {SITE_COLUMN, TIME_COLUMN, TARGET_COLUMN}
    missing = sorted(required.difference(frame.columns))
    if missing:
        raise ValueError(f"CSV 缺少必要列：{missing}")

    frame[TIME_COLUMN] = parse_time_column(frame[TIME_COLUMN])
    frame = frame.sort_values([SITE_COLUMN, TIME_COLUMN]).reset_index(drop=True)

    if FEATURE_COLUMNS:
        features = list(FEATURE_COLUMNS)
        missing_features = sorted(set(features).difference(frame.columns))
        if missing_features:
            raise ValueError(f"CSV 缺少指定的 X 列：{missing_features}")
    else:
        excluded = {SITE_COLUMN, TIME_COLUMN, TARGET_COLUMN}
        features = [
            column
            for column in frame.columns
            if column not in excluded
            and pd.api.types.is_numeric_dtype(frame[column])
        ]
    if not features:
        raise ValueError("没有识别到 X 变量，请检查 FEATURE_COLUMNS。")

    numeric_columns = features + [TARGET_COLUMN]
    frame[numeric_columns] = frame[numeric_columns].apply(
        pd.to_numeric,
        errors="coerce",
    )
    before = len(frame)
    frame = frame.dropna(
        subset=[SITE_COLUMN, TIME_COLUMN, *numeric_columns]
    ).reset_index(drop=True)
    if len(frame) < before:
        print(f"删除了 {before - len(frame)} 行含缺失值的数据。")

    duplicate_count = int(
        frame.duplicated([SITE_COLUMN, TIME_COLUMN]).sum()
    )
    if duplicate_count:
        raise ValueError(
            f"发现 {duplicate_count} 个重复的站点-时间组合，请先处理。"
        )
    if frame[SITE_COLUMN].nunique() < 6:
        raise ValueError("至少需要 6 个站点才能进行站点独立验证。")
    return frame, features


def split_continuous_segments(group: pd.DataFrame) -> list[pd.DataFrame]:
    group = group.sort_values(TIME_COLUMN).reset_index(drop=True)
    periods = period_number(group[TIME_COLUMN])
    if len(periods) <= 1:
        return [group]
    break_positions = np.flatnonzero(np.diff(periods) != 1) + 1
    boundaries = np.concatenate(([0], break_positions, [len(group)]))
    return [
        group.iloc[start:end].reset_index(drop=True)
        for start, end in zip(boundaries[:-1], boundaries[1:])
    ]


class StationSequenceDataset(Dataset):
    def __init__(
        self,
        frame: pd.DataFrame,
        site_ids: Sequence[Any],
        feature_columns: Sequence[str],
        x_window: int,
        y_lags: int,
        scaler: Standardization,
    ) -> None:
        super().__init__()
        history_columns = list(feature_columns) + [TARGET_COLUMN]
        x_sequences: list[np.ndarray] = []
        y_histories: list[np.ndarray] = []
        targets: list[float] = []
        metadata: list[tuple[str, str]] = []

        selected = frame[frame[SITE_COLUMN].isin(site_ids)]
        for site_id, group in selected.groupby(SITE_COLUMN, sort=False):
            for segment in split_continuous_segments(group):
                raw = segment[history_columns].to_numpy(dtype=np.float32)
                normalized = scaler.transform(raw).astype(np.float32)
                times = segment[TIME_COLUMN].dt.strftime("%Y-%m-%d").tolist()
                first_target = max(x_window - 1, y_lags)

                for target_index in range(first_target, len(segment)):
                    x_sequences.append(
                        normalized[
                            target_index - x_window + 1 : target_index + 1,
                            :-1,
                        ]
                    )
                    if y_lags > 0:
                        y_histories.append(
                            normalized[
                                target_index - y_lags : target_index,
                                -1:,
                            ]
                        )
                    else:
                        y_histories.append(
                            np.zeros((1, 1), dtype=np.float32)
                        )
                    targets.append(float(normalized[target_index, -1]))
                    metadata.append((str(site_id), times[target_index]))

        if not x_sequences:
            minimum = max(x_window, y_lags + 1)
            raise ValueError(
                f"没有可用连续窗口，每个连续片段至少需要 {minimum} 条记录。"
            )

        self.x_sequences = torch.from_numpy(np.stack(x_sequences))
        self.y_histories = torch.from_numpy(np.stack(y_histories))
        self.targets = torch.tensor(targets, dtype=torch.float32)
        self.metadata = metadata

    def __len__(self) -> int:
        return len(self.targets)

    def __getitem__(self, index: int):
        return (
            self.x_sequences[index],
            self.y_histories[index],
            self.targets[index],
            index,
        )


# =============================================================================
# TimePro-inspired + LSTM 模型
# =============================================================================


class TimeProLSTMFusion(nn.Module):
    def __init__(
        self,
        num_x: int,
        x_window: int,
        y_lags: int,
        patch_len: int,
        d_model: int,
        n_heads: int,
        temporal_layers: int,
        variable_layers: int,
        lstm_hidden: int,
        dropout: float,
    ) -> None:
        super().__init__()
        if patch_len > x_window:
            raise ValueError("patch_len 不能大于 x_window。")
        if d_model % n_heads != 0:
            raise ValueError("d_model 必须能被 n_heads 整除。")

        self.num_x = num_x
        self.x_window = x_window
        self.y_lags = y_lags
        self.patch_len = patch_len
        self.patch_stride = max(1, patch_len // 2)
        self.num_patches = 1 + (
            x_window - patch_len
        ) // self.patch_stride
        self.d_model = d_model

        self.patch_projection = nn.Linear(patch_len, d_model)
        self.patch_position = nn.Parameter(
            torch.zeros(1, 1, self.num_patches, d_model)
        )
        self.variable_embedding = nn.Parameter(
            torch.zeros(1, num_x, 1, d_model)
        )

        temporal_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dim_feedforward=d_model * 3,
            dropout=dropout,
            activation="gelu",
            batch_first=True,
            norm_first=True,
        )
        self.temporal_encoder = nn.TransformerEncoder(
            temporal_layer,
            num_layers=temporal_layers,
            enable_nested_tensor=False,
        )

        variable_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dim_feedforward=d_model * 3,
            dropout=dropout,
            activation="gelu",
            batch_first=True,
            norm_first=True,
        )
        self.variable_encoder = nn.TransformerEncoder(
            variable_layer,
            num_layers=variable_layers,
            enable_nested_tensor=False,
        )
        self.target_query = nn.Parameter(torch.zeros(1, 1, d_model))
        self.target_attention = nn.MultiheadAttention(
            d_model,
            n_heads,
            dropout=dropout,
            batch_first=True,
        )

        self.x_lstm = nn.LSTM(
            input_size=num_x,
            hidden_size=lstm_hidden,
            batch_first=True,
        )
        self.x_lstm_projection = nn.Linear(lstm_hidden, d_model)

        y_hidden = max(8, lstm_hidden // 2)
        self.y_lstm = nn.LSTM(
            input_size=1,
            hidden_size=y_hidden,
            batch_first=True,
        )
        self.y_lstm_projection = nn.Linear(y_hidden, d_model)
        self.no_y_context = nn.Parameter(torch.zeros(1, d_model))

        self.current_x_projection = nn.Sequential(
            nn.Linear(num_x, d_model),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model, d_model),
        )
        self.fusion_weights = nn.Linear(d_model * 4, 4)
        self.output_head = nn.Sequential(
            nn.LayerNorm(d_model),
            nn.Linear(d_model, d_model),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model, 1),
        )

        nn.init.trunc_normal_(self.patch_position, std=0.02)
        nn.init.trunc_normal_(self.variable_embedding, std=0.02)
        nn.init.trunc_normal_(self.target_query, std=0.02)
        nn.init.trunc_normal_(self.no_y_context, std=0.02)

    def forward(
        self,
        x_sequence: torch.Tensor,
        y_history: torch.Tensor,
    ) -> torch.Tensor:
        batch_size = x_sequence.shape[0]

        patches = (
            x_sequence.transpose(1, 2)
            .unfold(
                dimension=-1,
                size=self.patch_len,
                step=self.patch_stride,
            )
        )
        patch_tokens = (
            self.patch_projection(patches)
            + self.patch_position
            + self.variable_embedding
        )
        patch_tokens = patch_tokens.reshape(
            batch_size * self.num_x,
            self.num_patches,
            self.d_model,
        )
        patch_tokens = self.temporal_encoder(patch_tokens)
        variable_tokens = patch_tokens.mean(dim=1).reshape(
            batch_size,
            self.num_x,
            self.d_model,
        )
        variable_tokens = self.variable_encoder(variable_tokens)

        query = self.target_query.expand(batch_size, -1, -1)
        timepro_context, _ = self.target_attention(
            query,
            variable_tokens,
            variable_tokens,
            need_weights=False,
        )
        timepro_context = timepro_context[:, 0, :]

        _, (x_hidden, _) = self.x_lstm(x_sequence)
        x_context = self.x_lstm_projection(x_hidden[-1])

        if self.y_lags > 0:
            _, (y_hidden, _) = self.y_lstm(y_history)
            y_context = self.y_lstm_projection(y_hidden[-1])
        else:
            y_context = self.no_y_context.expand(batch_size, -1)

        current_context = self.current_x_projection(x_sequence[:, -1, :])
        all_context = torch.cat(
            [timepro_context, x_context, y_context, current_context],
            dim=-1,
        )
        weights = torch.softmax(self.fusion_weights(all_context), dim=-1)
        stacked = torch.stack(
            [timepro_context, x_context, y_context, current_context],
            dim=1,
        )
        fused = (stacked * weights.unsqueeze(-1)).sum(dim=1)
        return self.output_head(fused).squeeze(-1)


def build_model(num_x: int, params: dict[str, Any]) -> TimeProLSTMFusion:
    return TimeProLSTMFusion(
        num_x=num_x,
        x_window=int(params["x_window"]),
        y_lags=int(params["y_lags"]),
        patch_len=int(params["patch_len"]),
        d_model=int(params["d_model"]),
        n_heads=int(params["n_heads"]),
        temporal_layers=int(params["temporal_layers"]),
        variable_layers=int(params["variable_layers"]),
        lstm_hidden=int(params["lstm_hidden"]),
        dropout=float(params["dropout"]),
    )


def count_parameters(model: nn.Module) -> int:
    return sum(math.prod(parameter.shape) for parameter in model.parameters())


# =============================================================================
# 训练、自动调参与验证
# =============================================================================


def seed_everything(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def choose_device() -> torch.device:
    requested = DEVICE.lower()
    if requested == "auto":
        return torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if requested == "cuda" and not torch.cuda.is_available():
        print("未检测到 CUDA，自动改用 CPU。")
        return torch.device("cpu")
    return torch.device(requested)


def split_station_ids(
    station_ids: Sequence[Any],
    train_ratio: float,
    seed: int,
) -> tuple[list[Any], list[Any]]:
    ids = list(pd.unique(pd.Series(station_ids)))
    if len(ids) < 4:
        raise ValueError("站点数量不足，无法继续做按站点划分。")
    rng = np.random.default_rng(seed)
    rng.shuffle(ids)
    train_count = int(round(len(ids) * train_ratio))
    train_count = min(max(train_count, 2), len(ids) - 1)
    return ids[:train_count], ids[train_count:]


def make_loader(
    dataset: StationSequenceDataset,
    batch_size: int,
    shuffle: bool,
    seed: int,
) -> DataLoader:
    generator = torch.Generator()
    generator.manual_seed(seed)
    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=shuffle,
        num_workers=NUM_WORKERS,
        pin_memory=torch.cuda.is_available(),
        generator=generator,
    )


@dataclass
class FitResult:
    state_dict: dict[str, torch.Tensor]
    best_epoch: int
    best_val_loss: float


def fit_with_early_stopping(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    device: torch.device,
    params: dict[str, Any],
) -> FitResult:
    model.to(device)
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=float(params["learning_rate"]),
        weight_decay=float(params["weight_decay"]),
    )
    criterion = nn.MSELoss()
    best_loss = float("inf")
    best_epoch = 1
    best_state = copy.deepcopy(model.state_dict())
    wait = 0

    for epoch in range(1, MAX_EPOCHS + 1):
        model.train()
        for x_sequence, y_history, target, _ in train_loader:
            optimizer.zero_grad(set_to_none=True)
            prediction = model(
                x_sequence.to(device),
                y_history.to(device),
            )
            loss = criterion(prediction, target.to(device))
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

        model.eval()
        val_sum = 0.0
        val_count = 0
        with torch.inference_mode():
            for x_sequence, y_history, target, _ in val_loader:
                prediction = model(
                    x_sequence.to(device),
                    y_history.to(device),
                )
                loss = criterion(prediction, target.to(device))
                val_sum += float(loss.item()) * len(target)
                val_count += len(target)
        val_loss = val_sum / max(val_count, 1)

        if val_loss < best_loss - 1e-6:
            best_loss = val_loss
            best_epoch = epoch
            best_state = copy.deepcopy(model.state_dict())
            wait = 0
        else:
            wait += 1
            if wait >= EARLY_STOPPING_PATIENCE:
                break

    return FitResult(best_state, best_epoch, best_loss)


def fit_fixed_epochs(
    model: nn.Module,
    loader: DataLoader,
    device: torch.device,
    params: dict[str, Any],
    epochs: int,
) -> list[float]:
    model.to(device)
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=float(params["learning_rate"]),
        weight_decay=float(params["weight_decay"]),
    )
    criterion = nn.MSELoss()
    losses: list[float] = []

    for epoch in range(1, epochs + 1):
        model.train()
        loss_sum = 0.0
        sample_count = 0
        for x_sequence, y_history, target, _ in loader:
            optimizer.zero_grad(set_to_none=True)
            prediction = model(
                x_sequence.to(device),
                y_history.to(device),
            )
            loss = criterion(prediction, target.to(device))
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            loss_sum += float(loss.item()) * len(target)
            sample_count += len(target)
        epoch_loss = loss_sum / max(sample_count, 1)
        losses.append(epoch_loss)
        if epoch == 1 or epoch == epochs or epoch % 5 == 0:
            print(f"  epoch {epoch:>3}/{epochs} loss={epoch_loss:.5f}")
    return losses


def regression_metrics(
    observed: np.ndarray,
    predicted: np.ndarray,
) -> dict[str, float]:
    return {
        "r2": float(r2_score(observed, predicted)),
        "rmse": float(np.sqrt(mean_squared_error(observed, predicted))),
        "mae": float(mean_absolute_error(observed, predicted)),
    }


def evaluate_model(
    model: nn.Module,
    dataset: StationSequenceDataset,
    batch_size: int,
    device: torch.device,
    scaler: Standardization,
) -> tuple[dict[str, float], pd.DataFrame]:
    loader = make_loader(dataset, batch_size, False, RANDOM_SEED)
    predictions: list[np.ndarray] = []
    targets: list[np.ndarray] = []
    indices: list[np.ndarray] = []

    model.eval()
    with torch.inference_mode():
        for x_sequence, y_history, target, sample_index in loader:
            prediction = model(
                x_sequence.to(device),
                y_history.to(device),
            )
            predictions.append(prediction.cpu().numpy())
            targets.append(target.numpy())
            indices.append(sample_index.numpy())

    predicted = scaler.inverse_y(np.concatenate(predictions))
    observed = scaler.inverse_y(np.concatenate(targets))
    sample_indices = np.concatenate(indices).astype(int)
    metadata = [dataset.metadata[index] for index in sample_indices]
    result = pd.DataFrame(
        {
            "site_id": [item[0] for item in metadata],
            "date": [item[1] for item in metadata],
            "observed": observed,
            "predicted": predicted,
        }
    )
    return regression_metrics(observed, predicted), result


def search_space() -> dict[str, list[Any]]:
    common = {
        "d_model": [16, 24, 32],
        "n_heads": [2, 4],
        "temporal_layers": [1, 2],
        "variable_layers": [1, 2],
        "lstm_hidden": [16, 32],
        "dropout": [0.05, 0.15, 0.25],
        "learning_rate": [0.0003, 0.0007, 0.001],
        "weight_decay": [0.0, 0.0001],
    }
    if TIME_SCALE == "monthly":
        return {
            "x_window": [1, 3, 6, 12, 24],
            "y_lags": [0, 1, 3, 6, 12],
            "patch_len": [1, 3, 6],
            "batch_size": [64, 128],
            **common,
        }
    return {
        "x_window": [1, 2, 3, 5],
        "y_lags": [0, 1, 2, 3],
        "patch_len": [1, 2],
        "batch_size": [32, 64, 128],
        **common,
    }


def representative_windows() -> tuple[int, int]:
    return (12, 3) if TIME_SCALE == "monthly" else (3, 1)


def is_valid_params(params: dict[str, Any]) -> bool:
    return (
        int(params["patch_len"]) <= int(params["x_window"])
        and int(params["d_model"]) % int(params["n_heads"]) == 0
    )


def model_variant(params: dict[str, Any]) -> str:
    if int(params["x_window"]) == 1 and int(params["y_lags"]) == 0:
        return "M0_current_X"
    if int(params["y_lags"]) == 0:
        return "M1_window_X"
    return "M2_window_X_history_Y"


def build_trial_params() -> list[dict[str, Any]]:
    space = search_space()
    representative_x, representative_y = representative_windows()
    default = {
        "x_window": representative_x,
        "y_lags": representative_y,
        "patch_len": min(3, representative_x),
        "d_model": 24,
        "n_heads": 4,
        "temporal_layers": 1,
        "variable_layers": 1,
        "lstm_hidden": 32,
        "dropout": 0.15,
        "learning_rate": 0.0007,
        "weight_decay": 0.0001,
        "batch_size": 64,
    }

    m0 = dict(default)
    m0.update({"x_window": 1, "y_lags": 0, "patch_len": 1})
    m1 = dict(default)
    m1["y_lags"] = 0
    m2 = dict(default)
    trials = [m0, m1, m2]

    rng = random.Random(RANDOM_SEED)
    keys = list(space)
    seen = {json.dumps(item, sort_keys=True) for item in trials}
    target_count = max(3, NUM_TRIALS)
    while len(trials) < target_count:
        params = {key: rng.choice(space[key]) for key in keys}
        signature = json.dumps(params, sort_keys=True)
        if is_valid_params(params) and signature not in seen:
            trials.append(params)
            seen.add(signature)
    return trials


def save_plots(
    prediction_frame: pd.DataFrame,
    trial_frame: pd.DataFrame,
) -> None:
    observed = prediction_frame["observed"].to_numpy()
    predicted = prediction_frame["predicted"].to_numpy()
    lower = min(float(observed.min()), float(predicted.min()))
    upper = max(float(observed.max()), float(predicted.max()))

    fig, ax = plt.subplots(figsize=(6.2, 5.6), dpi=150)
    ax.scatter(observed, predicted, s=12, alpha=0.45, edgecolors="none")
    ax.plot([lower, upper], [lower, upper], "--", color="black")
    ax.set_xlabel("Observed Y")
    ax.set_ylabel("Predicted Y")
    ax.set_title("Held-out station validation")
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "validation_scatter.png")
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(6.2, 4.5), dpi=150)
    residual = predicted - observed
    ax.scatter(predicted, residual, s=12, alpha=0.45, edgecolors="none")
    ax.axhline(0, linestyle="--", color="black")
    ax.set_xlabel("Predicted Y")
    ax.set_ylabel("Residual")
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "validation_residuals.png")
    plt.close(fig)

    successful = trial_frame[trial_frame["status"] == "ok"]
    fig, ax = plt.subplots(figsize=(7.2, 4.2), dpi=150)
    ax.bar(
        successful["trial"].astype(str),
        successful["internal_r2"],
        color="#3d7ea6",
    )
    ax.set_xlabel("Trial")
    ax.set_ylabel("Internal station R2")
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "parameter_search.png")
    plt.close(fig)


def train_pipeline(
    frame: pd.DataFrame,
    feature_columns: list[str],
) -> dict[str, Any]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    device = choose_device()
    seed_everything(RANDOM_SEED)

    all_sites = frame[SITE_COLUMN].unique().tolist()
    train_sites, held_out_sites = split_station_ids(
        all_sites,
        TRAIN_STATION_RATIO,
        RANDOM_SEED,
    )
    tuning_train_sites, tuning_val_sites = split_station_ids(
        train_sites,
        0.82,
        RANDOM_SEED + 17,
    )

    pd.DataFrame(
        {
            "site_id": [str(item) for item in train_sites + held_out_sites],
            "split": (
                ["train_pool"] * len(train_sites)
                + ["held_out"] * len(held_out_sites)
            ),
        }
    ).to_csv(OUTPUT_DIR / "station_split.csv", index=False)

    tuning_rows = frame[frame[SITE_COLUMN].isin(tuning_train_sites)]
    tuning_scaler = Standardization.fit(
        tuning_rows,
        feature_columns + [TARGET_COLUMN],
    )

    print(
        f"总站点 {len(all_sites)}，训练池 {len(train_sites)}，"
        f"最终独立验证 {len(held_out_sites)}"
    )
    print(
        f"训练池内部调参：训练站点 {len(tuning_train_sites)}，"
        f"验证站点 {len(tuning_val_sites)}"
    )
    print(f"设备：{device}；X：{feature_columns}")

    trial_records: list[dict[str, Any]] = []
    best_params: dict[str, Any] | None = None
    best_internal_r2 = -float("inf")
    best_epoch = 1

    trials = build_trial_params()
    for trial_number, params in enumerate(trials, start=1):
        started = time.time()
        seed_everything(RANDOM_SEED + trial_number)
        try:
            train_dataset = StationSequenceDataset(
                frame,
                tuning_train_sites,
                feature_columns,
                int(params["x_window"]),
                int(params["y_lags"]),
                tuning_scaler,
            )
            val_dataset = StationSequenceDataset(
                frame,
                tuning_val_sites,
                feature_columns,
                int(params["x_window"]),
                int(params["y_lags"]),
                tuning_scaler,
            )
        except ValueError as error:
            trial_records.append(
                {
                    "trial": trial_number,
                    "status": "skipped",
                    "reason": str(error),
                    "variant": model_variant(params),
                    **params,
                }
            )
            print(f"trial {trial_number} 跳过：{error}")
            continue

        model = build_model(len(feature_columns), params)
        train_loader = make_loader(
            train_dataset,
            int(params["batch_size"]),
            True,
            RANDOM_SEED + trial_number,
        )
        val_loader = make_loader(
            val_dataset,
            int(params["batch_size"]),
            False,
            RANDOM_SEED + trial_number,
        )
        fit_result = fit_with_early_stopping(
            model,
            train_loader,
            val_loader,
            device,
            params,
        )
        model.load_state_dict(fit_result.state_dict)
        internal_metrics, _ = evaluate_model(
            model,
            val_dataset,
            int(params["batch_size"]),
            device,
            tuning_scaler,
        )
        elapsed = time.time() - started

        trial_records.append(
            {
                "trial": trial_number,
                "status": "ok",
                "variant": model_variant(params),
                "internal_r2": internal_metrics["r2"],
                "internal_rmse": internal_metrics["rmse"],
                "best_epoch": fit_result.best_epoch,
                "parameters": count_parameters(model),
                "seconds": round(elapsed, 2),
                **params,
            }
        )
        print(
            f"trial {trial_number}/{len(trials)} "
            f"{model_variant(params)} "
            f"R2={internal_metrics['r2']:.4f} "
            f"RMSE={internal_metrics['rmse']:.3f}"
        )
        if internal_metrics["r2"] > best_internal_r2:
            best_internal_r2 = internal_metrics["r2"]
            best_params = dict(params)
            best_epoch = fit_result.best_epoch

    trial_frame = pd.DataFrame(trial_records)
    trial_frame.to_csv(OUTPUT_DIR / "parameter_trials.csv", index=False)
    if best_params is None:
        raise RuntimeError("没有得到可用模型，请检查连续记录长度。")

    final_rows = frame[frame[SITE_COLUMN].isin(train_sites)]
    final_scaler = Standardization.fit(
        final_rows,
        feature_columns + [TARGET_COLUMN],
    )
    final_train_dataset = StationSequenceDataset(
        frame,
        train_sites,
        feature_columns,
        int(best_params["x_window"]),
        int(best_params["y_lags"]),
        final_scaler,
    )
    final_test_dataset = StationSequenceDataset(
        frame,
        held_out_sites,
        feature_columns,
        int(best_params["x_window"]),
        int(best_params["y_lags"]),
        final_scaler,
    )
    seed_everything(RANDOM_SEED + 999)
    final_model = build_model(len(feature_columns), best_params)
    final_loader = make_loader(
        final_train_dataset,
        int(best_params["batch_size"]),
        True,
        RANDOM_SEED + 999,
    )
    final_epochs = max(3, int(best_epoch))
    print(
        f"最优内部 R2={best_internal_r2:.4f}，"
        f"使用全部 70% 训练站点重训 {final_epochs} 轮。"
    )
    final_losses = fit_fixed_epochs(
        final_model,
        final_loader,
        device,
        best_params,
        final_epochs,
    )
    held_out_metrics, predictions = evaluate_model(
        final_model,
        final_test_dataset,
        int(best_params["batch_size"]),
        device,
        final_scaler,
    )

    per_site_records: list[dict[str, Any]] = []
    for station_id, group in predictions.groupby("site_id"):
        if len(group) >= 2:
            per_site_records.append(
                {
                    "site_id": station_id,
                    "n": len(group),
                    **regression_metrics(
                        group["observed"].to_numpy(),
                        group["predicted"].to_numpy(),
                    ),
                }
            )
    per_site = pd.DataFrame(per_site_records)
    per_site.to_csv(
        OUTPUT_DIR / "per_station_metrics.csv",
        index=False,
    )
    median_station_r2 = (
        float(per_site["r2"].median())
        if not per_site.empty
        else float("nan")
    )

    passed = bool(held_out_metrics["r2"] >= R2_THRESHOLD)
    summary = {
        "status": "SUCCESS" if passed else "FAILED_THRESHOLD",
        "success": passed,
        "r2_threshold": R2_THRESHOLD,
        "held_out_metrics": held_out_metrics,
        "median_station_r2": median_station_r2,
        "internal_best_r2": best_internal_r2,
        "best_params": best_params,
        "feature_columns": feature_columns,
        "target_column": TARGET_COLUMN,
        "time_scale": TIME_SCALE,
        "train_station_count": len(train_sites),
        "held_out_station_count": len(held_out_sites),
        "train_sample_count": len(final_train_dataset),
        "held_out_sample_count": len(final_test_dataset),
        "device": str(device),
    }

    predictions.to_csv(
        OUTPUT_DIR / "held_out_predictions.csv",
        index=False,
    )
    with (OUTPUT_DIR / "metrics.json").open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(summary, file, ensure_ascii=False, indent=2)

    checkpoint = {
        "model_state_dict": {
            key: value.detach().cpu()
            for key, value in final_model.state_dict().items()
        },
        "model_params": best_params,
        "feature_columns": feature_columns,
        "target_column": TARGET_COLUMN,
        "site_column": SITE_COLUMN,
        "time_column": TIME_COLUMN,
        "time_scale": TIME_SCALE,
        "scaler": final_scaler.to_dict(),
        "validation_metrics": held_out_metrics,
        "r2_threshold": R2_THRESHOLD,
        "success": passed,
    }
    torch.save(checkpoint, OUTPUT_DIR / "best_model.pt")

    pd.DataFrame(
        {
            "epoch": np.arange(1, len(final_losses) + 1),
            "train_loss": final_losses,
        }
    ).to_csv(OUTPUT_DIR / "final_training_curve.csv", index=False)
    save_plots(predictions, trial_frame)
    return summary


# =============================================================================
# 可选的 GeoTIFF 递推预测
# =============================================================================


def load_checkpoint(
    path: Path,
    device: torch.device,
) -> dict[str, Any]:
    try:
        return torch.load(path, map_location=device, weights_only=False)
    except TypeError:
        return torch.load(path, map_location=device)


def read_window_as_nan(source, window) -> np.ndarray:
    return (
        source.read(1, window=window, masked=True)
        .filled(np.nan)
        .astype(np.float32)
    )


def grid_signature(source) -> tuple[Any, Any, int, int]:
    return source.crs, source.transform, source.width, source.height


def assert_same_grid(source, template, path: Path) -> None:
    if grid_signature(source) != grid_signature(template):
        raise ValueError(f"栅格未对齐：{path}")


def batched_raster_predict(
    model: nn.Module,
    x_raw: np.ndarray,
    y_raw: np.ndarray,
    mean: np.ndarray,
    std: np.ndarray,
    device: torch.device,
) -> np.ndarray:
    x_normalized = (
        x_raw - mean[None, None, :-1]
    ) / std[None, None, :-1]
    y_normalized = (y_raw - mean[-1]) / std[-1]
    outputs: list[np.ndarray] = []
    model.eval()
    with torch.inference_mode():
        for start in range(0, len(x_raw), RASTER_BATCH_PIXELS):
            end = min(start + RASTER_BATCH_PIXELS, len(x_raw))
            prediction = model(
                torch.from_numpy(
                    x_normalized[start:end].astype(np.float32)
                ).to(device),
                torch.from_numpy(
                    y_normalized[start:end].astype(np.float32)
                ).to(device),
            )
            outputs.append(prediction.cpu().numpy())
    normalized = np.concatenate(outputs)
    return normalized * std[-1] + mean[-1]


def matching_names(
    root: Path,
    variables: Sequence[str],
) -> list[str]:
    first = sorted(
        path.name for path in (root / variables[0]).glob(RASTER_PATTERN)
    )
    if not first:
        raise ValueError(f"{root / variables[0]} 中没有找到栅格。")
    first_set = set(first)
    for variable in variables[1:]:
        current = {
            path.name for path in (root / variable).glob(RASTER_PATTERN)
        }
        if current != first_set:
            raise ValueError(
                f"{root} 中变量 {variable} 的时期文件与其他变量不一致。"
            )
    return first


def predict_rasters(summary: dict[str, Any]) -> None:
    try:
        import rasterio
    except ImportError as error:
        raise SystemExit(
            "栅格预测需要 rasterio，请先运行：pip install rasterio"
        ) from error

    if RASTER_ONLY_IF_R2_PASSED and not summary["success"]:
        print("R2 未达到阈值，按照设置跳过栅格预测。")
        return

    device = choose_device()
    checkpoint = load_checkpoint(OUTPUT_DIR / "best_model.pt", device)
    feature_columns = checkpoint["feature_columns"]
    target_column = checkpoint["target_column"]
    params = checkpoint["model_params"]
    x_window = int(params["x_window"])
    y_lags = int(params["y_lags"])
    x_history_count = x_window - 1
    mean = np.asarray(checkpoint["scaler"]["mean"], dtype=np.float32)
    std = np.asarray(checkpoint["scaler"]["std"], dtype=np.float32)

    model = build_model(len(feature_columns), params)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()

    future_names = matching_names(
        RASTER_FUTURE_DIR,
        feature_columns,
    )
    if x_history_count > 0:
        history_x_names = matching_names(
            RASTER_HISTORY_DIR,
            feature_columns,
        )[-x_history_count:]
        if len(history_x_names) < x_history_count:
            raise ValueError(
                f"历史 X 期数不足，模型需要 {x_history_count} 期。"
            )
    else:
        history_x_names = []

    if y_lags > 0:
        history_y_names = sorted(
            path.name
            for path in (RASTER_HISTORY_DIR / target_column).glob(
                RASTER_PATTERN
            )
        )[-y_lags:]
        if len(history_y_names) < y_lags:
            raise ValueError(
                f"历史 Y 期数不足，模型需要 {y_lags} 期。"
            )
    else:
        history_y_names = []

    RASTER_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(
        f"开始栅格预测：X窗口={x_window}，历史Y={y_lags}，"
        f"未来{len(future_names)}期。"
    )

    with ExitStack() as stack:
        x_history_sources = {
            variable: [
                stack.enter_context(
                    rasterio.open(
                        RASTER_HISTORY_DIR / variable / filename
                    )
                )
                for filename in history_x_names
            ]
            for variable in feature_columns
        }
        y_history_sources = [
            stack.enter_context(
                rasterio.open(
                    RASTER_HISTORY_DIR / target_column / filename
                )
            )
            for filename in history_y_names
        ]
        future_sources = {
            variable: [
                stack.enter_context(
                    rasterio.open(
                        RASTER_FUTURE_DIR / variable / filename
                    )
                )
                for filename in future_names
            ]
            for variable in feature_columns
        }

        template = future_sources[feature_columns[0]][0]
        for variable in feature_columns:
            for source in x_history_sources[variable]:
                assert_same_grid(source, template, Path(source.name))
            for source in future_sources[variable]:
                assert_same_grid(source, template, Path(source.name))
        for source in y_history_sources:
            assert_same_grid(source, template, Path(source.name))

        profile = template.profile.copy()
        profile.update(
            dtype="float32",
            count=1,
            nodata=RASTER_OUTPUT_NODATA,
            compress="deflate",
            BIGTIFF="IF_SAFER",
        )
        output_sources = [
            stack.enter_context(
                rasterio.open(
                    RASTER_OUTPUT_DIR / filename,
                    "w",
                    **profile,
                )
            )
            for filename in future_names
        ]

        for block_number, (_, window) in enumerate(
            template.block_windows(1),
            start=1,
        ):
            pixel_count = int(window.height) * int(window.width)
            x_steps: list[np.ndarray] = []
            for time_index in range(x_history_count):
                x_steps.append(
                    np.column_stack(
                        [
                            read_window_as_nan(
                                x_history_sources[variable][time_index],
                                window,
                            ).reshape(-1)
                            for variable in feature_columns
                        ]
                    )
                )
            if x_steps:
                x_history = np.stack(x_steps, axis=1)
            else:
                x_history = np.empty(
                    (pixel_count, 0, len(feature_columns)),
                    dtype=np.float32,
                )

            if y_lags > 0:
                y_history = np.stack(
                    [
                        read_window_as_nan(source, window).reshape(-1)
                        for source in y_history_sources
                    ],
                    axis=1,
                )[:, :, None]
            else:
                y_history = np.zeros(
                    (pixel_count, 1, 1),
                    dtype=np.float32,
                )

            for time_index, output_source in enumerate(output_sources):
                current_x = np.column_stack(
                    [
                        read_window_as_nan(
                            future_sources[variable][time_index],
                            window,
                        ).reshape(-1)
                        for variable in feature_columns
                    ]
                )
                x_sequence = np.concatenate(
                    [x_history, current_x[:, None, :]],
                    axis=1,
                )
                active = np.isfinite(x_sequence).all(axis=(1, 2))
                if y_lags > 0:
                    active &= np.isfinite(y_history).all(axis=(1, 2))

                output_flat = np.full(
                    pixel_count,
                    RASTER_OUTPUT_NODATA,
                    dtype=np.float32,
                )
                if active.any():
                    output_flat[active] = batched_raster_predict(
                        model,
                        x_sequence[active],
                        y_history[active],
                        mean,
                        std,
                        device,
                    ).astype(np.float32)

                output_source.write(
                    output_flat.reshape(
                        int(window.height),
                        int(window.width),
                    ),
                    1,
                    window=window,
                )

                if x_history_count > 0:
                    x_history = x_sequence[:, -x_history_count:, :]
                if y_lags > 0:
                    appended_y = output_flat.copy()
                    appended_y[~active] = np.nan
                    y_history = np.concatenate(
                        [y_history, appended_y[:, None, None]],
                        axis=1,
                    )[:, -y_lags:, :]

            if block_number % 20 == 0:
                print(f"已处理 {block_number} 个栅格块。")

    print(f"栅格预测完成：{RASTER_OUTPUT_DIR}")


# =============================================================================
# 主入口
# =============================================================================


def main() -> None:
    validate_time_scale()
    frame, feature_columns = load_station_csv()
    summary = train_pipeline(frame, feature_columns)
    metrics = summary["held_out_metrics"]

    print("\n" + "=" * 64)
    print(
        f"独立站点验证 R2={metrics['r2']:.4f}，"
        f"RMSE={metrics['rmse']:.3f}，"
        f"MAE={metrics['mae']:.3f}"
    )
    print(f"逐站点 R2 中位数={summary['median_station_r2']:.4f}")
    if summary["success"]:
        print(f"建模成功，R2 达到阈值 {R2_THRESHOLD:.2f}。")
    else:
        print(f"未达到阈值 {R2_THRESHOLD:.2f}，请勿强行解释模型。")
    print(f"结果目录：{OUTPUT_DIR}")
    print("=" * 64)

    if RUN_RASTER_PREDICTION:
        predict_rasters(summary)


if __name__ == "__main__":
    main()
