import ee
import geemap
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


def scale_ndvi(image):
    ndvi = image.select(config.MODIS_NDVI_BAND).multiply(config.MODIS_NDVI_SCALE)
    return ndvi.rename("ndvi").copyProperties(image, ["system:time_start"])


def sample_one_image(image, points):
    date = ee.Date(image.get("system:time_start")).format("YYYY-MM-dd")
    sampled = image.sampleRegions(
        collection=points,
        scale=250,
        geometries=True,
    )
    return sampled.map(lambda f: f.set("date", date))


def main():
    ee.Initialize()
    points = points_csv_to_feature_collection(config.POINTS_CSV)

    collection = (
        ee.ImageCollection(config.MODIS_NDVI_COLLECTION)
        .filterDate(config.START_DATE, config.END_DATE)
        .map(scale_ndvi)
    )

    sampled = collection.map(lambda img: sample_one_image(img, points)).flatten()

    task = ee.batch.Export.table.toDrive(
        collection=sampled,
        description="modis_ndvi_points_timeseries",
        folder=config.DRIVE_FOLDER,
        fileNamePrefix="modis_ndvi_points_timeseries",
        fileFormat="CSV",
    )
    task.start()
    print("MODIS NDVI 样点时间序列导出任务已提交，请到 Earth Engine Tasks 或 Google Drive 查看。")


if __name__ == "__main__":
    main()
