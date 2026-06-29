(function () {
  "use strict";

  var root = document.querySelector("[data-diary-console]");
  var dataElement = document.getElementById("diary-entry-data");

  if (!root || !dataElement) {
    return;
  }

  var entries;
  try {
    entries = JSON.parse(dataElement.textContent);
  } catch (parseError) {
    return;
  }

  var indexView = document.getElementById("diary-index-view");
  var detailView = document.getElementById("diary-detail-view");
  var indexMessage = document.getElementById("diary-index-message");
  var idElement = detailView.querySelector("[data-diary-id]");
  var dateElement = detailView.querySelector("[data-diary-date]");
  var bodyElement = detailView.querySelector("[data-diary-body]");
  var backLink = detailView.querySelector("[data-diary-back]");
  var pageTitle = document.getElementById("arg-page-title");
  var defaultPageTitle = pageTitle ? pageTitle.textContent : "运行日志";
  var defaultDocumentTitle = document.title;

  function findEntry(id) {
    return entries.find(function (entry) {
      return entry.id === id;
    });
  }

  function appendLines(container, text) {
    String(text).split("\n").forEach(function (line, index, lines) {
      container.appendChild(document.createTextNode(line));
      if (index < lines.length - 1) {
        container.appendChild(document.createElement("br"));
      }
    });
  }

  function renderBody(entry) {
    bodyElement.replaceChildren();

    String(entry.body).split(/\n{2,}/).forEach(function (block) {
      var paragraph = document.createElement("p");
      if (block.trim() === "【部分内容已损坏】") {
        paragraph.className = "diary-detail__corruption";
      }
      appendLines(paragraph, block);
      bodyElement.appendChild(paragraph);
    });
  }

  function showIndex(message) {
    detailView.hidden = true;
    indexView.hidden = false;
    detailView.classList.remove("diary-detail--highlight");
    indexMessage.textContent = message || "";

    if (pageTitle) {
      pageTitle.textContent = defaultPageTitle;
    }
    document.title = defaultDocumentTitle;
  }

  function showEntry(entry) {
    indexView.hidden = true;
    detailView.hidden = false;
    detailView.classList.toggle("diary-detail--highlight", Boolean(entry.highlight));
    idElement.textContent = entry.id;
    dateElement.textContent = entry.date;
    dateElement.dateTime = entry.date.replace(" ", "T");
    renderBody(entry);

    if (pageTitle) {
      pageTitle.textContent = entry.id;
    }
    document.title = entry.id + " | " + defaultDocumentTitle;
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function routeDiary() {
    var id = decodeURIComponent(window.location.hash.replace(/^#/, ""));

    if (!id) {
      showIndex("");
      return;
    }

    var entry = findEntry(id);
    if (!entry || entry.corrupted) {
      showIndex("该日志不可访问。");
      return;
    }

    showEntry(entry);
  }

  backLink.addEventListener("click", function (event) {
    event.preventDefault();
    window.history.pushState(null, "", window.location.pathname + window.location.search);
    showIndex("");
  });

  window.addEventListener("hashchange", routeDiary);
  window.addEventListener("popstate", routeDiary);
  routeDiary();
})();
