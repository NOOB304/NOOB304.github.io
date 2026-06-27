"""调用 InVEST 3.20 Carbon Storage and Sequestration 模型。"""

import logging
import sys
from importlib.metadata import version
from pathlib import Path

import natcap.invest.utils
from natcap.invest.carbon import carbon

from config import ALTERNATE_YEAR
from config import ANNUAL_PRICE_CHANGE
from config import BASELINE_YEAR
from config import CALCULATE_SEQUESTRATION
from config import CARBON_POOLS_PATH
from config import DISCOUNT_RATE
from config import LULC_ALTERNATE_PATH
from config import LULC_BASELINE_PATH
from config import N_WORKERS
from config import PRICE_PER_METRIC_TON_OF_C
from config import RESULTS_SUFFIX
from config import RUN_VALUATION
from config import WORKSPACE_DIR


def configure_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            fmt=natcap.invest.utils.LOG_FMT,
            datefmt="%Y-%m-%d %H:%M:%S ",
        )
    )
    logging.basicConfig(level=logging.INFO, handlers=[handler])


def build_args() -> dict:
    args = {
        "workspace_dir": str(WORKSPACE_DIR),
        "results_suffix": RESULTS_SUFFIX,
        "n_workers": N_WORKERS,
        "lulc_bas_path": str(LULC_BASELINE_PATH),
        "carbon_pools_path": str(CARBON_POOLS_PATH),
        "calc_sequestration": CALCULATE_SEQUESTRATION,
        "do_valuation": RUN_VALUATION,
    }

    if CALCULATE_SEQUESTRATION:
        args["lulc_alt_path"] = str(LULC_ALTERNATE_PATH)

    if RUN_VALUATION:
        args.update(
            {
                "lulc_bas_year": BASELINE_YEAR,
                "lulc_alt_year": ALTERNATE_YEAR,
                "price_per_metric_ton_of_c": PRICE_PER_METRIC_TON_OF_C,
                "discount_rate": DISCOUNT_RATE,
                "rate_change": ANNUAL_PRICE_CHANGE,
            }
        )
    return args


def main() -> None:
    configure_logging()
    WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)

    invest_version = version("natcap.invest")
    if invest_version != "3.20.0":
        print(
            f"警告：当前 natcap.invest 版本为 {invest_version}，"
            "本模板按 3.20.0 的参数名编写。"
        )

    args = build_args()
    validation_messages = carbon.validate(args)
    if validation_messages:
        print("InVEST 参数检查未通过：")
        for keys, message in validation_messages:
            print(f"  {keys}: {message}")
        raise SystemExit(1)

    output_registry = carbon.execute(args)

    print("\n模型运行完成。主要输出：")
    for output_id, output_path in sorted(output_registry.items()):
        if output_id not in {
            "c_storage_bas",
            "c_storage_alt",
            "c_change_bas_alt",
            "summary_csv",
        }:
            continue
        path = Path(output_path)
        if path.exists():
            print(f"  {output_id}: {path}")


if __name__ == "__main__":
    main()
