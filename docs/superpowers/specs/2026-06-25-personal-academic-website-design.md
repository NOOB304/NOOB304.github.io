# Heng Wei Personal Academic Website — Design Specification

Date: 2026-06-25  
Target URL: `https://we1heng.github.io`  
Repository: `We1heng/We1heng.github.io`

## 1. Objective

Build a bilingual personal academic website for 魏珩 / Heng Wei. The site will prioritize research interests and publications, with projects, blog posts, and CV as secondary sections.

The visual structure will closely follow Yizhuo Lv's public Academic Pages website:

- horizontal navigation bar;
- fixed author profile sidebar;
- single-column academic content area;
- responsive mobile navigation;
- light/dark theme toggle;
- Academic Pages typography, spacing, footer, and article layout.

The reference repository is publicly available under the MIT License. Its layout and open-source code may be reused with the license and upstream attribution retained. The reference author's photographs, biography, posts, research content, and other personal material will not be copied.

## 2. Technology and Deployment

- Static-site generator: Jekyll
- Theme/base: Academic Pages, including the reference site's compatible MIT-licensed customizations
- Hosting: GitHub Pages
- Deployment: GitHub Actions
- Content format: Markdown, YAML, and static assets
- Public URL: `https://we1heng.github.io`
- Local preview: Docker Compose where available; otherwise Bundler/Jekyll

No database or server-side application is required.

## 3. Information Architecture

The top navigation will retain the reference site's order and visual behavior:

1. Heng Wei — homepage
2. Publications
3. Projects
4. Blog Posts
5. CV
6. 中文 / EN — language switch
7. Light/dark theme toggle

The initial release will include:

- bilingual homepage;
- bilingual publications page;
- bilingual projects landing page with an empty-state message until project content is supplied;
- bilingual blog archive, ready for Markdown posts;
- bilingual CV page containing currently known information and clearly omitting unknown details;
- the standard Academic Pages RSS feed.

## 4. Bilingual Behavior

English will be available at the root routes for compatibility with Academic Pages:

- `/`
- `/publications/`
- `/projects/`
- `/year-archive/`
- `/cv/`

Chinese counterparts will use `/zh/`:

- `/zh/`
- `/zh/publications/`
- `/zh/projects/`
- `/zh/blog/`
- `/zh/cv/`

The language switch will link to the corresponding page in the other language whenever a translation exists. If no matching translated article exists, it will fall back to that language's homepage. Language choice will be remembered in local browser storage, without cookies or external tracking.

## 5. Author Profile

Display name:

- Chinese: 魏珩
- English: Heng Wei

Identity:

- Chinese: 南京林业大学博士研究生
- English: Ph.D. student at Nanjing Forestry University

Research focus:

- Chinese: 全球变化与生态系统碳汇
- English: Global change and ecosystem carbon sinks

Contact and profile links:

- Email: `we1heng@outlook.com`
- GitHub: `https://github.com/We1heng`
- Location: Nanjing, China
- Institution: Nanjing Forestry University

Google Scholar and ORCID links will be omitted until valid profile URLs are supplied.

The supplied rabbit illustration will be copied into the site's `images/` directory and used as the circular sidebar avatar. The source file is:

`C:\Users\16PRO\xwechat_files\wxid_shes56wm2ti422_ceac\temp\RWTemp\2026-06\fa20057bb94ab1c4eb22252c1b8dcbdb.jpg`

The site copy will use a stable filename such as `images/profile.jpg`.

## 6. Homepage Content

The homepage will preserve the reference site's section rhythm while replacing all personal content:

1. About me
2. Research Interests
3. Selected Publications
4. News

The English introduction will describe Heng Wei as a Ph.D. student at Nanjing Forestry University researching global change and ecosystem carbon sinks. The Chinese page will convey the same information naturally rather than through literal machine translation.

Initial research-interest bullets:

- Global Change Ecology / 全球变化生态学
- Ecosystem Carbon Sources and Sinks / 生态系统碳源汇
- Cropland Carbon Cycling / 农田生态系统碳循环
- Karst Ecosystems / 喀斯特生态系统
- Climate–Vegetation Interactions / 气候—植被相互作用

The homepage will show the three most recent publications. The full list will appear on the Publications page.

## 7. Publications

Publications will use the reference site's restrained academic list styling. Each full publication item will be clickable and open the DOI or official journal page in the same tab. Impact factors, CAS rankings, and all parenthetical evaluation text supplied in the original message will be excluded.

Official publisher titles and links:

1. **Advancing Karst Soil Conservation Evaluation via the Soil Conservation Ratio**  
   Land Degradation & Development, online 2026-06-24  
   `https://doi.org/10.1002/ldr.70719`

2. **喀斯特区磷限制危机：过去、现在与未来**  
   贵州师范大学学报（自然科学版）, 2026, 44(1)  
   `https://doi.org/10.16614/j.gznuj.zrb.2026.01.001`

3. **Assessing Climate Impacts on Karst Vegetation Carbon Sink Change Worldwide**  
   Ecosystem Health and Sustainability, 2025, 11: 0404  
   `https://doi.org/10.34133/ehs.0404`

4. **中国农田生态系统碳源汇时空动态特征及其影响机制**  
   生态学报, 2025, 45(15): 7277–7296  
   `https://doi.org/10.20103/j.stxb.202407151649`

5. **Rapid climate changes responsible for increased net global cropland carbon sink during the last 40 years**  
   Ecological Indicators, 2024, 166: 112465  
   `https://doi.org/10.1016/j.ecolind.2024.112465`

The supplied Land Degradation & Development entry originally described as “Under Review” is now treated as published because the publisher record shows online publication on 2026-06-24. The publisher's final title uses “Ratio,” not “Rate.”

## 8. Projects, Blog, and CV

### Projects

The Projects page will be structurally complete but initially show a concise bilingual message indicating that research projects will be added. No projects will be invented.

### Blog

The blog archive and post templates will be operational from launch. Until original posts are supplied, the archive will show a concise bilingual empty-state message. No copied or fabricated posts will be included.

### CV

The initial CV will include only confirmed details:

- name;
- Ph.D. student status;
- Nanjing Forestry University;
- research focus;
- publications;
- email and GitHub.

Dates, degree history, supervisors, awards, skills, and employment will not be guessed.

## 9. Visual and Interaction Requirements

- Match the reference site's desktop proportions, header height, content width, sidebar behavior, typography, borders, and footer.
- Preserve the Academic Pages responsive breakpoints and mobile “Follow” disclosure.
- Use the supplied avatar with a circular crop and responsive sizing.
- Retain light/dark mode and ensure the avatar remains legible in both themes.
- Add the language switch without disrupting the reference navigation layout.
- Use accessible link states, keyboard focus, semantic headings, and image alternative text.
- Avoid publication cards, oversized hero banners, animations, and unrelated decorative sections.

## 10. Metadata and Privacy

- Page title: `Heng Wei`
- Description: bilingual academic description appropriate to each route
- Canonical URL: `https://we1heng.github.io`
- Open Graph metadata and favicon will be configured.
- No analytics or comments will be enabled initially.
- No plaintext credentials, tokens, or passwords will be stored in the repository.
- GitHub publication will use browser-based authentication or a scoped token/SSH key, never the account password.

## 11. Error Handling and Content Integrity

- Missing optional social profiles will be omitted rather than linked to placeholders.
- Missing translated posts will fall back to the selected language's homepage.
- External publication links will be checked during build verification.
- Jekyll build warnings and broken internal links must be resolved before deployment.
- Unknown biographical details will not be inferred.

## 12. Verification

Before deployment:

1. Run the Jekyll production build.
2. Check English and Chinese routes.
3. Verify desktop and mobile layouts.
4. Verify light and dark themes.
5. Verify language switching on every primary page.
6. Verify the avatar loads and crops correctly.
7. Open all five publication links.
8. Check for copied reference-author content.
9. Check for secrets and personal credentials.
10. Confirm GitHub Pages deploys successfully and returns HTTP 200 at the public URL.

## 13. Scope Boundaries

Included:

- complete bilingual Academic Pages site;
- five verified publications;
- supplied avatar;
- GitHub Pages deployment configuration.

Not included without additional user content:

- fabricated project descriptions;
- fabricated CV history;
- Google Scholar or ORCID accounts;
- custom domain purchase;
- analytics, comments, newsletter, or CMS;
- CSDN synchronization.
