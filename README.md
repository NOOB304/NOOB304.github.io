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

Push `main` to `noob304/We1heng.github.io`. GitHub Actions builds, verifies, and deploys the site to `https://noob304.github.io/We1heng.github.io/`.

## Attribution

Built with [Academic Pages](https://github.com/academicpages/academicpages.github.io), derived from Minimal Mistakes, under the MIT License.
