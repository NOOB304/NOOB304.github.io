from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parent
TEMPLATE_DIR = PROJECT_DIR / "templates"

POINTS_CSV = TEMPLATE_DIR / "points_template.csv"
AOI_GEOJSON = TEMPLATE_DIR / "aoi_template.geojson"

# Earth Engine 时间范围
START_DATE = "2001-01-01"
END_DATE = "2020-12-31"

# Google Drive 导出文件夹
DRIVE_FOLDER = "gee_ecology_exports"

# MODIS NDVI 数据集
MODIS_NDVI_COLLECTION = "MODIS/061/MOD13Q1"
MODIS_NDVI_BAND = "NDVI"
MODIS_NDVI_SCALE = 0.0001

# MODIS NPP 数据集
MODIS_NPP_COLLECTION = "MODIS/061/MOD17A3HGF"
MODIS_NPP_BAND = "Npp"
MODIS_NPP_SCALE = 0.0001

# ERA5-Land 月尺度聚合数据
ERA5_COLLECTION = "ECMWF/ERA5_LAND/MONTHLY_AGGR"
ERA5_BANDS = [
    "temperature_2m",
    "total_precipitation_sum",
]
