# TimePro-inspired多变量时序预测

主代码为 `timepro_ecology_forecast.py`。

打开代码顶部的用户配置区，修改站点CSV和输出目录即可开始训练。

```python
STATION_CSV = Path("data/station_data.csv")
OUTPUT_DIR = Path("timepro_results")
```

安装依赖并运行。

```powershell
python -m pip install -r requirements.txt
python timepro_ecology_forecast.py
```

代码按站点划分训练集和验证集，比较M0、M1、M2并搜索参数。栅格预测默认关闭，需要时将 `RUN_RASTER_PREDICTION` 改为 `True`。
