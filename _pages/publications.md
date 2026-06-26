---
title: "Publications"
permalink: /publications/
lang: en
translation_url: /zh/publications/
author_profile: true
comments: false
share: false
redirect_from:
  - /en/publications/
---

The following journal articles are linked to their DOI pages when available.

<div class="publications-list">
{% for paper in site.data.publications %}
  <article class="publication-item">
    <h2 class="publication-title">
      <a href="{{ paper.url }}" target="_blank" rel="noopener">{{ paper.title }}</a>
    </h2>
    <p class="publication-authors">{{ paper.authors }}</p>
    <p class="publication-meta">
      <em>{{ paper.venue }}</em>{% if paper.year %}, {{ paper.year }}{% endif %}{% if paper.details %}. {{ paper.details }}{% endif %}
    </p>
    {% if paper.doi %}
      <p class="publication-doi">
        DOI: <a href="{{ paper.url }}" target="_blank" rel="noopener">{{ paper.doi }}</a>
      </p>
    {% endif %}
  </article>
{% endfor %}
</div>
