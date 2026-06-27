# 2026-06-27 生态系统服务与 InVEST 代码扫描记录

## 本次搜索关键词

- InVEST ecosystem services carbon storage Python 3.20 GitHub
- InVEST Carbon MODEL_SPEC lulc_bas_path lulc_alt_path
- InVEST SDR soil conservation sediment delivery ratio official
- InVEST annual water yield habitat quality official documentation
- natcap pygeoprocessing taskgraph GitHub license release
- RUSLE CASA ecosystem services open source reproducible code

## 候选项目列表

| 项目 | 链接 | 方法类型 | 推荐等级 | 是否写博客 |
|---|---|---|---|---|
| InVEST | <https://github.com/natcap/invest> | 生态系统服务空间建模与情景权衡 | A | 是 |
| pygeoprocessing | <https://github.com/natcap/pygeoprocessing> | 栅格/矢量地理处理与水文计算 | B+ | 否，作为底层依赖 |
| taskgraph | <https://github.com/natcap/taskgraph> | 任务调度、缓存与避免重复计算 | B | 否，作为底层依赖 |

核验日期为 2026-06-27。InVEST 最新稳定版为 3.20.0，GitHub 仓库约 241 stars、93 forks，默认分支为 `main`，许可证为 Apache-2.0。版本 DOI 为 `10.60793/natcap-invest-3.20.0`。

## 重点推荐项目：InVEST

1. 项目名称：InVEST
2. 项目链接：<https://github.com/natcap/invest>
3. 代码来源：GitHub / Natural Capital Alliance / Python package / Workbench
4. 主要功能：以空间显式方式评估碳储量、泥沙输移、水源产出、生境质量、营养物输出、授粉和海岸生态系统服务，并比较不同管理或土地利用情景
5. 对应论文或技术背景：自然资本与生态系统服务评估；Carbon 的土地利用—碳库映射；SDR 的 RUSLE 与泥沙连通性；Annual Water Yield 的 Budyko 水量平衡；Habitat Quality 的威胁—敏感性空间衰减
6. 推荐理由：输入可以直接衔接遥感土地利用、DEM、气候和土壤数据，输出仍为栅格与分区统计；模型模块化，适合从单项服务扩展到多服务协同与权衡
7. 可用于哪些遥感论文场景：土地利用变化与碳储量、喀斯特生态恢复、石漠化治理、土壤保持、流域泥沙、水源产出、生境质量和未来 SSP 土地利用情景
8. 与遥感生态研究的结合方式：以 GEE/geemap 生产土地利用与气候输入，以 pylandstats 构建景观格局，以 InVEST 计算服务供给，再用 EconML、SHAP 或 MGWR 做驱动与异质性分析
9. 可能形成的论文创新点：分区碳密度参数；情景模拟与因果识别分离；Carbon-SDR-Habitat Quality 多模型权衡；参数不确定性空间传递；土地利用多目标优化
10. 环境依赖和运行难度：中等到较高；图形界面较易入门，Python 批处理依赖 GDAL、pygeoprocessing 和 taskgraph，Windows 环境建议使用 conda/mamba 或官方 Workbench
11. 数据需求：Carbon 需要基准/替代土地利用栅格和四类碳库 CSV；SDR 还需要 DEM、R/K 因子、流域和 C/P 表；水源产出与生境质量各有额外输入
12. 代码质量评价：官方维护、文档和样例较完整，版本更新活跃；当前模型参数以 `MODEL_SPEC` 明确定义，适合脚本化验证
13. 许可证和引用方式：Apache-2.0；建议引用所用版本 DOI，并在方法中注明 InVEST 模型与版本
14. 是否建议深入复现：建议。先从 Carbon 小范围示例开始，再使用真实区域数据，并加入参数敏感性和独立验证
15. 推荐等级：A
16. 下一步行动建议：以同一套基准和未来土地利用情景串联 Carbon、SDR、Annual Water Yield 和 Habitat Quality，建立多生态系统服务协同与权衡流程

## 代码核验结果

- 已按 InVEST 3.20.0 官方 `src/natcap/invest/carbon/carbon.py` 核对输入字段；
- 当前字段为 `lulc_bas_path`、`lulc_alt_path`、`carbon_pools_path`、`calc_sequestration` 和 `do_valuation`；
- 当前主要输出为 `c_storage_bas`、`c_storage_alt`、`c_change_bas_alt` 和 `summary_csv`；
- 碳库 CSV 字段为 `lucode`、`c_above`、`c_below`、`c_soil` 和 `c_dead`，单位为 `t C/ha`；
- 演示 GeoTIFF 生成、两期栅格对齐检查、分类编码检查和脚本语法已在本机运行通过；
- 本机 conda 安装 InVEST 3.20.0 时发生包完整性校验错误，PyPI 环境又受 GDAL 和网络依赖影响，因此尚未完成 Carbon 端到端执行；
- 尚未在真实土地利用和碳库数据上复现。

## 暂不作为独立博客的项目及原因

- pygeoprocessing：地理处理能力很强，但更适合作为 InVEST、栅格批处理和水文模型的底层库；单独写作容易变成 API 清单。
- taskgraph：对多情景任务缓存和并行计算很有用，但生态学方法含义有限，适合放在科研工作流自动化专题中。
- 零散 RUSLE/CASA 个人仓库：本轮没有发现同时满足清晰 README、示例数据、维护记录和明确许可证的候选项目，不推荐为了凑数量而收录。

## 最值得写博客的项目

InVEST。博客主题定位为：

> 从土地利用图到碳储量变化：用 InVEST 3.20 搭建可复现的生态系统服务评估流程

配套内容：

- 博客：`_posts/2026-06-27-invest-carbon-ecosystem-services-automation.md`
- 模板：`assets/downloads/invest_ecosystem_services_template/`
- 压缩包：`assets/downloads/invest_ecosystem_services_template.zip`

## 后续继续追踪关键词

- InVEST SDR karst soil conservation calibration
- InVEST carbon Monte Carlo uncertainty spatial
- InVEST annual water yield CMIP6 SSP land use
- InVEST habitat quality ecological restoration causal inference
- PLUS InVEST multi-objective ecosystem services optimization
- pygeoprocessing raster calculator block processing

## 下一次搜索建议

下一轮优先检索“遥感变化检测与生态恢复成效评估”，重点比较 LandTrendr、CCDC、BFAST、COLD 和基于 GEE 的长时间序列断点检测代码。该方向可以把“生态恢复前后是否变化”从两期差值推进到变化年份、持续时间和恢复轨迹识别。
