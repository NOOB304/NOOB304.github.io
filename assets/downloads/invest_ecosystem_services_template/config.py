"""集中管理 InVEST Carbon 示例的路径和参数。"""

from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
WORKSPACE_DIR = BASE_DIR / "workspace"

LULC_BASELINE_PATH = DATA_DIR / "lulc_baseline_2020.tif"
LULC_ALTERNATE_PATH = DATA_DIR / "lulc_alternate_2030.tif"
CARBON_POOLS_PATH = DATA_DIR / "carbon_pools.csv"

BASELINE_YEAR = 2020
ALTERNATE_YEAR = 2030
RESULTS_SUFFIX = "demo"

# True：比较两期土地利用并计算碳储量变化。
# False：只计算基准土地利用对应的碳储量。
CALCULATE_SEQUESTRATION = True

# 估值需要可靠的碳价格、折现率与价格变化率。
# 教程默认关闭，避免把演示参数误当成研究依据。
RUN_VALUATION = False
PRICE_PER_METRIC_TON_OF_C = 0.0
DISCOUNT_RATE = 0.0
ANNUAL_PRICE_CHANGE = 0.0

# -1 表示在当前进程中同步运行，便于排错。
N_WORKERS = -1
