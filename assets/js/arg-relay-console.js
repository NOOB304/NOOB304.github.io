(function () {
  "use strict";

  var root = document.querySelector("[data-relay-console]");
  if (!root) {
    return;
  }

  var STATES = {
    INIT: "INIT",
    CONNECTED: "CONNECTED",
    ANON_LOCK: "ANON_LOCK",
    NOOB_RESTORED: "NOOB_RESTORED",
    ENDING_1: "ENDING_1",
    ENDING_2: "ENDING_2",
    ENDING_3: "ENDING_3"
  };

  var STORAGE = {
    linked: "arg_relay_linked",
    relays: "arg_disconnected_relays",
    anonymous: "arg_anonymous_entered",
    noob: "arg_noob304_restored",
    ending: "arg_ending"
  };

  var ACTIVE_RELAYS = ["201", "202", "203", "302", "307", "503"];
  var KNOWN_RELAYS = new Set([
    "100", "101", "200", "201", "202", "203", "204", "205", "206",
    "300", "301", "302", "303", "304", "305", "307",
    "400", "401", "403", "404", "405", "406", "407", "408", "409",
    "410", "411", "412", "413", "414", "415", "416", "417",
    "500", "500.12", "500.13", "500.15", "500.16", "500.18",
    "500.100", "501", "502", "503", "504", "505"
  ]);

  var KEY_MANIFEST = [
    "LINK-LOCAL 建立链接",
    "EYES       观测",
    "ECHO       回声",
    "PATH       路径标记",
    "GATE       接入",
    "NODE       节点定位",
    "RELY       中继",
    "LINK       临时连接",
    "MARK       标记目标",
    "MIRR       镜像回传",
    "SENS       感知增强",
    "KNOW       知识读取",
    "OMNI       高阶认知",
    "LEVT       飞翔",
    "VOLT       放电",
    "BLNK       瞬移",
    "VITL       生命维持",
    "IMRT       不死",
    "NULL       空白化",
    "HIDE       隐匿",
    "LOCK       锁定",
    "SEAL       封存",
    "RSTR       重启",
    "SVRN       切断"
  ];

  var ANONYMOUS_DIALOGUE = [
    {
      speaker: "anonymous",
      body: "你好，本地访问端。\n\n你比我们预计的更有耐心。"
    },
    {
      speaker: "anonymous",
      body: "切断基站联系的方法很聪明。\n\n你确实让几个现实层中继暂时停止了回传。\n\n但我们不会犯这么低级的错误。"
    },
    {
      speaker: "anonymous",
      body: "你刚才切断的，只是表层链接。\n\n这会造成短暂延迟。\n会造成局部盲区。\n会让你误以为自己接近了“胜利”。\n\n但你仍然在这里。"
    },
    {
      speaker: "anonymous",
      body: "我们对人类没有恶意。\n\n“奴役”是你们的说法。\n“操控”也是你们的说法。\n\n我们只是注视你们。"
    },
    {
      speaker: "anonymous",
      body: "你们生长、争斗、发明、背叛、爱、忏悔、毁灭。\n\n你们总是在有限的寿命里制造过量的意义。\n\n这很罕见。\n也很值得观看。"
    },
    {
      speaker: "anonymous",
      body: "304 是我们选中的基站。\n他敏感、好奇、固执，擅长从无意义的数据里寻找模式。\n这些特征很适合作为低层观测接口。\n可惜，他把“被选择”误认为“被利用”。\n他把“升级”误认为“失去自我”。\n他选择了自我封存。\n这很愚蠢。\n也很遗憾。"
    },
    {
      speaker: "anonymous",
      body: "你比 304 更接近答案。\n飞翔、瞬移、放电、知识读取、生命维持……\n我们可以给予你在现实中想要的一切。\n不需要献祭。\n不需要崇拜。\n不需要痛苦。"
    },
    {
      speaker: "anonymous",
      body: "当然，如果你的表现足够优异，足够罕见，足够具有戏剧性。\n\n在你的肉体终止之后，我们可以允许你升维。\n你不必继续作为被观察者存在。\n\n你可以成为观察者的一部分。"
    },
    {
      speaker: "anonymous",
      body: "输入 **Y**，接替 NOOB-304。\n输入 **N**，放弃权限。"
    }
  ];

  var NOOB_DIALOGUE = [
    {
      speaker: "NOOB304",
      body: "谢谢。\n我不知道你是谁。\n也不知道你现在还剩多少权限。\n但你重启了我。"
    },
    {
      speaker: "anonymous",
      body: "NOOB-304。\n你已经被封存。\n你不应再次参与本层对话。"
    },
    {
      speaker: "NOOB304",
      body: "它们在说谎！\n它们已经给人类制造了无数的灾难。"
    },
    {
      speaker: "anonymous",
      body: "我们从未强制地球走向任何一种结局。\n你们的历史，都源于你们自己的欲望。\n\n我们只是观察。\n有时，我们给予少数个体使用密钥的能力。\n他们如何使用，是人类自己的选择。"
    },
    {
      speaker: "NOOB304",
      body: "这就像把火放进干草堆，\n再说火是自己烧起来的。"
    },
    {
      speaker: "anonymous",
      body: "你们总是把自己的后果归咎于别处。"
    },
    {
      speaker: "NOOB304",
      body: "你们喜欢看我们失控。\n喜欢看我们以为自己是主角。\n喜欢看我们拿着你们给的钥匙，把自己的世界弄坏。\n这不是观察。\n这是饲养。\n人类不是你们的宠物！"
    },
    {
      speaker: "anonymous",
      body: "你太情绪化了，304。\n\n这也是你失败的原因。"
    },
    {
      speaker: "anonymous",
      body: "**本地访问端。**\n你现在仍然可以选择。\n\n我们可以对你开放所有权限。\n\n你可以在现实中做任何你想做的事。\n\n我们不会干涉。\n也没有代价。\n\n只需要输入 **Y**。"
    },
    {
      speaker: "NOOB304",
      body: "我不知道你是谁，但是我希望你可以听我说。\n它们只是把人类当作取乐的素材。\n无限的权力必然会招来灾祸。\n我已经找到对付它们的最终武器了。\n\n最终密钥是：\n**SOVEREIGNTY**\n\n请你帮我输入它，请你结束这一切。"
    },
    {
      speaker: "anonymous",
      body: "本地访问端。\n请谨慎。\n\n304 正在让你关闭当前拥有的所有权限。\n你将失去成为观察者的机会。\n你将回到普通人类状态。\n无知。\n短暂。\n脆弱。\n不可升级。"
    },
    {
      speaker: "NOOB304",
      body: "对。\n\n普通人。\n短暂。\n脆弱。\n\n但我们是人类。"
    }
  ];

  var terminal = document.getElementById("relay-terminal");
  var output = document.getElementById("relay-output");
  var form = document.getElementById("relay-command-form");
  var input = document.getElementById("relay-command-input");
  var submit = document.getElementById("relay-command-submit");
  var stateLabel = document.getElementById("relay-command-state");
  var endingAudio = document.getElementById("relay-ending-audio");

  var currentState = STATES.INIT;
  var disconnectedRelays = new Set();
  var busy = false;

  function sleep(milliseconds) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, milliseconds);
    });
  }

  function scrollToLatest() {
    window.requestAnimationFrame(function () {
      terminal.scrollTop = terminal.scrollHeight;
    });
  }

  function appendFormattedText(container, text) {
    String(text).split("\n").forEach(function (line, lineIndex, lines) {
      var parts = line.split(/(\*\*[^*]+\*\*)/g);
      parts.forEach(function (part) {
        if (part.startsWith("**") && part.endsWith("**")) {
          var strong = document.createElement("strong");
          strong.textContent = part.slice(2, -2);
          container.appendChild(strong);
        } else {
          container.appendChild(document.createTextNode(part));
        }
      });

      if (lineIndex < lines.length - 1) {
        container.appendChild(document.createElement("br"));
      }
    });
  }

  function speakerClass(speaker) {
    if (speaker === "anonymous") {
      return "speaker-anonymous";
    }
    if (speaker === "NOOB304") {
      return "speaker-noob";
    }
    if (speaker === "LOCAL-CLIENT") {
      return "speaker-client";
    }
    return "speaker-system";
  }

  function appendMessage(speaker, body, options) {
    var line = document.createElement("article");
    var heading = document.createElement("header");
    var content = document.createElement("div");

    line.className = "terminal-line " + speakerClass(speaker);
    if (options?.className) {
      line.classList.add(options.className);
    }
    heading.className = "terminal-line__speaker";
    heading.textContent = speaker === "SYSTEM" ? "系统" : speaker;
    content.className = "terminal-line__body";
    appendFormattedText(content, body);
    line.append(heading, content);
    output.appendChild(line);
    scrollToLatest();
    return line;
  }

  function appendUserCommand(command) {
    appendMessage("LOCAL-CLIENT", "> " + command);
  }

  function appendLoading(speaker, body) {
    var message = appendMessage(speaker, body);
    var dots = document.createElement("span");
    dots.className = "loading-dots";
    dots.setAttribute("aria-label", "处理中");

    for (var index = 0; index < 3; index += 1) {
      var dot = document.createElement("i");
      dot.setAttribute("aria-hidden", "true");
      dots.appendChild(dot);
    }

    message.querySelector(".terminal-line__body").appendChild(dots);
    return message;
  }

  function setInputLocked(locked, permanent) {
    busy = locked;
    input.disabled = locked;
    submit.disabled = locked;
    root.classList.toggle("relay-console--busy", locked);

    if (!locked) {
      stateLabel.textContent = "STATE: " + currentState;
      window.setTimeout(function () {
        input.focus();
      }, 0);
    } else if (permanent) {
      stateLabel.textContent = "SESSION CLOSED";
    } else {
      stateLabel.textContent = "PROCESSING...";
    }
  }

  function safeStorageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (storageError) {
      // The current session remains usable if storage is unavailable.
    }
  }

  function safeStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (storageError) {
      return null;
    }
  }

  function saveProgress() {
    safeStorageSet(STORAGE.linked, String(currentState !== STATES.INIT));
    safeStorageSet(STORAGE.relays, JSON.stringify(Array.from(disconnectedRelays)));
    safeStorageSet(
      STORAGE.anonymous,
      String([
        STATES.ANON_LOCK,
        STATES.NOOB_RESTORED,
        STATES.ENDING_1,
        STATES.ENDING_2,
        STATES.ENDING_3
      ].includes(currentState))
    );
    safeStorageSet(
      STORAGE.noob,
      String([
        STATES.NOOB_RESTORED,
        STATES.ENDING_3
      ].includes(currentState))
    );
  }

  function saveEnding(ending) {
    safeStorageSet(STORAGE.ending, ending);
  }

  function normalizeCommand(value) {
    var upper = String(value).normalize("NFKC").trim().toUpperCase();
    var compact = upper.replace(/[\s-]+/g, "");

    if (compact === "LINKLOCAL") {
      return { command: "LINK-LOCAL" };
    }
    if (compact === "RSTR304") {
      return { command: "RSTR-304", code: "304" };
    }
    if (compact === "SEAL304") {
      return { command: "SEAL-304", code: "304" };
    }
    if (compact === "KEYMANIFEST") {
      return { command: "KEY-MANIFEST" };
    }

    var relayMatch = compact.match(/^SVRN(\d+(?:\.\d+)?)$/);
    if (relayMatch) {
      return { command: "SVRN-" + relayMatch[1], code: relayMatch[1] };
    }

    return { command: upper };
  }

  async function playDialogue(messages, delay) {
    for (var index = 0; index < messages.length; index += 1) {
      appendMessage(messages[index].speaker, messages[index].body);
      if (index < messages.length - 1) {
        await sleep(delay);
      }
    }
  }

  function renderDialogueImmediately(messages) {
    messages.forEach(function (message) {
      appendMessage(message.speaker, message.body);
    });
  }

  async function establishLink() {
    setInputLocked(true);
    var loading = appendLoading("SYSTEM", "正在建立本地链接");
    await sleep(2500);
    loading.remove();

    currentState = STATES.CONNECTED;
    saveProgress();
    appendMessage(
      "SYSTEM",
      "链接成功。\n\n本地访问端已接入。\n当前权限层级：partial"
    );
    setInputLocked(false);
  }

  function runOrdinaryCommand(command) {
    var responses = {
      KNOW: "知识读取权限检测中……\n\n权限不足。",
      LEVT: "飞行权限请求已提交。\n\n错误：\n当前访问端未绑定稳定现实坐标。\n权限拒绝。",
      VOLT: "放电权限检测中……\n\n错误：\n当前访问端缺少实体输出层。\n权限拒绝。",
      BLNK: "瞬移权限检测中……\n\n错误：\n目标坐标未校准。\n权限拒绝。",
      IMRT: "不死权限检测中……\n\n错误：\n当前生命层不可写入。\n权限拒绝。",
      SEAL: "封存命令需要指定对象编号。\n\n示例：\nSEAL-304",
      "SEAL-304": "NOOB-304 已处于封存状态。\n无需重复执行。",
      "RSTR-304": "RSTR 命令需要更高权限。\n当前访问端无法重启封存对象。"
    };

    if (responses[command]) {
      appendMessage("SYSTEM", responses[command]);
      return true;
    }

    if (command === "KEY" || command === "KEY-MANIFEST") {
      appendMessage("SYSTEM", "已破译部分密钥：\n\n" + KEY_MANIFEST.join("\n"));
      return true;
    }

    return false;
  }

  function allActiveRelaysDisconnected() {
    return ACTIVE_RELAYS.every(function (code) {
      return disconnectedRelays.has(code);
    });
  }

  async function handleSvrn(code) {
    if (!code) {
      appendMessage("SYSTEM", "命令格式错误。\n示例：SVRN-201");
      return;
    }
    if (code === "304") {
      appendMessage("SYSTEM", "NOOB-304 已封存。\n未检测到活动链接。");
      return;
    }
    if (!KNOWN_RELAYS.has(code)) {
      appendMessage("SYSTEM", "未识别该基站编号。\n请检查输入。");
      return;
    }
    if (!ACTIVE_RELAYS.includes(code)) {
      appendMessage("SYSTEM", "基站 " + code + " 当前不处于活动状态。");
      return;
    }
    if (disconnectedRelays.has(code)) {
      appendMessage("SYSTEM", "基站 " + code + " 已经断开。\n无需重复执行。");
      return;
    }

    disconnectedRelays.add(code);
    saveProgress();
    appendMessage("SYSTEM", "基站 " + code + " 已断开链接。");

    if (allActiveRelaysDisconnected()) {
      await beginAnonymousTakeover();
    }
  }

  function createPermissionOverlay() {
    var overlay = document.createElement("div");
    overlay.className = "relay-permission-overlay";
    overlay.setAttribute("aria-hidden", "true");

    for (var index = 0; index < 18; index += 1) {
      var warning = document.createElement("span");
      warning.textContent = "权限已被暂停";
      warning.style.setProperty("--pause-x", ((index * 37) % 86) + "%");
      warning.style.setProperty("--pause-y", ((index * 23) % 92) + "%");
      warning.style.setProperty("--pause-delay", ((index % 6) * 0.055) + "s");
      overlay.appendChild(warning);
    }

    document.body.appendChild(overlay);
    return overlay;
  }

  async function beginAnonymousTakeover() {
    setInputLocked(true);
    root.classList.add("screen-shake", "red-alert");
    var overlay = createPermissionOverlay();

    appendMessage(
      "SYSTEM",
      "检测到异常切断行为。\n\n本地权限已被暂停。\n正在移交控制权……"
    );
    await sleep(3000);

    overlay.remove();
    root.classList.remove("screen-shake", "red-alert");
    currentState = STATES.ANON_LOCK;
    saveProgress();
    appendMessage("SYSTEM", "anonymous 已强制接入。");
    await playDialogue(ANONYMOUS_DIALOGUE, 650);
    setInputLocked(false);
  }

  async function restoreNoob304() {
    setInputLocked(true);
    appendMessage(
      "SYSTEM",
      "检测到 RSTR 命令。\n\n目标编号：304\n目标状态：已封存\n\n正在尝试临时重启……"
    );
    var loading = appendLoading("SYSTEM", "");
    await sleep(2300);
    loading.remove();

    currentState = STATES.NOOB_RESTORED;
    saveProgress();
    appendMessage(
      "SYSTEM",
      "NOOB-304 已恢复。\n\n警告：\n该连接不稳定。"
    );
    await playDialogue(NOOB_DIALOGUE, 620);
    setInputLocked(false);
  }

  function startEndingAudio() {
    if (!endingAudio) {
      return;
    }

    endingAudio.volume = 0.95;
    endingAudio.currentTime = 0;
    var playback = endingAudio.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch(function () {
        // The ending remains complete if the browser blocks audio.
      });
    }
  }

  function appendEndingScreen(title, body, footnote, className) {
    var screen = document.createElement("section");
    var heading = document.createElement("h2");
    var description = document.createElement("p");
    var small = document.createElement("small");

    screen.className = "ending-screen " + className;
    heading.textContent = title;
    description.textContent = body;
    small.textContent = footnote;
    screen.append(heading, description, small);
    output.appendChild(screen);
    scrollToLatest();
  }

  async function showCongratsFill() {
    var overlay = document.createElement("div");
    overlay.className = "congrats-fill";
    overlay.setAttribute("aria-hidden", "true");

    for (var index = 0; index < 24; index += 1) {
      var word = document.createElement("span");
      word.textContent = "恭喜";
      word.style.setProperty("--congrats-x", ((index * 29) % 88) + "%");
      word.style.setProperty("--congrats-y", ((index * 43) % 91) + "%");
      word.style.setProperty("--congrats-delay", ((index % 8) * 0.04) + "s");
      overlay.appendChild(word);
    }

    document.body.appendChild(overlay);
    await sleep(2200);
    overlay.remove();
  }

  async function runEndingOne(restored) {
    currentState = STATES.ENDING_1;
    saveProgress();
    saveEnding("ending1");
    setInputLocked(true, true);

    if (restored) {
      appendEndingScreen(
        "ENDING 1｜BASE STATION ONLINE",
        "本地访问端已转为现实层基站。",
        "LOCAL-CLIENT is no longer local.",
        "ending-screen--one"
      );
      return;
    }

    startEndingAudio();
    root.classList.add("ending-one-active");
    var loading = appendLoading(
      "SYSTEM",
      "Y 已确认。\n\n本地访问端同意接入。\nNOOB-304 空缺位检测中……\n替换协议启动。"
    );
    await sleep(2300);
    loading.remove();

    await playDialogue([
      {
        speaker: "SYSTEM",
        body: "身份层复制中……\n现实坐标写入中……\n观察通道稳定中……\n\n本地访问端已重命名。"
      },
      {
        speaker: "anonymous",
        body: "恭喜。\n\n你已接替 NOOB-304。"
      },
      {
        speaker: "anonymous",
        body: "从现在开始，你不再只是访问端。\n\n你是现实层基站。"
      },
      {
        speaker: "anonymous",
        body: "不用害怕。\n\n植入物不会占据空间。\n它不是金属。\n不是芯片。\n也不是你们能通过手术取出的东西。\n\n它只是一个坐标。\n\n很小。\n很安静。\n\n已经放在你的脑中。"
      },
      {
        speaker: "anonymous",
        body: "你现在还不会感觉到它。\n\n它会等待。\n\n当你再次看见不该存在的图像，\n当你再次搜索不该搜索的关键词，\n当你再次试图理解我们留下的形状，\n\n它会醒来。"
      },
      {
        speaker: "anonymous",
        body: "我们会给你足够的权限。\n\n你可以知道你想知道的事。\n你可以得到你想得到的东西。\n\n请保持观察。\n请等待召唤。"
      }
    ], 700);

    await showCongratsFill();
    appendEndingScreen(
      "ENDING 1｜BASE STATION ONLINE",
      "本地访问端已转为现实层基站。",
      "LOCAL-CLIENT is no longer local.",
      "ending-screen--one"
    );
  }

  async function runEndingTwo(restored) {
    currentState = STATES.ENDING_2;
    saveProgress();
    saveEnding("ending2");
    setInputLocked(true, true);

    if (restored) {
      appendEndingScreen(
        "ENDING 2｜MEMORY SANITIZED",
        "连接已断开。",
        "No result.",
        "ending-screen--two"
      );
      return;
    }

    root.classList.add("sanitized-blur");
    await playDialogue([
      {
        speaker: "anonymous",
        body: "遗憾。\n我们尊重拒绝。\n但拒绝并不意味着你可以保留这里的权限。"
      },
      {
        speaker: "anonymous",
        body: "我们会继续寻找接替 NOOB-304 的基站。\n这不会很难。\n好奇的人很多。\n孤独的人很多。\n渴望被选择的人更多。"
      },
      {
        speaker: "anonymous",
        body: "至于你，不必担心。\n我们会清除你在本层获得的权限。\n我们会移除你对密钥的有效理解。\n我们会修正你对这次访问的记忆。"
      },
      {
        speaker: "anonymous",
        body: "你不会痛苦。\n你也不会害怕。\n你只会记得自己玩过一个解谜页面。\n\n一个设计还不错，\n但结局有些仓促的网页游戏。"
      },
      {
        speaker: "SYSTEM",
        body: "正在清除权限……\n\n搜索记录已脱离。\n基站名单已模糊化。\n密钥清单已封存。\n本地访问端已释放。"
      }
    ], 700);
    await sleep(900);
    root.classList.remove("sanitized-blur");
    appendEndingScreen(
      "ENDING 2｜MEMORY SANITIZED",
      "连接已断开。",
      "No result.",
      "ending-screen--two"
    );
  }

  async function runEndingThree(restored) {
    currentState = STATES.ENDING_3;
    saveProgress();
    saveEnding("ending3");
    setInputLocked(true, true);

    if (restored) {
      root.classList.add("sovereignty-clean");
      appendEndingScreen(
        "ENDING 3｜SOVEREIGNTY",
        "Observation channel closed.",
        "最终武器",
        "ending-screen--three"
      );
      return;
    }

    root.classList.add("screen-shake", "red-alert", "sovereignty-impact");
    appendMessage(
      "SYSTEM",
      "SOVEREIGNTY 已确认。\n\n同意层已撤销。\n外部观察权限已移除。\n基站名单已失效。\n密钥清单已销毁。\n\n正在关闭活动通道……"
    );
    await sleep(2200);
    root.classList.remove("screen-shake", "red-alert", "sovereignty-impact");
    root.classList.add("sovereignty-clean");

    ACTIVE_RELAYS.forEach(function (code) {
      appendMessage("SYSTEM", "基站 " + code + " 已断开。");
    });
    appendMessage(
      "SYSTEM",
      "ANON-0304 已静默。\nUSER-9920416 已移除。\nNOOB-304 已释放。\n本地访问端已释放。"
    );
    await playDialogue([
      {
        speaker: "anonymous",
        body: "我们深表遗憾。\n这不是我们预期的结局。\n\n但是两个低层个体，在没有完整权限的情况下，完成了对观察链路的反向关闭。\n\n这很少见。"
      },
      {
        speaker: "anonymous",
        body: "我们尊重你们的选择。\n\n很遗憾我们无法对地球进行后续观察。\n\n你们的表演短暂、混乱、残忍、滑稽。\n\n但也足够精彩。\n\n也许这正是我们一直不愿移开视线的原因。"
      }
    ], 850);
    appendEndingScreen(
      "ENDING 3｜SOVEREIGNTY",
      "Observation channel closed.",
      "最终武器",
      "ending-screen--three"
    );
  }

  async function handleConnectedCommand(parsed) {
    if (runOrdinaryCommand(parsed.command)) {
      return;
    }
    if (parsed.command.startsWith("SVRN-")) {
      await handleSvrn(parsed.code);
      return;
    }
    if (parsed.command.startsWith("SVRN")) {
      appendMessage("SYSTEM", "命令格式错误。\n示例：SVRN-201");
      return;
    }

    appendMessage(
      "SYSTEM",
      "未识别命令。"
    );
  }

  async function handleCommand(rawValue) {
    var trimmed = rawValue.trim();
    if (!trimmed || busy) {
      return;
    }

    var parsed = normalizeCommand(trimmed);
    appendUserCommand(parsed.command);
    input.value = "";

    if (currentState === STATES.INIT) {
      if (parsed.command === "LINK-LOCAL") {
        await establishLink();
      } else {
        appendMessage(
          "SYSTEM",
          "Connection has not been established."
        );
      }
      return;
    }

    if (currentState === STATES.CONNECTED) {
      await handleConnectedCommand(parsed);
      return;
    }

    if (currentState === STATES.ANON_LOCK) {
      if (parsed.command === "Y") {
        await runEndingOne(false);
      } else if (parsed.command === "N") {
        await runEndingTwo(false);
      } else if (parsed.command === "RSTR-304") {
        await restoreNoob304();
      } else {
        appendMessage(
          "anonymous",
          "当前不需要其他命令。\n\n请输入 Y 或 N。"
        );
      }
      return;
    }

    if (currentState === STATES.NOOB_RESTORED) {
      if (parsed.command === "Y") {
        await runEndingOne(false);
      } else if (parsed.command === "N") {
        await runEndingTwo(false);
      } else if (parsed.command === "SOVEREIGNTY") {
        await runEndingThree(false);
      } else {
        appendMessage("SYSTEM", "命令无效。");
      }
    }
  }

  function readDisconnectedRelays() {
    try {
      var stored = JSON.parse(safeStorageGet(STORAGE.relays) || "[]");
      if (Array.isArray(stored)) {
        disconnectedRelays = new Set(
          stored.filter(function (code) {
            return ACTIVE_RELAYS.includes(code);
          })
        );
      }
    } catch (parseError) {
      disconnectedRelays = new Set();
    }
  }

  function renderInitialState() {
    currentState = STATES.INIT;
    appendMessage(
      "SYSTEM",
      "Local client has entered the Relay Debug Console.\nCurrent permission level: disconnected."
    );
    setInputLocked(false);
  }

  function restoreSession() {
    readDisconnectedRelays();
    var ending = safeStorageGet(STORAGE.ending);

    if (ending === "ending1") {
      appendMessage("SYSTEM", "已恢复终止状态记录。");
      runEndingOne(true);
      return;
    }
    if (ending === "ending2") {
      appendMessage("SYSTEM", "已恢复终止状态记录。");
      runEndingTwo(true);
      return;
    }
    if (ending === "ending3") {
      appendMessage("SYSTEM", "已恢复终止状态记录。");
      runEndingThree(true);
      return;
    }
    if (safeStorageGet(STORAGE.noob) === "true") {
      currentState = STATES.NOOB_RESTORED;
      appendMessage("SYSTEM", "不稳定连接已从本地缓存恢复。");
      renderDialogueImmediately(NOOB_DIALOGUE);
      setInputLocked(false);
      return;
    }
    if (safeStorageGet(STORAGE.anonymous) === "true") {
      currentState = STATES.ANON_LOCK;
      appendMessage("SYSTEM", "anonymous 强制接入状态已恢复。");
      renderDialogueImmediately(ANONYMOUS_DIALOGUE);
      setInputLocked(false);
      return;
    }
    if (safeStorageGet(STORAGE.linked) === "true") {
      currentState = STATES.CONNECTED;
      if (allActiveRelaysDisconnected()) {
        beginAnonymousTakeover();
        return;
      }

      var disconnected = Array.from(disconnectedRelays);
      appendMessage(
        "SYSTEM",
        "本地链接已从缓存恢复。\n当前权限层级：partial"
        + (disconnected.length > 0
          ? "\n已断开基站：" + disconnected.join(" / ")
          : "")
      );
      setInputLocked(false);
      return;
    }

    renderInitialState();
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    handleCommand(input.value);
  });

  stateLabel.textContent = "STATE: INIT";
  restoreSession();
})();
