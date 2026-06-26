#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const publicationsPath = path.join(rootDir, '_data', 'publications.yml');
const requestTimeoutMs = 15_000;

function stripInlineComment(value) {
  let quote = null;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const previous = value[index - 1];

    if ((char === '"' || char === "'") && previous !== '\\') {
      quote = quote === char ? null : quote || char;
      continue;
    }

    if (char === '#' && !quote && (index === 0 || /\s/.test(previous))) {
      return value.slice(0, index).trim();
    }
  }

  return value.trim();
}

function parseScalar(value) {
  const stripped = stripInlineComment(value).trim();

  if (!stripped || stripped === '~' || stripped.toLowerCase() === 'null') {
    return '';
  }

  if (
    (stripped.startsWith('"') && stripped.endsWith('"')) ||
    (stripped.startsWith("'") && stripped.endsWith("'"))
  ) {
    return stripped.slice(1, -1).trim();
  }

  return stripped;
}

function setField(publication, fieldName, value) {
  const normalizedName = fieldName.toLowerCase();

  if (normalizedName !== 'url' && normalizedName !== 'doi') {
    return;
  }

  publication.fields[normalizedName] = parseScalar(value);
}

function parsePublications(yaml) {
  const publications = [];
  let current = null;
  let listIndent = null;

  yaml.split(/\r?\n/).forEach((line, index) => {
    if (/^\s*(#|$)/.test(line)) {
      return;
    }

    const itemMatch = line.match(/^(\s*)-\s*(.*)$/);
    const itemIndent = itemMatch?.[1].length;

    if (itemMatch && (listIndent === null || itemIndent === listIndent)) {
      listIndent = itemIndent;
      current = { line: index + 1, fieldIndent: null, fields: {} };
      publications.push(current);

      const inlineFieldMatch = itemMatch[2].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (inlineFieldMatch) {
        setField(current, inlineFieldMatch[1], inlineFieldMatch[2]);
      }

      return;
    }

    if (!current) {
      return;
    }

    const fieldMatch = line.match(/^(\s+)([A-Za-z0-9_-]+):\s*(.*)$/);
    if (fieldMatch) {
      const fieldIndent = fieldMatch[1].length;

      if (fieldIndent <= listIndent) {
        return;
      }

      current.fieldIndent ??= fieldIndent;

      if (fieldIndent === current.fieldIndent) {
        setField(current, fieldMatch[2], fieldMatch[3]);
      }
    }
  });

  return publications;
}

function normalizeUrl(url) {
  const trimmed = url.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  throw new Error(`unsupported URL "${url}"`);
}

function doiToUrl(doi) {
  const normalizedDoi = doi
    .trim()
    .replace(/^doi:\s*/i, '')
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '');

  if (!normalizedDoi) {
    throw new Error('empty DOI');
  }

  return `https://doi.org/${encodeURI(normalizedDoi)}`;
}

function linkForPublication(publication) {
  if (publication.fields.url) {
    return {
      source: `publication starting line ${publication.line} url`,
      url: normalizeUrl(publication.fields.url),
    };
  }

  if (publication.fields.doi) {
    return {
      source: `publication starting line ${publication.line} doi`,
      url: doiToUrl(publication.fields.doi),
    };
  }

  return null;
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const { headers = {}, ...requestOptions } = options;

  try {
    return await fetch(url, {
      ...requestOptions,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'academic-site-link-checker/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...headers,
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function isAllowedStatus(status) {
  return status >= 200 && status < 400;
}

async function requestUrl(url, method) {
  try {
    const response = await fetchWithTimeout(url, {
      method,
      headers: method === 'GET' ? { Range: 'bytes=0-0' } : {},
    });

    await response.body?.cancel?.();

    return {
      method,
      status: response.status,
      ok: isAllowedStatus(response.status),
    };
  } catch (error) {
    return {
      method,
      ok: false,
      error: error.name === 'AbortError' ? `timed out after ${requestTimeoutMs}ms` : error.message,
    };
  }
}

function formatAttempt(attempt) {
  if (attempt.error) {
    return `${attempt.method} ${attempt.error}`;
  }

  return `${attempt.method} HTTP ${attempt.status}`;
}

async function checkUrl(url) {
  const headAttempt = await requestUrl(url, 'HEAD');

  if (headAttempt.ok) {
    return { ok: true, detail: formatAttempt(headAttempt) };
  }

  const getAttempt = await requestUrl(url, 'GET');

  if (getAttempt.ok) {
    return {
      ok: true,
      detail: `${formatAttempt(headAttempt)}; fallback ${formatAttempt(getAttempt)}`,
    };
  }

  return {
    ok: false,
    detail: `${formatAttempt(headAttempt)}; fallback ${formatAttempt(getAttempt)}`,
  };
}

async function readPublications() {
  try {
    return await fs.readFile(publicationsPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('FAIL publication link check: missing _data/publications.yml');
      process.exitCode = 1;
      return null;
    }

    throw error;
  }
}

async function main() {
  console.log('Publication link checks');

  if (typeof fetch !== 'function') {
    console.error('FAIL publication link check: this script requires Node.js 18 or newer for fetch()');
    process.exitCode = 1;
    return;
  }

  const yaml = await readPublications();
  if (yaml === null) {
    return;
  }

  const publications = parsePublications(yaml);
  const links = [];
  const invalidEntries = [];

  for (const publication of publications) {
    try {
      const link = linkForPublication(publication);
      if (link) {
        links.push(link);
      }
    } catch (error) {
      invalidEntries.push({
        line: publication.line,
        message: error.message,
      });
    }
  }

  if (invalidEntries.length > 0) {
    console.error(`FAIL invalid publication link fields (${invalidEntries.length})`);
    for (const entry of invalidEntries) {
      console.error(`  - publication starting line ${entry.line}: ${entry.message}`);
    }
    process.exitCode = 1;
    return;
  }

  if (links.length === 0) {
    console.log('PASS publication link check: no DOI/URL links found');
    return;
  }

  const failedLinks = [];

  for (const link of links) {
    const result = await checkUrl(link.url);
    const status = result.ok ? 'PASS' : 'FAIL';
    console.log(`${status} ${link.source}: ${link.url} (${result.detail})`);

    if (!result.ok) {
      failedLinks.push(link);
    }
  }

  if (failedLinks.length > 0) {
    console.error(`FAIL publication link check completed with ${failedLinks.length} failing link(s)`);
    process.exitCode = 1;
    return;
  }

  console.log(`PASS publication link check completed (${links.length} link(s))`);
}

main().catch((error) => {
  console.error(`FAIL publication link check could not run: ${error.message}`);
  process.exitCode = 1;
});
