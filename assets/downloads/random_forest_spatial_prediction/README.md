# 随机森林点位数据空间预测

目录中有两个脚本。

- `01_train_random_forest.py` 训练模型、搜索参数并评价测试集
- `02_predict_new_area.py` 读取保存的模型并预测新区域表格

先修改两个脚本顶部的 `PROJECT_DIR`。训练脚本还需要确认 `FEATURE_COLUMNS` 和 `TARGET_COLUMN`。

项目目录按下面的方式准备。

```text
your_project/
├─ data/
│  ├─ training_set.xlsx
│  ├─ test_set.xlsx
│  └─ prediction_grid.xlsx
└─ output/
```

安装依赖并运行。

```powershell
python -m pip install -r requirements.txt
python 01_train_random_forest.py
python 02_predict_new_area.py
```
