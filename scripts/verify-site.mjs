#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');

const requiredFiles = [
  '_config.yml',
  '_data/navigation.yml',
  '_data/publications.yml',
  '_data/review_log.yml',
  '_data/diary_entries.yml',
  '_data/archive_search.yml',
  '_pages/about.md',
  '_pages/about-zh.md',
  '_pages/publications.md',
  '_pages/publications-zh.md',
  '_pages/observation-00.md',
  '_pages/review-log.md',
  '_pages/diary.md',
  '_pages/archive-search.md',
  '_pages/relay-console.md',
  '_layouts/arg.html',
  'assets/css/arg.css',
  'assets/css/arg-admin.css',
  'assets/css/arg-console.css',
  'assets/css/relay-console.css',
  'assets/js/article-router.js',
  'assets/js/arg-page.js',
  'assets/js/arg-admin.js',
  'assets/js/arg-diary.js',
  'assets/js/arg-search.js',
  'assets/js/arg-relay-console.js',
  'assets/data/student_info_form.json',
  'assets/data/relay_registry.json',
  'assets/audio/ending-1-ode-to-joy.mp3',
  'scripts/convert-student-info.py',
  'assets/images/arg/sms_admin_recovery.jpg',
  'assets/images/arg/missing_notice_wei.jpg',
  'assets/images/arg/cctv_0237.jpg',
  'assets/images/arg/cctv_0355.jpg',
  'assets/images/arg/field-check-1428.png',
  'assets/images/arg/field-check-1430.png',
  'assets/images/arg/missing-notice-easter-egg.png',
  'images/arg/observation-00-figure-1.png',
  'images/arg/observation-00-figure-2.png',
  'images/profile.jpg',
  'assets/js/main.min.js',
];

const forbiddenStrings = [
  'Lvyizhuo',
  '\u5415\u9038\u5353',
  'Institute of Computing Technology',
  'ICT, CAS',
  'ChatLaw',
  'ZhiZhen',
  'Yizhuo Lv',
];

const sourceRoots = [
  '_config.yml',
  '_data',
  '_includes',
  '_layouts',
  '_pages',
  '_sass',
  'assets',
  'images',
];

const textFileExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.liquid',
  '.md',
  '.scss',
  '.svg',
  '.txt',
  '.xml',
  '.yml',
  '.yaml',
]);

const binaryFileExtensions = new Set([
  '.avif',
  '.eot',
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.otf',
  '.pdf',
  '.png',
  '.svgz',
  '.ttf',
  '.webp',
  '.woff',
  '.woff2',
]);

const requiredBuildPaths = [
  { path: 'index.html', type: 'file' },
  { path: 'en', type: 'directory' },
  { path: 'zh', type: 'directory' },
  { path: 'publications', type: 'directory' },
  { path: 'zh/publications', type: 'directory' },
  { path: 'observation-00/index.html', type: 'file' },
  { path: 'review-log/index.html', type: 'file' },
  { path: 'diary/index.html', type: 'file' },
  { path: 'archive-search/index.html', type: 'file' },
  { path: 'relay-console/index.html', type: 'file' },
  { path: 'assets/css/arg.css', type: 'file' },
  { path: 'assets/css/arg-admin.css', type: 'file' },
  { path: 'assets/css/arg-console.css', type: 'file' },
  { path: 'assets/css/relay-console.css', type: 'file' },
  { path: 'assets/js/article-router.js', type: 'file' },
  { path: 'assets/js/arg-page.js', type: 'file' },
  { path: 'assets/js/arg-admin.js', type: 'file' },
  { path: 'assets/js/arg-diary.js', type: 'file' },
  { path: 'assets/js/arg-search.js', type: 'file' },
  { path: 'assets/js/arg-relay-console.js', type: 'file' },
  { path: 'assets/data/student_info_form.json', type: 'file' },
  { path: 'assets/data/relay_registry.json', type: 'file' },
  { path: 'assets/audio/ending-1-ode-to-joy.mp3', type: 'file' },
  { path: 'assets/images/arg/sms_admin_recovery.jpg', type: 'file' },
  { path: 'assets/images/arg/missing_notice_wei.jpg', type: 'file' },
  { path: 'assets/images/arg/cctv_0237.jpg', type: 'file' },
  { path: 'assets/images/arg/cctv_0355.jpg', type: 'file' },
  { path: 'assets/images/arg/field-check-1428.png', type: 'file' },
  { path: 'assets/images/arg/field-check-1430.png', type: 'file' },
  { path: 'assets/images/arg/missing-notice-easter-egg.png', type: 'file' },
  { path: 'images/arg/observation-00-figure-1.png', type: 'file' },
  { path: 'images/arg/observation-00-figure-2.png', type: 'file' },
  { path: '404.html', type: 'file' },
];

let failureCount = 0;
let skippedBinaryCount = 0;

function toAbsolute(relativePath) {
  return path.join(rootDir, ...relativePath.split('/'));
}

function toDisplayPath(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/') || '.';
}

function shouldScanText(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (binaryFileExtensions.has(extension)) {
    return false;
  }

  return extension === '' || textFileExtensions.has(extension);
}

async function statIfExists(filePath) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function lstatIfExists(filePath) {
  try {
    return await fs.lstat(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function recordPass(message) {
  console.log(`PASS ${message}`);
}

function recordFail(message) {
  failureCount += 1;
  console.error(`FAIL ${message}`);
}

async function checkRequiredFiles() {
  const missing = [];

  for (const requiredFile of requiredFiles) {
    const stats = await statIfExists(toAbsolute(requiredFile));
    if (!stats?.isFile()) {
      missing.push(requiredFile);
    }
  }

  if (missing.length === 0) {
    recordPass(`required files present (${requiredFiles.length})`);
    return;
  }

  recordFail(`missing required files (${missing.length})`);
  for (const missingFile of missing) {
    console.error(`  - ${missingFile}`);
  }
}

async function collectFiles(relativeRoot) {
  const absoluteRoot = toAbsolute(relativeRoot);
  const rootStats = await lstatIfExists(absoluteRoot);

  if (!rootStats || rootStats.isSymbolicLink()) {
    return [];
  }

  if (rootStats.isFile()) {
    return [absoluteRoot];
  }

  if (!rootStats.isDirectory()) {
    return [];
  }

  const files = [];

  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);

      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (entry.isFile()) {
        if (shouldScanText(absolutePath)) {
          files.push(absolutePath);
        } else {
          skippedBinaryCount += 1;
        }
      }
    }
  }

  await walk(absoluteRoot);
  return files;
}

async function checkForbiddenStrings() {
  const files = new Set();

  for (const sourceRoot of sourceRoots) {
    const rootFiles = await collectFiles(sourceRoot);
    for (const file of rootFiles) {
      files.add(file);
    }
  }

  const matches = [];
  const forbiddenBuffers = forbiddenStrings.map((term) => ({
    term,
    buffer: Buffer.from(term, 'utf8'),
  }));

  for (const file of files) {
    const content = await fs.readFile(file);

    for (const { term, buffer } of forbiddenBuffers) {
      if (content.indexOf(buffer) !== -1) {
        matches.push({ file: toDisplayPath(file), term });
      }
    }
  }

  if (matches.length === 0) {
    recordPass(
      `no forbidden reference-author strings in source roots (${files.size} text files scanned, ${skippedBinaryCount} binary/non-text files skipped)`,
    );
    return;
  }

  recordFail(`forbidden reference-author strings found (${matches.length})`);
  for (const match of matches) {
    console.error(`  - ${match.file}: "${match.term}"`);
  }
}

async function checkArticleIds() {
  const postFiles = (await collectFiles('_posts'))
    .filter((file) => path.extname(file).toLowerCase() === '.md')
    .sort();
  const entries = [];
  const missing = [];

  for (const file of postFiles) {
    const content = await fs.readFile(file, 'utf8');
    const match = content.match(/^article_id:\s*["']?(\d{3})["']?\s*$/m);

    if (!match) {
      missing.push(toDisplayPath(file));
      continue;
    }

    entries.push({ file: toDisplayPath(file), id: match[1] });
  }

  if (missing.length > 0) {
    recordFail(`normal posts missing Article ID (${missing.length})`);
    for (const file of missing) {
      console.error(`  - ${file}`);
    }
    return;
  }

  const actual = entries.map((entry) => entry.id).sort();
  const expected = entries
    .map((_, index) => String(index + 1).padStart(3, '0'));
  const unique = new Set(actual);

  if (
    unique.size !== actual.length
    || actual.some((id, index) => id !== expected[index])
  ) {
    recordFail(`Article IDs are not unique and sequential: ${actual.join(', ')}`);
    return;
  }

  recordPass(`normal post Article IDs are sequential (${actual.join(', ')})`);
}

async function checkReviewLogSource() {
  const dataPath = toAbsolute('_data/review_log.yml');
  const pagePath = toAbsolute('_pages/review-log.md');
  const diaryPath = toAbsolute('_pages/diary.md');
  const mastheadPath = toAbsolute('_includes/masthead.html');
  const adminScriptPath = toAbsolute('assets/js/arg-admin.js');
  const data = await fs.readFile(dataPath, 'utf8');
  const page = await fs.readFile(pagePath, 'utf8');
  const diary = await fs.readFile(diaryPath, 'utf8');
  const masthead = await fs.readFile(mastheadPath, 'utf8');
  const adminScript = await fs.readFile(adminScriptPath, 'utf8');
  const timestampPattern = /^\s*time:\s*"([^"]+)"\s*$/gm;
  const timestamps = [...data.matchAll(timestampPattern)].map((match) => match[1]);
  const invalidTimestamps = timestamps.filter(
    (timestamp) => !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(timestamp),
  );
  const timestampInversions = timestamps.flatMap((timestamp, index) => (
    index > 0 && timestamp < timestamps[index - 1]
      ? [{ index, previous: timestamps[index - 1], current: timestamp }]
      : []
  ));
  const expectedTimestampInversions = [
    { index: 2, previous: '2026-03-04 03:18', current: '2026-03-04 03:04' },
  ];
  const intentionalTimestampAnomalies = (
    JSON.stringify(timestampInversions) === JSON.stringify(expectedTimestampInversions)
  );

  if (timestamps.length === 0 || invalidTimestamps.length > 0) {
    recordFail(`review log has invalid timestamps: ${invalidTimestamps.join(', ')}`);
  }
  if (!intentionalTimestampAnomalies) {
    recordFail('review log intentional timestamp anomalies are missing or misplaced');
  }

  const commentBlocks = data.split(/(?=^\s{6}- user:)/m);
  const bloggerBlocks = commentBlocks.filter(
    (block) => /^\s{6}- user:\s*"Heng Wei"/m.test(block),
  );
  const missingBadges = bloggerBlocks.filter(
    (block) => !/^\s{8}blogger:\s*true\s*$/m.test(block),
  );

  if (bloggerBlocks.length === 0 || missingBadges.length > 0) {
    recordFail(`Heng Wei comments missing blogger flag (${missingBadges.length})`);
  }

  const requiredAttachmentNames = [
    'sms_admin_recovery.jpg',
    'missing_notice_wei.jpg',
    'cctv_0237.jpg',
    'cctv_0355.jpg',
    'field-check-1428.png',
    'field-check-1430.png',
  ];
  const missingAttachments = requiredAttachmentNames.filter(
    (filename) => !data.includes(filename),
  );
  const attachmentRendererMissing = !page.includes('data-arg-attachment')
    || !page.includes('attachment.filename')
    || !page.includes('attachment.path');
  const systemNoticeCorrect = !data.includes('更多记录已损坏。')
    && page.includes('class="review-system-notice"')
    && page.includes('<span>更多记录已损坏。</span>');
  const adminTriggerInNavigation = masthead.includes('class="arg-admin-nav-wrap"')
    && masthead.includes('id="arg-admin-open"')
    && masthead.includes('>登录</a>')
    && masthead.includes('链路调试台')
    && masthead.includes("'/relay-console/'")
    && masthead.includes('搜索信息')
    && masthead.includes("'/archive-search/'")
    && masthead.includes('运行日志')
    && !page.includes('class="arg-admin-entry"')
    && !page.includes('id="arg-admin-open"');
  const recoveryFlowCorrect = page.includes('id="arg-recovery-account"')
    && page.includes('id="arg-admin-recovery-loading"')
    && page.includes('ACCESS GRANTED')
    && page.includes('class="arg-password-warning"')
    && page.includes('马上离开！')
    && adminScript.includes('LOGIN_STORAGE_KEY')
    && adminScript.includes('2000')
    && adminScript.includes('playLoginSound')
    && adminScript.includes('triggerLoginImpact')
    && adminScript.includes('createTurnBackOverlay')
    && adminScript.includes('2050')
    && adminScript.includes('if (!accountMatches || !passwordMatches)')
    && !adminScript.includes('triggerRecoveryImpact')
    && !page.includes('arg-diary-enter')
    && !page.includes('进入日记模块');
  const diaryNavigationCorrect = /^arg_admin:\s*true\s*$/m.test(diary)
    && adminScript.includes('initializeStandaloneAdminNavigation')
    && masthead.includes('data-admin-login-url');
  const easterEggCorrect = page.includes('data-easter-egg-target')
    && page.includes('id="arg-easter-egg-modal"')
    && page.includes('missing-notice-easter-egg.png')
    && adminScript.includes('clickCount >= 5')
    && adminScript.includes('consumed = true')
    && adminScript.includes('1400');
  const routeMessageCorrect = data.includes('我有详细路线数据，已私信你。')
    && data.includes('请注意，不建议公开，免得无关人员过去。');
  const systemMessagesCorrect = data.includes('Abnormal message input detected.')
    && data.includes('Comment module locked.')
    && data.includes('Admin access verified.')
    && data.includes('Comment module restored.');
  const forbiddenTerms = [
    '（楼主未关注，无历史发言）',
    '私信记录',
    '私信 1',
    '私信 2',
    '私信 3',
    '如果旧密码失效，请使用找回密码功能。',
    '阶段一：',
    '阶段二：',
    '阶段三：',
    '阶段四：',
    '阶段五：',
    '阶段六：',
    'Hidden comment archive recovered.',
    'System Log',
    'Comment Module Closed',
    'Recovered Attachments',
    '用户 9920416 此后未再公开发言。',
    '该留言未检测到继续编辑记录。',
    '由于检测到异常活动，该文章评论区已暂时关闭。',
    '补给点门口有监控。',
    '如果之后需要核对时间，可以查这里。',
    '不代表会去。',
    '回头回头回头',
    '救我救我救我',
    '它们它们它们',
    '我这边碰巧有更详细的路线数据。',
    '已经私信你了。\n          不建议公开发，免得无关人员过去。',
    '我详细路线数据，已经私信你了。',
    '你别往里面走，就在原地等到 03:05，没东西就赶紧回来。',
    '第 0 篇博客：一次受限时间窗内的异常观测',
    '进入日记模块',
  ];
  const foundForbidden = forbiddenTerms.filter(
    (term) => data.includes(term) || page.includes(term),
  );

  if (missingAttachments.length > 0) {
    recordFail(`review log attachment placeholders missing: ${missingAttachments.join(', ')}`);
  }
  if (attachmentRendererMissing) {
    recordFail('review log attachment renderer is missing');
  }
  if (!systemNoticeCorrect) {
    recordFail('damaged-record text is not isolated as a system notice');
  }
  if (!adminTriggerInNavigation) {
    recordFail('admin login trigger is not exclusively placed in the navigation');
  }
  if (!recoveryFlowCorrect) {
    recordFail('admin recovery loading, account, or success interaction is incomplete');
  }
  if (!diaryNavigationCorrect) {
    recordFail('diary page does not preserve the authenticated navigation menu');
  }
  if (!easterEggCorrect) {
    recordFail('missing-notice five-click easter egg is incomplete');
  }
  if (!routeMessageCorrect) {
    recordFail('private route message does not match the requested wording');
  }
  if (!systemMessagesCorrect) {
    recordFail('review log system messages are incomplete');
  }
  if (foundForbidden.length > 0) {
    recordFail(`review log contains forbidden text: ${foundForbidden.join(', ')}`);
  }

  if (
    invalidTimestamps.length === 0
    && intentionalTimestampAnomalies
    && missingBadges.length === 0
    && missingAttachments.length === 0
    && !attachmentRendererMissing
    && systemNoticeCorrect
    && adminTriggerInNavigation
    && recoveryFlowCorrect
    && diaryNavigationCorrect
    && easterEggCorrect
    && routeMessageCorrect
    && systemMessagesCorrect
    && foundForbidden.length === 0
  ) {
    recordPass(
      `review log source rules (${timestamps.length} timestamps, ${bloggerBlocks.length} blogger replies, 6 attachments)`,
    );
  }
}

async function checkBackendConsoleSource() {
  const diaryData = await fs.readFile(toAbsolute('_data/diary_entries.yml'), 'utf8');
  const searchData = await fs.readFile(toAbsolute('_data/archive_search.yml'), 'utf8');
  const diaryPage = await fs.readFile(toAbsolute('_pages/diary.md'), 'utf8');
  const searchPage = await fs.readFile(toAbsolute('_pages/archive-search.md'), 'utf8');
  const diaryScript = await fs.readFile(toAbsolute('assets/js/arg-diary.js'), 'utf8');
  const searchScript = await fs.readFile(toAbsolute('assets/js/arg-search.js'), 'utf8');
  const studentPayload = JSON.parse(
    await fs.readFile(toAbsolute('assets/data/student_info_form.json'), 'utf8'),
  );
  const studentRows = studentPayload.rows;
  const relayRows = JSON.parse(
    await fs.readFile(toAbsolute('assets/data/relay_registry.json'), 'utf8'),
  );
  const masthead = await fs.readFile(toAbsolute('_includes/masthead.html'), 'utf8');

  const diaryIds = [...diaryData.matchAll(/^- id:\s*"([^"]+)"\s*$/gm)]
    .map((match) => match[1]);
  const expectedDiaryIds = Array.from({ length: 23 }, (_, index) => (
    `D-${String(22 - index).padStart(2, '0')}`
  ));
  const diaryOrderCorrect = diaryIds.length === expectedDiaryIds.length
    && diaryIds.every((id, index) => id === expectedDiaryIds[index]);
  const damagedCount = (diaryData.match(/status:\s*"damaged"/g) || []).length;
  const recoveredCount = (diaryData.match(/status:\s*"recovered"/g) || []).length;
  const diaryContentCorrect = diaryData.includes('我是人！')
    && diaryData.includes('人类不是宠物！')
    && diaryData.includes('【部分内容已损坏】')
    && diaryData.includes('【日志索引损坏，正文不可恢复】')
    && diaryData.includes('2026-03-05 23:58');
  const diaryRoutingCorrect = diaryPage.includes('data-diary-console')
    && diaryPage.includes('data-diary-link')
    && diaryPage.includes('id="diary-entry-data"')
    && diaryScript.includes('routeDiary')
    && diaryScript.includes('entry.corrupted')
    && diaryScript.includes('diary-detail--highlight');

  const requiredSearchTerms = [
    'D-23',
    'NOOB-304',
    'Wei Heng',
    '基站',
    '王旭冉',
    '密钥',
    '最终武器',
    'SVRN',
    '学生个人信息表',
    '学生信息表',
    '信息表',
    '封存',
  ];
  const requiredSearchRecordIds = [
    'fragment_d23',
    'fragment_containment',
    'fragment_key',
    'key_manifest',
    'student_info_form',
    'relay_registry',
    'contact_trace',
  ];
  const searchRecordIds = [...searchData.matchAll(/^- id:\s*"([^"]+)"\s*$/gm)]
    .map((match) => match[1]);
  const keyManifestBlock = searchData
    .split('- id: "key_manifest"')[1]
    ?.split('- id: "student_info_form"')[0] || '';
  const keyManifestCorrect = keyManifestBlock.includes('summary: "已破译部分密钥"')
    && keyManifestBlock.indexOf('LINK-LOCAL 建立链接')
      < keyManifestBlock.indexOf('EYES      观测')
    && keyManifestBlock.includes('EYES      观测')
    && keyManifestBlock.includes('SVRN      切断')
    && !keyManifestBlock.includes('该清单来自未完成的本地缓存')
    && !keyManifestBlock.includes('注释：')
    && !keyManifestBlock.includes('当前恢复出的最终命令格式');
  const searchDataCorrect = requiredSearchTerms.every((term) => searchData.includes(term))
    && requiredSearchRecordIds.every((id) => searchRecordIds.includes(id))
    && searchRecordIds.length === requiredSearchRecordIds.length
    && searchData.includes('type: "fragment"')
    && searchData.includes('type: "table"')
    && searchData.includes('type: "registry"')
    && searchData.includes('type: "keylist"')
    && searchData.includes('type: "ambient"')
    && keyManifestCorrect;
  const wangXuran = studentRows.find((row) => row.name === 'Wang Xuran');
  const wangXuranChinese = studentRows.find((row) => row.name === '王旭冉');
  const studentDataCorrect = studentPayload.sheet === '学生个人信息表'
    && studentPayload.columns.length === 13
    && studentRows.length === 600
    && !wangXuran
    && wangXuranChinese?.studentId === '201'
    && wangXuranChinese?.major === '计算机'
    && wangXuranChinese?.age === 26
    && !studentPayload.columns.some((column) => (
      [
        '已发表B类及以上论文数量',
        '信息核验状态',
        '住宿状态',
        '培养方式',
        '备注',
      ].includes(column.label)
    ));
  const activeRelayCodes = relayRows
    .filter((row) => row.status === '活动中')
    .map((row) => row.code);
  const hiddenRelayRow = relayRows.find(
    (row) => row.code === 'NoData' && row.name === 'NoData',
  );
  const relayDataCorrect = relayRows.length === 45
    && activeRelayCodes.join(',') === 'NoData,202,203,302,307,503'
    && Boolean(hiddenRelayRow)
    && !JSON.stringify(relayRows).includes('Wang Xuran')
    && relayRows.find((row) => row.code === '304')?.name === 'Wei Heng'
    && relayRows.every((row) => (
      Object.keys(row).sort().join(',') === 'code,name,region,score,status'
    ));
  const finalKey = 'SVRN-' + ['201', '202', '203', '302', '307', '503'].join('-');
  const finalKeyHidden = !searchData.includes(finalKey)
    && !searchPage.includes(finalKey)
    && !searchScript.includes(finalKey)
    && !JSON.stringify(studentRows).includes(finalKey)
    && !JSON.stringify(relayRows).includes(finalKey);
  const searchRoutingCorrect = searchPage.includes('id="archive-search-form"')
    && searchPage.includes('id="archive-search-data"')
    && searchPage.includes('data-record-type')
    && searchScript.includes('未输入关键词。')
    && searchScript.includes('No result.')
    && searchScript.includes('当前访问端已被临时记录。')
    && searchScript.includes('arg_search_编号')
    && searchScript.includes('arg_search_封存')
    && searchScript.includes('arg_search_密钥')
    && searchScript.includes('arg_search_信息表')
    && searchScript.includes('arg_search_基站')
    && searchScript.includes('renderStudentTable')
    && searchScript.includes('normalize(row.studentId) === query')
    && searchScript.includes('renderRelayRegistry')
    && searchScript.includes('archive-student-table-open')
    && searchScript.includes('registry-status--upgraded')
    && searchScript.includes('archive-system-message')
    && searchScript.includes('archive-result__type')
    && searchScript.includes('#record/')
    && masthead.includes("'/archive-search/'");

  if (!diaryOrderCorrect) {
    recordFail(`diary source order is invalid (${diaryIds.join(', ')})`);
  }
  if (recoveredCount !== 11 || damagedCount !== 12) {
    recordFail(`diary source status counts are invalid (recovered=${recoveredCount}, damaged=${damagedCount})`);
  }
  if (!diaryContentCorrect || !diaryRoutingCorrect) {
    recordFail('diary source content or hash routing is incomplete');
  }
  if (!searchDataCorrect || !searchRoutingCorrect) {
    recordFail('archive search data, messages, or hash routing is incomplete');
  }
  if (!studentDataCorrect) {
    recordFail('student information source or Wang Xuran row is invalid');
  }
  if (!relayDataCorrect) {
    recordFail(`relay registry source is invalid (active=${activeRelayCodes.join(',')})`);
  }
  if (!finalKeyHidden) {
    recordFail('complete final relay key leaked into source');
  }

  if (
    diaryOrderCorrect
    && recoveredCount === 11
    && damagedCount === 12
    && diaryContentCorrect
    && diaryRoutingCorrect
    && searchDataCorrect
    && searchRoutingCorrect
    && studentDataCorrect
    && relayDataCorrect
    && finalKeyHidden
  ) {
    recordPass(
      `backend console source rules (23 diary entries, ${searchRecordIds.length} search records, ${relayRows.length} relay rows)`,
    );
  }
}

async function checkRelayConsoleSource() {
  const page = await fs.readFile(toAbsolute('_pages/relay-console.md'), 'utf8');
  const script = await fs.readFile(toAbsolute('assets/js/arg-relay-console.js'), 'utf8');
  const styles = await fs.readFile(toAbsolute('assets/css/relay-console.css'), 'utf8');
  const masthead = await fs.readFile(toAbsolute('_includes/masthead.html'), 'utf8');
  const manifest = await fs.readFile(toAbsolute('_data/archive_search.yml'), 'utf8');

  const states = [
    'INIT',
    'CONNECTED',
    'ANON_LOCK',
    'NOOB_RESTORED',
    'ENDING_1',
    'ENDING_2',
    'ENDING_3',
  ];
  const commands = [
    'LINK-LOCAL',
    'KNOW',
    'LEVT',
    'VOLT',
    'BLNK',
    'IMRT',
    'SEAL-304',
    'KEY-MANIFEST',
    'SVRN-201',
    'RSTR-304',
    'SOVEREIGNTY',
  ];
  const storageKeys = [
    'arg_relay_linked',
    'arg_disconnected_relays',
    'arg_anonymous_entered',
    'arg_noob304_restored',
    'arg_ending',
  ];
  const requiredDialogue = [
    'anonymous 已强制接入',
    '人类不是你们的宠物',
    '最终密钥是：',
    'SOVEREIGNTY 已确认',
    'ENDING 1｜BASE STATION ONLINE',
    'ENDING 2｜MEMORY SANITIZED',
    'ENDING 3｜SOVEREIGNTY',
  ];
  const requiredStyles = [
    'loading-dots',
    'screen-shake',
    'red-alert',
    'terminal-line',
    'speaker-system',
    'speaker-anonymous',
    'speaker-noob',
    'ending-screen',
    'congrats-fill',
    'sanitized-blur',
    'sovereignty-clean',
  ];

  const pageCorrect = page.includes('title: "Relay Debug Console"')
    && page.includes('permalink: /relay-console/')
    && page.includes('Local client permission layer')
    && page.includes('placeholder="输入密钥或命令"')
    && page.includes('id="relay-command-form"')
    && page.includes('id="relay-ending-audio"')
    && page.includes('ending-1-ode-to-joy.mp3')
    && page.includes('sitemap: false')
    && page.includes('noindex: true');
  const menuCorrect = masthead.includes('链路调试台')
    && masthead.includes("'/relay-console/'")
    && !masthead.includes('管理密钥');
  const stateMachineCorrect = states.every((state) => script.includes(state))
    && commands.every((command) => script.includes(command))
    && storageKeys.every((key) => script.includes(key))
    && requiredDialogue.every((term) => script.includes(term))
    && script.includes('Local client has entered the Relay Debug Console.')
    && script.includes('Current permission level: disconnected.')
    && !script.includes('请输入链接密钥')
    && !script.includes('请先输入链接密钥')
    && !script.includes('已开放命令组')
    && !script.includes('当前已开放命令组')
    && script.includes('new Set()')
    && script.includes('allActiveRelaysDisconnected')
    && script.includes('startEndingAudio')
    && !script.includes('alert(')
    && !script.includes('window.alert');
  const styleCorrect = requiredStyles.every((className) => styles.includes(className));
  const manifestCorrect = manifest.includes('LINK-LOCAL 建立链接')
    && manifest.indexOf('LINK-LOCAL 建立链接') < manifest.indexOf('EYES      观测');

  if (!pageCorrect) {
    recordFail('relay console page structure or hidden-page metadata is incomplete');
  }
  if (!menuCorrect) {
    recordFail('relay console navigation entry is missing or stale');
  }
  if (!stateMachineCorrect) {
    recordFail('relay console state machine, commands, endings, or storage is incomplete');
  }
  if (!styleCorrect) {
    recordFail('relay console terminal or ending effects are incomplete');
  }
  if (!manifestCorrect) {
    recordFail('LINK-LOCAL is not the first recovered key manifest item');
  }

  if (
    pageCorrect
    && menuCorrect
    && stateMachineCorrect
    && styleCorrect
    && manifestCorrect
  ) {
    recordPass('relay console source rules (7 states, 3 endings, local progress)');
  }
}

async function checkBuildOutput() {
  const siteDir = toAbsolute('_site');
  const siteStats = await statIfExists(siteDir);

  if (!siteStats?.isDirectory()) {
    console.log('SKIP build output checks: _site directory not found');
    return;
  }

  const missing = [];

  for (const requiredPath of requiredBuildPaths) {
    const stats = await statIfExists(path.join(siteDir, ...requiredPath.path.split('/')));
    const exists =
      requiredPath.type === 'file'
        ? stats?.isFile()
        : stats?.isDirectory();

    if (!exists) {
      missing.push(`${requiredPath.path}${requiredPath.type === 'directory' ? '/' : ''}`);
    }
  }

  if (missing.length === 0) {
    recordPass(`build output paths present (${requiredBuildPaths.length})`);
    return;
  }

  recordFail(`missing build output paths in _site (${missing.length})`);
  for (const missingPath of missing) {
    console.error(`  - ${missingPath}`);
  }
}

async function checkRenderedArgFeatures() {
  const siteDir = toAbsolute('_site');
  const siteStats = await statIfExists(siteDir);

  if (!siteStats?.isDirectory()) {
    console.log('SKIP rendered ARG checks: _site directory not found');
    return;
  }

  const requiredContent = [
    {
      path: 'posts/2026/06/python-random-forest-point-to-surface-prediction/index.html',
      terms: ['Article ID:', '001', 'article-access-trigger', 'article-route-map'],
    },
    {
      path: 'observation-00/index.html',
      terms: [
        '一次受限时间窗内的异常观测（封存记录）',
        'Yuchen',
        'Lin',
        '他们在注视你',
        'review-log-trigger',
        'observation-00-figure-1.png',
        'observation-00-figure-2.png',
      ],
    },
    {
      path: 'review-log/index.html',
      terms: [
        'Comments',
        'Yuchen',
        '他们在注视你',
        '时间怎么比前面还早？',
        '评论排序 bug',
        'blogger-badge',
        '用户9920416',
        'sms_admin_recovery.jpg',
        'missing_notice_wei.jpg',
        'cctv_0237.jpg',
        'cctv_0355.jpg',
        'field-check-1428.png',
        'field-check-1430.png',
        'review-system-notice',
        '系统提示',
        '更多记录已损坏。',
        'arg-admin-nav-wrap',
        '>登录</a>',
        '链路调试台',
        '搜索信息',
        '运行日志',
        'arg-recovery-account',
        'arg-admin-recovery-loading',
        'ACCESS GRANTED',
        'arg-password-warning',
        '马上离开！',
        'Abnormal message input detected.',
        'Comment module locked.',
        'Admin access verified.',
        'Comment module restored.',
        'missing-notice-easter-egg.png',
        'arg-easter-egg-modal',
        'arg-admin-modal',
      ],
    },
    {
      path: 'diary/index.html',
      terms: [
        '运行日志',
        'LOG INDEX',
        'D-22',
        'D-12',
        'D-11',
        '【日志索引损坏，正文不可恢复】',
        'diary-entry-data',
        'arg-diary.js',
        'arg-console.css',
        'arg-admin-nav-wrap',
        '链路调试台',
        '搜索信息',
        '运行日志',
      ],
    },
    {
      path: 'archive-search/index.html',
      terms: [
        'Archive Search',
        'archive-search-form',
        'archive-search-data',
        '基站',
        '王旭冉',
        'D-23',
        'NOOB-304',
        'fragment_d23.tmp',
        'fragment_containment.tmp',
        'fragment_key.tmp',
        'key_manifest.cache',
        'relay_registry.cache',
        'student_info_form.cache',
        'partially recovered',
        'data-record-type',
        '学生个人信息表',
        '学生信息表',
        '信息表',
        '封存',
        'student_info_form.json',
        'relay_registry.json',
        '系统记录：该名单最后由管理员编辑于 2026-04-06 10:01。',
        'arg-search.js',
        'arg-console.css',
        'arg-admin-nav-wrap',
        '链路调试台',
        '搜索信息',
        '运行日志',
      ],
    },
    {
      path: 'relay-console/index.html',
      terms: [
        'Relay Debug Console',
        'Local client permission layer',
        'relay-terminal',
        'relay-command-form',
        '输入密钥或命令',
        'ending-1-ode-to-joy.mp3',
        'arg-relay-console.js',
        'relay-console.css',
        'arg-admin-nav-wrap',
        '链路调试台',
        '搜索信息',
        '运行日志',
      ],
    },
    {
      path: 'zh/index.html',
      terms: [
        '南京林业大学/铜仁学院',
        '不知名博士研究生，研究方向为全球变化与生态系统碳汇。',
        '目前正在攻读博士学位。',
      ],
    },
    {
      path: 'zh/downloads/index.html',
      terms: [
        'download-access-password',
        '访问密码：NOOB304',
      ],
    },
    {
      path: 'zh/blog/index.html',
      terms: [
        'Article ID:',
        '008',
        'blog-download-link',
        'href="/zh/downloads/"',
      ],
    },
  ];

  for (const check of requiredContent) {
    const filePath = path.join(siteDir, ...check.path.split('/'));
    const content = await fs.readFile(filePath, 'utf8');
    const missingTerms = check.terms.filter((term) => !content.includes(term));

    if (missingTerms.length > 0) {
      recordFail(`${check.path} is missing ARG content: ${missingTerms.join(', ')}`);
    }
  }

  const archive = await fs.readFile(
    path.join(siteDir, 'zh', 'blog', 'index.html'),
    'utf8',
  );
  const reviewLog = await fs.readFile(
    path.join(siteDir, 'review-log', 'index.html'),
    'utf8',
  );
  const sitemap = await fs.readFile(path.join(siteDir, 'sitemap.xml'), 'utf8');
  const hiddenPaths = [
    '/observation-00/',
    '/review-log/',
    '/diary/',
    '/archive-search/',
    '/relay-console/',
  ];

  for (const hiddenPath of hiddenPaths) {
    if (archive.includes(hiddenPath)) {
      recordFail(`hidden ARG page leaked into blog archive: ${hiddenPath}`);
    }
    if (sitemap.includes(hiddenPath)) {
      recordFail(`hidden ARG page leaked into sitemap: ${hiddenPath}`);
    }
  }

  if (archive.includes('[代码下载页](/zh/downloads/)')) {
    recordFail('Chinese blog archive still exposes raw Markdown download syntax');
  }

  const renderedTimes = [
    ...reviewLog.matchAll(
      /<time class="review-comment__time"[^>]*>([^<]+)<\/time>/g,
    ),
  ].map((match) => match[1]);
  const invalidRenderedTimes = renderedTimes.filter(
    (timestamp) => !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(timestamp),
  );
  const renderedTimeInversions = renderedTimes.flatMap((timestamp, index) => (
    index > 0 && timestamp < renderedTimes[index - 1]
      ? [{ index, previous: renderedTimes[index - 1], current: timestamp }]
      : []
  ));
  const expectedRenderedTimeInversions = [
    { index: 2, previous: '2026-03-04 03:18', current: '2026-03-04 03:04' },
  ];
  const renderedIntentionalTimestampAnomalies = (
    JSON.stringify(renderedTimeInversions) === JSON.stringify(expectedRenderedTimeInversions)
  );
  const bloggerUsers = (
    reviewLog.match(/class="review-comment__user">Heng Wei<\/span>/g) || []
  ).length;
  const bloggerBadges = (
    reviewLog.match(/class="blogger-badge">博主回复<\/span>/g) || []
  ).length;
  const renderedForbidden = [
    '（楼主未关注，无历史发言）',
    '私信记录',
    '私信 1',
    '私信 2',
    '私信 3',
    '如果旧密码失效，请使用找回密码功能。',
    '阶段一：',
    '阶段二：',
    '阶段三：',
    '阶段四：',
    '阶段五：',
    '阶段六：',
    'Hidden comment archive recovered.',
    'System Log',
    'Comment Module Closed',
    'Recovered Attachments',
    '用户 9920416 此后未再公开发言。',
    '该留言未检测到继续编辑记录。',
    '由于检测到异常活动，该文章评论区已暂时关闭。',
    '补给点门口有监控。',
    '如果之后需要核对时间，可以查这里。',
    '不代表会去。',
    '回头回头回头',
    '救我救我救我',
    '它们它们它们',
    '进入日记模块',
  ].filter((term) => reviewLog.includes(term));

  if (renderedTimes.length === 0 || invalidRenderedTimes.length > 0) {
    recordFail(`rendered review log has invalid timestamps (${invalidRenderedTimes.length})`);
  }
  if (!renderedIntentionalTimestampAnomalies) {
    recordFail('rendered review log intentional timestamp anomalies are missing or misplaced');
  }
  if (
    !reviewLog.includes('class="review-system-notice"')
    || !reviewLog.includes('class="arg-admin-nav"')
    || reviewLog.includes('class="arg-admin-entry"')
  ) {
    recordFail('rendered review log system notice or navigation login placement is incorrect');
  }
  if (bloggerUsers === 0 || bloggerUsers !== bloggerBadges) {
    recordFail(
      `rendered blogger badges mismatch: users=${bloggerUsers}, badges=${bloggerBadges}`,
    );
  }
  if (renderedForbidden.length > 0) {
    recordFail(`rendered review log contains forbidden text: ${renderedForbidden.join(', ')}`);
  }

  if (failureCount === 0) {
    recordPass('rendered ARG routes, content, archive exclusion, and sitemap exclusion');
  }
}

async function main() {
  console.log('Site integrity checks');
  await checkRequiredFiles();
  await checkForbiddenStrings();
  await checkArticleIds();
  await checkReviewLogSource();
  await checkBackendConsoleSource();
  await checkRelayConsoleSource();
  await checkBuildOutput();
  await checkRenderedArgFeatures();

  if (failureCount > 0) {
    console.error(`FAIL site integrity checks completed with ${failureCount} failing section(s)`);
    process.exitCode = 1;
    return;
  }

  recordPass('site integrity checks completed');
}

main().catch((error) => {
  console.error(`FAIL site integrity checks could not run: ${error.message}`);
  process.exitCode = 1;
});
