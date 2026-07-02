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
      <div class="archive-record-detail__meta">
        <span>Status: <strong data-record-status></strong></span>
        <span>Type: <strong data-record-type></strong></span>
      </div>
    </header>
    <div class="archive-record-detail__body" data-record-body aria-live="polite"></div>
  </article>
</section>

<div class="arg-modal archive-image-modal" id="archive-image-modal" hidden>
  <div class="arg-modal__backdrop" data-archive-image-close></div>
  <figure class="archive-image-dialog" role="dialog" aria-modal="true" aria-labelledby="archive-image-title">
    <button type="button" class="arg-modal__close archive-image-close" data-archive-image-close aria-label="关闭">×</button>
    <figcaption id="archive-image-title">RECOVERED IMAGE</figcaption>
    <img id="archive-image-preview" alt="" decoding="async">
  </figure>
</div>

<script type="application/json" id="archive-search-data">{{ site.data.archive_search | jsonify }}</script>
