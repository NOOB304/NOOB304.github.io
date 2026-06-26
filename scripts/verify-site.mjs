#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const requiredFiles = [
  '_config.yml',
  '_data/navigation.yml',
  '_data/publications.yml',
  '_pages/about.md',
  '_pages/about-zh.md',
  '_pages/publications.md',
  '_pages/publications-zh.md',
  'assets/images/avatar.jpg',
  'assets/js/main.min.js',
];

const forbiddenStrings = [
  'Lvyizhuo',
  '吕逸卓',
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
];

const requiredBuildPaths = [
  { path: 'index.html', type: 'file' },
  { path: 'en', type: 'directory' },
  { path: 'zh', type: 'directory' },
  { path: 'publications', type: 'directory' },
  { path: 'zh/publications', type: 'directory' },
  { path: '404.html', type: 'file' },
];

let failureCount = 0;

function toAbsolute(relativePath) {
  return path.join(rootDir, ...relativePath.split('/'));
}

function toDisplayPath(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/') || '.';
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
        files.push(absolutePath);
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
    recordPass(`no forbidden reference-author strings in source roots (${files.size} files scanned)`);
    return;
  }

  recordFail(`forbidden reference-author strings found (${matches.length})`);
  for (const match of matches) {
    console.error(`  - ${match.file}: "${match.term}"`);
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

async function main() {
  console.log('Site integrity checks');
  await checkRequiredFiles();
  await checkForbiddenStrings();
  await checkBuildOutput();

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
