import ee
import geemap

import config


def load_aoi():
    """读取 GeoJSON 研究区。"""
    return geemap.geojson_to_ee(str(config.AOI_GEOJSON))


def scale_npp(image):
    npp = image.select(config.MODIS_NPP_BAND).multiply(config.MODIS_NPP_SCALE)
    return npp.rename("npp").copyProperties(image, ["system:time_start"])


def main():
    ee.Initialize()
    aoi = load_aoi()

    collection = (
        ee.ImageCollection(config.MODIS_NPP_COLLECTION)
        .filterDate(config.START_DATE, config.END_DATE)
        .map(scale_npp)
    )

    years = list(range(2001, 2021))
    for year in years:
        image = collection.filterDate(f"{year}-01-01", f"{year + 1}-01-01").first()
        if image is None:
            continue

        task = ee.batch.Export.image.toDrive(
            image=image.clip(aoi.geometry()),
            description=f"modis_npp_{year}",
            folder=config.DRIVE_FOLDER,
            fileNamePrefix=f"modis_npp_{year}",
            region=aoi.geometry(),
            scale=500,
            maxPixels=1e13,
        )
        task.start()
        print(f"已提交 MODIS NPP {year} 导出任务")


if __name__ == "__main__":
    main()
