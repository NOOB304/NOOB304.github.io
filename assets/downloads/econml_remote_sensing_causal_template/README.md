# EconML 遥感生态因果森林示例模板

这是一份用于博客配套的最小示例代码，演示如何把“像元/样点表格”用于 CausalForestDML，估计某个处理变量对生态环境结果变量的平均因果效应和异质性因果效应。

示例使用合成数据，不代表真实研究结论。真实应用时需要将遥感栅格、气候数据、土地利用数据和地形数据整理成类似的 CSV 表格。

## 文件说明

| 文件 | 作用 |
|---|---|
| `requirements.txt` | Python 依赖 |
| `01_generate_demo_data.py` | 生成合成像元-年份样本表 |
| `02_fit_causal_forest.py` | 使用 EconML CausalForestDML 估计处理效应 |
| `03_plot_cate_results.py` | 绘制 CATE 分布和异质性分组图 |

## 安装

建议使用 Python 3.10 或 3.11。

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## 运行

```bash
python 01_generate_demo_data.py
python 02_fit_causal_forest.py
python 03_plot_cate_results.py
```

运行后会生成：

```text
data/demo_pixel_panel.csv
output/cate_results.csv
output/summary_metrics.json
output/cate_distribution.png
output/cate_by_human_pressure.png
```

## 数据列含义

| 字段 | 含义 |
|---|---|
| `carbon_sink_change` | 结果变量，可替换为 NPP/GPP/NDVI/土壤保持等 |
| `restoration_intensity` | 处理变量，可替换为生态工程强度、气候异常、土地利用变化等 |
| `precip_anomaly`、`temp_anomaly`、`human_pressure` 等 | 混杂变量或效应修饰变量 |

## 重要提醒

因果森林不是“自动证明因果关系”的黑箱。真实论文中必须说明：

- 为什么处理变量近似可识别；
- 控制了哪些混杂因素；
- 是否存在未观测混杂；
- 结果是否通过稳健性检验；
- 因果效应的解释边界是什么。
