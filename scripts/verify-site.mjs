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
  const data = await fs.readFile(dataPath, 'utf8');
  const page = await fs.readFile(pagePath, 'utf8');
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
  const intentionalTimestampAnomaly = timestampInversions.length === 1
    && timestampInversions[0].index === 2
    && timestampInversions[0].previous === '2026-03-04 03:18'
    && timestampInversions[0].current === '2026-03-04 03:04';

  if (timestamps.length === 0 || invalidTimestamps.length > 0) {
    recordFail(`review log has invalid timestamps: ${invalidTimestamps.join(', ')}`);
  }
  if (!intentionalTimestampAnomaly) {
    recordFail('review log intentional 03:04 timestamp anomaly is missing or misplaced');
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
    'cctv_0301.jpg',
  ];
  const missingAttachments = requiredAttachmentNames.filter(
    (filename) => !data.includes(filename),
  );
  const attachmentRendererMissing = !page.includes('data-arg-attachment')
    || !page.includes('attachment.filename')
    || !page.includes('attachment.path');
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
  if (foundForbidden.length > 0) {
    recordFail(`review log contains forbidden text: ${foundForbidden.join(', ')}`);
  }

  if (
    invalidTimestamps.length === 0
    && intentionalTimestampAnomaly
    && missingBadges.length === 0
    && missingAttachments.length === 0
    && !attachmentRendererMissing
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
        '第 0 篇博客：一次受限时间窗内的异常观测',
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
        'cctv_0301.jpg',
        '登录博客后台',
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
      ],
    },
    {
      path: 'zh/blog/index.html',
      terms: ['Article ID:', '008'],
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
  const renderedIntentionalTimestampAnomaly = renderedTimeInversions.length === 1
    && renderedTimeInversions[0].index === 2
    && renderedTimeInversions[0].previous === '2026-03-04 03:18'
    && renderedTimeInversions[0].current === '2026-03-04 03:04';
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
  ].filter((term) => reviewLog.includes(term));

  if (renderedTimes.length === 0 || invalidRenderedTimes.length > 0) {
    recordFail(`rendered review log has invalid timestamps (${invalidRenderedTimes.length})`);
  }
  if (!renderedIntentionalTimestampAnomaly) {
    recordFail('rendered review log intentional 03:04 timestamp anomaly is missing or misplaced');
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
