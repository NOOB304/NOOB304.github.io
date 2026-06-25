# Heng Wei Personal Academic Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a bilingual Academic Pages website at `https://we1heng.github.io` that closely matches every primary page type on the approved reference site while containing only Heng Wei's verified content.

**Architecture:** Import the reference site's MIT-licensed Academic Pages presentation layer, then replace all identity and content layers with focused bilingual data and pages. English and Chinese routes share layouts, includes, publication data, responsive styles, dark mode, and a small language-preference script; GitHub Actions builds the Jekyll site and runs rendered-output verification before deployment.

**Tech Stack:** Jekyll, Liquid, Markdown, YAML, SCSS, vanilla JavaScript, Node.js verification scripts, GitHub Pages, GitHub Actions.

---

## File Structure

The implementation creates or modifies these units:

- `.github/workflows/pages.yml` — production build, verification, and Pages deployment.
- `_config.yml` — site identity, author profile, collections, plugins, defaults, and SEO.
- `_data/navigation.yml` — English and Chinese navigation arrays.
- `_data/publications.yml` — the single verified source for all five publications.
- `_includes/masthead.html` — reference navigation with language-aware menu selection.
- `_includes/language-switch.html` — corresponding-route language switch.
- `_includes/author-profile.html` — localized profile name, biography, location, and institution.
- `_includes/publication-list.html` — reusable, fully clickable publication list.
- `_includes/footer.html` and `_includes/footer/custom.html` — localized standard Academic Pages footer without reference-author text.
- `_includes/scripts.html` — reference scripts plus language-preference behavior.
- `_layouts/default.html` — page-specific HTML language attribute.
- `_pages/about.md` and `_pages/about.zh.md` — English and Chinese homepages.
- `_pages/publications.html` and `_pages/publications.zh.html` — bilingual publication archives.
- `_pages/portfolio.html` and `_pages/portfolio.zh.html` — bilingual projects empty states using the reference page structure.
- `_pages/year-archive.html` and `_pages/year-archive.zh.html` — bilingual blog archives and empty states.
- `_pages/cv.md` and `_pages/cv.zh.md` — bilingual minimal CVs containing only confirmed facts.
- `_pages/404.md` — bilingual not-found page.
- `assets/js/language-preference.js` — stores language choice and redirects root visitors who selected Chinese.
- `_sass/layout/_language.scss` — language switch, publication-row, and empty-state styling.
- `assets/css/main.scss` — imports the new focused stylesheet.
- `images/profile.jpg` — user-provided rabbit avatar.
- `scripts/verify-site.mjs` — source and rendered-site integrity checks.
- `scripts/check-publication-links.mjs` — external DOI reachability check.
- `LICENSE` — retained MIT license and upstream attribution.

Reference source used during implementation:

`D:\Codex\.reference\Lvyizhuo.github.io-main`

Target repository:

`D:\Codex\We1heng.github.io`

### Task 1: Import the Reference Presentation Layer

**Files:**

- Create: `.github/workflows/pages.yml`
- Create: `_includes/**`
- Create: `_layouts/**`
- Create: `_sass/**`
- Create: `assets/**`
- Create: `images/favicon*`
- Create: `images/apple-touch-icon-180x180.png`
- Create: `images/manifest.json`
- Create: `_data/ui-text.yml`
- Create: `Gemfile`
- Create: `Gemfile.lock`
- Create: `Dockerfile`
- Create: `docker-compose.yaml`
- Create: `LICENSE`

- [ ] **Step 1: Confirm the reference checkout and target repository**

Run:

```powershell
Test-Path 'D:\Codex\.reference\Lvyizhuo.github.io-main\_layouts\default.html'
Test-Path 'D:\Codex\We1heng.github.io\.git'
```

Expected:

```text
True
True
```

- [ ] **Step 2: Copy only the reusable theme and build files**

Run:

```powershell
$source = 'D:\Codex\.reference\Lvyizhuo.github.io-main'
$target = 'D:\Codex\We1heng.github.io'

Copy-Item "$source\_includes" "$target\_includes" -Recurse -Force
Copy-Item "$source\_layouts" "$target\_layouts" -Recurse -Force
Copy-Item "$source\_sass" "$target\_sass" -Recurse -Force
Copy-Item "$source\assets" "$target\assets" -Recurse -Force
New-Item -ItemType Directory -Force "$target\_data" | Out-Null
Copy-Item "$source\_data\ui-text.yml" "$target\_data\ui-text.yml" -Force
New-Item -ItemType Directory -Force "$target\images" | Out-Null
Copy-Item "$source\images\favicon.svg" "$target\images\favicon.svg" -Force
Copy-Item "$source\images\favicon.ico" "$target\images\favicon.ico" -Force
Copy-Item "$source\images\favicon-32x32.png" "$target\images\favicon-32x32.png" -Force
Copy-Item "$source\images\favicon-192x192.png" "$target\images\favicon-192x192.png" -Force
Copy-Item "$source\images\favicon-512x512.png" "$target\images\favicon-512x512.png" -Force
Copy-Item "$source\images\apple-touch-icon-180x180.png" "$target\images\apple-touch-icon-180x180.png" -Force
Copy-Item "$source\images\manifest.json" "$target\images\manifest.json" -Force
Copy-Item "$source\Gemfile" "$target\Gemfile" -Force
Copy-Item "$source\Gemfile.lock" "$target\Gemfile.lock" -Force
Copy-Item "$source\Dockerfile" "$target\Dockerfile" -Force
Copy-Item "$source\docker-compose.yaml" "$target\docker-compose.yaml" -Force
Copy-Item "$source\LICENSE" "$target\LICENSE" -Force
New-Item -ItemType Directory -Force "$target\.github\workflows" | Out-Null
Copy-Item "$source\.github\workflows\pages.yml" "$target\.github\workflows\pages.yml" -Force
```

Do not copy `_posts`, `_portfolio`, `_publications`, `_teaching`, `_talks`, `_data/csdn_posts.yml`, scripts, PDFs, project images, or any reference-author profile image.

- [ ] **Step 3: Verify no personal content directories were imported**

Run:

```powershell
$forbidden = @(
  '_posts',
  '_portfolio',
  '_publications',
  '_teaching',
  '_talks',
  '_data\csdn_posts.yml',
  'images\profile.png'
)
$forbidden | ForEach-Object {
  [pscustomobject]@{ Path = $_; Exists = Test-Path (Join-Path 'D:\Codex\We1heng.github.io' $_) }
}
```

Expected: every `Exists` value is `False`.

- [ ] **Step 4: Commit the reusable baseline**

Run:

```powershell
git add .github _includes _layouts _sass assets images _data/ui-text.yml Gemfile Gemfile.lock Dockerfile docker-compose.yaml LICENSE
git commit -m "chore: import Academic Pages presentation layer"
```

Expected: one commit containing theme and build files only.

### Task 2: Add Site Integrity Tests Before Personalization

**Files:**

- Create: `scripts/verify-site.mjs`
- Create: `scripts/check-publication-links.mjs`

- [ ] **Step 1: Write the source and rendered-output verifier**

Create `scripts/verify-site.mjs`:

```javascript
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const rendered = process.argv.includes("--rendered");
const base = rendered ? path.join(root, "_site") : root;

const requiredSource = [
  "_config.yml",
  "_data/navigation.yml",
  "_data/publications.yml",
  "_pages/about.md",
  "_pages/about.zh.md",
  "_pages/publications.html",
  "_pages/publications.zh.html",
  "_pages/portfolio.html",
  "_pages/portfolio.zh.html",
  "_pages/year-archive.html",
  "_pages/year-archive.zh.html",
  "_pages/cv.md",
  "_pages/cv.zh.md",
  "images/profile.jpg",
];

const requiredRendered = [
  "index.html",
  "zh/index.html",
  "publications/index.html",
  "zh/publications/index.html",
  "projects/index.html",
  "zh/projects/index.html",
  "year-archive/index.html",
  "zh/blog/index.html",
  "cv/index.html",
  "zh/cv/index.html",
  "404.html",
];

const expectedDois = [
  "10.1002/ldr.70719",
  "10.16614/j.gznuj.zrb.2026.01.001",
  "10.34133/ehs.0404",
  "10.20103/j.stxb.202407151649",
  "10.1016/j.ecolind.2024.112465",
];

const forbiddenIdentity = [
  "Lvyizhuo",
  "Yizhuo Lv",
  "Qilu University",
  "Shandong Artificial Intelligence Institute",
  "blog.csdn.net/Lvyizhuo",
];

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  }
}

function readTree(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.name === ".git" || entry.name === "vendor") continue;
    if (entry.isDirectory()) output.push(...readTree(full));
    else output.push(full);
  }
  return output;
}

const required = rendered ? requiredRendered : requiredSource;
for (const relative of required) {
  assert(fs.existsSync(path.join(base, relative)), `missing ${relative}`);
}

const sourceRoots = [
  "_config.yml",
  "_data",
  "_includes",
  "_layouts",
  "_pages",
  "_sass",
  "assets",
];

const candidates = rendered
  ? readTree(base)
  : sourceRoots.flatMap((relative) => {
      const entry = path.join(base, relative);
      if (!fs.existsSync(entry)) return [];
      return fs.statSync(entry).isDirectory() ? readTree(entry) : [entry];
    });

const textFiles = candidates.filter((file) =>
  /\.(html|md|yml|yaml|js|scss|xml|txt)$/i.test(file)
);
const corpus = textFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");

for (const identity of forbiddenIdentity) {
  assert(!corpus.includes(identity), `reference identity leaked: ${identity}`);
}

assert(corpus.includes("魏珩"), "Chinese name is absent");
assert(corpus.includes("Heng Wei"), "English name is absent");
assert(corpus.includes("Nanjing Forestry University"), "institution is absent");

for (const doi of expectedDois) {
  assert(corpus.includes(doi), `publication DOI is absent: ${doi}`);
}

if (rendered) {
  const englishHome = fs.readFileSync(path.join(base, "index.html"), "utf8");
  const chineseHome = fs.readFileSync(path.join(base, "zh/index.html"), "utf8");
  assert(englishHome.includes('lang="en"'), "English homepage lacks lang=en");
  assert(chineseHome.includes('lang="zh"'), "Chinese homepage lacks lang=zh");
  assert(englishHome.includes("/zh/"), "English homepage lacks Chinese switch");
  assert(chineseHome.includes('href="/"'), "Chinese homepage lacks English switch");
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`PASS: ${rendered ? "rendered" : "source"} site verification`);
```

- [ ] **Step 2: Write the publication-link checker**

Create `scripts/check-publication-links.mjs`:

```javascript
const links = [
  "https://doi.org/10.1002/ldr.70719",
  "https://doi.org/10.16614/j.gznuj.zrb.2026.01.001",
  "https://doi.org/10.34133/ehs.0404",
  "https://doi.org/10.20103/j.stxb.202407151649",
  "https://doi.org/10.1016/j.ecolind.2024.112465",
];

let failed = false;
for (const url of links) {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": "We1heng-site-link-check/1.0" },
    });
    const ok = response.status >= 200 && response.status < 400;
    console.log(`${ok ? "PASS" : "FAIL"} ${response.status} ${url}`);
    if (!ok) failed = true;
  } catch (error) {
    console.error(`FAIL ${url}: ${error.message}`);
    failed = true;
  }
}

if (failed) process.exit(1);
```

- [ ] **Step 3: Run the source verifier and confirm it fails for missing personal files**

Run:

```powershell
$node = 'C:\Users\16PRO\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node scripts/verify-site.mjs
```

Expected: failure messages beginning with `missing _config.yml`, `missing _data/navigation.yml`, and other personalized files.

- [ ] **Step 4: Commit the failing integrity harness**

Run:

```powershell
git add scripts/verify-site.mjs scripts/check-publication-links.mjs
git commit -m "test: add academic site integrity checks"
```

### Task 3: Configure Identity, Avatar, Metadata, and Shared Data

**Files:**

- Create: `_config.yml`
- Create: `_data/navigation.yml`
- Create: `_data/publications.yml`
- Create: `images/profile.jpg`
- Modify: `_includes/footer/custom.html`

- [ ] **Step 1: Create the site configuration**

Create `_config.yml` by starting from the reference `_config.yml`, retaining its plugin, collection, Sass, archive, and compression sections, and replacing the identity blocks with:

```yaml
locale: "en-US"
site_theme: "default"
title: "Heng Wei"
title_separator: "-"
name: &name "Homepage of Heng Wei"
description: &description "Heng Wei's academic website on global change and ecosystem carbon sinks."
url: "https://we1heng.github.io"
baseurl: ""
repository: "We1heng/We1heng.github.io"
timezone: "Asia/Shanghai"

author:
  avatar: "profile.jpg"
  name: "魏珩 Heng Wei"
  name_en: "Heng Wei"
  name_zh: "魏珩"
  bio: "Ph.D. student studying global change and ecosystem carbon sinks."
  bio_en: "Ph.D. student studying global change and ecosystem carbon sinks."
  bio_zh: "南京林业大学博士研究生，研究方向为全球变化与生态系统碳汇。"
  location: "Nanjing, China"
  location_en: "Nanjing, China"
  location_zh: "中国南京"
  employer: "Nanjing Forestry University"
  employer_en: "Nanjing Forestry University"
  employer_zh: "南京林业大学"
  email: "we1heng@outlook.com"
  github: "We1heng"

publication_category:
  manuscripts:
    title: "Journal Articles"

analytics:
  provider: "false"

comments:
  provider:
```

In the `defaults` section, set `comments: false`, `share: false`, and retain `author_profile: true`. Do not add Google Scholar or ORCID fields.

- [ ] **Step 2: Create bilingual navigation data**

Create `_data/navigation.yml`:

```yaml
en:
  - title: "Publications"
    url: /publications/
  - title: "Projects"
    url: /projects/
  - title: "Blog Posts"
    url: /year-archive/
  - title: "CV"
    url: /cv/

zh:
  - title: "论文成果"
    url: /zh/publications/
  - title: "研究项目"
    url: /zh/projects/
  - title: "博客文章"
    url: /zh/blog/
  - title: "个人简历"
    url: /zh/cv/
```

- [ ] **Step 3: Create the verified publication dataset**

Create `_data/publications.yml`:

```yaml
- title: "Advancing Karst Soil Conservation Evaluation via the Soil Conservation Ratio"
  authors: "Wei H, Wu L, Xiong L S, Chen D, Yang D N, Du J J, Xia Y Y"
  venue: "Land Degradation & Development"
  year: 2026
  details: "Online published 24 June 2026"
  doi: "10.1002/ldr.70719"
  url: "https://doi.org/10.1002/ldr.70719"

- title: "喀斯特区磷限制危机：过去、现在与未来"
  authors: "吴路华, 魏珩, 杨东妮, 熊露莎, 陈丹, 张仁文, 齐琪"
  venue: "贵州师范大学学报（自然科学版）"
  year: 2026
  details: "44(1): 1–14, 63, 164"
  doi: "10.16614/j.gznuj.zrb.2026.01.001"
  url: "https://doi.org/10.16614/j.gznuj.zrb.2026.01.001"

- title: "Assessing Climate Impacts on Karst Vegetation Carbon Sink Change Worldwide"
  authors: "Wei H, Wu L H, Chen D, Yang D N, Yang Y F, Zhang Y, Du J J, Jia J L"
  venue: "Ecosystem Health and Sustainability"
  year: 2025
  details: "11: 0404"
  doi: "10.34133/ehs.0404"
  url: "https://doi.org/10.34133/ehs.0404"

- title: "中国农田生态系统碳源汇时空动态特征及其影响机制"
  authors: "魏珩, 吴路华, 杨东妮, 陈丹, 熊露莎"
  venue: "生态学报"
  year: 2025
  details: "45(15): 7277–7296"
  doi: "10.20103/j.stxb.202407151649"
  url: "https://doi.org/10.20103/j.stxb.202407151649"

- title: "Rapid climate changes responsible for increased net global cropland carbon sink during the last 40 years"
  authors: "Wei H, Wu L H, Chen D, Yang D N, Du J J, Xu Y J, Jia J L"
  venue: "Ecological Indicators"
  year: 2024
  details: "166: 112465"
  doi: "10.1016/j.ecolind.2024.112465"
  url: "https://doi.org/10.1016/j.ecolind.2024.112465"
```

Do not include impact factors, journal rankings, review-status text, or parenthetical evaluation claims.

- [ ] **Step 4: Copy the approved avatar**

Run:

```powershell
New-Item -ItemType Directory -Force 'D:\Codex\We1heng.github.io\images' | Out-Null
Copy-Item `
  'C:\Users\16PRO\xwechat_files\wxid_shes56wm2ti422_ceac\temp\RWTemp\2026-06\fa20057bb94ab1c4eb22252c1b8dcbdb.jpg' `
  'D:\Codex\We1heng.github.io\images\profile.jpg' `
  -Force
```

- [ ] **Step 5: Replace the reference custom footer**

Set `_includes/footer/custom.html` to:

```html
<!-- Heng Wei academic homepage -->
```

- [ ] **Step 6: Run the source verifier**

Run:

```powershell
$node = 'C:\Users\16PRO\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node scripts/verify-site.mjs
```

Expected: missing-page failures remain, but no failures for `_config.yml`, navigation, publications, avatar, name, institution, or DOI values.

- [ ] **Step 7: Commit shared identity and data**

Run:

```powershell
git add _config.yml _data/navigation.yml _data/publications.yml images/profile.jpg _includes/footer/custom.html
git commit -m "feat: configure Heng Wei identity and publication data"
```

### Task 4: Implement Bilingual Navigation and Author Profile

**Files:**

- Modify: `_layouts/default.html`
- Modify: `_includes/masthead.html`
- Create: `_includes/language-switch.html`
- Modify: `_includes/author-profile.html`
- Modify: `_includes/footer.html`
- Modify: `_includes/scripts.html`
- Create: `assets/js/language-preference.js`
- Create: `_sass/layout/_language.scss`
- Modify: `assets/css/main.scss`

- [ ] **Step 1: Make the document language page-specific**

In `_layouts/default.html`, replace the opening HTML tag with:

```liquid
{% assign document_lang = page.lang | default: "en" %}
<!doctype html>
<html lang="{{ document_lang }}" class="no-js"{% if site.site_theme == "dark" %} data-theme="dark"{% endif %}>
```

- [ ] **Step 2: Add a corresponding-route language switch**

Create `_includes/language-switch.html`:

```liquid
{% assign current_lang = page.lang | default: "en" %}
{% if current_lang == "zh" %}
  {% assign switch_label = "EN" %}
  {% assign switch_lang = "en" %}
  {% assign switch_url = page.translation_url | default: "/" %}
{% else %}
  {% assign switch_label = "中文" %}
  {% assign switch_lang = "zh" %}
  {% assign switch_url = page.translation_url | default: "/zh/" %}
{% endif %}
<li class="masthead__menu-item persist language-switch">
  <a href="{{ switch_url | relative_url }}"
     hreflang="{{ switch_lang }}"
     data-language-switch="{{ switch_lang }}">{{ switch_label }}</a>
</li>
```

- [ ] **Step 3: Replace the masthead loop with localized navigation**

Use this body in `_includes/masthead.html`:

```liquid
{% include base_path %}
{% assign current_lang = page.lang | default: "en" %}
{% assign navigation_links = site.data.navigation[current_lang] %}

<div class="masthead">
  <div class="masthead__inner-wrap">
    <div class="masthead__menu">
      <nav id="site-nav" class="greedy-nav">
        <button aria-label="Toggle navigation"><div class="navicon"></div></button>
        <ul class="visible-links">
          <li class="masthead__menu-item masthead__menu-item--lg persist">
            <a href="{% if current_lang == 'zh' %}{{ '/zh/' | relative_url }}{% else %}{{ '/' | relative_url }}{% endif %}">
              {% if current_lang == "zh" %}魏珩{% else %}Heng Wei{% endif %}
            </a>
          </li>
          {% for link in navigation_links %}
            <li class="masthead__menu-item">
              <a href="{{ link.url | relative_url }}">{{ link.title }}</a>
            </li>
          {% endfor %}
          {% include language-switch.html %}
          <li id="theme-toggle" class="masthead__menu-item persist tail">
            <a aria-label="Toggle color theme">
              <i id="theme-icon" class="fa-solid fa-sun" aria-hidden="true"></i>
            </a>
          </li>
        </ul>
        <ul class="hidden-links hidden"></ul>
      </nav>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Localize profile text without duplicating the profile component**

At the start of `_includes/author-profile.html`, after selecting `author`, add:

```liquid
{% assign current_lang = page.lang | default: "en" %}
{% if current_lang == "zh" %}
  {% assign author_name = author.name_zh %}
  {% assign author_bio = author.bio_zh %}
  {% assign author_location = author.location_zh %}
  {% assign author_employer = author.employer_zh %}
{% else %}
  {% assign author_name = author.name_en %}
  {% assign author_bio = author.bio_en %}
  {% assign author_location = author.location_en %}
  {% assign author_employer = author.employer_en %}
{% endif %}
```

Replace the displayed `author.name`, `author.bio`, `author.location`, and `author.employer` values with `author_name`, `author_bio`, `author_location`, and `author_employer`. Keep the reference icon, mobile Follow menu, email, and GitHub markup.

- [ ] **Step 5: Add language preference behavior**

Create `assets/js/language-preference.js`:

```javascript
(() => {
  const key = "preferred-language";

  document.querySelectorAll("[data-language-switch]").forEach((link) => {
    link.addEventListener("click", () => {
      localStorage.setItem(key, link.dataset.languageSwitch);
    });
  });

  const selected = localStorage.getItem(key);
  if (window.location.pathname === "/" && selected === "zh") {
    window.location.replace("/zh/");
  }
})();
```

Append to `_includes/scripts.html`:

```liquid
<script src="{{ '/assets/js/language-preference.js' | relative_url }}"></script>
```

- [ ] **Step 6: Add focused bilingual and publication styles**

Create `_sass/layout/_language.scss`:

```scss
.language-switch a {
  font-weight: 700;
}

.publication-list {
  margin-top: 1.25rem;
}

.publication-row {
  display: block;
  padding: 1rem 0 1.1rem;
  border-bottom: 1px solid var(--global-border-color);
  color: var(--global-text-color);
  text-decoration: none !important;

  &:hover {
    color: var(--global-link-color);
  }
}

.publication-row__title {
  margin: 0 0 0.35rem;
  font-size: $type-size-4;
  line-height: 1.4;
}

.publication-row__authors,
.publication-row__meta {
  margin: 0.2rem 0 0;
  color: var(--global-text-color-light);
  font-size: $type-size-6;
  line-height: 1.55;
}

.page-empty-state {
  margin-top: 1.5rem;
  padding: 1.4rem;
  border: 1px solid var(--global-border-color);
  border-radius: 12px;
  color: var(--global-text-color-light);
  background: var(--global-bg-color);
}
```

Add `"layout/language"` immediately after `"layout/sidebar"` in the `@import` list in `assets/css/main.scss`.

- [ ] **Step 7: Localize footer labels**

In `_includes/footer.html`, derive `current_lang` from `page.lang`; display `关注：` for Chinese and `Follow:` for English, while retaining GitHub, Feed, Jekyll, AcademicPages, Minimal Mistakes, and the current-year copyright.

- [ ] **Step 8: Commit shared bilingual components**

Run:

```powershell
git add _layouts/default.html _includes/masthead.html _includes/language-switch.html _includes/author-profile.html _includes/footer.html _includes/scripts.html assets/js/language-preference.js _sass/layout/_language.scss assets/css/main.scss
git commit -m "feat: add bilingual navigation and profile components"
```

### Task 5: Build Homepages and Publication Pages

**Files:**

- Create: `_includes/publication-list.html`
- Create: `_pages/about.md`
- Create: `_pages/about.zh.md`
- Create: `_pages/publications.html`
- Create: `_pages/publications.zh.html`

- [ ] **Step 1: Create the reusable clickable publication list**

Create `_includes/publication-list.html`:

```liquid
{% assign limit = include.limit | default: site.data.publications.size %}
<div class="publication-list">
  {% for publication in site.data.publications limit: limit %}
    <a class="publication-row"
       href="{{ publication.url }}"
       aria-label="Open {{ publication.title }}">
      <h2 class="publication-row__title">{{ publication.title }}</h2>
      <p class="publication-row__authors">{{ publication.authors }}</p>
      <p class="publication-row__meta">
        <em>{{ publication.venue }}</em>, {{ publication.year }}{% if publication.details %}, {{ publication.details }}{% endif %}
        <span aria-hidden="true"> ↗</span>
      </p>
    </a>
  {% endfor %}
</div>
```

- [ ] **Step 2: Create the English homepage**

Create `_pages/about.md`:

```markdown
---
permalink: /
lang: en
translation_url: /zh/
author_profile: true
redirect_from:
  - /about/
  - /about.html
---

# About me

### Hi there, I'm Heng Wei 👋

I am a Ph.D. student at **Nanjing Forestry University**. My research focuses on **global change** and **ecosystem carbon sinks**, particularly carbon cycling in cropland and karst ecosystems.

---

### 🔬 Research Interests

- **Global Change Ecology**
- **Ecosystem Carbon Sources and Sinks**
- **Cropland Carbon Cycling**
- **Karst Ecosystems**
- **Climate–Vegetation Interactions**

### 📚 Selected Publications

{% include publication-list.html limit=3 %}

### 🔥 News

- **[2026.06]** *Advancing Karst Soil Conservation Evaluation via the Soil Conservation Ratio* was published online in *Land Degradation & Development*.
- **[2025]** Studies on karst vegetation carbon sinks and Chinese cropland carbon source–sink dynamics were published.
```

- [ ] **Step 3: Create the Chinese homepage**

Create `_pages/about.zh.md`:

```markdown
---
permalink: /zh/
lang: zh
translation_url: /
author_profile: true
---

# 关于我

### 你好，我是魏珩 👋

我目前是**南京林业大学博士研究生**，研究方向为**全球变化与生态系统碳汇**，重点关注农田与喀斯特生态系统的碳循环过程。

---

### 🔬 研究方向

- **全球变化生态学**
- **生态系统碳源汇**
- **农田生态系统碳循环**
- **喀斯特生态系统**
- **气候—植被相互作用**

### 📚 代表性成果

{% include publication-list.html limit=3 %}

### 🔥 最新动态

- **[2026.06]** 论文 *Advancing Karst Soil Conservation Evaluation via the Soil Conservation Ratio* 在 *Land Degradation & Development* 在线发表。
- **[2025]** 关于喀斯特植被碳汇及中国农田生态系统碳源汇动态的研究成果发表。
```

- [ ] **Step 4: Create both publication pages**

Create `_pages/publications.html`:

```liquid
---
layout: archive
title: "Publications"
permalink: /publications/
lang: en
translation_url: /zh/publications/
author_profile: true
---

{% include publication-list.html %}
```

Create `_pages/publications.zh.html`:

```liquid
---
layout: archive
title: "论文成果"
permalink: /zh/publications/
lang: zh
translation_url: /publications/
author_profile: true
---

{% include publication-list.html %}
```

- [ ] **Step 5: Run source verification**

Run:

```powershell
$node = 'C:\Users\16PRO\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node scripts/verify-site.mjs
```

Expected: only Projects, Blog, CV, and 404 source files remain missing.

- [ ] **Step 6: Commit home and publication pages**

Run:

```powershell
git add _includes/publication-list.html _pages/about.md _pages/about.zh.md _pages/publications.html _pages/publications.zh.html
git commit -m "feat: add bilingual home and publication pages"
```

### Task 6: Recreate Projects, Blog, CV, and 404 Pages

**Files:**

- Create: `_pages/portfolio.html`
- Create: `_pages/portfolio.zh.html`
- Create: `_pages/year-archive.html`
- Create: `_pages/year-archive.zh.html`
- Create: `_pages/cv.md`
- Create: `_pages/cv.zh.md`
- Create: `_pages/404.md`

- [ ] **Step 1: Create the bilingual Projects pages**

Create `_pages/portfolio.html`:

```liquid
---
layout: archive
title: "Projects"
permalink: /projects/
lang: en
translation_url: /zh/projects/
author_profile: true
redirect_from:
  - /portfolio/
---

<div class="page-empty-state">
  Research projects will be added as their public descriptions and materials become available.
</div>
```

Create `_pages/portfolio.zh.html`:

```liquid
---
layout: archive
title: "研究项目"
permalink: /zh/projects/
lang: zh
translation_url: /projects/
author_profile: true
---

<div class="page-empty-state">
  研究项目将在公开说明与材料整理完成后陆续更新。
</div>
```

- [ ] **Step 2: Create blog archives with reference-compatible post rendering**

Create `_pages/year-archive.html`:

```liquid
---
layout: archive
permalink: /year-archive/
title: "Blog Posts"
lang: en
translation_url: /zh/blog/
author_profile: true
---

{% if site.posts.size > 0 %}
  {% capture written_year %}'None'{% endcapture %}
  {% for post in site.posts %}
    {% capture year %}{{ post.date | date: '%Y' }}{% endcapture %}
    {% if year != written_year %}
      <h2 id="{{ year | slugify }}" class="archive__subtitle">{{ year }}</h2>
      {% capture written_year %}{{ year }}{% endcapture %}
    {% endif %}
    {% include archive-single.html %}
  {% endfor %}
{% else %}
  <div class="page-empty-state">Original blog posts will appear here.</div>
{% endif %}
```

Create `_pages/year-archive.zh.html` with `/zh/blog/`, `lang: zh`, `/year-archive/`, title `博客文章`, and empty-state text `原创博客文章将在这里发布。`; reuse the same post loop.

- [ ] **Step 3: Create the English CV**

Create `_pages/cv.md`:

```markdown
---
layout: archive
title: "Curriculum Vitae"
permalink: /cv/
lang: en
translation_url: /zh/cv/
author_profile: true
redirect_from:
  - /resume/
---

## Education

- **Ph.D. Student**, Nanjing Forestry University

## Research Interests

- Global change ecology
- Ecosystem carbon sources and sinks
- Cropland carbon cycling
- Karst ecosystems

## Publications

{% include publication-list.html %}

## Contact

- Email: [we1heng@outlook.com](mailto:we1heng@outlook.com)
- GitHub: [We1heng](https://github.com/We1heng)
```

- [ ] **Step 4: Create the Chinese CV**

Create `_pages/cv.zh.md`:

```markdown
---
layout: archive
title: "个人简历"
permalink: /zh/cv/
lang: zh
translation_url: /cv/
author_profile: true
---

## 教育经历

- **博士研究生**，南京林业大学

## 研究方向

- 全球变化生态学
- 生态系统碳源汇
- 农田生态系统碳循环
- 喀斯特生态系统

## 论文成果

{% include publication-list.html %}

## 联系方式

- 邮箱：[we1heng@outlook.com](mailto:we1heng@outlook.com)
- GitHub：[We1heng](https://github.com/We1heng)
```

- [ ] **Step 5: Create a bilingual 404 page**

Create `_pages/404.md`:

```markdown
---
permalink: /404.html
title: "Page not found / 页面未找到"
author_profile: false
lang: en
---

The requested page could not be found. Return to the [English homepage](/) or [中文主页](/zh/).

未找到您访问的页面。请返回[英文主页](/)或[中文主页](/zh/)。
```

- [ ] **Step 6: Run source verification**

Run:

```powershell
$node = 'C:\Users\16PRO\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node scripts/verify-site.mjs
```

Expected:

```text
PASS: source site verification
```

- [ ] **Step 7: Commit the remaining primary pages**

Run:

```powershell
git add _pages/portfolio.html _pages/portfolio.zh.html _pages/year-archive.html _pages/year-archive.zh.html _pages/cv.md _pages/cv.zh.md _pages/404.md
git commit -m "feat: add bilingual projects blog cv and error pages"
```

### Task 7: Wire Production Verification into GitHub Pages

**Files:**

- Modify: `.github/workflows/pages.yml`
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Run source and external-link checks**

Run:

```powershell
$node = 'C:\Users\16PRO\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node scripts/verify-site.mjs
& $node scripts/check-publication-links.mjs
```

Expected: source verification passes; all DOI requests return HTTP 2xx or 3xx. If a publisher temporarily blocks automated requests, manually open that DOI and record the successful browser check rather than weakening the stored URL.

- [ ] **Step 2: Add rendered verification to the Pages workflow**

In `.github/workflows/pages.yml`, add this step immediately after `Build with Jekyll`:

```yaml
      - name: Verify rendered site
        run: node scripts/verify-site.mjs --rendered
```

- [ ] **Step 3: Add ignored build artifacts**

Create `.gitignore`:

```gitignore
_site/
.sass-cache/
.jekyll-cache/
.jekyll-metadata
.bundle/
vendor/
.superpowers/
```

- [ ] **Step 4: Add concise maintenance documentation**

Create `README.md`:

````markdown
# Heng Wei Academic Website

Bilingual personal academic website for 魏珩 / Heng Wei, built with Jekyll and Academic Pages.

## Local preview

```bash
bundle install
bundle exec jekyll serve -l -H localhost
```

Open `http://localhost:4000`.

## Content locations

- Profile and site metadata: `_config.yml`
- Navigation: `_data/navigation.yml`
- Publications: `_data/publications.yml`
- English and Chinese pages: `_pages/`
- Avatar and static images: `images/`

## Deployment

Push `main` to `We1heng/We1heng.github.io`. GitHub Actions builds, verifies, and deploys the site to `https://we1heng.github.io`.

## Attribution

Built with [Academic Pages](https://github.com/academicpages/academicpages.github.io), derived from Minimal Mistakes, under the MIT License.
````

- [ ] **Step 5: Commit deployment and maintenance files**

Run:

```powershell
git add .github/workflows/pages.yml .gitignore README.md
git commit -m "ci: verify and deploy the Jekyll site"
```

### Task 8: Create the GitHub Repository and Verify the Live Site

**Files:**

- No source files unless deployment reveals a defect.

- [ ] **Step 1: Confirm there are no secrets or reference-author strings**

Run:

```powershell
git grep -n -I -E '(password|passwd|api[_-]?key|access[_-]?token|client[_-]?secret)[[:space:]]*[:=]' -- ':!docs/**'
$node = 'C:\Users\16PRO\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node scripts/verify-site.mjs
```

Expected: the credential-pattern scan returns no matches, followed by `PASS: source site verification`.

- [ ] **Step 2: Inspect the final commit history and worktree**

Run:

```powershell
git status --short
git log --oneline --decorate -8
```

Expected: clean worktree and focused commits matching the tasks above.

- [ ] **Step 3: Authenticate without using an account password**

Use GitHub browser authorization, GitHub CLI device authorization, SSH, or a scoped personal access token. Never use the password strings previously shared in chat.

If GitHub CLI is available:

```powershell
gh auth login --web --git-protocol https
gh auth status
```

Expected: authenticated as `We1heng`.

- [ ] **Step 4: Create or connect the public Pages repository**

If the repository does not yet exist:

```powershell
gh repo create We1heng/We1heng.github.io --public --source . --remote origin --push
```

If it already exists:

```powershell
git remote add origin https://github.com/We1heng/We1heng.github.io.git
git push -u origin main
```

Expected: `main` is visible at `https://github.com/We1heng/We1heng.github.io`.

- [ ] **Step 5: Enable GitHub Actions as the Pages source**

Open repository Settings → Pages and set Source to **GitHub Actions** if it is not already selected.

- [ ] **Step 6: Verify the deployment workflow**

Run:

```powershell
gh run list --workflow pages.yml --limit 3
gh run watch --exit-status
```

Expected: the latest `Deploy Jekyll site to Pages` run completes successfully, including `Verify rendered site`.

- [ ] **Step 7: Verify all live routes**

Open:

```text
https://we1heng.github.io/
https://we1heng.github.io/zh/
https://we1heng.github.io/publications/
https://we1heng.github.io/zh/publications/
https://we1heng.github.io/projects/
https://we1heng.github.io/zh/projects/
https://we1heng.github.io/year-archive/
https://we1heng.github.io/zh/blog/
https://we1heng.github.io/cv/
https://we1heng.github.io/zh/cv/
```

Verify:

- reference-style top navigation and fixed profile sidebar;
- rabbit avatar;
- mobile Follow disclosure and collapsed navigation;
- light/dark theme;
- page-to-page language switch;
- five fully clickable publication rows;
- no reference-author identity or content;
- no invented education, projects, awards, supervisors, or employment.

- [ ] **Step 8: Record final verification**

Run:

```powershell
$node = 'C:\Users\16PRO\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node scripts/check-publication-links.mjs
git status --short
```

Expected: publication links pass and the repository remains clean.
