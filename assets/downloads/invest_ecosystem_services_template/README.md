# InVEST 3.20 碳储量与土地利用情景模板

这套模板演示如何用 InVEST 3.20.0 Carbon Storage and Sequestration 模型，把两期土地利用栅格和碳库参数表转换为：

- 基准情景碳储量密度图；
- 替代情景碳储量密度图；
- 两个情景之间的碳储量变化图；
- 区域总碳储量、增汇区、损失区和平均年变化汇总表。

示例数据完全是为了跑通流程而构造的，不代表任何真实地区，也不能用于论文结论。

## 1. 文件说明

```text
invest_ecosystem_services_template/
├─ README.md
├─ environment.yml
├─ requirements.txt
├─ config.py
├─ 01_create_demo_inputs.py
├─ 02_validate_inputs.py
├─ 03_run_invest_carbon.py
├─ 04_summarize_outputs.py
├─ data/
│  └─ carbon_pools.csv
└─ workspace/
```

各文件的作用：

| 文件 | 作用 |
|---|---|
| `environment.yml` | 用 conda/mamba 安装 InVEST、GDAL、rasterio 和 pandas |
| `config.py` | 集中设置数据路径、情景年份和模型开关 |
| `01_create_demo_inputs.py` | 生成两个小型土地利用 GeoTIFF 和示例碳库表 |
| `02_validate_inputs.py` | 检查投影、像元对齐、分类编码和碳库字段 |
| `03_run_invest_carbon.py` | 调用 InVEST 3.20 Carbon Python API |
| `04_summarize_outputs.py` | 汇总碳储量、增减面积和平均年变化 |
| `data/carbon_pools.csv` | 土地利用编码与四类碳库密度的对应表 |

## 2. 推荐安装方法

InVEST 依赖 GDAL。Windows 下直接执行 `pip install natcap.invest` 可能因 GDAL 编译失败，因此优先使用 Miniforge、conda 或 mamba。

进入本文件夹后执行：

```powershell
mamba env create -f environment.yml
mamba activate invest-carbon
```

没有 mamba 时也可以使用：

```powershell
conda env create -f environment.yml
conda activate invest-carbon
```

验证环境：

```powershell
python -c "from importlib.metadata import version; print(version('natcap.invest'))"
```

预期输出为 `3.20.0`。

`requirements.txt` 主要用于记录 Python 依赖。只有在 GDAL 已经正确安装时，才建议使用：

```powershell
python -m pip install -r requirements.txt
```

## 3. 按顺序运行

```powershell
python 01_create_demo_inputs.py
python 02_validate_inputs.py
python 03_run_invest_carbon.py
python 04_summarize_outputs.py
```

第一步会生成：

```text
data/lulc_baseline_2020.tif
data/lulc_alternate_2030.tif
data/carbon_pools.csv
```

第三步完成后，`workspace/` 中应包含：

```text
c_storage_bas_demo.tif
c_storage_alt_demo.tif
c_change_bas_alt_demo.tif
raster_values_summary_demo.csv
```

第四步会额外生成：

```text
workspace/carbon_output_summary.csv
```

## 4. 换成真实数据

真实研究至少需要准备三个文件。

### 4.1 基准土地利用栅格

- 推荐格式：单波段整数型 GeoTIFF；
- 示例：`lulc_2020.tif`；
- 必须使用投影坐标系，单位为米；
- 每个像元值是土地利用类别编码；
- 所有有效编码都必须出现在碳库参数表中。

### 4.2 替代情景土地利用栅格

- 推荐格式：单波段整数型 GeoTIFF；
- 示例：`lulc_ssp245_2030.tif`；
- 分类体系必须与基准栅格一致；
- 行列数、像元大小、投影和像元网格必须与基准栅格一致。

如果只计算某一期碳储量，可以在 `config.py` 中将 `CALCULATE_SEQUESTRATION` 改为 `False`，并只提供基准栅格。

### 4.3 碳库参数表

CSV 必须包含以下字段：

```csv
lucode,lulc_name,c_above,c_below,c_soil,c_dead
1,forest,120,30,80,10
```

字段含义：

| 字段 | 含义 | 单位 |
|---|---|---|
| `lucode` | 土地利用分类编码 | 整数 |
| `lulc_name` | 类别名称，便于阅读，可选 | 文本 |
| `c_above` | 地上生物量碳密度 | t C/ha |
| `c_below` | 地下生物量碳密度 | t C/ha |
| `c_soil` | 土壤有机碳密度 | t C/ha |
| `c_dead` | 枯落物与死有机质碳密度 | t C/ha |

这里的碳是元素碳，不是二氧化碳当量。缺少某个碳库的可靠数据时，可以把该列全部设为 0，但应在论文中说明由此造成的低估。

把真实文件放入 `data/` 后，修改 `config.py`：

```python
LULC_BASELINE_PATH = DATA_DIR / "lulc_2020.tif"
LULC_ALTERNATE_PATH = DATA_DIR / "lulc_ssp245_2030.tif"
BASELINE_YEAR = 2020
ALTERNATE_YEAR = 2030
```

然后从输入检查脚本开始重新运行：

```powershell
python 02_validate_inputs.py
python 03_run_invest_carbon.py
python 04_summarize_outputs.py
```

## 5. 结果解释

`c_storage_bas_demo.tif` 和 `c_storage_alt_demo.tif` 的单位为 `t C/ha`。`c_change_bas_alt_demo.tif` 等于替代情景减去基准情景：

- 正值：土地利用变化对应的碳储量增加；
- 负值：土地利用变化对应的碳储量损失；
- 0：分类未变，或变化前后碳密度相同。

InVEST Carbon 使用“每种土地利用类别对应一个固定碳密度”的简化假设。它不会模拟光合作用、呼吸、树龄、土壤碳周转、温度或降水变化。因此，这里的变化量不能直接等同于 GPP、NEP、NBP 或观测意义上的年度生态系统碳汇。

## 6. 常见问题

### `ModuleNotFoundError: No module named 'natcap'`

没有激活环境，或 InVEST 没有安装到当前 Python：

```powershell
conda activate invest-carbon
python -c "import natcap.invest; print('InVEST import OK')"
```

### `No module named osgeo` 或 GDAL 编译失败

停止使用当前 `pip` 环境，改用 `environment.yml` 创建 conda/mamba 环境。

### conda 提示 `CondaVerificationError`

这通常是下载缓存不完整、包被安全软件隔离或通道混用造成的。先更新 conda/mamba，并确认只使用 `conda-forge` 且启用严格通道优先级。若仍无法安装，改用 InVEST Workbench 官方安装包，不要在同一个损坏环境里反复覆盖安装。

### 分类编码缺失

运行 `02_validate_inputs.py`。如果提示某个编码不在 `carbon_pools.csv` 中，需要补齐该类别的四个碳库值，或修正土地利用重分类。

### 两期栅格不对齐

不要只看分辨率数值。两期栅格必须具有相同的投影、范围、行列数和仿射变换。可先在 QGIS/ArcGIS 中以基准栅格为捕捉栅格重新投影和重采样。

## 7. 版本与来源

- 模板目标版本：InVEST 3.20.0
- InVEST 许可证：Apache-2.0
- 项目主页：<https://github.com/natcap/invest>
- Carbon 官方文档：<https://storage.googleapis.com/releases.naturalcapitalproject.org/invest-userguide/latest/en/carbonstorage.html>
- 官方 Python 安装说明：<https://invest.readthedocs.io/en/latest/installing.html>
