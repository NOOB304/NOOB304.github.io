from pathlib import Path

import xarray as xr
import xclim.indices as xci


DATA_FILE = Path("data/demo_daily_climate.nc")
OUTPUT_DIR = Path("output")
OUTPUT_DIR.mkdir(exist_ok=True)


def main():
    if not DATA_FILE.exists():
        raise FileNotFoundError("请先运行：python 01_create_demo_climate_data.py")

    ds = xr.open_dataset(DATA_FILE, chunks={"time": 365})
    tas = ds["tas"]
    pr = ds["pr"]

    # 生长季热量条件：年平均温度
    annual_mean_temp = tas.resample(time="YS").mean()
    annual_mean_temp.name = "annual_mean_temp"
    annual_mean_temp.attrs["units"] = tas.attrs.get("units", "degC")

    # 年降水量
    annual_precip = pr.resample(time="YS").sum()
    annual_precip.name = "annual_precip"
    annual_precip.attrs["units"] = "mm"

    # 暖日数：日均温高于 25 摄氏度的天数
    warm_days = xci.tx_days_above(tas, thresh="25 degC", freq="YS")
    warm_days.name = "warm_days_above_25degC"

    # 强降水日数：日降水量超过 10 mm 的天数
    wet_days = xci.days_over_precip_thresh(pr, thresh="10 mm/day", freq="YS")
    wet_days.name = "heavy_precip_days"

    out = xr.Dataset(
        {
            "annual_mean_temp": annual_mean_temp,
            "annual_precip": annual_precip,
            "warm_days_above_25degC": warm_days,
            "heavy_precip_days": wet_days,
        }
    )

    out_file = OUTPUT_DIR / "climate_indices_annual.nc"
    out.to_netcdf(out_file)
    print(f"xclim 气候指标已保存：{out_file}")


if __name__ == "__main__":
    main()
