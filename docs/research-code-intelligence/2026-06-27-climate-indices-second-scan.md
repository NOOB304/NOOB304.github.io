# 2026-06-27 气候情景与生态胁迫指标代码扫描记录

## 本次搜索关键词

- xclim GitHub climate indices xarray license documentation
- intake-esm GitHub CMIP6 catalog python package license documentation
- clisops GitHub climate data subsetting python license
- xESMF GitHub regridding climate data Python license

## 候选项目列表

| 项目 | 链接 | 方法类型 | 推荐等级 | 是否写博客 |
|---|---|---|---|---|
| xclim | <https://github.com/Ouranosinc/xclim> | 气候指标、极端气候指数、xarray/dask | A | 是 |
| intake-esm | <https://github.com/intake/intake-esm> | CMIP6/ESM 数据目录检索与加载 | A- | 否 |
| clisops | <https://github.com/roocs/clisops> | 气候模拟数据裁剪与子集处理 | B+ | 否 |
| xESMF | <https://github.com/pangeo-data/xESMF> | 气候与遥感网格重采样 | B+ | 否 |

## 重点推荐项目：xclim

1. 项目名称：xclim
2. 项目链接：<https://github.com/Ouranosinc/xclim>
3. 代码来源：Ouranos / GitHub / Python package
4. 主要功能：基于 xarray 计算气候派生变量和气候指标，支持温度、降水、雪、热浪、干旱等指标；可与 dask 结合处理大尺度 NetCDF
5. 对应论文或技术背景：气候服务、极端气候指数、ETCCDI 指标、CMIP6/ERA5 数据处理
6. 适合我的原因：可把 CMIP6/ERA5/CRU/WorldClim 从原始气候变量转化为生态学更有意义的胁迫指标，如干旱日数、热浪强度、生长季长度、极端降水等
7. 可用于哪些遥感论文场景：气候变化对 NPP/GPP/NDVI 的影响、未来 SSP 情景下碳汇风险评估、喀斯特区水热限制分析、生态恢复区气候约束识别
8. 与我现有研究方向的结合方式：将 xclim 生成的气候指标作为机器学习、因果分析或情景预测模型的驱动变量
9. 可能形成的论文创新点：从原始气候均值变量升级为生态过程相关气候胁迫指标；多指标气候胁迫综合指数；未来情景下碳汇气候风险分区
10. 环境依赖和运行难度：中等；需要 xarray、dask、xclim、netCDF4 或 zarr；大尺度数据需要较好内存管理
11. 数据需求：日尺度或月尺度温度、降水等 NetCDF；若计算极端气候指标，通常需要日尺度数据
12. 代码质量评价：文档较完整，维护活跃，许可证清晰，适合科研流程化使用
13. 许可证和引用方式：Apache-2.0；需按项目文档引用
14. 是否建议深入复现：建议
15. 推荐等级：A
16. 下一步行动建议：用 ERA5-Land 或 CMIP6 日尺度数据复现干旱、热浪和生长季指标，并与 NPP/GPP 变化耦合

## 暂不作为首篇博客的项目及原因

- intake-esm：更偏数据目录检索和加载，适合作为 CMIP6 数据入口，但单独介绍对生态指标构建不够完整；建议与 xclim 组合。
- clisops：适合气候数据裁剪和子集处理，属于重要预处理工具，但方法创新性不如 xclim。
- xESMF：重网格非常关键，但主要是空间对齐工具；适合写多源栅格预处理专题。

## 最值得写博客的项目

xclim。首篇博客主题定位为：

> 从 CMIP6/ERA5 到生态胁迫指标：用 xclim 构建碳汇与植被响应研究的气候驱动变量

## 后续继续追踪关键词

- xclim CMIP6 ecological indicators
- ERA5-Land drought heatwave vegetation carbon sink
- intake-esm CMIP6 SSP xarray workflow
- xclim ETCCDI climate indices ecology
- climate extremes NPP GPP remote sensing Python
