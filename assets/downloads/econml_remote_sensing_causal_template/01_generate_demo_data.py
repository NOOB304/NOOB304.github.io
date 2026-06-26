from pathlib import Path

import numpy as np
import pandas as pd


RANDOM_SEED = 42
N_PIXELS = 1200
YEARS = np.arange(2001, 2021)

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)


def main():
    rng = np.random.default_rng(RANDOM_SEED)

    pixel_ids = np.arange(N_PIXELS)
    lon = rng.uniform(104.0, 109.5, size=N_PIXELS)
    lat = rng.uniform(24.5, 29.5, size=N_PIXELS)
    elevation = rng.normal(900, 350, size=N_PIXELS).clip(200, 2200)
    slope = rng.gamma(shape=2.0, scale=6.0, size=N_PIXELS).clip(0, 45)
    karst_index = rng.beta(2.0, 2.5, size=N_PIXELS)
    baseline_ndvi = rng.normal(0.52, 0.12, size=N_PIXELS).clip(0.15, 0.85)
    human_pressure = rng.beta(2.0, 4.0, size=N_PIXELS)

    records = []
    for year in YEARS:
        year_trend = (year - YEARS.min()) / (YEARS.max() - YEARS.min())
        precip_anomaly = rng.normal(0, 1, size=N_PIXELS)
        temp_anomaly = rng.normal(0, 1, size=N_PIXELS)

        # 处理变量：生态恢复强度。这里故意让它与地形、人类压力和岩溶程度相关，
        # 模拟真实研究中“工程并非随机布设”的混杂问题。
        restoration_intensity = (
            0.25
            + 0.35 * karst_index
            + 0.18 * slope / 45
            - 0.22 * human_pressure
            + 0.20 * year_trend
            + rng.normal(0, 0.08, size=N_PIXELS)
        ).clip(0, 1)

        # 真实异质性效应：岩溶程度高、基线 NDVI 低、人类压力低的像元，
        # 恢复强度对碳汇增益的边际效应更大。
        true_effect = (
            0.18
            + 0.22 * karst_index
            + 0.16 * (1 - baseline_ndvi)
            - 0.12 * human_pressure
        )

        carbon_sink_change = (
            0.10 * precip_anomaly
            - 0.06 * temp_anomaly
            + 0.14 * baseline_ndvi
            - 0.08 * human_pressure
            + true_effect * restoration_intensity
            + 0.03 * year_trend
            + rng.normal(0, 0.08, size=N_PIXELS)
        )

        year_df = pd.DataFrame(
            {
                "pixel_id": pixel_ids,
                "year": year,
                "lon": lon,
                "lat": lat,
                "elevation": elevation,
                "slope": slope,
                "karst_index": karst_index,
                "baseline_ndvi": baseline_ndvi,
                "human_pressure": human_pressure,
                "precip_anomaly": precip_anomaly,
                "temp_anomaly": temp_anomaly,
                "restoration_intensity": restoration_intensity,
                "carbon_sink_change": carbon_sink_change,
                "true_effect_demo_only": true_effect,
            }
        )
        records.append(year_df)

    data = pd.concat(records, ignore_index=True)
    out_file = DATA_DIR / "demo_pixel_panel.csv"
    data.to_csv(out_file, index=False)
    print(f"示例数据已生成：{out_file}")
    print(data.head())


if __name__ == "__main__":
    main()
