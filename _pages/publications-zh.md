---
title: "论文成果"
permalink: /zh/publications/
lang: zh
translation_url: /publications/
author_profile: true
comments: false
share: false
---

以下论文均已正式发表，标题链接指向对应 DOI 页面。

<div class="publications-list">
{% for paper in site.data.publications %}
  <article class="publication-item">
    <h2 class="publication-title">
      <a href="{{ paper.url }}" target="_blank" rel="noopener">{{ paper.title }}</a>
    </h2>
    <p class="publication-authors"><span>作者：</span>{{ paper.authors }}</p>
    <p class="publication-meta">
      <span>期刊：</span><em>{{ paper.venue }}</em>{% if paper.year %}，{{ paper.year }}{% endif %}{% if paper.details %}。{{ paper.details }}{% endif %}
    </p>
    {% if paper.doi %}
      <p class="publication-doi">
        DOI：<a href="{{ paper.url }}" target="_blank" rel="noopener">{{ paper.doi }}</a>
      </p>
    {% endif %}
  </article>
{% endfor %}
</div>
