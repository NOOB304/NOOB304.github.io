---
layout: arg
title: "Relay Debug Console"
permalink: /relay-console/
lang: zh
arg_page: true
arg_admin_page: true
arg_admin: true
arg_console: "relay"
arg_status: "LOCAL CLIENT"
body_class: "arg-page arg-admin-page arg-console-page relay-console-page"
author_profile: false
comments: false
share: false
related: false
read_time: false
sitemap: false
noindex: true
---

<section
  class="relay-console"
  id="relay-console"
  data-relay-console
  data-ending-one-url="{{ '/relay-console/ending-1/' | relative_url }}"
  data-final-ending-url="{{ '/relay-console/final-ending/' | relative_url }}"
>
  <p class="relay-console__subtitle">Local client permission layer</p>

  <div class="relay-terminal" id="relay-terminal" role="log" aria-live="polite" aria-relevant="additions">
    <div class="relay-terminal__output" id="relay-output"></div>
  </div>

  <form class="relay-command" id="relay-command-form" autocomplete="off">
    <label class="relay-command__label" for="relay-command-input">LOCAL-CLIENT</label>
    <div class="relay-command__controls">
      <span class="relay-command__prompt" aria-hidden="true">&gt;</span>
      <input
        id="relay-command-input"
        type="text"
        placeholder="请输入密钥"
        autocomplete="off"
        autocapitalize="characters"
        spellcheck="false"
      >
      <button type="submit" id="relay-command-submit">执行</button>
    </div>
    <p class="relay-command__state" id="relay-command-state" role="status" aria-live="polite"></p>
    <div class="relay-indicators" id="relay-indicators" aria-label="链路状态">
      <span class="relay-indicator relay-indicator--green" data-relay-indicator="201" title="Relay 201"></span>
      <span class="relay-indicator relay-indicator--green" data-relay-indicator="202" title="Relay 202"></span>
      <span class="relay-indicator relay-indicator--green" data-relay-indicator="203" title="Relay 203"></span>
      <span class="relay-indicator relay-indicator--green" data-relay-indicator="302" title="Relay 302"></span>
      <span class="relay-indicator relay-indicator--green" data-relay-indicator="307" title="Relay 307"></span>
      <span class="relay-indicator relay-indicator--green" data-relay-indicator="503" title="Relay 503"></span>
      <span class="relay-indicator relay-indicator--red" data-control-indicator title="Control channel"></span>
    </div>
  </form>
</section>

<audio id="relay-ending-audio" preload="auto">
  <source src="{{ '/assets/audio/ending-1-ode-to-joy.mp3' | relative_url }}" type="audio/mpeg">
</audio>
