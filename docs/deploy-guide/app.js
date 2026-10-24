// Deploy guide: fills the operator's values into commands, adds copy buttons, and remembers ticked
// steps. Plain JavaScript, no dependencies; works when index.html is opened from the file system.
// Everything is kept in this browser's localStorage only, and the page works without it.

(function () {
  "use strict";

  var VALUES_KEY = "stem-racing-deploy-values";
  var TASKS_KEY = "stem-racing-deploy-tasks";

  var DEFAULTS = {
    domain: "",
    dir: "/opt/stem-racing",
    repo: "git@github.com:575051410455/hotel-stem-racing.git",
    adminEmail: "",
    adminName: "",
  };

  /** Shown wherever a value is still empty. */
  var PLACEHOLDERS = {
    domain: "register.example.org",
    dir: "/opt/stem-racing",
    repo: "git@github.com:OWNER/REPO.git",
    adminEmail: "organiser@example.com",
    adminName: "Organiser",
  };

  // ---- Storage (may be unavailable: private windows, blocked site data) ----

  function load(key) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function save(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Not remembered; the page still works.
    }
  }

  // ---- Values ----

  // Values that end up in shell commands keep only characters that are safe there unquoted.
  var SANITISE = {
    domain: function (value) {
      return value
        .trim()
        .toLowerCase()
        .replace(/^[a-z]+:\/\//, "")
        .replace(/[/?#].*$/, "")
        .replace(/[^a-z0-9.-]/g, "");
    },
    dir: function (value) {
      return value.trim().replace(/[^A-Za-z0-9._/~-]/g, "");
    },
    repo: function (value) {
      return value.trim().replace(/[^A-Za-z0-9@:._/~+-]/g, "");
    },
    adminEmail: function (value) {
      var email = value.trim();
      return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email) ? email : "";
    },
    adminName: function (value) {
      return value.trim();
    },
  };

  var form = document.getElementById("values-form");
  var stored = load(VALUES_KEY);
  var raw = {};
  Object.keys(DEFAULTS).forEach(function (name) {
    raw[name] = typeof stored[name] === "string" ? stored[name] : DEFAULTS[name];
    var input = form.elements[name];
    if (input) input.value = raw[name];
  });

  /** The value to show for `name`, and whether it is still the placeholder. */
  function valueOf(name) {
    if (name === "url") {
      var domain = valueOf("domain");
      return { text: "https://" + domain.text, empty: domain.empty };
    }
    var clean = SANITISE[name] ? SANITISE[name](raw[name] || "") : "";
    return clean ? { text: clean, empty: false } : { text: PLACEHOLDERS[name] || "", empty: true };
  }

  function fillTemplate(template) {
    return template.replace(/\{\{(\w+)\}\}/g, function (match, name) {
      return valueOf(name).text;
    });
  }

  // ---- Code blocks: fill values and add copy buttons ----

  var codeBlocks = Array.prototype.slice.call(document.querySelectorAll("pre > code"));
  codeBlocks.forEach(function (code) {
    code.dataset.template = code.textContent;
    var pre = code.parentElement;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "copy";
    button.textContent = "Copy";
    button.addEventListener("click", function () {
      copyText(code.textContent).then(
        function () {
          flash(button, "Copied", true);
        },
        function () {
          flash(button, "Select and copy", false);
        },
      );
    });
    pre.classList.add("has-copy");
    pre.appendChild(button);
  });

  function renderCode(code) {
    var template = code.dataset.template;
    var parts = template.split(/(\{\{\w+\}\})/);
    var nodes = parts.map(function (part) {
      var match = /^\{\{(\w+)\}\}$/.exec(part);
      if (!match) return document.createTextNode(part);
      var span = document.createElement("span");
      span.className = "fill";
      span.textContent = valueOf(match[1]).text;
      return span;
    });
    code.replaceChildren.apply(code, nodes);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      document.body.removeChild(area);
      if (ok) resolve();
      else reject(new Error("copy failed"));
    });
  }

  function flash(button, label, ok) {
    button.textContent = label;
    button.classList.toggle("copied", ok);
    window.setTimeout(function () {
      button.textContent = "Copy";
      button.classList.remove("copied");
    }, 1600);
  }

  // ---- Render values everywhere ----

  function render() {
    codeBlocks.forEach(renderCode);
    document.querySelectorAll("[data-var]").forEach(function (element) {
      var value = valueOf(element.getAttribute("data-var"));
      element.textContent = value.text;
      element.classList.toggle("empty", value.empty);
    });
    document.querySelectorAll("a[data-href]").forEach(function (link) {
      link.href = fillTemplate(link.getAttribute("data-href"));
    });
  }

  form.addEventListener("input", function (event) {
    var input = event.target;
    if (!input.name) return;
    raw[input.name] = input.value;
    save(VALUES_KEY, raw);
    render();
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
  });

  // ---- Ticked steps and progress ----

  var tasks = load(TASKS_KEY);
  var boxes = Array.prototype.slice.call(document.querySelectorAll("input[data-task]"));

  boxes.forEach(function (box) {
    box.checked = tasks[box.dataset.task] === true;
    box.addEventListener("change", function () {
      if (box.checked) tasks[box.dataset.task] = true;
      else delete tasks[box.dataset.task];
      save(TASKS_KEY, tasks);
      updateProgress();
    });
  });

  function updateProgress() {
    var done = 0;
    boxes.forEach(function (box) {
      box.closest(".task").classList.toggle("done", box.checked);
      if (box.checked) done += 1;
    });
    document.getElementById("progress-fill").style.width = boxes.length ? (done / boxes.length) * 100 + "%" : "0";
    document.getElementById("progress-text").textContent = done + " of " + boxes.length + " steps done";

    document.querySelectorAll("section[data-section]").forEach(function (section) {
      var sectionBoxes = section.querySelectorAll("input[data-task]");
      var complete = Array.prototype.every.call(sectionBoxes, function (box) {
        return box.checked;
      });
      var link = document.querySelector('.toc a[href="#' + section.id + '"]');
      if (link) link.classList.toggle("complete", sectionBoxes.length > 0 && complete);
    });
  }

  document.getElementById("reset-progress").addEventListener("click", function () {
    if (!window.confirm("Clear every ticked step?")) return;
    tasks = {};
    save(TASKS_KEY, tasks);
    boxes.forEach(function (box) {
      box.checked = false;
    });
    updateProgress();
  });

  // ---- Contents: folded on narrow screens, where it sits above the guide ----

  var toc = document.querySelector(".toc details");
  if (toc && window.matchMedia("(max-width: 959px)").matches) toc.open = false;

  // ---- Highlight the section in view ----

  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a"));
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          tocLinks.forEach(function (link) {
            link.classList.toggle("active", link.getAttribute("href") === "#" + entry.target.id);
          });
        });
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    document.querySelectorAll("main section[id]").forEach(function (section) {
      observer.observe(section);
    });
  }

  render();
  updateProgress();
})();
