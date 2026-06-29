---
layout: arg
title: "运行日志"
permalink: /diary/
lang: zh
arg_page: true
arg_admin_page: true
arg_admin: true
arg_console: "diary"
arg_status: "RESTORED"
body_class: "arg-page arg-admin-page arg-console-page"
author_profile: false
comments: false
share: false
related: false
read_time: false
sitemap: false
noindex: true
---

<section class="backend-console diary-console" data-diary-console>
  <div class="backend-console__view" id="diary-index-view">
    <header class="backend-console__toolbar">
      <span>LOG INDEX</span>
      <span>{{ site.data.diary_entries | size }} ENTRIES</span>
    </header>

    <p class="backend-console__intro">Recovered entries are listed in reverse chronological order.</p>
    <p class="backend-console__message" id="diary-index-message" role="status" aria-live="polite"></p>

    <ol class="diary-index" aria-label="运行日志列表">
      {% for entry in site.data.diary_entries %}
        <li class="diary-index__item{% if entry.corrupted %} diary-index__item--damaged{% endif %}">
          {% if entry.corrupted %}
            <div class="diary-index__entry" aria-disabled="true">
              <span class="diary-index__id">{{ entry.id }}</span>
              <span class="diary-index__date">NO TIMESTAMP</span>
              <span class="diary-index__status">【日志索引损坏，正文不可恢复】</span>
            </div>
          {% else %}
            <a class="diary-index__entry" href="#{{ entry.id }}" data-diary-link="{{ entry.id }}">
              <span class="diary-index__id">{{ entry.id }}</span>
              <time class="diary-index__date" datetime="{{ entry.date | replace: ' ', 'T' }}">{{ entry.date }}</time>
              <span class="diary-index__status">RECOVERED</span>
            </a>
          {% endif %}
        </li>
      {% endfor %}
    </ol>
  </div>

  <article class="backend-console__view diary-detail" id="diary-detail-view" aria-live="polite" hidden>
    <a class="backend-console__back" href="#" data-diary-back>← 返回日志列表</a>
    <header class="diary-detail__meta">
      <span class="diary-detail__id" data-diary-id></span>
      <time class="diary-detail__date" data-diary-date></time>
    </header>
    <div class="diary-detail__body" data-diary-body></div>
  </article>
</section>

<script type="application/json" id="diary-entry-data">{{ site.data.diary_entries | jsonify }}</script>
