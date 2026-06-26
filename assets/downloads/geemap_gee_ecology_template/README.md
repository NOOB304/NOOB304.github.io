# geemap / Google Earth Engine 遥感生态数据自动化模板

这是一份博客配套模板，演示如何使用 geemap 和 Earth Engine Python API 批量提取遥感生态研究常用变量，包括 MODIS NDVI、MODIS NPP、ERA5-Land 气候变量和土地利用数据。

## 重要前提

这些脚本需要你拥有 Google Earth Engine 账号，并完成本机认证。首次使用需要运行：

```bash
earthengine authenticate
```

或者运行：

```bash
python 00_authenticate_gee.py
```

如果你所在网络环境无法访问 Google 服务，脚本不能直接运行。

## 文件说明

| 文件 | 作用 |
|---|---|
| `requirements.txt` | Python 依赖 |
| `config.py` | 研究区、时间范围、导出设置 |
| `00_authenticate_gee.py` | GEE 认证和初始化检查 |
| `01_extract_modis_ndvi_points.py` | 按样点提取 MODIS NDVI 时间序列 |
| `02_export_modis_npp_roi.py` | 按研究区导出年度 MODIS NPP 栅格 |
| `03_extract_era5_monthly_points.py` | 按样点提取 ERA5-Land 月尺度气候变量 |
| `templates/points_template.csv` | 样点 CSV 模板 |
| `templates/aoi_template.geojson` | 研究区 GeoJSON 模板 |

## 安装

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## 运行顺序

```bash
python 00_authenticate_gee.py
python 01_extract_modis_ndvi_points.py
python 02_export_modis_npp_roi.py
python 03_extract_era5_monthly_points.py
```

## 输出

示例脚本默认将表格导出到 Google Drive，栅格也通过 Earth Engine Export 任务导出到 Google Drive。你需要在 Earth Engine Tasks 或 Google Drive 中查看任务结果。

## 真实研究迁移

- 样点提取：把 `templates/points_template.csv` 换成自己的样点；
- 区域导出：把 `templates/aoi_template.geojson` 换成自己的研究区；
- 时间范围：修改 `config.py` 中的 `START_DATE` 和 `END_DATE`；
- 数据集：可替换为 Landsat、Sentinel、MODIS NPP/GPP、ERA5-Land、CHIRPS、ESA WorldCover 等。
