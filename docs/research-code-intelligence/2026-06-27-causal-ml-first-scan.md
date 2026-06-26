# 2026-06-27 遥感生态因果机器学习代码初筛记录

## 本次搜索关键词

- remote sensing causal inference machine learning GitHub
- EconML CausalForestDML double machine learning GitHub
- DoWhy causal inference refutation GitHub
- geographically weighted regression MGWR PySAL GitHub
- CausalImpact Python interrupted time series GitHub

## 候选项目列表

| 项目 | 链接 | 方法类型 | 推荐等级 | 是否写博客 |
|---|---|---|---|---|
| EconML | <https://github.com/py-why/EconML> | DML、因果森林、异质性处理效应 | A | 是 |
| DoWhy | <https://github.com/py-why/dowhy> | 因果图、识别、估计、反驳检验 | A- | 否 |
| mgwr | <https://github.com/pysal/mgwr> | GWR/MGWR、空间异质性 | B+ | 否 |
| tfcausalimpact | <https://github.com/WillianFuks/tfcausalimpact> | 中断时间序列、干预影响评估 | B | 否 |

## 重点推荐项目：EconML

1. 项目名称：EconML
2. 项目链接：<https://github.com/py-why/EconML>
3. 代码来源：PyWhy / Microsoft Research 起源的 Python 因果机器学习工具包
4. 主要功能：Double Machine Learning、Causal Forest、DR Learner、Meta Learner、IV、正交化估计等
5. 对应论文或技术背景：Double/Debiased Machine Learning、Generalized Random Forest、Orthogonal Machine Learning
6. 适合我的原因：可把遥感生态研究中常见的“驱动因子相关性解释”升级为“处理效应估计”和“异质性因果响应分析”
7. 可用于哪些遥感论文场景：气候变化对 NPP/GPP 的影响、生态修复工程对碳汇增益的影响、土地利用变化对生态系统服务的影响、人类活动强度对石漠化治理成效的影响
8. 与我现有研究方向的结合方式：构建像元-年份面板表，将气候异常、生态工程强度、土地利用变化等作为 treatment，将碳汇、NDVI、NPP、土壤保持率等作为 outcome
9. 可能形成的论文创新点：异质性因果效应制图、喀斯特区分区响应机制识别、气候与人类活动效应剥离、因果森林与 SHAP/MGWR 对比
10. 环境依赖和运行难度：中等；需要 Python、econml、scikit-learn、pandas；真实遥感应用需要先把栅格整理成样本表
11. 数据需求：像元级或样点级 outcome、treatment、confounders、effect modifiers；建议有时间维度或准实验设计
12. 代码质量评价：文档较完整，维护活跃，功能强，但初学者需要理解因果假设
13. 许可证和引用方式：GitHub API 未返回标准 SPDX；使用前需检查 LICENSE 和文档引用方式
14. 是否建议深入复现：建议
15. 推荐等级：A
16. 下一步行动建议：用合成样本先跑通 CausalForestDML，再迁移到 NPP/GPP 像元-年份数据

## 暂不作为首篇博客的项目及原因

- DoWhy：非常适合因果图与稳健性检验，但若单独写，遥感读者可能较难直接看到“空间制图”的成果；建议作为 EconML 后续组合篇。
- mgwr：与遥感空间异质性高度相关，代码质量较好，但它偏空间统计解释，不是严格因果识别；适合作为“空间异质性方法比较”专题。
- tfcausalimpact：适合政策或工程干预前后评估，但大尺度遥感像元批量应用需要更谨慎的对照序列设计；可后续写生态修复干预评估专题。

## 最值得写博客的项目

EconML。首篇博客主题定位为：

> 从相关性到因果效应：用 EconML Causal Forest 做遥感生态归因分析

## 后续继续追踪关键词

- spatial causal forest remote sensing
- panel double machine learning ecological restoration
- causal inference vegetation carbon sink
- heterogeneous treatment effect land use change ecosystem services
- DoWhy EconML geospatial causal inference
- causal impact ecological restoration remote sensing
