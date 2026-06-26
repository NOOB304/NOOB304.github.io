from pathlib import Path


# ============================================================
# 1. 项目路径
# ============================================================
# 如果你的项目不在 D:/Project-RasterML，请改成自己的路径。
PROJECT_DIR = Path(r"D:/Project-RasterML")

SITE_DIR = PROJECT_DIR / "SiteData"
DATA_FILE = SITE_DIR / "datasite.csv"

RASTER_INPUT_DIR = PROJECT_DIR / "grid_datasite" / "ALL"
RASTER_OUTPUT_BASE = PROJECT_DIR / "grid_datasite"


# ============================================================
# 2. 表格字段
# ============================================================
# TARGET_COL 是要预测的目标变量。
# FEATURES 是解释变量，顺序必须和 RASTER_PREFIXES 一一对应。
TARGET_COL = "Y"
FEATURES = ["X1", "X2", "X3", "X4", "X5"]

# GROUP_COL 用于分层抽样。原始案例用 Month 保证训练集和测试集月份比例一致。
# 如果你的数据没有月份或不需要分层抽样，可以改成 None。
GROUP_COL = "Month"


# ============================================================
# 3. 栅格字段
# ============================================================
# RASTER_PREFIXES 的顺序必须和 FEATURES 一致：
# X1 对应 x1_YYYYMM.tif，X2 对应 x2_YYYYMM.tif，以此类推。
RASTER_PREFIXES = ["x1", "x2", "x3", "x4", "x5"]

# 输出栅格名前缀。比如 Prediction_2000_01.tif。
OUTPUT_PREFIX = "Prediction"

# 输出栅格 NoData 值。
OUT_NODATA = -9999.0


# ============================================================
# 4. 时间范围
# ============================================================
# 原始案例是 2000-2020 年逐月数据。可按自己的数据修改。
YEARS = range(2000, 2021)
MONTHS = range(1, 13)


# ============================================================
# 5. 模型和随机种子
# ============================================================
# 可选：rf, xgb, lgb, cat, svm, gpr
MODEL_NAME = "rf"

TEST_SIZE = 0.2
RANDOM_STATE = 42
CV_FOLDS = 5
