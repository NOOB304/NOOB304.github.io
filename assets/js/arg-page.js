(function () {
  "use strict";

  var trigger = document.getElementById("review-log-trigger");
  var modal = document.getElementById("review-log-modal");

  if (!trigger || !modal) {
    return;
  }

  var input = document.getElementById("review-log-key");
  var confirmButton = document.getElementById("review-log-confirm");
  var error = document.getElementById("review-log-error");
  var closeButtons = modal.querySelectorAll("[data-arg-close]");
  var validKey = "NOOB304";

  function openModal() {
    modal.hidden = false;
    document.body.classList.add("arg-modal-open");
    input.value = "";
    error.textContent = "";
    window.setTimeout(function () {
      input.focus();
    }, 0);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("arg-modal-open");
    error.textContent = "";
    trigger.focus();
  }

  function verifyKey() {
    var suppliedKey = input.value.trim().toUpperCase();

    if (suppliedKey !== validKey) {
      error.textContent = "访问密钥无效。";
      return;
    }

    window.location.assign(modal.getAttribute("data-destination"));
  }

  trigger.addEventListener("click", openModal);
  confirmButton.addEventListener("click", verifyKey);

  closeButtons.forEach(function (button) {
    button.addEventListener("click", closeModal);
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      verifyKey();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });
})();
