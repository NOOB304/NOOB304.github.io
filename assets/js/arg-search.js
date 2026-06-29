(function () {
  "use strict";

  var root = document.querySelector("[data-archive-search]");
  var dataElement = document.getElementById("archive-search-data");

  if (!root || !dataElement) {
    return;
  }

  var records;
  try {
    records = JSON.parse(dataElement.textContent);
  } catch (parseError) {
    return;
  }

  var searchView = document.getElementById("archive-search-view");
  var recordView = document.getElementById("archive-record-view");
  var form = document.getElementById("archive-search-form");
  var input = document.getElementById("archive-search-input");
  var feedback = document.getElementById("archive-search-feedback");
  var resultList = document.getElementById("archive-result-list");
  var backLink = recordView.querySelector("[data-search-back]");
  var titleElement = recordView.querySelector("[data-record-title]");
  var statusElement = recordView.querySelector("[data-record-status]");
  var bodyElement = recordView.querySelector("[data-record-body]");
  var pageTitle = document.getElementById("arg-page-title");
  var defaultPageTitle = pageTitle ? pageTitle.textContent : "Archive Search";
  var defaultDocumentTitle = document.title;

  function normalize(value) {
    return String(value).trim().toLowerCase();
  }

  function findRecord(id) {
    return records.find(function (record) {
      return record.id === id;
    });
  }

  function showSearchView() {
    recordView.hidden = true;
    searchView.hidden = false;

    if (pageTitle) {
      pageTitle.textContent = defaultPageTitle;
    }
    document.title = defaultDocumentTitle;
  }

  function showRecord(record) {
    searchView.hidden = true;
    recordView.hidden = false;
    titleElement.textContent = record.title;
    statusElement.textContent = record.status;
    bodyElement.textContent = record.body;

    if (pageTitle) {
      pageTitle.textContent = record.title;
    }
    document.title = record.title + " | " + defaultDocumentTitle;
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function renderResults(matches) {
    resultList.replaceChildren();

    matches.forEach(function (record) {
      var item = document.createElement("li");
      var link = document.createElement("a");
      var title = document.createElement("strong");
      var summary = document.createElement("span");
      var status = document.createElement("span");

      link.href = "#record/" + encodeURIComponent(record.id);
      link.className = "archive-result";
      title.textContent = record.title;
      summary.textContent = record.summary;
      status.textContent = record.status;
      status.className = "archive-result__status";

      link.append(title, summary, status);
      item.appendChild(link);
      resultList.appendChild(item);
    });
  }

  function search(query) {
    var normalizedQuery = normalize(query);
    feedback.replaceChildren();
    resultList.replaceChildren();

    if (!normalizedQuery) {
      feedback.textContent = "未输入关键词。";
      return;
    }

    var matches = records.filter(function (record) {
      return record.keywords.some(function (keyword) {
        return normalize(keyword).includes(normalizedQuery)
          || normalizedQuery.includes(normalize(keyword));
      });
    });

    if (matches.length === 0) {
      var mainMessage = document.createElement("p");
      var auditMessage = document.createElement("small");
      mainMessage.textContent = "No result.";
      auditMessage.textContent = "当前访问端已被临时记录。";
      feedback.append(mainMessage, auditMessage);
      return;
    }

    feedback.textContent = matches.length + " result(s) recovered.";
    renderResults(matches);
  }

  function routeSearch() {
    var hash = window.location.hash;
    var prefix = "#record/";

    if (!hash.startsWith(prefix)) {
      showSearchView();
      return;
    }

    var id = decodeURIComponent(hash.slice(prefix.length));
    var record = findRecord(id);

    if (!record) {
      showSearchView();
      feedback.textContent = "No result.";
      return;
    }

    showRecord(record);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    search(input.value);
  });

  backLink.addEventListener("click", function (event) {
    event.preventDefault();
    window.history.pushState(null, "", window.location.pathname + window.location.search);
    showSearchView();
    input.focus();
  });

  window.addEventListener("hashchange", routeSearch);
  window.addEventListener("popstate", routeSearch);
  routeSearch();
})();
