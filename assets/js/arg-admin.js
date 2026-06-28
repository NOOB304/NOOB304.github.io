(function () {
  "use strict";

  var RECOVERY_STORAGE_KEY = "arg_admin_recovered";
  var LOGIN_STORAGE_KEY = "arg_admin_logged_in";
  var VALID_ACCOUNT = "NOOB304";
  var RECOVERED_PASSWORD = "W123456";
  var recoveryFallback = false;
  var loginFallback = false;

  function initializeAttachments() {
    document.querySelectorAll("[data-arg-attachment]").forEach(function (attachment) {
      var image = attachment.querySelector("[data-arg-attachment-image]");
      var placeholder = attachment.querySelector("[data-arg-attachment-placeholder]");

      if (!image || !placeholder) {
        return;
      }

      function showImage() {
        image.hidden = false;
        placeholder.hidden = true;
        attachment.classList.add("arg-attachment--loaded");
      }

      function showPlaceholder() {
        image.hidden = true;
        placeholder.hidden = false;
        attachment.classList.remove("arg-attachment--loaded");
      }

      image.addEventListener("load", showImage);
      image.addEventListener("error", showPlaceholder);

      if (image.complete) {
        if (image.naturalWidth > 0) {
          showImage();
        } else {
          showPlaceholder();
        }
      }
    });
  }

  function isRecovered() {
    try {
      return window.localStorage.getItem(RECOVERY_STORAGE_KEY) === "true";
    } catch (storageError) {
      return recoveryFallback;
    }
  }

  function saveRecoveredState() {
    recoveryFallback = true;
    try {
      window.localStorage.setItem(RECOVERY_STORAGE_KEY, "true");
    } catch (storageError) {
      // Session fallback remains available when localStorage is blocked.
    }
  }

  function isLoggedIn() {
    if (!isRecovered()) {
      return false;
    }

    try {
      return window.localStorage.getItem(LOGIN_STORAGE_KEY) === "true";
    } catch (storageError) {
      return loginFallback;
    }
  }

  function saveLoggedInState() {
    loginFallback = true;
    try {
      window.localStorage.setItem(LOGIN_STORAGE_KEY, "true");
    } catch (storageError) {
      // Session fallback remains available when localStorage is blocked.
    }
  }

  function normalizeName(value) {
    return value.trim().toLowerCase().replace(/\s+/g, "");
  }

  function normalizeEmail(value) {
    return value.trim().toLowerCase();
  }

  function normalizePhone(value) {
    return value.trim().replace(/[\s-]+/g, "");
  }

  function initializeMissingNoticeEasterEgg() {
    var target = document.querySelector("[data-easter-egg-target]");
    var modal = document.getElementById("arg-easter-egg-modal");

    if (!target || !modal) {
      return;
    }

    var closeButtons = modal.querySelectorAll("[data-easter-egg-close]");
    var closeButton = modal.querySelector(".arg-easter-egg-close");
    var clickCount = 0;
    var consumed = false;
    var resetTimer = null;

    function resetSequence() {
      clickCount = 0;
      if (resetTimer !== null) {
        window.clearTimeout(resetTimer);
        resetTimer = null;
      }
    }

    function openEasterEgg() {
      consumed = true;
      resetSequence();
      modal.hidden = false;
      modal.classList.add("arg-easter-egg-active");
      document.body.classList.add("arg-modal-open");
      window.setTimeout(function () {
        closeButton.focus();
      }, 0);
    }

    function closeEasterEgg() {
      modal.hidden = true;
      modal.classList.remove("arg-easter-egg-active");
      document.body.classList.remove("arg-modal-open");
      target.focus();
    }

    target.setAttribute("tabindex", "0");
    target.setAttribute("role", "button");
    target.setAttribute("aria-label", "寻人启事附件");

    target.addEventListener("click", function () {
      if (consumed) {
        return;
      }

      clickCount += 1;
      if (resetTimer !== null) {
        window.clearTimeout(resetTimer);
      }

      if (clickCount >= 5) {
        openEasterEgg();
        return;
      }

      resetTimer = window.setTimeout(resetSequence, 1400);
    });

    target.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        target.click();
      }
    });

    closeButtons.forEach(function (button) {
      button.addEventListener("click", closeEasterEgg);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !modal.hidden) {
        closeEasterEgg();
      }
    });
  }

  function initializeStandaloneAdminNavigation() {
    var trigger = document.getElementById("arg-admin-open");
    var adminMenu = document.getElementById("arg-admin-menu");
    var navWrapper = trigger ? trigger.closest(".arg-admin-nav-wrap") : null;
    var modal = document.getElementById("arg-admin-modal");

    if (!trigger || !adminMenu || !navWrapper || modal) {
      return;
    }

    var placeholderMenuItems = adminMenu.querySelectorAll("[data-admin-placeholder]");

    function closeAdminMenu() {
      adminMenu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }

    function updateNavigationState() {
      var loggedIn = isLoggedIn();
      trigger.textContent = loggedIn ? VALID_ACCOUNT : "登录";
      trigger.setAttribute("aria-haspopup", loggedIn ? "menu" : "dialog");
      closeAdminMenu();
    }

    trigger.addEventListener("click", function (event) {
      event.preventDefault();

      if (!isLoggedIn()) {
        window.location.assign(
          navWrapper.getAttribute("data-admin-login-url") || "/review-log/#admin-login"
        );
        return;
      }

      var willOpen = adminMenu.hidden;
      adminMenu.hidden = !willOpen;
      trigger.setAttribute("aria-expanded", String(willOpen));
    });

    placeholderMenuItems.forEach(function (item) {
      item.addEventListener("click", function (event) {
        event.preventDefault();
      });
    });

    document.addEventListener("click", function (event) {
      if (!adminMenu.hidden && !navWrapper.contains(event.target)) {
        closeAdminMenu();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !adminMenu.hidden) {
        closeAdminMenu();
      }
    });

    updateNavigationState();
  }

  function initializeAdminModal() {
    var trigger = document.getElementById("arg-admin-open");
    var modal = document.getElementById("arg-admin-modal");
    var adminMenu = document.getElementById("arg-admin-menu");
    var navWrapper = trigger ? trigger.closest(".arg-admin-nav-wrap") : null;

    if (!trigger || !modal || !adminMenu || !navWrapper) {
      return;
    }

    var dialog = modal.querySelector('[role="dialog"]');
    var views = Array.from(modal.querySelectorAll(".arg-admin-view"));
    var closeButtons = modal.querySelectorAll("[data-admin-close]");
    var loginViewButtons = modal.querySelectorAll("[data-admin-login-view]");
    var loginView = document.getElementById("arg-admin-login-view");
    var recoveryView = document.getElementById("arg-admin-recovery-view");
    var recoveryLoadingView = document.getElementById("arg-admin-recovery-loading");
    var recoverySuccessView = document.getElementById("arg-admin-recovery-success");
    var loginSuccessView = document.getElementById("arg-admin-login-success");
    var accountInput = document.getElementById("arg-admin-account");
    var passwordInput = document.getElementById("arg-admin-password");
    var loginButton = document.getElementById("arg-admin-login");
    var forgotButton = document.getElementById("arg-admin-forgot");
    var loginError = document.getElementById("arg-admin-login-error");
    var recoveryAccountInput = document.getElementById("arg-recovery-account");
    var nameInput = document.getElementById("arg-security-name");
    var emailInput = document.getElementById("arg-security-email");
    var phoneInput = document.getElementById("arg-security-phone");
    var resetButton = document.getElementById("arg-admin-reset");
    var recoveryError = document.getElementById("arg-admin-recovery-error");
    var placeholderMenuItems = adminMenu.querySelectorAll("[data-admin-placeholder]");
    var recoveryTimer = null;
    var impactAudioContext = null;

    var viewLabels = new Map([
      [loginView, "arg-admin-login-title"],
      [recoveryView, "arg-admin-recovery-title"],
      [recoveryLoadingView, "arg-admin-recovery-loading-title"],
      [recoverySuccessView, "arg-admin-recovery-success-title"],
      [loginSuccessView, "arg-admin-login-success-title"]
    ]);

    function clearMessages() {
      loginError.textContent = "";
      recoveryError.textContent = "";
    }

    function showView(targetView) {
      views.forEach(function (view) {
        view.hidden = view !== targetView;
      });
      clearMessages();
      dialog.setAttribute("aria-labelledby", viewLabels.get(targetView));
    }

    function cancelRecoveryTimer() {
      if (recoveryTimer !== null) {
        window.clearTimeout(recoveryTimer);
        recoveryTimer = null;
      }
    }

    function closeAdminMenu() {
      adminMenu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }

    function updateNavigationState() {
      var loggedIn = isLoggedIn();
      trigger.textContent = loggedIn ? VALID_ACCOUNT : "登录";
      trigger.setAttribute("aria-haspopup", loggedIn ? "menu" : "dialog");
      closeAdminMenu();
    }

    function toggleAdminMenu() {
      var willOpen = adminMenu.hidden;
      adminMenu.hidden = !willOpen;
      trigger.setAttribute("aria-expanded", String(willOpen));
    }

    function showLoginView() {
      cancelRecoveryTimer();
      showView(loginView);
      window.setTimeout(function () {
        accountInput.focus();
      }, 0);
    }

    function openModal() {
      closeAdminMenu();
      modal.hidden = false;
      document.body.classList.add("arg-modal-open");
      accountInput.value = "";
      passwordInput.value = "";
      showLoginView();
    }

    function closeModal() {
      cancelRecoveryTimer();
      if (impactAudioContext && impactAudioContext.state !== "closed") {
        impactAudioContext.close();
        impactAudioContext = null;
      }
      modal.hidden = true;
      document.body.classList.remove("arg-modal-open");
      modal.classList.remove("arg-login-impact");
      clearMessages();
      trigger.focus();
    }

    function prepareLoginSound() {
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return null;
      }

      try {
        if (!impactAudioContext || impactAudioContext.state === "closed") {
          impactAudioContext = new AudioContextClass();
        }
        if (impactAudioContext.state === "suspended") {
          impactAudioContext.resume();
        }
        return impactAudioContext;
      } catch (audioError) {
        return null;
      }
    }

    function playLoginSound() {
      var context = prepareLoginSound();
      if (!context) {
        return;
      }

      try {
        var gain = context.createGain();
        var firstTone = context.createOscillator();
        var secondTone = context.createOscillator();
        var now = context.currentTime;

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.16, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

        firstTone.type = "square";
        firstTone.frequency.setValueAtTime(185, now);
        firstTone.frequency.exponentialRampToValueAtTime(72, now + 0.42);

        secondTone.type = "sawtooth";
        secondTone.frequency.setValueAtTime(121, now);
        secondTone.frequency.exponentialRampToValueAtTime(48, now + 0.42);

        firstTone.connect(gain);
        secondTone.connect(gain);
        gain.connect(context.destination);
        firstTone.start(now);
        secondTone.start(now);
        firstTone.stop(now + 0.43);
        secondTone.stop(now + 0.43);

        window.setTimeout(function () {
          context.close();
          impactAudioContext = null;
        }, 600);
      } catch (audioError) {
        // The visual login response remains available when audio is blocked.
      }
    }

    function createTurnBackOverlay() {
      var existingOverlay = document.querySelector(".arg-login-horror");
      if (existingOverlay) {
        existingOverlay.remove();
      }

      var overlay = document.createElement("div");
      overlay.className = "arg-login-horror";
      overlay.setAttribute("aria-hidden", "true");

      ["left", "right"].forEach(function (sideName, sideIndex) {
        var side = document.createElement("div");
        side.className = "arg-login-horror__side arg-login-horror__side--" + sideName;

        for (var index = 0; index < 18; index += 1) {
          var warning = document.createElement("span");
          warning.textContent = index % 4 === 0 ? "回头，回头" : "回头";
          warning.style.setProperty("--turn-top", ((index * 31 + sideIndex * 11) % 92) + "%");
          warning.style.setProperty("--turn-left", ((index * 19 + sideIndex * 7) % 58) + "%");
          warning.style.setProperty("--turn-delay", ((index % 5) * 0.045) + "s");
          warning.style.setProperty("--turn-size", (1.1 + (index % 5) * 0.28) + "rem");
          side.appendChild(warning);
        }

        overlay.appendChild(side);
      });

      document.body.appendChild(overlay);
      window.setTimeout(function () {
        overlay.remove();
      }, 2050);
    }

    function triggerLoginImpact() {
      modal.classList.remove("arg-login-impact");
      window.requestAnimationFrame(function () {
        modal.classList.add("arg-login-impact");
        playLoginSound();
        createTurnBackOverlay();
        window.setTimeout(function () {
          modal.classList.remove("arg-login-impact");
        }, 700);
      });
    }

    function attemptLogin() {
      prepareLoginSound();
      var accountMatches = accountInput.value.trim().toUpperCase() === VALID_ACCOUNT;
      var passwordMatches = passwordInput.value.trim() === RECOVERED_PASSWORD;

      if (!accountMatches || !passwordMatches) {
        if (impactAudioContext && impactAudioContext.state !== "closed") {
          impactAudioContext.close();
          impactAudioContext = null;
        }
        loginError.textContent = "密码错误。";
        return;
      }

      saveRecoveredState();
      saveLoggedInState();
      updateNavigationState();
      showView(loginSuccessView);
      triggerLoginImpact();
    }

    function showRecoveryView() {
      cancelRecoveryTimer();
      recoveryAccountInput.value = "";
      nameInput.value = "";
      emailInput.value = "";
      phoneInput.value = "";
      showView(recoveryView);
      window.setTimeout(function () {
        nameInput.focus();
      }, 0);
    }

    function attemptRecovery() {
      if (recoveryTimer !== null) {
        return;
      }

      var accountMatches = recoveryAccountInput.value.trim().toUpperCase() === VALID_ACCOUNT;
      var normalizedName = normalizeName(nameInput.value);
      var nameMatches = (
        normalizedName === "hengwei"
        || normalizedName === "weiheng"
        || normalizedName === "魏珩"
      );
      var emailMatches = normalizeEmail(emailInput.value) === "we1heng@outlook.com";
      var phoneMatches = normalizePhone(phoneInput.value) === "17320111812";

      showView(recoveryLoadingView);
      recoveryTimer = window.setTimeout(function () {
        recoveryTimer = null;

        if (!accountMatches || !nameMatches || !emailMatches || !phoneMatches) {
          showView(recoveryView);
          recoveryError.textContent = "密保信息不匹配。";
          return;
        }

        saveRecoveredState();
        showView(recoverySuccessView);
      }, 2000);
    }

    trigger.addEventListener("click", function (event) {
      event.preventDefault();
      if (isLoggedIn()) {
        toggleAdminMenu();
        return;
      }
      openModal();
    });
    loginButton.addEventListener("click", attemptLogin);
    forgotButton.addEventListener("click", showRecoveryView);
    resetButton.addEventListener("click", attemptRecovery);

    closeButtons.forEach(function (button) {
      button.addEventListener("click", closeModal);
    });

    loginViewButtons.forEach(function (button) {
      button.addEventListener("click", showLoginView);
    });

    placeholderMenuItems.forEach(function (item) {
      item.addEventListener("click", function (event) {
        event.preventDefault();
      });
    });

    passwordInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        attemptLogin();
      }
    });

    phoneInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        attemptRecovery();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !modal.hidden) {
        closeModal();
      } else if (event.key === "Escape" && !adminMenu.hidden) {
        closeAdminMenu();
      }
    });

    document.addEventListener("click", function (event) {
      if (!adminMenu.hidden && !navWrapper.contains(event.target)) {
        closeAdminMenu();
      }
    });

    updateNavigationState();

    if (window.location.hash === "#admin-login" && !isLoggedIn()) {
      openModal();
    }
  }

  initializeAttachments();
  initializeMissingNoticeEasterEgg();
  initializeStandaloneAdminNavigation();
  initializeAdminModal();
})();
