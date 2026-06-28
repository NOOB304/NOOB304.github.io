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
    var recoveryAudioContext = null;

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
      if (recoveryAudioContext && recoveryAudioContext.state !== "closed") {
        recoveryAudioContext.close();
        recoveryAudioContext = null;
      }
      modal.hidden = true;
      document.body.classList.remove("arg-modal-open");
      modal.classList.remove("arg-recovery-impact");
      clearMessages();
      trigger.focus();
    }

    function prepareRecoverySound() {
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return null;
      }

      try {
        if (!recoveryAudioContext || recoveryAudioContext.state === "closed") {
          recoveryAudioContext = new AudioContextClass();
        }
        if (recoveryAudioContext.state === "suspended") {
          recoveryAudioContext.resume();
        }
        return recoveryAudioContext;
      } catch (audioError) {
        return null;
      }
    }

    function playRecoverySound() {
      var context = prepareRecoverySound();
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
          recoveryAudioContext = null;
        }, 600);
      } catch (audioError) {
        // The visual recovery response remains available when audio is blocked.
      }
    }

    function triggerRecoveryImpact() {
      modal.classList.remove("arg-recovery-impact");
      window.requestAnimationFrame(function () {
        modal.classList.add("arg-recovery-impact");
        playRecoverySound();
        window.setTimeout(function () {
          modal.classList.remove("arg-recovery-impact");
        }, 700);
      });
    }

    function attemptLogin() {
      var accountMatches = accountInput.value.trim().toUpperCase() === VALID_ACCOUNT;
      var passwordMatches = passwordInput.value.trim() === RECOVERED_PASSWORD;

      if (!isRecovered() || !accountMatches || !passwordMatches) {
        loginError.textContent = "密码错误。";
        return;
      }

      saveLoggedInState();
      updateNavigationState();
      showView(loginSuccessView);
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

      prepareRecoverySound();
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
          if (recoveryAudioContext && recoveryAudioContext.state !== "closed") {
            recoveryAudioContext.close();
            recoveryAudioContext = null;
          }
          showView(recoveryView);
          recoveryError.textContent = "密保信息不匹配。";
          return;
        }

        saveRecoveredState();
        showView(recoverySuccessView);
        triggerRecoveryImpact();
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
  }

  initializeAttachments();
  initializeAdminModal();
})();
