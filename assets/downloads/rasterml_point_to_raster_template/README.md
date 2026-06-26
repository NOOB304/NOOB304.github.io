# 点位数据到栅格预测：配套代码模板

这是一份通用模板，用于完成“样本表格 → 机器学习回归模型 → GeoTIFF 栅格预测”的流程。原始案例文件名中使用了 `GPP`，但这套模板不限于 GPP，也可以用于 NPP、NDVI、LAI、土壤有机碳、碳储量、水质指标、生态质量指数等连续型变量。

## 1. 文件说明

| 文件 | 作用 |
|---|---|
| `requirements.txt` | Python 依赖包列表 |
| `config.py` | 路径、字段名、年份、月份、模型名称等配置 |
| `01_check_inputs.py` | 检查样本表和栅格文件是否符合要求 |
| `02_train_model.py` | 训练模型并保存评价指标和 `.pkl` 模型 |
| `03_predict_raster.py` | 调用训练好的模型，对 GeoTIFF 逐像元预测 |
| `04_compare_metrics.py` | 汇总多个模型的精度指标，生成对比表 |
| `templates/datasite_template.csv` | 样本表格模板，只包含示例格式 |

## 2. 推荐项目结构

建议把本代码包放在 `D:\Project-RasterML\scripts` 下，整体结构如下：

```text
D:\Project-RasterML
├─ SiteData
│  └─ datasite.csv
├─ grid_datasite
│  └─ ALL
│     ├─ x1_200001.tif
│     ├─ x2_200001.tif
│     ├─ x3_200001.tif
│     ├─ x4_200001.tif
│     ├─ x5_200001.tif
│     └─ ...
└─ scripts
   ├─ config.py
   ├─ 01_check_inputs.py
   ├─ 02_train_model.py
   ├─ 03_predict_raster.py
   └─ 04_compare_metrics.py
```

如果你放在其它路径，只需要修改 `config.py` 里的 `PROJECT_DIR`。

## 3. 安装环境

```bash
cd D:\Project-RasterML\scripts
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

如果 `rasterio` 在 Windows 下安装失败，建议使用 Conda：

```bash
conda create -n rasterml python=3.10
conda activate rasterml
conda install -c conda-forge rasterio pandas numpy scikit-learn
pip install xgboost lightgbm catboost joblib matplotlib
```

## 4. 使用步骤

第一步，修改 `config.py`：

- `PROJECT_DIR`：项目根目录；
- `FEATURES`：样本表里的解释变量列名；
- `RASTER_PREFIXES`：栅格文件前缀，顺序必须和 `FEATURES` 一致；
- `TARGET_COL`：目标变量列名；
- `GROUP_COL`：分层抽样列；如果没有月份或分组，可以设为 `None`；
- `YEARS`、`MONTHS`：需要预测的年份和月份。

第二步，检查输入文件：

```bash
python 01_check_inputs.py
```

第三步，训练模型。默认模型由 `config.py` 里的 `MODEL_NAME` 控制，也可以在命令行指定：

```bash
python 02_train_model.py --model rf
python 02_train_model.py --model cat
python 02_train_model.py --model xgb
```

可用模型：

| 参数 | 模型 |
|---|---|
| `rf` | 随机森林 |
| `xgb` | XGBoost |
| `lgb` | LightGBM |
| `cat` | CatBoost |
| `svm` | 支持向量机 |
| `gpr` | 高斯过程回归 |

第四步，使用训练好的模型预测栅格：

```bash
python 03_predict_raster.py --model rf
```

第五步，如果训练了多个模型，可以汇总精度：

```bash
python 04_compare_metrics.py
```

## 5. 输入表格格式

`datasite.csv` 至少需要包含这些列：

```csv
Month,Y,X1,X2,X3,X4,X5
1,0,0,10.86,0,14,0
2,0,0,5.31,0,9,0
3,0,12.3,9.46,0,8.97,1.1
```

其中：

- `Y` 是目标变量，可以改成你自己的变量名，但要同步修改 `config.py`；
- `X1-X5` 是解释变量，可以增减数量，但要同步修改 `FEATURES` 和 `RASTER_PREFIXES`；
- `Month` 是分组列。没有分组需求时，可以在 `config.py` 中设置 `GROUP_COL = None`。

## 6. 输入栅格格式

默认命名规则：

```text
x1_200001.tif
x2_200001.tif
x3_200001.tif
x4_200001.tif
x5_200001.tif
```

这里 `200001` 表示 2000 年 1 月。所有输入栅格必须：

- 行列数一致；
- 坐标系一致；
- 分辨率一致；
- 像元位置对齐；
- 变量顺序和 `FEATURES` 完全对应。

## 7. 输出结果

训练输出会保存在：

```text
SiteData\ML_RF
SiteData\ML_XGB
SiteData\ML_LGB
...
```

栅格预测输出会保存在：

```text
grid_datasite\Result_RF\Prediction_2000_01.tif
grid_datasite\Result_RF\Prediction_2000_02.tif
...
```

如果你要把输出文件名改成自己的变量名，例如 `SOC_2000_01.tif`，可以修改 `config.py` 中的 `OUTPUT_PREFIX`。
