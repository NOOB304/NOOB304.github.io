# 2026-06-27 土地利用景观格局与生态系统服务代码扫描记录

## 本次搜索关键词

- pylandstats GitHub landscape metrics FRAGSTATS Python license documentation
- geemap GitHub Google Earth Engine Python package license documentation
- rasterstats GitHub zonal statistics Python license
- pylandstats landscape ecology metrics paper

## 候选项目列表

| 项目 | 链接 | 方法类型 | 推荐等级 | 是否写博客 |
|---|---|---|---|---|
| pylandstats | <https://github.com/martibosch/pylandstats> | 景观格局指数、FRAGSTATS 风格斑块分析 | A- | 是 |
| geemap | <https://github.com/gee-community/geemap> | GEE Python 自动化、遥感下载与可视化 | A- | 否 |
| rasterstats | <https://github.com/perrygeo/python-rasterstats> | 分区统计、矢量区域内栅格统计 | B+ | 否 |

## 重点推荐项目：pylandstats

1. 项目名称：pylandstats
2. 项目链接：<https://github.com/martibosch/pylandstats>
3. 代码来源：GitHub / Python package / landscape ecology
4. 主要功能：读取土地利用/覆被栅格，计算 patch、class、landscape 层级的景观格局指数，支持时空分析、分区分析和空间签名分析
5. 对应论文或技术背景：FRAGSTATS 景观指数体系；pylandstats 的 PLOS ONE 论文介绍其在 Python 生态中的景观指标计算功能
6. 适合我的原因：土地利用变化、石漠化治理、生态系统服务和土壤保持研究都需要量化景观破碎化、聚集度、连通性和多样性
7. 可用于哪些遥感论文场景：土地利用变化对生态系统服务影响、喀斯特区生态恢复格局变化、土壤保持与景观破碎化关系、碳汇空间格局与土地利用结构耦合
8. 与我现有研究方向的结合方式：将 2000-2020 年土地利用栅格转化为景观指数时间序列，再与 NPP/GPP、土壤保持率、生态系统服务和气候指标耦合
9. 可能形成的论文创新点：景观格局—生态系统服务耦合、石漠化治理景观响应、土地利用格局阈值识别、景观指数作为机器学习/因果分析变量
10. 环境依赖和运行难度：中等；需要 pylandstats、rasterio、geopandas、pandas；真实大尺度数据需注意分区计算
11. 数据需求：分类土地利用/覆被栅格，最好多个年份；可选生态分区、流域或行政区矢量
12. 代码质量评价：README 和文档较清晰，有论文支撑；许可证为 GPL-3.0，使用和二次开发需注意
13. 许可证和引用方式：GPL-3.0；论文中应引用 pylandstats 论文和仓库
14. 是否建议深入复现：建议
15. 推荐等级：A-
16. 下一步行动建议：用 GlobeLand30、CLCD、ESA WorldCover 或自有土地利用产品计算研究区景观格局变化

## 暂不作为首篇博客的项目及原因

- geemap：非常实用，适合遥感数据获取和 GEE 自动化，但作为“方法创新”更偏工具链；可后续单独写 GEE 批处理教程。
- rasterstats：分区统计非常常用，但功能单一，适合与 pylandstats 组合，而不是作为单独方法博客首选。

## 最值得写博客的项目

pylandstats。首篇博客主题定位为：

> 从土地利用栅格到生态系统服务解释变量：用 pylandstats 批量计算景观格局指数

## 后续继续追踪关键词

- landscape metrics ecosystem services remote sensing Python
- pylandstats zonal analysis land use change
- FRAGSTATS Python landscape ecology
- land use pattern soil conservation NPP GPP
- geemap land cover export Google Earth Engine
