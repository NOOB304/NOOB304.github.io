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
  var typeElement = recordView.querySelector("[data-record-type]");
  var bodyElement = recordView.querySelector("[data-record-body]");
  var pageTitle = document.getElementById("arg-page-title");
  var defaultPageTitle = pageTitle ? pageTitle.textContent : "Archive Search";
  var defaultDocumentTitle = document.title;
  var dataCache = new Map();
  var routeSequence = 0;

  var searchActivityGroups = [
    {
      key: "arg_search_编号",
      terms: ["编号", "D-23", "NOOB-304", "NOOB304", "304"]
    },
    {
      key: "arg_search_封存",
      terms: ["封存", "自我封存", "主动封存", "失效封存", "containment", "archived"]
    },
    {
      key: "arg_search_密钥",
      terms: ["密钥", "运行密钥", "最终密钥", "最终武器", "SVRN", "切断命令", "切断所有基站"]
    },
    {
      key: "arg_search_信息表",
      terms: [
        "学生个人信息表",
        "学生信息表",
        "信息表",
        "信息",
        "学生个人信息",
        "student info",
        "student_info_form"
      ]
    },
    {
      key: "arg_search_基站",
      terms: ["基站", "基站名单", "名单", "relay registry", "registry", "base station"]
    }
  ];

  function normalize(value) {
    return String(value)
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/[\s_\-\u2010-\u2015\u2212]+/g, "");
  }

  function findRecord(id) {
    return records.find(function (record) {
      return record.id === id;
    });
  }

  function saveSearchActivity(normalizedQuery) {
    searchActivityGroups.forEach(function (group) {
      var matched = group.terms.some(function (term) {
        return normalize(term) === normalizedQuery;
      });

      if (!matched) {
        return;
      }

      try {
        window.localStorage.setItem(group.key, "true");
      } catch (storageError) {
        // Search still works when storage is unavailable.
      }
    });
  }

  function resetRecordBody(record) {
    bodyElement.replaceChildren();
    bodyElement.className = "archive-record-detail__body";
    bodyElement.classList.add("archive-record-detail__body--" + record.type);
    recordView.className = "backend-console__view archive-record-detail";
    recordView.classList.add("archive-record-detail--" + record.type);
    document.body.classList.toggle("archive-student-table-open", record.type === "table");

    if (record.status === "severely damaged") {
      recordView.classList.add("archive-record-detail--severely-damaged");
    }
  }

  function showSearchView() {
    routeSequence += 1;
    recordView.hidden = true;
    searchView.hidden = false;
    document.body.classList.remove("archive-student-table-open");

    if (pageTitle) {
      pageTitle.textContent = defaultPageTitle;
    }
    document.title = defaultDocumentTitle;
  }

  function appendTextLines(container, text) {
    String(text).split("\n").forEach(function (line, index, lines) {
      container.appendChild(document.createTextNode(line));
      if (index < lines.length - 1) {
        container.appendChild(document.createElement("br"));
      }
    });
  }

  function isFragmentWarning(text) {
    return /没有时间|无法命令|无法操控|我是人类|不屈服|不承认|宠物|最终武器|SVRN|切断/.test(text);
  }

  function renderFragment(record) {
    var fragment = document.createElement("div");
    fragment.className = "archive-fragment";

    String(record.body).split(/\n{2,}/).forEach(function (block) {
      var paragraph = document.createElement("p");
      if (isFragmentWarning(block)) {
        paragraph.className = "archive-fragment__warning";
      }
      appendTextLines(paragraph, block);
      fragment.appendChild(paragraph);
    });

    bodyElement.appendChild(fragment);
  }

  function renderKeyList(record) {
    var manifest = document.createElement("pre");
    manifest.className = "archive-key-manifest";
    manifest.textContent = record.body;
    bodyElement.appendChild(manifest);
  }

  function renderAmbient(record) {
    var message = document.createElement("p");
    message.className = "archive-placeholder";
    message.textContent = record.body || "【内容尚未恢复】";
    bodyElement.appendChild(message);
  }

  function createTable(columns, rows, options) {
    var wrapper = document.createElement("div");
    var table = document.createElement("table");
    var head = document.createElement("thead");
    var headRow = document.createElement("tr");
    var body = document.createElement("tbody");

    wrapper.className = "archive-table-scroll";
    table.className = "archive-data-table";
    table.id = options.id;

    columns.forEach(function (column) {
      var cell = document.createElement("th");
      cell.scope = "col";
      cell.textContent = column.label;
      headRow.appendChild(cell);
    });

    head.appendChild(headRow);
    table.append(head, body);
    wrapper.appendChild(table);

    function renderRows(nextRows) {
      body.replaceChildren();

      nextRows.forEach(function (row) {
        var tableRow = document.createElement("tr");

        columns.forEach(function (column) {
          var cell = document.createElement("td");
          var value = row[column.key];
          cell.textContent = value === undefined || value === null ? "" : String(value);
          cell.dataset.label = column.label;

          if (column.className) {
            var cellClass = typeof column.className === "function"
              ? column.className(row)
              : column.className;
            if (cellClass) {
              cell.className = cellClass;
            }
          }

          tableRow.appendChild(cell);
        });

        body.appendChild(tableRow);
      });
    }

    renderRows(rows);
    return { wrapper: wrapper, renderRows: renderRows };
  }

  function renderStudentTable(data) {
    var rows = Array.isArray(data) ? data : data.rows;
    var columns = Array.isArray(data.columns) ? data.columns : [
      { key: "name", label: "Name" },
      { key: "studentId", label: "Student ID" },
      { key: "major", label: "Major" },
      { key: "college", label: "College" },
      { key: "age", label: "Age" }
    ];

    if (!Array.isArray(rows) || rows.length === 0) {
      renderDataUnavailable("【学生信息表尚未载入】");
      return;
    }

    var panel = document.createElement("section");
    var filterLabel = document.createElement("label");
    var filterInput = document.createElement("input");
    var count = document.createElement("p");
    var tableView = createTable(columns, rows, { id: "student-info-table" });

    panel.className = "archive-data-panel archive-data-panel--student";
    filterLabel.htmlFor = "student-table-filter";
    filterLabel.textContent = "表内搜索";
    filterInput.id = "student-table-filter";
    filterInput.className = "archive-table-filter";
    filterInput.type = "search";
    filterInput.autocomplete = "off";
    filterInput.spellcheck = false;
    filterInput.setAttribute("aria-controls", "student-info-table");
    count.className = "archive-table-count";

    function updateRows() {
      var query = normalize(filterInput.value);
      var filteredRows = rows.filter(function (row) {
        if (!query) {
          return true;
        }

        if (/^\d+$/.test(query)) {
          return normalize(row.studentId) === query;
        }

        var searchableValues = Object.values(row).flatMap(function (value) {
          return Array.isArray(value) ? value : [value];
        });

        return searchableValues.some(function (value) {
          return normalize(value).includes(query);
        });
      });

      tableView.renderRows(filteredRows);
      count.textContent = filteredRows.length + " / " + rows.length + " records";
    }

    filterInput.addEventListener("input", updateRows);
    panel.append(filterLabel, filterInput, count, tableView.wrapper);
    bodyElement.appendChild(panel);
    updateRows();
  }

  function renderRelayRegistry(rows, record) {
    if (!Array.isArray(rows) || rows.length === 0) {
      renderDataUnavailable("【基站名单尚未载入】");
      return;
    }

    var columns = [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "region", label: "Region" },
      { key: "score", label: "Score" },
      {
        key: "status",
        label: "Status",
        className: function (row) {
          if (row.status === "活动中") {
            return "registry-status registry-status--active";
          }
          if (row.status === "失效封存") {
            return "registry-status registry-status--sealed";
          }
          if (row.status === "已升级") {
            return "registry-status registry-status--upgraded";
          }
          return "registry-status";
        }
      }
    ];
    var tableView = createTable(columns, rows, { id: "relay-registry-table" });

    if (record.system_message) {
      var systemMessage = document.createElement("p");
      systemMessage.className = "archive-system-message";
      systemMessage.textContent = record.system_message;
      bodyElement.appendChild(systemMessage);
    }

    bodyElement.appendChild(tableView.wrapper);
  }

  function renderDataUnavailable(message) {
    var placeholder = document.createElement("p");
    placeholder.className = "archive-placeholder";
    placeholder.textContent = message;
    bodyElement.appendChild(placeholder);
  }

  async function loadDataSource(path) {
    if (dataCache.has(path)) {
      return dataCache.get(path);
    }

    var response = await window.fetch(path, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error("Data source unavailable");
    }

    var data = await response.json();
    dataCache.set(path, data);
    return data;
  }

  async function renderRecordBody(record, sequence) {
    if (record.type === "fragment") {
      renderFragment(record);
      return;
    }
    if (record.type === "keylist") {
      renderKeyList(record);
      return;
    }
    if (record.type === "ambient") {
      renderAmbient(record);
      return;
    }

    var loading = document.createElement("p");
    loading.className = "archive-data-loading";
    loading.textContent = "READING LOCAL CACHE...";
    bodyElement.appendChild(loading);

    try {
      var rows = await loadDataSource(record.data_source);
      if (sequence !== routeSequence) {
        return;
      }

      bodyElement.replaceChildren();
      if (record.type === "table") {
        renderStudentTable(rows);
      } else if (record.type === "registry") {
        renderRelayRegistry(rows, record);
      } else {
        renderDataUnavailable("【内容尚未恢复】");
      }
    } catch (dataError) {
      if (sequence !== routeSequence) {
        return;
      }

      bodyElement.replaceChildren();
      if (record.type === "table") {
        renderDataUnavailable("【学生信息表尚未载入】");
      } else if (record.type === "registry") {
        renderDataUnavailable("【基站名单尚未载入】");
      } else {
        renderDataUnavailable("【内容尚未恢复】");
      }
    }
  }

  async function showRecord(record) {
    routeSequence += 1;
    var sequence = routeSequence;

    searchView.hidden = true;
    recordView.hidden = false;
    titleElement.textContent = record.title;
    statusElement.textContent = record.status;
    typeElement.textContent = record.type;
    resetRecordBody(record);

    if (pageTitle) {
      pageTitle.textContent = record.title;
    }
    document.title = record.title + " | " + defaultDocumentTitle;
    window.scrollTo({ top: 0, behavior: "auto" });
    await renderRecordBody(record, sequence);
  }

  function renderResults(matches) {
    resultList.replaceChildren();

    matches.forEach(function (record) {
      var item = document.createElement("li");
      var link = document.createElement("a");
      var title = document.createElement("strong");
      var summary = document.createElement("span");
      var metadata = document.createElement("span");
      var status = document.createElement("span");
      var type = document.createElement("span");

      link.href = "#record/" + encodeURIComponent(record.id);
      link.className = "archive-result";
      title.textContent = record.title;
      summary.textContent = record.summary;
      metadata.className = "archive-result__meta";
      status.textContent = "STATUS: " + record.status;
      status.className = "archive-result__status";
      type.textContent = "TYPE: " + record.type;
      type.className = "archive-result__type";

      metadata.append(status, type);
      link.append(title, summary, metadata);
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

    saveSearchActivity(normalizedQuery);

    var matches = records.filter(function (record) {
      return record.keywords.some(function (keyword) {
        return normalize(keyword) === normalizedQuery;
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
