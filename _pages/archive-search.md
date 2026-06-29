---
layout: arg
title: "Archive Search"
permalink: /archive-search/
lang: zh
arg_page: true
arg_admin_page: true
arg_admin: true
arg_console: "search"
arg_status: "PARTIALLY RESTORED"
body_class: "arg-page arg-admin-page arg-console-page"
author_profile: false
comments: false
share: false
related: false
read_time: false
sitemap: false
noindex: true
---

<section class="backend-console archive-search-console" data-archive-search>
  <div class="backend-console__view" id="archive-search-view">
    <header class="backend-console__toolbar">
      <span>ARCHIVE QUERY INTERFACE</span>
      <span>LOCAL INDEX</span>
    </header>

    <form class="archive-search-form" id="archive-search-form" novalidate>
      <label for="archive-search-input">搜索关键词</label>
      <div class="archive-search-form__controls">
        <input id="archive-search-input" type="search" autocomplete="off" spellcheck="false">
        <button type="submit">搜索</button>
      </div>
    </form>

    <div class="archive-search-feedback" id="archive-search-feedback" role="status" aria-live="polite"></div>
    <ol class="archive-result-list" id="archive-result-list" aria-label="搜索结果"></ol>
  </div>

  <article class="backend-console__view archive-record-detail" id="archive-record-view" aria-live="polite" hidden>
    <a class="backend-console__back" href="#" data-search-back>← 返回搜索页面</a>
    <header class="archive-record-detail__header">
      <h2 data-record-title></h2>
      <p>Status: <span data-record-status></span></p>
    </header>
    <div class="archive-record-detail__body" data-record-body></div>
  </article>
</section>

<script type="application/json" id="archive-search-data">{{ site.data.archive_search | jsonify }}</script>
