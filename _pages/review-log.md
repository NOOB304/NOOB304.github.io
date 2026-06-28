---
layout: arg
title: "Review Log"
permalink: /review-log/
lang: zh
arg_page: true
arg_admin_page: true
arg_admin: true
arg_status: "PARTIALLY CORRUPTED"
body_class: "arg-page arg-admin-page"
author_profile: false
comments: false
share: false
related: false
read_time: false
sitemap: false
noindex: true
---

<aside class="review-recovery-note" aria-label="恢复状态">
  <p>Hidden comment archive recovered.</p>
  <p>Source: observation record</p>
  <p>Visibility: restored</p>
  <p>Status: partially corrupted</p>
</aside>

<div class="review-archive" role="log" aria-label="恢复的评论归档">
  {% for stage in site.data.review_log.stages %}
    <section class="review-stage" aria-labelledby="review-stage-{{ forloop.index }}">
      <h2 id="review-stage-{{ forloop.index }}">{{ stage.title }}</h2>

      {% for comment in stage.comments %}
        <article class="review-comment{% if comment.blogger %} review-comment--blogger{% endif %}{% if comment.kind %} review-comment--{{ comment.kind }}{% endif %}{% if comment.emphasis %} review-comment--{{ comment.emphasis }}{% endif %}">
          <header class="review-comment__header">
            <span class="review-comment__user">{{ comment.user }}</span>
            {% if comment.blogger %}<span class="blogger-badge">博主回复</span>{% endif %}
            <span class="review-comment__separator" aria-hidden="true">·</span>
            <time class="review-comment__time" datetime="{{ comment.time | replace: ' ', 'T' }}">{{ comment.time }}</time>
          </header>
          <div class="review-comment__body">{{ comment.body | newline_to_br }}</div>

          {% if comment.attachments %}
            <div class="arg-attachment-list">
              {% for attachment in comment.attachments %}
                <figure class="arg-attachment" data-arg-attachment>
                  <img class="arg-attachment__image" data-arg-attachment-image src="{{ attachment.path | relative_url }}" alt="恢复附件：{{ attachment.filename }}" decoding="async" hidden>
                  <div class="arg-attachment__placeholder" data-arg-attachment-placeholder>
                    <span class="arg-attachment__state">FILE UNAVAILABLE</span>
                    <span class="arg-attachment__filename">{{ attachment.filename }}</span>
                  </div>
                  <figcaption>{{ attachment.filename }}</figcaption>
                </figure>
              {% endfor %}
            </div>
          {% endif %}
        </article>
      {% endfor %}
    </section>

    {% if forloop.index == 5 %}
      <section class="arg-system-panel" aria-labelledby="system-log-title">
        <h2 id="system-log-title">System Log</h2>
        <div class="arg-system-log">
          <p><code>&gt; comment_module status</code></p>
          <p>Status: unstable</p>
          <p><code>&gt; user_status</code></p>
          <p>Unknown</p>
          <p><code>&gt; route_cache</code></p>
          <p>Active</p>
          <p><code>&gt; private_message_source</code></p>
          <p>user_9920416</p>
          <p><code>&gt; attachment_upload</code></p>
          <p>Failed</p>
          <p><code>&gt; location_signal</code></p>
          <p>Lost</p>
          <p><code>&gt; lock comment_module</code></p>
          <p>Comment module status changed: locked.</p>
          <p>Reason:</p>
          <p><code>abnormal activity detected</code></p>
          <p>New comments rejected.</p>
        </div>
      </section>
    {% endif %}
  {% endfor %}
</div>

<section class="arg-system-panel" aria-labelledby="comment-module-closed-title">
  <h2 id="comment-module-closed-title">Comment Module Closed</h2>
  <div class="arg-system-log">
    <p>This module has been set to invisible.</p>
    <p>Reason:</p>
    <p><code>manual recovery expired</code></p>
    <p>Last visible user:</p>
    <p><code>做喵的GIS</code></p>
    <p>Last visible attachment:</p>
    <p><code>missing_notice_wei.jpg</code></p>
    <p>New replies are no longer accepted.</p>
  </div>
</section>

<section class="arg-system-panel" aria-labelledby="recovered-attachments-title">
  <h2 id="recovered-attachments-title">Recovered Attachments</h2>
  <ul class="arg-recovered-files">
    <li>missing_notice_wei.jpg</li>
    <li>sms_admin_recovery.jpg</li>
    <li>cctv_0237.jpg</li>
    <li>cctv_0301.jpg</li>
  </ul>
  <p>Attachment status:</p>
  <ul class="arg-recovered-files">
    <li>missing_notice_wei.jpg: visible</li>
    <li>sms_admin_recovery.jpg: visible</li>
    <li>cctv_0237.jpg: partially corrupted</li>
    <li>cctv_0301.jpg: partially corrupted</li>
  </ul>
</section>

<section class="arg-admin-entry" aria-labelledby="blog-admin-recovery-title">
  <p class="arg-modal__eyebrow">ADMINISTRATION</p>
  <h2 id="blog-admin-recovery-title">Blog Admin Recovery</h2>
  <p>该模块需要管理员身份验证。</p>
  <button type="button" class="arg-admin-button" id="arg-admin-open" aria-haspopup="dialog">登录博客后台</button>
</section>

<div class="arg-modal arg-admin-modal" id="arg-admin-modal" data-diary-url="{{ '/diary/' | relative_url }}" hidden>
  <div class="arg-modal__backdrop" data-admin-close></div>
  <section class="arg-modal__dialog arg-admin-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="arg-admin-login-title">
    <button type="button" class="arg-modal__close" data-admin-close aria-label="关闭">×</button>

    <div class="arg-admin-view" id="arg-admin-login-view">
      <p class="arg-modal__eyebrow">BLOG CONTROL PANEL</p>
      <h2 id="arg-admin-login-title">Blog Admin Recovery</h2>
      <p>该模块需要管理员身份验证。</p>
      <label for="arg-admin-account">账号</label>
      <input id="arg-admin-account" class="arg-modal__input" type="text" autocomplete="username">
      <label for="arg-admin-password">密码</label>
      <input id="arg-admin-password" class="arg-modal__input" type="password" autocomplete="current-password">
      <p id="arg-admin-login-error" class="arg-modal__error" role="status" aria-live="polite"></p>
      <div class="arg-modal__actions arg-admin-actions">
        <button type="button" class="arg-button arg-button--primary" id="arg-admin-login">登录</button>
        <button type="button" class="arg-button" id="arg-admin-forgot">找回密码</button>
        <button type="button" class="arg-button" data-admin-close>关闭</button>
      </div>
    </div>

    <div class="arg-admin-view" id="arg-admin-recovery-view" hidden>
      <p class="arg-modal__eyebrow">IDENTITY VERIFICATION</p>
      <h2 id="arg-admin-recovery-title">Password Recovery</h2>
      <p>请回答密保问题以重置后台密码。</p>
      <label for="arg-security-name">密保姓名</label>
      <input id="arg-security-name" class="arg-modal__input" type="text" autocomplete="off">
      <label for="arg-security-email">密保邮箱</label>
      <input id="arg-security-email" class="arg-modal__input" type="email" autocomplete="off">
      <label for="arg-security-phone">密保手机</label>
      <input id="arg-security-phone" class="arg-modal__input" type="tel" autocomplete="off">
      <p id="arg-admin-recovery-error" class="arg-modal__error" role="status" aria-live="polite"></p>
      <div class="arg-modal__actions arg-admin-actions">
        <button type="button" class="arg-button arg-button--primary" id="arg-admin-reset">确认重置</button>
        <button type="button" class="arg-button" data-admin-login-view>返回登录</button>
        <button type="button" class="arg-button" data-admin-close>关闭</button>
      </div>
    </div>

    <div class="arg-admin-view" id="arg-admin-recovery-success" hidden>
      <p class="arg-modal__eyebrow">IDENTITY VERIFIED</p>
      <h2 id="arg-admin-recovery-success-title">Password Recovery</h2>
      <p>身份验证通过。<br>后台密码已重置。</p>
      <p class="arg-admin-new-password">新密码：<code>W123456</code></p>
      <p>请返回登录页面重新登录。</p>
      <div class="arg-modal__actions arg-admin-actions">
        <button type="button" class="arg-button arg-button--primary" data-admin-login-view>返回登录</button>
        <button type="button" class="arg-button" data-admin-close>关闭</button>
      </div>
    </div>

    <div class="arg-admin-view" id="arg-admin-login-success" hidden>
      <p class="arg-modal__eyebrow">ACCESS RESTORED</p>
      <h2 id="arg-admin-login-success-title">Blog Admin Recovery</h2>
      <p>登录成功。<br>Diary module restored.</p>
      <div class="arg-modal__actions arg-admin-actions">
        <a class="arg-button arg-button--primary" id="arg-diary-enter" href="{{ '/diary/' | relative_url }}">进入日记模块</a>
        <button type="button" class="arg-button" data-admin-close>关闭</button>
      </div>
    </div>
  </section>
</div>
