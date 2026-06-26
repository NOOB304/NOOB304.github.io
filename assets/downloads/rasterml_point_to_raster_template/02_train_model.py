import argparse
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import ConstantKernel, RBF
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV, KFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVR

import config


MODEL_DIR_NAMES = {
    "rf": "ML_RF",
    "xgb": "ML_XGB",
    "lgb": "ML_LGB",
    "cat": "ML_CAT",
    "svm": "ML_SVM",
    "gpr": "ML_GPR",
}


def safe_mape(y_true, y_pred):
    """计算 MAPE，并自动跳过真实值为 0 的样本。"""
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    mask = y_true != 0

    if mask.sum() == 0:
        return np.nan

    return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100


def regression_metrics(y_true, y_pred):
    """返回常用回归评价指标。"""
    return {
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "r2": float(r2_score(y_true, y_pred)),
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "mape": float(safe_mape(y_true, y_pred)),
    }


def jsonable_dict(params):
    """把 GridSearchCV 的参数转换成 JSON 友好的格式。"""
    out = {}
    for key, value in params.items():
        if value is None:
            out[key] = None
        elif isinstance(value, (str, int, float, bool)):
            out[key] = value
        else:
            out[key] = str(value)
    return out


def get_model_and_grid(model_name):
    """根据模型名称返回模型对象和参数网格。"""
    if model_name == "rf":
        model = RandomForestRegressor(random_state=config.RANDOM_STATE)
        param_grid = {
            "n_estimators": [100, 200, 300],
            "max_depth": [10, 20, None],
            "min_samples_split": [2, 5, 10],
            "min_samples_leaf": [1, 2, 4],
            "bootstrap": [True, False],
        }
        return model, param_grid

    if model_name == "xgb":
        try:
            from xgboost import XGBRegressor
        except ImportError as exc:
            raise ImportError("需要先安装 xgboost：pip install xgboost") from exc

        model = XGBRegressor(
            objective="reg:squarederror",
            random_state=config.RANDOM_STATE,
        )
        param_grid = {
            "n_estimators": [50, 100, 200],
            "max_depth": [3, 5, 7],
            "learning_rate": [0.01, 0.1, 0.2],
            "subsample": [0.6, 0.8, 1.0],
            "colsample_bytree": [0.6, 0.8, 1.0],
        }
        return model, param_grid

    if model_name == "lgb":
        try:
            from lightgbm import LGBMRegressor
        except ImportError as exc:
            raise ImportError("需要先安装 lightgbm：pip install lightgbm") from exc

        model = LGBMRegressor(random_state=config.RANDOM_STATE)
        param_grid = {
            "num_leaves": [31, 50, 100],
            "max_depth": [-1, 10, 20],
            "learning_rate": [0.01, 0.1, 0.2],
            "n_estimators": [100, 200, 300],
            "min_child_samples": [20, 50, 100],
        }
        return model, param_grid

    if model_name == "cat":
        try:
            from catboost import CatBoostRegressor
        except ImportError as exc:
            raise ImportError("需要先安装 catboost：pip install catboost") from exc

        model = CatBoostRegressor(random_state=config.RANDOM_STATE, silent=True)
        param_grid = {
            "iterations": [100, 200, 300],
            "depth": [4, 6, 10],
            "learning_rate": [0.01, 0.1, 0.2],
            "l2_leaf_reg": [1, 3, 5],
            "border_count": [32, 50, 100],
        }
        return model, param_grid

    if model_name == "svm":
        model = Pipeline(
            steps=[
                ("scaler", StandardScaler()),
                ("model", SVR()),
            ]
        )
        param_grid = {
            "model__C": [0.1, 1, 10, 100],
            "model__epsilon": [0.01, 0.1, 0.2],
            "model__gamma": ["scale", "auto"],
            "model__kernel": ["rbf"],
        }
        return model, param_grid

    if model_name == "gpr":
        kernel = ConstantKernel(1.0) * RBF(length_scale=1.0)
        model = Pipeline(
            steps=[
                ("scaler", StandardScaler()),
                (
                    "model",
                    GaussianProcessRegressor(
                        kernel=kernel,
                        n_restarts_optimizer=5,
                        random_state=config.RANDOM_STATE,
                    ),
                ),
            ]
        )
        param_grid = {
            "model__alpha": [1e-10, 1e-5, 1e-2, 1],
            "model__kernel__k1__constant_value": [0.1, 1, 10],
            "model__kernel__k2__length_scale": [0.1, 1, 10],
        }
        return model, param_grid

    raise ValueError(f"未知模型：{model_name}")


def load_data():
    """读取样本表，并返回 X、y 和分组列。"""
    if not config.DATA_FILE.exists():
        raise FileNotFoundError(f"找不到样本表：{config.DATA_FILE}")

    data = pd.read_csv(config.DATA_FILE)
    required_cols = [config.TARGET_COL] + list(config.FEATURES)

    if config.GROUP_COL is not None:
        required_cols.append(config.GROUP_COL)

    missing_cols = [col for col in required_cols if col not in data.columns]
    if missing_cols:
        raise ValueError(f"样本表缺少这些列：{missing_cols}")

    data = data.dropna(subset=required_cols).copy()
    X = data[config.FEATURES]
    y = data[config.TARGET_COL]
    groups = data[config.GROUP_COL] if config.GROUP_COL is not None else None
    return X, y, groups


def split_data(X, y, groups):
    """划分训练集和测试集；如果分组列可用，则优先分层抽样。"""
    stratify = None

    if groups is not None:
        counts = groups.value_counts()
        if counts.min() >= 2:
            stratify = groups
        else:
            print("分组列中存在样本数少于 2 的组，自动取消分层抽样。")

    return train_test_split(
        X,
        y,
        test_size=config.TEST_SIZE,
        stratify=stratify,
        random_state=config.RANDOM_STATE,
    )


def train(model_name):
    """训练指定模型，并保存模型、参数、指标和预测结果。"""
    if model_name not in MODEL_DIR_NAMES:
        raise ValueError(f"模型名称必须是：{', '.join(MODEL_DIR_NAMES)}")

    out_dir = config.SITE_DIR / MODEL_DIR_NAMES[model_name]
    out_dir.mkdir(parents=True, exist_ok=True)

    X, y, groups = load_data()
    X_train, X_test, y_train, y_test = split_data(X, y, groups)

    model, param_grid = get_model_and_grid(model_name)
    kfold = KFold(
        n_splits=config.CV_FOLDS,
        shuffle=True,
        random_state=config.RANDOM_STATE,
    )

    grid_search = GridSearchCV(
        estimator=model,
        param_grid=param_grid,
        cv=kfold,
        scoring="neg_mean_squared_error",
        n_jobs=-1,
        verbose=1,
    )

    grid_search.fit(X_train, y_train)
    best_model = grid_search.best_estimator_

    y_pred_train = best_model.predict(X_train)
    y_pred_test = best_model.predict(X_test)

    metrics = {
        "model": model_name,
        "best_params": jsonable_dict(grid_search.best_params_),
        "train": regression_metrics(y_train, y_pred_train),
        "test": regression_metrics(y_test, y_pred_test),
    }

    pd.DataFrame([metrics["best_params"]]).to_csv(
        out_dir / "optimized_params.csv",
        index=False,
    )

    with open(out_dir / "model_metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics, f, ensure_ascii=False, indent=2)

    X_train.to_csv(out_dir / "X_train.csv", index=False)
    X_test.to_csv(out_dir / "X_test.csv", index=False)
    y_train.to_frame(config.TARGET_COL).to_csv(out_dir / "y_train.csv", index=False)
    y_test.to_frame(config.TARGET_COL).to_csv(out_dir / "y_test.csv", index=False)
    pd.DataFrame({"y_pred_train": y_pred_train}).to_csv(out_dir / "y_pred_train.csv", index=False)
    pd.DataFrame({"y_pred_test": y_pred_test}).to_csv(out_dir / "y_pred_test.csv", index=False)

    joblib.dump(best_model, out_dir / "trained_model.pkl")

    print("\n训练完成")
    print(f"模型：{model_name}")
    print(f"输出目录：{out_dir}")
    print(f"测试集 R2：{metrics['test']['r2']:.4f}")
    print(f"测试集 RMSE：{metrics['test']['rmse']:.4f}")


def main():
    parser = argparse.ArgumentParser(description="训练点位到栅格预测模型")
    parser.add_argument(
        "--model",
        default=config.MODEL_NAME,
        choices=sorted(MODEL_DIR_NAMES),
        help="模型名称：rf, xgb, lgb, cat, svm, gpr",
    )
    args = parser.parse_args()
    train(args.model)


if __name__ == "__main__":
    main()
