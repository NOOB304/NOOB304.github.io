# 第三方归属与修改说明

本教学模板由魏珩（Heng Wei）于 2026 年整理，用于演示 Landsat 年度合成、Google Earth Engine 内置 LandTrendr 调用、扰动/恢复变化段筛选和本地 GeoTIFF 汇总。

`landtrendr_complete.js` 的变化段数组结构、指标组织与筛选思路参考并改写自：

- LT-GEE v0.2.0：<https://github.com/eMapR/LT-GEE>
- 原项目作者：Justin Braaten、Zhiqiang Yang、Robert Kennedy、Ben Roberts-Pierel 等贡献者
- 原项目许可证：Apache License 2.0

本模板做了以下重新组织与扩展：

- 改为不依赖公共 `require()` 模块的单文件 GEE 教程；
- 重写 Landsat 5/7/8/9 Collection 2 Level 2 预处理与年度中值合成；
- 同时提取最大扰动和最大恢复事件；
- 将 NBR 幅度恢复到 0—1 尺度；
- 增加 DSNR、最小斑块、图表、导出和本地统计流程；
- 增加模拟 GeoTIFF、验证点模板和中文说明。

使用或再分发本模板时，请保留 `LICENSE.txt`、本文件和源代码中的许可证标识。论文中还应引用 LandTrendr 2010、LT-GEE 2018 及实际使用的数据集和参数。
