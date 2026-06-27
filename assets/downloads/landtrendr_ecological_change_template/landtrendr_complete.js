/*******************************************************************************
 * LandTrendr 生态扰动与恢复识别：完整单文件 GEE 示例
 *
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2026 Heng Wei
 *
 * 本模板按 GEE 官方 API 和 LT-GEE v0.2.0 的开源实现重新组织。
 * 变化段数组结构与筛选逻辑参考：
 * https://github.com/eMapR/LT-GEE
 * 原项目作者与许可证信息见 NOTICE.md 和 LICENSE.txt。
 *
 * 功能：
 * 1. 读取 Landsat 5/7/8/9 Collection 2 Level 2；
 * 2. QA_PIXEL 云、阴影、雪和饱和像元掩膜；
 * 3. 生成固定季节的年度中值合成与 NBR；
 * 4. 调用 GEE 内置 LandTrendr；
 * 5. 提取最大扰动和最大恢复事件；
 * 6. 按幅度、持续时间、DSNR 和最小斑块过滤；
 * 7. 导出多波段 GeoTIFF。
 *
 * 本脚本不依赖 require() 外部模块。
 ******************************************************************************/

// =============================================================================
// 1. 用户参数
// =============================================================================

var START_YEAR = 1990;
var END_YEAR = 2025;

// 每年使用相同季节，减少物候差异造成的伪变化。
var START_MONTH = 6;
var START_DAY = 1;
var END_MONTH = 9;
var END_DAY = 30;

// 小范围演示区。正式使用时替换为研究区 geometry 或 Asset。
var AOI = ee.Geometry.Rectangle([109.08, 27.62, 109.18, 27.72]);
var CHECK_POINT = AOI.centroid(1);

// LandTrendr 拟合参数。需要结合样点和研究区做敏感性分析。
var RUN_PARAMS = {
  maxSegments: 6,
  spikeThreshold: 0.9,
  vertexCountOvershoot: 3,
  preventOneYearRecovery: true,
  recoveryThreshold: 0.25,
  pvalThreshold: 0.05,
  bestModelProportion: 0.75,
  minObservationsNeeded: 6
};

// 变化筛选参数。NBR 幅度使用 0—1 的原始指数尺度。
var MIN_DIST_MAG = 0.15;
var MAX_DIST_DUR = 4;
var MIN_REC_MAG = 0.10;
var MIN_REC_DUR = 2;
var MAX_REC_DUR = 10;
var MIN_DSNR = 2.0;

// 30 m 像元下 11 个像元约为 1 ha。
var MIN_PATCH_PIXELS = 11;

// =============================================================================
// 2. Landsat Collection 2 预处理
// =============================================================================

function maskLandsatC2(image) {
  var qa = image.select('QA_PIXEL');

  // QA_PIXEL 0—5 位：填充值、膨胀云、卷云、云、云影、雪。
  var clear = qa.bitwiseAnd(1 << 0).eq(0)
    .and(qa.bitwiseAnd(1 << 1).eq(0))
    .and(qa.bitwiseAnd(1 << 2).eq(0))
    .and(qa.bitwiseAnd(1 << 3).eq(0))
    .and(qa.bitwiseAnd(1 << 4).eq(0))
    .and(qa.bitwiseAnd(1 << 5).eq(0));

  var notSaturated = image.select('QA_RADSAT').eq(0);
  return image.updateMask(clear).updateMask(notSaturated);
}

function prepareL57(image) {
  var optical = image.select(
    ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'],
    ['blue', 'green', 'red', 'nir', 'swir1', 'swir2']
  ).multiply(0.0000275).add(-0.2);

  return optical.copyProperties(
    image,
    ['system:time_start', 'SPACECRAFT_ID']
  );
}

function prepareL89(image) {
  var optical = image.select(
    ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'],
    ['blue', 'green', 'red', 'nir', 'swir1', 'swir2']
  ).multiply(0.0000275).add(-0.2);

  return optical.copyProperties(
    image,
    ['system:time_start', 'SPACECRAFT_ID']
  );
}

function buildLandsatCollection() {
  var l5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
    .filterBounds(AOI)
    .map(maskLandsatC2)
    .map(prepareL57);

  var l7 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
    .filterBounds(AOI)
    .map(maskLandsatC2)
    .map(prepareL57);

  var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterBounds(AOI)
    .map(maskLandsatC2)
    .map(prepareL89);

  var l9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
    .filterBounds(AOI)
    .map(maskLandsatC2)
    .map(prepareL89);

  return l5.merge(l7).merge(l8).merge(l9);
}

var landsat = buildLandsatCollection();

// =============================================================================
// 3. 构建年度 NBR 序列
// =============================================================================

function buildAnnualImage(year) {
  year = ee.Number(year);

  var startDate = ee.Date.fromYMD(
    year,
    START_MONTH,
    START_DAY
  );
  var endDate = ee.Date.fromYMD(
    year,
    END_MONTH,
    END_DAY
  ).advance(1, 'day');

  var yearly = landsat.filterDate(startDate, endDate);

  // 加入一个全掩膜影像，保证无影像年份仍具有一致波段结构。
  var empty = ee.Image.constant([0, 0, 0, 0, 0, 0])
    .rename(['blue', 'green', 'red', 'nir', 'swir1', 'swir2'])
    .updateMask(ee.Image(0));
  var safeYearly = yearly.merge(ee.ImageCollection.fromImages([empty]));

  var composite = safeYearly.median().clip(AOI);

  // 使用 expression 避免 normalizedDifference 自动屏蔽负反射率。
  var nbr = composite.expression(
    '(nir - swir2) / (nir + swir2)',
    {
      nir: composite.select('nir'),
      swir2: composite.select('swir2')
    }
  )
    .rename('NBR')
    .updateMask(
      composite.select('nir').add(composite.select('swir2')).neq(0)
    );

  // LandTrendr 要求第一波段“值增加=扰动”。
  // 植被损失通常使 NBR 下降，因此乘以 -1000。
  var ltIndex = nbr.multiply(-1000).rename('LT_index');
  var clearCount = safeYearly.select('red')
    .count()
    .rename('clear_count');

  return ltIndex
    .addBands(nbr)
    .addBands(clearCount)
    .set('year', year)
    .set('n_images', yearly.size())
    .set('system:time_start', startDate.advance(2, 'month').millis());
}

var YEARS = ee.List.sequence(START_YEAR, END_YEAR);
var annualCollection = ee.ImageCollection.fromImages(
  YEARS.map(buildAnnualImage)
).sort('system:time_start');

print('年度合成影像', annualCollection);
print('每年参与合成的 Landsat 影像数', annualCollection.aggregate_array('n_images'));

// =============================================================================
// 4. 运行 LandTrendr
// =============================================================================

// 第一波段用于寻找断点，第二波段 NBR 按相同断点拟合。
var ltInput = annualCollection.select(['LT_index', 'NBR']);
RUN_PARAMS.timeSeries = ltInput;

var ltResult = ee.Algorithms.TemporalSegmentation.LandTrendr(RUN_PARAMS);
print('LandTrendr 原始输出', ltResult);

// =============================================================================
// 5. 把 LandTrendr 顶点转换为变化段
// =============================================================================

function getSegmentArray(result, changeType) {
  var ltArray = result.select('LandTrendr');
  var rmse = result.select('rmse');

  var vertexMask = ltArray.arraySlice(0, 3, 4);
  var vertices = ltArray.arrayMask(vertexMask);

  var left = vertices.arraySlice(1, 0, -1);
  var right = vertices.arraySlice(1, 1, null);

  var startYear = left.arraySlice(0, 0, 1);
  var endYear = right.arraySlice(0, 0, 1);
  var startValue = left.arraySlice(0, 2, 3);
  var endValue = right.arraySlice(0, 2, 3);

  var duration = endYear.subtract(startYear);
  var rawMagnitude = endValue.subtract(startValue);

  // 翻转后的 NBR：正变化是扰动，负变化是恢复。
  var typeMask = changeType === 'disturbance'
    ? rawMagnitude.gt(0)
    : rawMagnitude.lt(0);

  var yod = startYear.add(1).arrayMask(typeMask);
  var segmentEnd = endYear.arrayMask(typeMask);
  var preNbr = startValue.arrayMask(typeMask).multiply(-0.001);
  var postNbr = endValue.arrayMask(typeMask).multiply(-0.001);
  var magnitude = rawMagnitude.arrayMask(typeMask).abs().multiply(0.001);
  var dur = duration.arrayMask(typeMask);
  var rate = magnitude.divide(dur);
  var dsnr = rawMagnitude.arrayMask(typeMask).abs().divide(rmse);

  return ee.Image.cat([
    yod,
    segmentEnd,
    preNbr,
    postNbr,
    magnitude,
    dur,
    rate,
    dsnr
  ])
    .unmask(ee.Image(ee.Array([[-9999]])))
    .toArray(0);
}

function selectGreatestSegment(segmentArray, prefix) {
  var magnitude = segmentArray.arraySlice(0, 4, 5);
  var validSegments = segmentArray.arrayMask(magnitude.gt(0));

  // arraySort 为升序，乘以 -1 后把最大幅度放到第一列。
  var sortKey = validSegments.arraySlice(0, 4, 5).multiply(-1);
  var greatest = validSegments
    .arraySort(sortKey)
    .arraySlice(1, 0, 1);

  var names = [
    prefix + '_yod',
    prefix + '_end_year',
    prefix + '_pre_nbr',
    prefix + '_post_nbr',
    prefix + '_mag',
    prefix + '_dur',
    prefix + '_rate',
    prefix + '_dsnr'
  ];

  var flattened = greatest
    .arrayProject([0])
    .arrayFlatten([names]);

  return flattened.updateMask(
    flattened.select(prefix + '_mag').gt(0)
  );
}

function applyMinimumPatch(image, magnitudeBand) {
  var binaryChange = image.select(magnitudeBand).gt(0).selfMask();
  var connected = binaryChange.connectedPixelCount(100, true);
  return image.updateMask(connected.gte(MIN_PATCH_PIXELS));
}

// =============================================================================
// 6. 最大扰动事件
// =============================================================================

var disturbanceSegments = getSegmentArray(ltResult, 'disturbance');
var disturbance = selectGreatestSegment(disturbanceSegments, 'dist');

var disturbanceMask = disturbance.select('dist_mag').gte(MIN_DIST_MAG)
  .and(disturbance.select('dist_dur').lte(MAX_DIST_DUR))
  .and(disturbance.select('dist_dsnr').gte(MIN_DSNR))
  .and(disturbance.select('dist_yod').gte(START_YEAR + 1))
  .and(disturbance.select('dist_yod').lte(END_YEAR));

disturbance = disturbance.updateMask(disturbanceMask);
disturbance = applyMinimumPatch(disturbance, 'dist_mag').float();

// =============================================================================
// 7. 最大恢复事件
// =============================================================================

var recoverySegments = getSegmentArray(ltResult, 'recovery');
var recovery = selectGreatestSegment(recoverySegments, 'rec');

var recoveryMask = recovery.select('rec_mag').gte(MIN_REC_MAG)
  .and(recovery.select('rec_dur').gte(MIN_REC_DUR))
  .and(recovery.select('rec_dur').lte(MAX_REC_DUR))
  .and(recovery.select('rec_dsnr').gte(MIN_DSNR))
  .and(recovery.select('rec_yod').gte(START_YEAR + 1))
  .and(recovery.select('rec_yod').lte(END_YEAR));

recovery = recovery.updateMask(recoveryMask);
recovery = applyMinimumPatch(recovery, 'rec_mag').float();

print('扰动结果波段', disturbance.bandNames());
print('恢复结果波段', recovery.bandNames());

// =============================================================================
// 8. 拟合序列与点位图表
// =============================================================================

var fittedBandNames = [];
for (var y = START_YEAR; y <= END_YEAR; y++) {
  fittedBandNames.push('fit_' + y);
}

var fittedNbrStack = ltResult
  .select('NBR_fit')
  .arrayFlatten([fittedBandNames]);

var fittedImages = [];
for (var year = START_YEAR; year <= END_YEAR; year++) {
  fittedImages.push(
    fittedNbrStack
      .select('fit_' + year)
      .rename('NBR')
      .set('system:time_start', ee.Date.fromYMD(year, 7, 1).millis())
  );
}
var fittedNbrCollection = ee.ImageCollection.fromImages(fittedImages);

var rawChart = ui.Chart.image.series({
  imageCollection: annualCollection.select('NBR'),
  region: CHECK_POINT,
  reducer: ee.Reducer.mean(),
  scale: 30
}).setOptions({
  title: '年度 NBR 原始合成序列',
  lineWidth: 1,
  pointSize: 3
});

var fittedChart = ui.Chart.image.series({
  imageCollection: fittedNbrCollection,
  region: CHECK_POINT,
  reducer: ee.Reducer.mean(),
  scale: 30
}).setOptions({
  title: 'LandTrendr 拟合 NBR 序列',
  lineWidth: 2,
  pointSize: 0
});

print(rawChart);
print(fittedChart);

// =============================================================================
// 9. 地图显示
// =============================================================================

var yearPalette = [
  '440154', '3b528b', '21918c', '5ec962', 'fde725', 'f8961e', 'd00000'
];

Map.centerObject(AOI, 11);
Map.addLayer(AOI, {color: 'white'}, '研究区', false);
Map.addLayer(
  disturbance.select('dist_yod'),
  {min: START_YEAR, max: END_YEAR, palette: yearPalette},
  '最大扰动年份'
);
Map.addLayer(
  disturbance.select('dist_mag'),
  {min: MIN_DIST_MAG, max: 0.6, palette: ['fff7bc', 'fec44f', 'd95f0e']},
  '最大扰动幅度',
  false
);
Map.addLayer(
  recovery.select('rec_yod'),
  {min: START_YEAR, max: END_YEAR, palette: yearPalette},
  '最大恢复年份',
  false
);
Map.addLayer(
  recovery.select('rec_mag'),
  {min: MIN_REC_MAG, max: 0.5, palette: ['ffffcc', '78c679', '006837']},
  '最大恢复幅度',
  false
);
Map.addLayer(
  annualCollection.filter(ee.Filter.eq('year', END_YEAR)).first()
    .select('clear_count'),
  {min: 0, max: 20, palette: ['8c2d04', 'fec44f', 'ffffd4']},
  '末年清晰观测次数',
  false
);
Map.addLayer(CHECK_POINT, {color: '00ffff'}, '时序检查点');

// =============================================================================
// 10. 导出到 Google Drive
// =============================================================================

Export.image.toDrive({
  image: disturbance,
  description: 'LandTrendr_disturbance_metrics',
  folder: 'LandTrendr_demo',
  fileNamePrefix: 'landtrendr_disturbance_metrics',
  region: AOI,
  scale: 30,
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF',
  formatOptions: {cloudOptimized: true}
});

Export.image.toDrive({
  image: recovery,
  description: 'LandTrendr_recovery_metrics',
  folder: 'LandTrendr_demo',
  fileNamePrefix: 'landtrendr_recovery_metrics',
  region: AOI,
  scale: 30,
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF',
  formatOptions: {cloudOptimized: true}
});

// 如需导出完整拟合 NBR 序列，可取消下面的注释。
/*
Export.image.toDrive({
  image: fittedNbrStack,
  description: 'LandTrendr_fitted_NBR_stack',
  folder: 'LandTrendr_demo',
  fileNamePrefix: 'landtrendr_fitted_nbr_1990_2025',
  region: AOI,
  scale: 30,
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF',
  formatOptions: {cloudOptimized: true}
});
*/
