(function () {
  "use strict";

  var trigger = document.getElementById("article-access-trigger");
  var modal = document.getElementById("article-access-modal");
  var mapElement = document.getElementById("article-route-map");

  if (!trigger || !modal || !mapElement) {
    return;
  }

  var input = document.getElementById("article-id-input");
  var confirmButton = document.getElementById("article-id-confirm");
  var error = document.getElementById("article-id-error");
  var closeButtons = modal.querySelectorAll("[data-arg-close]");
  var routes = {};

  try {
    routes = JSON.parse(mapElement.textContent);
  } catch (parseError) {
    error.textContent = "文章索引暂时不可用。";
  }

  function openModal(event) {
    event.preventDefault();
    modal.hidden = false;
    document.body.classList.add("arg-modal-open");
    error.textContent = "";
    input.value = "";
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

  function normalizeArticleId(value) {
    return value.trim().replace(/\s+/g, "");
  }

  function visitArticle() {
    var articleId = normalizeArticleId(input.value);

    if (!/^\d{3}$/.test(articleId) || !routes[articleId]) {
      error.textContent = "未找到对应文章。";
      return;
    }

    window.location.assign(routes[articleId]);
  }

  trigger.addEventListener("click", openModal);
  confirmButton.addEventListener("click", visitArticle);

  closeButtons.forEach(function (button) {
    button.addEventListener("click", closeModal);
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      visitArticle();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });
})();
