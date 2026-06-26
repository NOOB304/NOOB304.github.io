from pathlib import Path

import numpy as np
import pandas as pd
import xarray as xr


DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)


def main():
    rng = np.random.default_rng(42)
    time = pd.date_range("2001-01-01", "2010-12-31", freq="D")
    lat = np.linspace(24.5, 29.5, 20)
    lon = np.linspace(104.0, 109.5, 24)

    day_of_year = time.dayofyear.to_numpy()
    seasonal_temp = 15 + 10 * np.sin(2 * np.pi * (day_of_year - 90) / 365)
    seasonal_precip = 3 + 2 * np.sin(2 * np.pi * (day_of_year - 120) / 365)

    temp = (
        seasonal_temp[:, None, None]
        - 0.4 * (lat[None, :, None] - lat.mean())
        + rng.normal(0, 2.0, size=(len(time), len(lat), len(lon)))
    )
    precip = (
        seasonal_precip[:, None, None]
        + rng.gamma(shape=1.5, scale=1.2, size=(len(time), len(lat), len(lon)))
    ).clip(0, None)

    ds = xr.Dataset(
        data_vars={
            "tas": (("time", "lat", "lon"), temp),
            "pr": (("time", "lat", "lon"), precip),
        },
        coords={"time": time, "lat": lat, "lon": lon},
    )
    ds["tas"].attrs["units"] = "degC"
    ds["pr"].attrs["units"] = "mm/day"
    ds["lat"].attrs["units"] = "degrees_north"
    ds["lon"].attrs["units"] = "degrees_east"

    out_file = DATA_DIR / "demo_daily_climate.nc"
    ds.to_netcdf(out_file)
    print(f"合成气候数据已保存：{out_file}")


if __name__ == "__main__":
    main()
