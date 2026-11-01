(function () {
  // Public JSON on GitHub (NAS page can stay; also works on GitHub Pages)
  const DATA_BASE = "https://raw.githubusercontent.com/henma8888/daily-dash/main/data";
  const BOTS = {
    news: { file: "news", label: "新聞bot", page: "news.html" },
    fin: { file: "fin", label: "FinBot", page: "fin.html" },
    theme: { file: "theme", label: "主題機械人", page: "theme.html" },
    book: { file: "books", label: "寫書", page: "book.html" },
  };

  function todayHK() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Hong_Kong",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  function qs(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function setDateParam(date) {
    const u = new URL(location.href);
    u.searchParams.set("date", date);
    history.replaceState(null, "", u);
  }

  async function loadJson(botKey, date) {
    const name = BOTS[botKey].file;
    const file = `${name}-${date}.json`;
    const urls = [`${DATA_BASE}/${file}`, `data/${file}`];
    let lastErr;
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`找不到 ${url}`);
        return await res.json();
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error(`找不到 ${file}`);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Lightweight markdown: tables, bold, links, line breaks */
  function renderBody(md) {
    if (!md) return "";
    const lines = String(md).replace(/\r\n/g, "\n").split("\n");
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (line.trim().startsWith("|") && i + 1 < lines.length && /^\s*\|?\s*:?-/.test(lines[i + 1])) {
        const rows = [];
        while (i < lines.length && lines[i].trim().startsWith("|")) {
          rows.push(lines[i]);
          i++;
        }
        out.push(tableHtml(rows));
        continue;
      }
      out.push(inlineHtml(line) + (i < lines.length - 1 ? "<br>" : ""));
      i++;
    }
    return out.join("\n");
  }

  function tableHtml(rows) {
    if (rows.length < 2) return escapeHtml(rows.join("\n"));
    const parse = (r) =>
      r
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());
    const head = parse(rows[0]);
    const bodyRows = rows.slice(2).map(parse);
    let html = "<table><thead><tr>";
    head.forEach((h) => (html += `<th>${inlineHtml(h)}</th>`));
    html += "</tr></thead><tbody>";
    bodyRows.forEach((cells) => {
      html += "<tr>";
      cells.forEach((c) => (html += `<td>${inlineHtml(c)}</td>`));
      html += "</tr>";
    });
    html += "</tbody></table>";
    return html;
  }

  function inlineHtml(s) {
    let t = escapeHtml(s);
    t = t.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    return t;
  }

  function renderReport(data, mount) {
    const el = document.getElementById(mount);
    if (!el) return;
    if (!data) {
      el.innerHTML = `<div class="empty">呢日未有資料。</div>`;
      return;
    }
    const sections = (data.sections || [])
      .map(
        (s) => `
      <div class="section">
        <h3>${escapeHtml(s.heading || "")}</h3>
        <div class="body">${renderBody(s.body || "")}</div>
      </div>`
      )
      .join("");
    const links = (data.links || [])
      .map((l) => {
        if (typeof l === "string") return `<a href="${escapeHtml(l)}" target="_blank" rel="noopener">${escapeHtml(l)}</a>`;
        return `<a href="${escapeHtml(l.url || "#")}" target="_blank" rel="noopener">${escapeHtml(l.label || l.url || "連結")}</a>`;
      })
      .join("");
    el.innerHTML = `
      <article class="panel">
        <h2>${escapeHtml(data.title || "")}</h2>
        <p class="meta">${escapeHtml(data.bot || "")} · ${escapeHtml(data.date || "")}</p>
        <p class="summary">${escapeHtml(data.summary || "")}</p>
        ${sections}
        ${links ? `<div class="links">${links}</div>` : ""}
      </article>`;
  }

  function wireDatePicker(date) {
    const input = document.getElementById("date-picker");
    if (!input) return;
    input.value = date;
    input.addEventListener("change", () => {
      const d = input.value;
      if (!d) return;
      setDateParam(d);
      location.reload();
    });
  }

  async function initPage(botKey) {
    const date = qs("date") || todayHK();
    wireDatePicker(date);
    setDateParam(date);
    const meta = document.getElementById("page-meta");
    if (meta) meta.textContent = `日期：${date}（香港時間）`;
    try {
      const data = await loadJson(botKey, date);
      renderReport(data, "report");
    } catch (e) {
      document.getElementById("report").innerHTML =
        `<div class="empty">未有 ${BOTS[botKey].label} ${date} 嘅檔案。<br><small>${escapeHtml(e.message)}</small></div>`;
    }
  }

  async function initHome() {
    const date = qs("date") || todayHK();
    wireDatePicker(date);
    setDateParam(date);
    const meta = document.getElementById("page-meta");
    if (meta) meta.textContent = `日期：${date}（香港時間）`;
    const mount = document.getElementById("home-cards");
    if (!mount) return;
    const cards = await Promise.all(
      Object.keys(BOTS).map(async (key) => {
        const b = BOTS[key];
        let summary = "未有今日資料";
        let title = b.label;
        try {
          const data = await loadJson(key, date);
          title = data.title || b.label;
          summary = data.summary || "已有更新";
        } catch (_) {}
        return `
          <div class="card">
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(summary)}</p>
            <a class="go" href="${b.page}?date=${encodeURIComponent(date)}">打開 ${escapeHtml(b.label)} →</a>
          </div>`;
      })
    );
    mount.innerHTML = cards.join("");
  }

  window.DailyDash = { initPage, initHome, todayHK };
})();
