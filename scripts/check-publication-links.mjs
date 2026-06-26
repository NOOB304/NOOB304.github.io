#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const publicationsPath = path.join(rootDir, '_data', 'publications.yml');
const requestTimeoutMs = 15_000;

class PublicationDataError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PublicationDataError';
  }
}

function normalizeUrl(url) {
  const trimmed = url.trim();
  const candidate = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new PublicationDataError(`unsupported URL "${url}"`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new PublicationDataError(`unsupported URL protocol "${parsed.protocol}" in "${url}"`);
  }

  return parsed.toString();
}

function doiToUrl(doi) {
  const normalizedDoi = doi
    .trim()
    .replace(/^doi:\s*/i, '')
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '');

  if (!/^10\.\S+\/\S+$/.test(normalizedDoi)) {
    throw new PublicationDataError(`invalid DOI "${doi}"`);
  }

  return `https://doi.org/${encodeURI(normalizedDoi)}`;
}

function stringField(publication, fieldName, index) {
  const value = publication[fieldName];

  if (value === undefined || value === null || value === '') {
    return '';
  }

  if (typeof value !== 'string') {
    throw new PublicationDataError(`publication #${index + 1} field "${fieldName}" must be a string`);
  }

  return value;
}

function parsePublicationsYaml(yamlText) {
  if (yamlText.trim() === '') {
    throw new PublicationDataError('empty _data/publications.yml; expected a YAML list of publication objects');
  }

  const document = YAML.parseDocument(yamlText, {
    prettyErrors: false,
    strict: true,
  });

  if (document.errors.length > 0) {
    const firstError = document.errors[0];
    throw new PublicationDataError(`malformed YAML: ${firstError.message}`);
  }

  const publications = document.toJS();

  if (!Array.isArray(publications)) {
    throw new PublicationDataError('expected _data/publications.yml to be a YAML list of publication objects');
  }

  for (const [index, publication] of publications.entries()) {
    if (
      publication === null ||
      typeof publication !== 'object' ||
      Array.isArray(publication)
    ) {
      throw new PublicationDataError(`publication #${index + 1} must be an object`);
    }
  }

  return publications;
}

function linksFromPublications(publications) {
  const links = [];

  publications.forEach((publication, index) => {
    const url = stringField(publication, 'url', index);
    const doi = stringField(publication, 'doi', index);

    if (url) {
      links.push({
        source: `publication #${index + 1} url`,
        url: normalizeUrl(url),
      });
      return;
    }

    if (doi) {
      links.push({
        source: `publication #${index + 1} doi`,
        url: doiToUrl(doi),
      });
    }
  });

  return links;
}

function extractLinksFromYaml(yamlText) {
  return linksFromPublications(parsePublicationsYaml(yamlText));
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const { headers = {}, ...requestOptions } = options;

  try {
    return await fetch(url, {
      redirect: 'follow',
      ...requestOptions,
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

function isDoiResolverUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    return (hostname === 'doi.org' || hostname === 'dx.doi.org') && parsed.pathname.startsWith('/10.');
  } catch {
    return false;
  }
}

async function requestUrl(url, method, options = {}) {
  const { headers = {}, ...requestOptions } = options;

  try {
    const response = await fetchWithTimeout(url, {
      method,
      ...requestOptions,
      headers: {
        ...(method === 'GET' ? { Range: 'bytes=0-0' } : {}),
        ...headers,
      },
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

async function checkDoiResolverUrl(url, requester) {
  const headAttempt = await requester(url, 'HEAD', { redirect: 'manual' });

  if (headAttempt.ok) {
    return {
      ok: true,
      detail: `doi.org resolver ${formatAttempt(headAttempt)} (manual redirect accepted)`,
    };
  }

  const getAttempt = await requester(url, 'GET', { redirect: 'manual' });

  if (getAttempt.ok) {
    return {
      ok: true,
      detail: `doi.org resolver ${formatAttempt(headAttempt)}; fallback resolver ${formatAttempt(getAttempt)} (manual redirect accepted)`,
    };
  }

  return {
    ok: false,
    detail: `doi.org resolver ${formatAttempt(headAttempt)}; fallback resolver ${formatAttempt(getAttempt)}`,
  };
}

async function checkRegularUrl(url, requester) {
  const headAttempt = await requester(url, 'HEAD');

  if (headAttempt.ok) {
    return { ok: true, detail: formatAttempt(headAttempt) };
  }

  const getAttempt = await requester(url, 'GET');

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

async function checkUrl(url, requester = requestUrl) {
  if (isDoiResolverUrl(url)) {
    return checkDoiResolverUrl(url, requester);
  }

  return checkRegularUrl(url, requester);
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

function assertThrows(name, input, expectedMessage) {
  try {
    extractLinksFromYaml(input);
  } catch (error) {
    if (error instanceof PublicationDataError && error.message.includes(expectedMessage)) {
      console.log(`PASS self-test ${name}`);
      return;
    }

    throw new Error(`self-test ${name} failed with unexpected error: ${error.message}`);
  }

  throw new Error(`self-test ${name} failed: expected an error containing "${expectedMessage}"`);
}

function assertLinks(name, input, expectedUrls) {
  const links = extractLinksFromYaml(input);
  const actualUrls = links.map((link) => link.url);

  if (JSON.stringify(actualUrls) !== JSON.stringify(expectedUrls)) {
    throw new Error(
      `self-test ${name} failed: expected ${JSON.stringify(expectedUrls)}, got ${JSON.stringify(actualUrls)}`,
    );
  }

  console.log(`PASS self-test ${name}`);
}

async function assertCheckUrl(name, url, requester, expectedOk, expectedDetailText) {
  const result = await checkUrl(url, requester);

  if (result.ok !== expectedOk) {
    throw new Error(`self-test ${name} failed: expected ok=${expectedOk}, got ok=${result.ok} (${result.detail})`);
  }

  if (expectedDetailText && !result.detail.includes(expectedDetailText)) {
    throw new Error(
      `self-test ${name} failed: expected detail containing "${expectedDetailText}", got "${result.detail}"`,
    );
  }

  console.log(`PASS self-test ${name}`);
}

async function runSelfTest() {
  console.log('Publication link parser self-tests');

  assertThrows('malformed YAML fails closed', '- title: Broken\n  url: [unterminated', 'malformed YAML');
  assertThrows('non-list YAML fails closed', 'title: Not a list\nurl: https://example.com/', 'YAML list');
  assertThrows('empty file fails closed', '\n  \n', 'empty _data/publications.yml');
  assertThrows('bad URL fails closed', '- title: Bad URL\n  url: ftp://example.com/file.pdf', 'unsupported URL protocol');
  assertLinks(
    'valid DOI and URL extraction',
    [
      '- title: DOI paper',
      '  doi: 10.1000/xyz123',
      '- title: URL paper',
      '  url: https://example.com/paper',
    ].join('\n'),
    ['https://doi.org/10.1000/xyz123', 'https://example.com/paper'],
  );

  await assertCheckUrl(
    'DOI resolver manual redirect 3xx passes',
    'https://doi.org/10.1000/xyz123',
    async (_url, method, options = {}) => ({
      method,
      status: options.redirect === 'manual' ? 302 : 403,
      ok: options.redirect === 'manual',
    }),
    true,
    'manual redirect accepted',
  );
  await assertCheckUrl(
    'DOI resolver manual 2xx passes',
    'https://doi.org/10.1000/xyz123',
    async (_url, method, options = {}) => ({
      method,
      status: options.redirect === 'manual' ? 204 : 403,
      ok: options.redirect === 'manual',
    }),
    true,
    'HTTP 204',
  );
  await assertCheckUrl(
    'non-DOI 403 still fails',
    'https://publisher.example/paper',
    async (_url, method) => ({
      method,
      status: 403,
      ok: false,
    }),
    false,
    'HTTP 403',
  );

  console.log('PASS publication link parser self-tests completed');
}

async function main() {
  if (process.argv.includes('--self-test')) {
    await runSelfTest();
    return;
  }

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

  let links;
  try {
    links = extractLinksFromYaml(yaml);
  } catch (error) {
    if (error instanceof PublicationDataError) {
      console.error(`FAIL publication link check: ${error.message}`);
      process.exitCode = 1;
      return;
    }

    throw error;
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
