# 2026-06-27 GEE 与遥感数据自动化代码扫描记录

## 本次搜索关键词

- geemap GitHub Google Earth Engine Python package license documentation
- gee-community geetools GitHub Google Earth Engine Python tools license
- eemont GitHub Google Earth Engine python package documentation license
- geedim GitHub Google Earth Engine cloud-free export license
- google earthengine-api GitHub Python JavaScript bindings

## 候选项目列表

| 项目 | 链接 | 方法类型 | 推荐等级 | 是否写博客 |
|---|---|---|---|---|
| geemap | <https://github.com/gee-community/geemap> | GEE Python 自动化、交互式分析、批量导出 | A- | 是 |
| earthengine-api | <https://github.com/google/earthengine-api> | GEE 官方 Python/JavaScript API | A | 否，作为基础依赖 |
| geetools | <https://github.com/gee-community/geetools> | GEE Python API 扩展工具 | B+ | 否 |
| eemont | <https://github.com/davemlz/eemont> | GEE 指数计算、云掩膜和预处理扩展 | B+ | 否 |

## 重点推荐项目：geemap

1. 项目名称：geemap
2. 项目链接：<https://github.com/gee-community/geemap>
3. 代码来源：GitHub / gee-community / Python package
4. 主要功能：在 Python 中进行 Google Earth Engine 交互式分析、影像集合处理、区域统计、样点提取、地图可视化和导出
5. 对应论文或技术背景：Google Earth Engine 云端遥感计算；Python 可复现科研工作流；Jupyter 交互式地理分析
6. 适合我的原因：可批量构建 NDVI/NPP/GPP、ERA5、土地利用、样点表格和 GeoTIFF，为后续机器学习、因果分析、xclim 和 pylandstats 工作流提供数据入口
7. 可用于哪些遥感论文场景：植被碳汇时序提取、生态恢复前后 NDVI/NPP 对比、ERA5 气候因子提取、土地利用产品下载、样点/区域统计
8. 与我现有研究方向的结合方式：用 geemap 生成像元-年份或样点-年份表，再接入 EconML、随机森林、SHAP、xclim、pylandstats 等方法
9. 可能形成的论文创新点：可复现遥感数据生产线；GEE 批量样本表构建；多源遥感变量快速融合；生态恢复长期监测自动化
10. 环境依赖和运行难度：中等；需要 earthengine-api、geemap、GEE 账号认证和 Google Cloud/Earth Engine 项目配置
11. 数据需求：GEE 数据集、研究区矢量、样点 CSV、导出路径或 Google Drive
12. 代码质量评价：维护活跃，文档丰富，社区使用广，适合教学和科研自动化
13. 许可证和引用方式：MIT；使用 GEE 数据集还需遵循各数据集引用要求
14. 是否建议深入复现：建议
15. 推荐等级：A-
16. 下一步行动建议：先用点样本提取 MODIS NDVI 和 ERA5-Land 气候因子，再扩展到区域栅格导出

## 暂不作为首篇博客的项目及原因

- earthengine-api：官方基础 API，非常重要，但偏底层；以 geemap 为入口更适合教学和博客表达。
- geetools：适合作为 GEE 扩展工具，但单独方法叙事不如 geemap 完整。
- eemont：适合指数计算和云掩膜，但需要结合具体传感器和数据集介绍，后续可写 Sentinel/Landsat 专题。

## 最值得写博客的项目

geemap。首篇博客主题定位为：

> 从 GEE 到论文数据表：用 geemap 批量提取 NDVI、NPP、ERA5 和土地利用变量

## 后续继续追踪关键词

- geemap batch export MODIS NDVI NPP ERA5
- geemap sampleRegions ecological modeling
- Google Earth Engine carbon sink remote sensing Python
- eemont Landsat Sentinel cloud mask vegetation indices
- geetools ImageCollection export Google Earth Engine
