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
  '_pages/about.md',
  '_pages/about-zh.md',
  '_pages/publications.md',
  '_pages/publications-zh.md',
  '_pages/observation-00.md',
  '_pages/review-log.md',
  '_layouts/arg.html',
  'assets/css/arg.css',
  'assets/js/article-router.js',
  'assets/js/arg-page.js',
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
  { path: 'assets/css/arg.css', type: 'file' },
  { path: 'assets/js/article-router.js', type: 'file' },
  { path: 'assets/js/arg-page.js', type: 'file' },
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
        'Reviewer_01',
        '我们在注视你',
        'review-log-trigger',
        'observation-00-figure-1.png',
        'observation-00-figure-2.png',
      ],
    },
    {
      path: 'review-log/index.html',
      terms: ['该模块已恢复', '你们把“看见”理解得太窄', '更多记录已损坏'],
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
  const sitemap = await fs.readFile(path.join(siteDir, 'sitemap.xml'), 'utf8');
  const hiddenPaths = ['/observation-00/', '/review-log/'];

  for (const hiddenPath of hiddenPaths) {
    if (archive.includes(hiddenPath)) {
      recordFail(`hidden ARG page leaked into blog archive: ${hiddenPath}`);
    }
    if (sitemap.includes(hiddenPath)) {
      recordFail(`hidden ARG page leaked into sitemap: ${hiddenPath}`);
    }
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
