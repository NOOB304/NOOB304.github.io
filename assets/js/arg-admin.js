(function () {
  "use strict";

  var RECOVERY_STORAGE_KEY = "arg_admin_recovered";
  var VALID_ACCOUNT = "NOOB304";
  var RECOVERED_PASSWORD = "W123456";
  var recoveryFallback = false;

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

    if (!trigger || !modal) {
      return;
    }

    var dialog = modal.querySelector('[role="dialog"]');
    var views = Array.from(modal.querySelectorAll(".arg-admin-view"));
    var closeButtons = modal.querySelectorAll("[data-admin-close]");
    var loginViewButtons = modal.querySelectorAll("[data-admin-login-view]");
    var loginView = document.getElementById("arg-admin-login-view");
    var recoveryView = document.getElementById("arg-admin-recovery-view");
    var recoverySuccessView = document.getElementById("arg-admin-recovery-success");
    var loginSuccessView = document.getElementById("arg-admin-login-success");
    var accountInput = document.getElementById("arg-admin-account");
    var passwordInput = document.getElementById("arg-admin-password");
    var loginButton = document.getElementById("arg-admin-login");
    var forgotButton = document.getElementById("arg-admin-forgot");
    var loginError = document.getElementById("arg-admin-login-error");
    var nameInput = document.getElementById("arg-security-name");
    var emailInput = document.getElementById("arg-security-email");
    var phoneInput = document.getElementById("arg-security-phone");
    var resetButton = document.getElementById("arg-admin-reset");
    var recoveryError = document.getElementById("arg-admin-recovery-error");

    var viewLabels = new Map([
      [loginView, "arg-admin-login-title"],
      [recoveryView, "arg-admin-recovery-title"],
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

    function showLoginView() {
      showView(loginView);
      window.setTimeout(function () {
        accountInput.focus();
      }, 0);
    }

    function openModal() {
      modal.hidden = false;
      document.body.classList.add("arg-modal-open");
      accountInput.value = "";
      passwordInput.value = "";
      showLoginView();
    }

    function closeModal() {
      modal.hidden = true;
      document.body.classList.remove("arg-modal-open");
      clearMessages();
      trigger.focus();
    }

    function attemptLogin() {
      var accountMatches = accountInput.value.trim().toUpperCase() === VALID_ACCOUNT;
      var passwordMatches = passwordInput.value.trim() === RECOVERED_PASSWORD;

      if (!isRecovered() || !accountMatches || !passwordMatches) {
        loginError.textContent = "密码错误。";
        return;
      }

      showView(loginSuccessView);
    }

    function showRecoveryView() {
      nameInput.value = "";
      emailInput.value = "";
      phoneInput.value = "";
      showView(recoveryView);
      window.setTimeout(function () {
        nameInput.focus();
      }, 0);
    }

    function attemptRecovery() {
      var normalizedName = normalizeName(nameInput.value);
      var nameMatches = (
        normalizedName === "hengwei"
        || normalizedName === "weiheng"
        || normalizedName === "魏珩"
      );
      var emailMatches = normalizeEmail(emailInput.value) === "we1heng@outlook.com";
      var phoneMatches = normalizePhone(phoneInput.value) === "17320111812";

      if (!nameMatches || !emailMatches || !phoneMatches) {
        recoveryError.textContent = "密保信息不匹配。";
        return;
      }

      saveRecoveredState();
      showView(recoverySuccessView);
    }

    trigger.addEventListener("click", openModal);
    loginButton.addEventListener("click", attemptLogin);
    forgotButton.addEventListener("click", showRecoveryView);
    resetButton.addEventListener("click", attemptRecovery);

    closeButtons.forEach(function (button) {
      button.addEventListener("click", closeModal);
    });

    loginViewButtons.forEach(function (button) {
      button.addEventListener("click", showLoginView);
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
      }
    });
  }

  initializeAttachments();
  initializeAdminModal();
})();
