# 2026-06-27 遥感长时间序列变化检测第六次扫描记录

## 本次搜索关键词

- LandTrendr Google Earth Engine Landsat disturbance recovery GitHub
- GEE LandTrendr array output segment magnitude duration DSNR
- CCDC Google Earth Engine tools continuous change detection GitHub
- BFAST R remote sensing time series breakpoint GitHub
- COLD S-CCD pyxccd Python HLS Sentinel-2 GitHub
- remote sensing ecological restoration disturbance recovery year validation

## 候选项目列表

| 项目 | 链接 | 主要时间序列 | 推荐等级 | 本轮处理 |
|---|---|---|---|---|
| LT-GEE / LandTrendr | <https://github.com/eMapR/LT-GEE> | Landsat 年度合成 | A | 写博客并制作独立模板 |
| gee-ccdc-tools | <https://github.com/parevalo/gee-ccdc-tools> | Landsat 全部清晰观测 | A- | 纳入情报库，后续对比 |
| bfast | <https://github.com/bfast2/bfast> | 规则的趋势—季节序列 | A- | 纳入情报库，后续写 MODIS 教程 |
| pyxccd | <https://github.com/Remote-Sensing-of-Land-Resource-Lab/pyxccd> | 密集多波段与近实时序列 | A | 纳入情报库，作为高级路线 |
| pycold | <https://github.com/GERSL/pycold> | COLD | C | 仓库已停止维护，不推荐新项目使用 |

核验日期为 2026-06-27。推荐等级不按 stars 排序，而是综合文档、许可证、维护状态、科研解释性、数据门槛和迁移成本判断。

## 重点推荐项目：LT-GEE / LandTrendr

1. 项目名称：LT-GEE / LandTrendr
2. 项目链接：<https://github.com/eMapR/LT-GEE>
3. 代码来源：eMapR GitHub 仓库、Google Earth Engine 内置算法、LandTrendr 与 LT-GEE 方法论文
4. 主要功能：把年度 Landsat 光谱序列拟合成分段线性轨迹，提取扰动或恢复的发生年份、幅度、持续时间、变化速率和拟合误差相对幅度
5. 对应论文或技术背景：LandTrendr 2010 提出年度 Landsat 轨迹分段，LT-GEE 2018 将算法实现到 Earth Engine；本轮同时核对 GEE 官方 API 与 LT-GEE 0.2.0 源码
6. 推荐理由：年度序列和分段轨迹容易解释，能把两期差值推进到事件时间、过程和恢复阶段；GEE 可降低大范围 Landsat 预处理成本
7. 可用于哪些遥感论文场景：森林扰动、火灾、采伐、建设占用、土地退化、石漠化治理、矿山修复、退耕还林和生态工程响应年份识别
8. 与遥感生态研究的结合方式：用 LandTrendr 定位光谱事件，再与 GPP/NPP、LAI、土地利用、气候、工程边界、InVEST 和因果模型衔接
9. 可能形成的论文创新点：事件感知的碳汇响应；扰动—恢复不对称；行政实施年与遥感响应年比较；多指数一致性断点；参数不确定性空间制图；多次扰动与恢复力
10. 环境依赖和运行难度：GEE 主流程为 JavaScript，入门难度中等；本地统计依赖 Python、NumPy、pandas 和 rasterio；大区域运行受 GEE 任务、像元数和年度序列长度限制
11. 数据需求：GEE 公共 Landsat Collection 2 Level 2、研究区几何和固定年度窗口；正式验证还需要高分历史影像、火点、工程记录、土地利用或其它独立参考数据
12. 代码质量评价：官方仓库文档、示例和论文较完整，内置 GEE API 可直接调用；仓库主代码最近一次推送在 2024 年，使用前仍需核对 API 与数据集版本
13. 许可证和引用方式：代码示例 Apache-2.0，文档 CC BY 4.0；论文应引用 LandTrendr 2010 和 LT-GEE 2018，并记录 GEE 数据集与参数
14. 是否建议深入复现：建议。先用小范围、已知变化区和短时间窗口检查，再扩展到完整研究区
15. 推荐等级：A
16. 下一步行动建议：在真实样区执行附件脚本，建立变化/未变化与事件年份验证集，并对季节窗口、指数、最大分段数、幅度、持续时间、DSNR 和最小制图单元做敏感性分析

## 方法比较与选择

| 方法 | 核心表示 | 优势 | 主要限制 | 建议用途 |
|---|---|---|---|---|
| LandTrendr | 年度序列的分段直线 | 轨迹直观，扰动与恢复易解释 | 丢失季节细节，依赖年度合成质量 | 年度生态退化与恢复 |
| CCDC | 全部清晰观测的谐波回归 | 保留季节项，可连续检测与分类 | 输出复杂，参数和算力门槛更高 | 连续土地覆盖变化 |
| BFAST | 趋势、季节和残差分解 | 适合月尺度规则序列，统计解释清晰 | 大范围逐像元处理需额外工程化 | MODIS 植被与气候响应 |
| COLD / S-CCD | 密集多光谱连续监测 | 支持本地、高性能和近实时处理 | 数据整理、编译环境和验证成本高 | HLS/Sentinel-2 预警监测 |

选择 LandTrendr 不是因为它在所有场景中最好，而是本轮目标是先建立一条“年度遥感序列—变化年份—扰动/恢复轨迹—本地统计”的完整入门路径。关注季节突变时应优先比较 BFAST；需要全部清晰观测和土地覆盖分类时应考虑 CCDC；近实时、高密度、多传感器监测则更适合 pyxccd。

## 代码与复现核验结果

- 按 GEE 官方 API 和 LT-GEE 开源实现重新组织 `landtrendr_complete.js`，不调用 `require()` 公共模块，并保留 Apache-2.0 许可证与归属说明；
- 使用 Landsat 5/7/8/9 Collection 2 Level 2，核对地表反射率缩放和 QA_PIXEL 位；
- 按 GEE 官方 LandTrendr API 与 LT-GEE 0.2.0 源码核对四行主数组、附加波段拟合输出、顶点筛选、变化段构造和按最大幅度排序；
- JavaScript 已通过本地标准语法检查，但本轮未使用真实 Earth Engine 账号提交云端任务，不能写成 GEE 端到端复现；
- Python 模拟栅格生成、波段名称读取、投影和单位检查、像元面积换算、按年份汇总及总体汇总已完整运行；
- 压缩包包含完整 GEE 脚本、两个模拟多波段 GeoTIFF、Python 环境文件、统计脚本、示例输出和人工验证模板；
- 模拟数据仅用于验证文件接口和统计流程，不代表任何真实区域结果。

## 不推荐项目及原因

- `GERSL/pycold`：README 已明确说明项目停止维护，并引导用户转向 `pyxccd`。旧论文复现可以保留原环境，新研究不应把它作为首选依赖。
- 无许可证、只给一段代码且没有输入输出说明的个人 LandTrendr 脚本：即使能显示地图，也难以判断参数来源、数组方向、导出波段和复现边界，不纳入情报库。
- 把 NDVI/NBR 断点直接命名为“碳汇变化”的流程：光谱变化只能用于事件定位或植被状态解释，不能替代 GPP、NPP、NEP、碳储量及独立机制证据。

## 最值得写博客的项目

LandTrendr。博客主题为：

> 从两期差值到变化轨迹：用 LandTrendr/GEE 识别生态退化与恢复年份

配套内容：

- 博客：`_posts/2026-06-27-landtrendr-gee-ecological-disturbance-recovery.md`
- 模板：`assets/downloads/landtrendr_ecological_change_template/`
- 压缩包：`assets/downloads/landtrendr_ecological_change_template.zip`

## 后续继续追踪关键词

- CCDC LandTrendr same site change year accuracy comparison
- BFAST MODIS NDVI GPP drought breakpoint spatial
- pyxccd HLS COLD S-CCD ecological disturbance validation
- TimeSync LandTrendr disturbance year reference sample
- LandTrendr multi-index ensemble uncertainty map
- ecological restoration event study remote sensing causal inference

## 下一次搜索建议

下一轮可检索“遥感时间序列缺失值重建与时空融合”。重点比较 Whittaker/SG 滤波、DINEOF、STL、Kalman、ESTARFM、HANTS 和深度学习重建项目，优先寻找既能处理云缺失，又能保留趋势和断点的开源代码。
