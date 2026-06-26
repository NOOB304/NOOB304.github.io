from pathlib import Path

import pandas as pd
import xarray as xr


INDICES_FILE = Path("output/climate_indices_annual.nc")
OUTPUT_FILE = Path("output/ecology_model_climate_table.csv")


def main():
    if not INDICES_FILE.exists():
        raise FileNotFoundError("请先运行：python 02_compute_xclim_indices.py")

    ds = xr.open_dataset(INDICES_FILE)
    table = ds.to_dataframe().reset_index()
    table["year"] = pd.to_datetime(table["time"]).dt.year
    table = table.drop(columns=["time"])

    # 真实研究中，可以继续把这张表与 NPP/GPP/NDVI/土地利用/地形数据按 lon-lat-year 合并。
    table.to_csv(OUTPUT_FILE, index=False)
    print(f"生态模型气候指标表已保存：{OUTPUT_FILE}")
    print(table.head())


if __name__ == "__main__":
    main()
