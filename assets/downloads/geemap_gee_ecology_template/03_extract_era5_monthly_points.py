import ee
import pandas as pd

import config


def points_csv_to_feature_collection(csv_file):
    """把包含 id/lon/lat 的 CSV 转成 Earth Engine FeatureCollection。"""
    table = pd.read_csv(csv_file)
    required = {"id", "lon", "lat"}
    if not required.issubset(table.columns):
        raise ValueError("样点 CSV 必须包含 id, lon, lat 三列")

    features = []
    for _, row in table.iterrows():
        geom = ee.Geometry.Point([float(row["lon"]), float(row["lat"])])
        feat = ee.Feature(geom, {"id": str(row["id"])})
        features.append(feat)
    return ee.FeatureCollection(features)


def convert_era5_units(image):
    """将 ERA5-Land 温度从 K 转为摄氏度，降水从 m 转为 mm。"""
    temp_c = image.select("temperature_2m").subtract(273.15).rename("temp_c")
    precip_mm = image.select("total_precipitation_sum").multiply(1000).rename("precip_mm")
    return temp_c.addBands(precip_mm).copyProperties(image, ["system:time_start"])


def sample_one_image(image, points):
    date = ee.Date(image.get("system:time_start")).format("YYYY-MM")
    sampled = image.sampleRegions(
        collection=points,
        scale=10000,
        geometries=True,
    )
    return sampled.map(lambda f: f.set("date", date))


def main():
    ee.Initialize()
    points = points_csv_to_feature_collection(config.POINTS_CSV)

    collection = (
        ee.ImageCollection(config.ERA5_COLLECTION)
        .filterDate(config.START_DATE, config.END_DATE)
        .select(config.ERA5_BANDS)
        .map(convert_era5_units)
    )

    sampled = collection.map(lambda img: sample_one_image(img, points)).flatten()

    task = ee.batch.Export.table.toDrive(
        collection=sampled,
        description="era5_monthly_points_timeseries",
        folder=config.DRIVE_FOLDER,
        fileNamePrefix="era5_monthly_points_timeseries",
        fileFormat="CSV",
    )
    task.start()
    print("ERA5-Land 月尺度样点时间序列导出任务已提交。")


if __name__ == "__main__":
    main()
