# LandTrendr 生态扰动与恢复识别模板

这套模板演示如何使用 Google Earth Engine（GEE）内置的 LandTrendr 算法，从 1990—2025 年 Landsat 年度序列中提取：

- 最大植被扰动发生年份；
- 扰动结束年份、持续时间和变化幅度；
- 扰动前后 NBR；
- 变化幅度与拟合误差之比（DSNR）；
- 最大植被恢复发生年份、持续时间和幅度；
- 各年份扰动/恢复面积统计表。

GEE 主脚本是完整的单文件版本，不调用未附带的辅助脚本，也不要求导入外部 LandTrendr 模块。

## 1. 文件结构

```text
landtrendr_ecological_change_template/
├─ README.md
├─ landtrendr_complete.js
├─ environment.yml
├─ requirements.txt
├─ 01_create_demo_change_rasters.py
├─ 02_summarize_change_metrics.py
├─ validation_points_template.csv
├─ data/
│  ├─ demo_landtrendr_disturbance.tif
│  └─ demo_landtrendr_recovery.tif
└─ output/
```

| 文件 | 作用 |
|---|---|
| `landtrendr_complete.js` | 在 GEE 中完成 Landsat 预处理、LandTrendr 拟合、变化提取、地图显示和导出 |
| `01_create_demo_change_rasters.py` | 生成可供本地练习的模拟多波段变化结果 |
| `02_summarize_change_metrics.py` | 按年份汇总扰动/恢复面积、幅度、持续时间和 DSNR |
| `validation_points_template.csv` | 人工判读或 TimeSync 验证点记录模板 |
| `environment.yml` | 本地统计环境 |

## 2. GEE 脚本怎么用

### 第一步：准备 Earth Engine

打开：

<https://code.earthengine.google.com/>

需要已经开通 Google Earth Engine，并选择可用的 Cloud Project。

### 第二步：复制完整脚本

新建一个 Script，把 `landtrendr_complete.js` 的全部内容复制进去。

脚本不需要下面这类外部调用：

```javascript
require('users/某人/某仓库:某脚本.js')
```

所有必要函数都在同一个文件中。

### 第三步：修改研究区

模板中的研究区只是一个小矩形：

```javascript
var AOI = ee.Geometry.Rectangle([109.08, 27.62, 109.18, 27.72]);
```

可以替换为：

- 在 GEE 地图上绘制并自动生成的 `geometry`；
- 上传到 Assets 的研究区矢量；
- 行政区、流域或生态工程区。

大区域第一次运行时，建议先裁出 10—20 km 的小范围测试参数。

### 第四步：检查时间窗口

模板使用：

```javascript
var START_MONTH = 6;
var START_DAY = 1;
var END_MONTH = 9;
var END_DAY = 30;
```

这表示每年 6 月 1 日至 9 月 30 日参与年度中值合成。正式研究应根据植被物候和云量选择固定季节，避免不同年份使用完全不同的物候阶段。

### 第五步：检查阈值

模板默认值：

```javascript
var MIN_DIST_MAG = 0.15;
var MAX_DIST_DUR = 4;
var MIN_REC_MAG = 0.10;
var MIN_REC_DUR = 2;
var MAX_REC_DUR = 10;
var MIN_DSNR = 2.0;
var MIN_PATCH_PIXELS = 11;
```

这些值只用于示范，不能直接当成所有地区的通用参数。应使用样点、历史影像或高分辨率影像验证。

### 第六步：运行和导出

点击 GEE 的 `Run`。地图会显示：

- 最大扰动年份；
- 最大扰动幅度；
- 最大恢复年份；
- 最大恢复幅度；
- 最近一年清晰观测次数。

右侧 `Tasks` 面板会出现两个任务：

```text
LandTrendr_disturbance_metrics
LandTrendr_recovery_metrics
```

点击 `Run` 后导出到 Google Drive 的 `LandTrendr_demo` 文件夹。

## 3. 导出 GeoTIFF 的波段

扰动结果：

| 波段 | 含义 |
|---|---|
| `dist_yod` | 变化首次可确认的年份 |
| `dist_end_year` | 变化段结束年份 |
| `dist_pre_nbr` | 变化前拟合 NBR |
| `dist_post_nbr` | 变化后拟合 NBR |
| `dist_mag` | NBR 下降幅度，已转为正数 |
| `dist_dur` | 变化持续年数 |
| `dist_rate` | 年均 NBR 变化幅度 |
| `dist_dsnr` | 变化幅度 / LandTrendr 拟合 RMSE |

恢复结果使用相同结构，波段前缀为 `rec_`。`rec_mag` 表示 NBR 增长幅度，已转为正数。

## 4. 本地统计环境

安装 Miniforge、conda 或 mamba 后，在本文件夹运行：

```powershell
mamba env create -f environment.yml
mamba activate landtrendr-summary
```

也可以使用已有 Python：

```powershell
python -m pip install -r requirements.txt
```

## 5. 先用模拟结果练习

压缩包已经包含两个模拟 GeoTIFF。若需要重新生成：

```powershell
python 01_create_demo_change_rasters.py
```

模拟图仅用于检查后处理流程，不代表任何真实遥感结果。

运行汇总：

```powershell
python 02_summarize_change_metrics.py
```

输出：

```text
output/disturbance_by_year.csv
output/recovery_by_year.csv
output/overall_summary.csv
```

## 6. 统计真实 GEE 结果

把从 Google Drive 下载的 GeoTIFF 放进 `data/`，然后运行：

```powershell
python 02_summarize_change_metrics.py `
  --disturbance data/landtrendr_disturbance_metrics.tif `
  --recovery data/landtrendr_recovery_metrics.tif `
  --output-dir output_real
```

脚本要求栅格使用投影坐标系，线性单位为米。若导出结果仍为经纬度坐标，应先投影到适合研究区的等面积或 UTM 坐标系，再统计面积。

## 7. 验证建议

`validation_points_template.csv` 可用于记录人工判读结果。至少保存：

- LandTrendr 映射年份；
- 参考影像判读年份；
- 映射变化类型与参考类型；
- 判读置信度；
- 误差原因。

建议同时评价：

- 扰动/恢复识别的用户精度和生产者精度；
- 年份误差，例如允许 ±1 年；
- 不同阈值和时间窗口的敏感性；
- 云多、地形阴影强和 Landsat 7 SLC-off 区域的稳定性。

## 8. 结果不能直接解释成什么

NBR 断点表示光谱轨迹变化，不自动等于生态系统碳汇变化。火灾、采伐、病虫害、干旱、物候异常、云残留和传感器差异都可能形成断点。若研究结论涉及治理成效或碳汇机制，还需要土地利用、气候、工程边界和独立验证数据。

## 9. 版本与来源

- LT-GEE 项目：<https://github.com/eMapR/LT-GEE>
- LT-GEE 指南：<https://emapr.github.io/LT-GEE/>
- GEE LandTrendr API：<https://developers.google.com/earth-engine/apidocs/ee-algorithms-temporalsegmentation-landtrendr>
- 代码示例许可证：Apache-2.0
- 本模板按 GEE 官方 API 和 LT-GEE v0.2.0 的开源实现重新组织为单文件流程，不需要调用公共 `require()` 模块。
- 许可证全文与第三方归属说明见 `LICENSE.txt` 和 `NOTICE.md`。
