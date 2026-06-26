# xclim 气候指标与遥感生态研究示例模板

这是一份博客配套模板，用于演示如何把 NetCDF 气候数据转化为可用于遥感生态研究的气候胁迫指标。示例代码以合成数据为主，真实研究时可替换为 ERA5、ERA5-Land、CRU、CMIP6 或其它气候数据。

## 文件说明

| 文件 | 作用 |
|---|---|
| `requirements.txt` | Python 依赖 |
| `01_create_demo_climate_data.py` | 生成合成日尺度温度和降水 NetCDF |
| `02_compute_xclim_indices.py` | 使用 xclim 计算气候指标 |
| `03_prepare_ecology_model_table.py` | 把气候指标整理成生态模型可用的表格 |

## 安装

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

如果 Windows 下安装依赖不顺利，建议使用 Conda：

```bash
conda create -n climate-indices python=3.11
conda activate climate-indices
conda install -c conda-forge xarray dask netcdf4 xclim pandas numpy
```

## 运行

```bash
python 01_create_demo_climate_data.py
python 02_compute_xclim_indices.py
python 03_prepare_ecology_model_table.py
```

输出文件：

```text
data/demo_daily_climate.nc
output/climate_indices_annual.nc
output/ecology_model_climate_table.csv
```

## 真实数据替换建议

真实研究中，可将 `demo_daily_climate.nc` 替换为 ERA5-Land 或 CMIP6 的日尺度数据。注意：

- 温度单位通常需要转换为 `degC` 或 `K`，并带 CF-compliant units；
- 降水单位可能是 `mm/day`、`kg m-2 s-1` 或累计量，需要统一；
- 极端气候指标通常要求日尺度数据；
- 大区域长时间序列建议使用 dask 分块计算。
