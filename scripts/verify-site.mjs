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
  '_pages/about.md',
  '_pages/about-zh.md',
  '_pages/publications.md',
  '_pages/publications-zh.md',
  '_pages/observation-00.md',
  '_pages/review-log.md',
  '_pages/diary.md',
  '_layouts/arg.html',
  'assets/css/arg.css',
  'assets/css/arg-admin.css',
  'assets/js/article-router.js',
  'assets/js/arg-page.js',
  'assets/js/arg-admin.js',
  'assets/images/arg/sms_admin_recovery.jpg',
  'assets/images/arg/missing_notice_wei.jpg',
  'assets/images/arg/cctv_0237.jpg',
  'assets/images/arg/cctv_0355.jpg',
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
  { path: 'assets/css/arg.css', type: 'file' },
  { path: 'assets/css/arg-admin.css', type: 'file' },
  { path: 'assets/js/article-router.js', type: 'file' },
  { path: 'assets/js/arg-page.js', type: 'file' },
  { path: 'assets/js/arg-admin.js', type: 'file' },
  { path: 'assets/images/arg/sms_admin_recovery.jpg', type: 'file' },
  { path: 'assets/images/arg/missing_notice_wei.jpg', type: 'file' },
  { path: 'assets/images/arg/cctv_0237.jpg', type: 'file' },
  { path: 'assets/images/arg/cctv_0355.jpg', type: 'file' },
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
    && masthead.includes('管理密钥')
    && masthead.includes('搜索信息')
    && masthead.includes('运行日志')
    && !page.includes('class="arg-admin-entry"')
    && !page.includes('id="arg-admin-open"');
  const recoveryFlowCorrect = page.includes('id="arg-recovery-account"')
    && page.includes('id="arg-admin-recovery-loading"')
    && page.includes('ACCESS GRANTED')
    && adminScript.includes('LOGIN_STORAGE_KEY')
    && adminScript.includes('2000')
    && adminScript.includes('playRecoverySound')
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
      `review log source rules (${timestamps.length} timestamps, ${bloggerBlocks.length} blogger replies, 4 attachments)`,
    );
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
        'review-system-notice',
        '系统提示',
        '更多记录已损坏。',
        'arg-admin-nav-wrap',
        '>登录</a>',
        '管理密钥',
        '搜索信息',
        '运行日志',
        'arg-recovery-account',
        'arg-admin-recovery-loading',
        'ACCESS GRANTED',
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
        'Diary Module',
        '日志模块已恢复。',
        'D-00｜白天复核',
        'D-05｜失联后写入',
        'arg-admin-nav-wrap',
        '管理密钥',
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
  const hiddenPaths = ['/observation-00/', '/review-log/', '/diary/'];

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
