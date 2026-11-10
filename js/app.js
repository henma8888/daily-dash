(function () {
  // Public JSON on GitHub (NAS page can stay; also works on GitHub Pages)
  const DATA_BASE = "https://raw.githubusercontent.com/henma8888/daily-dash/main/data";
  const BOTS = {
    news: { file: "news", label: "新聞bot", page: "index.html" },
  };
  // Clinic sidebar embeds this page. 「開瀏覽器」 leaves that frame for the public site.
  const PAGES_URL = "https://henma8888.github.io/daily-dash/";

  const HEADINGS = {
    weather: "天氣",
    aqhi: "空氣質素",
    aqhi_kwun_tong: "觀塘空氣質素",
    flu: "流感",
    medical: "醫療",
    news: "新聞",
  };

  function pagesHref(date) {
    const u = new URL(PAGES_URL);
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) u.searchParams.set("date", date);
    return u.href;
  }

  function selectedDate() {
    const input = document.getElementById("date-picker");
    if (input && /^\d{4}-\d{2}-\d{2}$/.test(input.value)) return input.value;
    const q = qs("date");
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
    return todayHK();
  }

  function wireOpenBrowser(date) {
    const a = document.getElementById("open-browser");
    if (!a) return;
    const applyHref = () => {
      a.href = pagesHref(date || selectedDate());
    };
    applyHref();
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    if (a.dataset.wired === "1") return;
    a.dataset.wired = "1";
    a.addEventListener("click", (e) => {
      const url = pagesHref(selectedDate());
      a.href = url;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      let opened = null;
      try {
        opened = window.open(url, "_blank");
      } catch (err) {
        opened = null;
      }
      if (opened) {
        e.preventDefault();
        try { opened.opener = null; } catch (err) {}
      }
    });
  }

  function todayHK() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Hong_Kong",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  /** Move a YYYY-MM-DD calendar date by whole days. Independent of the browser zone. */
  function shiftDate(iso, days) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    if (!m || !Number.isFinite(days)) return null;
    const utc = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days));
    const y = utc.getUTCFullYear();
    const mo = String(utc.getUTCMonth() + 1).padStart(2, "0");
    const d = String(utc.getUTCDate()).padStart(2, "0");
    return y + "-" + mo + "-" + d;
  }

  function goToDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) return;
    const u = new URL(location.href);
    if (u.searchParams.get("date") === date) return;
    u.searchParams.set("date", date);
    location.assign(u.href);
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

  function stripMd(s) {
    return String(s == null ? "" : s)
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, "$1")
      .replace(/\*\*/g, "")
      .replace(/`/g, "");
  }

  function normalizeUnits(s) {
    return String(s)
      .replace(/\u00a0/g, " ")
      .replace(/℃/g, "°C")
      .replace(/％/g, "%");
  }

  function plain(s) {
    return normalizeUnits(stripMd(s)).replace(/\s+/g, " ").trim();
  }

  function parseTableRows(md) {
    const lines = String(md || "").replace(/\r\n/g, "\n").split("\n");
    const rows = [];
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].trim().startsWith("|")) continue;
      if (i + 1 >= lines.length || !/^\s*\|?\s*:?-/.test(lines[i + 1])) continue;
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i]
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
        if (cells.length >= 2) {
          rows.push({ label: cells[0], value: cells.slice(1).join(" | ") });
        }
        i++;
      }
      i--;
    }
    return rows;
  }

  function findSection(data, re) {
    return (data.sections || []).find((s) => re.test(String(s.heading || "")));
  }

  function shortNote(s, max) {
    const t = plain(s).split(/[；;。，,]/)[0].trim();
    if (!t) return "";
    return t.length > max ? t.slice(0, max - 1) + "…" : t;
  }

  function formatMeasure(raw) {
    if (raw == null || raw === "") return null;
    const text = String(raw).trim();
    if (/[–\-—~～]/.test(text)) return text.replace(/\s+/g, "");
    const n = Number(text);
    if (!Number.isFinite(n)) return text;
    return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
  }

  /** Observatory temperature: prefer 氣溫 / 天文台, skip 最高 and 最低. */
  function firstTemp(text) {
    const src = plain(text);
    const re = /(\d+(?:\.\d+)?)\s*°\s*C/gi;
    const hits = [];
    let m;
    while ((m = re.exec(src))) {
      const pre = src.slice(Math.max(0, m.index - 8), m.index);
      let score = 0;
      if (/氣溫/.test(pre)) score += 5;
      if (/天文台/.test(pre)) score += 3;
      if (/現時|實況/.test(pre)) score += 2;
      if (/觀塘/.test(pre) && !/氣溫|天文台/.test(pre)) score -= 2;
      if (/最高/.test(pre)) score -= 6;
      if (/最低/.test(pre)) score -= 6;
      if (/預測|展望/.test(pre)) score -= 3;
      hits.push({ n: m[1], score, idx: m.index });
    }
    if (!hits.length) return null;
    hits.sort((a, b) => b.score - a.score || a.idx - b.idx);
    return hits[0].n;
  }

  function firstHumidity(text) {
    const src = plain(text);
    const at = src.search(/濕度/);
    if (at < 0) return null;
    const scope = src.slice(at, at + 28);
    const range = scope.match(/(\d+(?:\.\d+)?)\s*[–\-—~～]\s*(\d+(?:\.\d+)?)\s*%/);
    if (range) return range[1] + "–" + range[2];
    const single = scope.match(/(\d+(?:\.\d+)?)\s*%/);
    return single ? single[1] : null;
  }

  function clampAqhi(raw) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1 || n > 12) return null;
    return n;
  }

  /** 觀塘 AQHI index. Ignores band ranges (1–3 / 4–6) and years. */
  function aqhiNumber(text) {
    let src = plain(text);
    src = src.replace(/\d+\s*[–\-—~～至]\s*\d+/g, " ");
    src = src.replace(/\b20\d{2}\b/g, " ");
    const plus = src.match(/(?:AQHI|觀塘)[^0-9]{0,30}(\d{1,2})\s*\+/i);
    if (plus) {
      const n = clampAqhi(plus[1]);
      if (n) return { n, plus: true };
    }
    const anchored = src.match(/(?:AQHI|觀塘)[^0-9]{0,30}(\d{1,2})/i);
    if (anchored) {
      const n = clampAqhi(anchored[1]);
      if (n) return { n, plus: false };
    }
    const lead = src.match(/^\s*(\d{1,2})\s*(\+)?/);
    if (lead) {
      const n = clampAqhi(lead[1]);
      if (n) return { n, plus: Boolean(lead[2]) };
    }
    return null;
  }

  function aqhiBand(n) {
    if (n == null || !Number.isFinite(n)) return { key: "unknown", label: "—" };
    if (n <= 3) return { key: "low", label: "低" };
    if (n <= 6) return { key: "mid", label: "中" };
    return { key: "high", label: "高" };
  }

  function optionalFields(data) {
    const f = data && data.fields && typeof data.fields === "object" ? data.fields : null;
    if (!f) return {};
    const out = {};
    const temp = f.temperature != null ? f.temperature : f.temp;
    const humidity = f.humidity != null ? f.humidity : f.rh;
    const aqhi = f.aqhi != null ? f.aqhi : f.aqhi_kwun_tong;
    if (temp != null && temp !== "") out.temp = formatMeasure(String(temp).replace(/°\s*C/gi, ""));
    if (humidity != null && humidity !== "") out.humidity = formatMeasure(String(humidity).replace(/%/g, ""));
    if (aqhi != null && aqhi !== "") {
      const text = String(aqhi);
      const plus = /\+/.test(text);
      const n = clampAqhi(text.replace(/[^\d.]/g, ""));
      if (n) out.aqhi = { n, plus };
    }
    return out;
  }

  function extractMetrics(data) {
    const empty = {
      temp: null,
      humidity: null,
      condition: "",
      aqhi: null,
      aqhiDetail: "",
      band: aqhiBand(null),
    };
    if (!data) return empty;

    const weather = findSection(data, /weather|天氣/i);
    const aqhiSec = findSection(data, /aqhi|空氣/i);
    const weatherRows = weather ? parseTableRows(weather.body) : [];
    const aqhiRows = aqhiSec ? parseTableRows(aqhiSec.body) : [];

    let temp = null;
    const tempRows = weatherRows
      .map((r, idx) => {
        const label = plain(r.label);
        const value = plain(r.value);
        const blob = label + " " + value;
        let score = 0;
        if (/氣溫/.test(label)) score += 6;
        else if (/氣溫/.test(value)) score += 4;
        if (/°\s*C/i.test(blob)) score += 1;
        if (/實況|現時/.test(blob)) score += 2;
        if (/預測|展望|風|來源|日期/.test(label) && !/氣溫/.test(label)) score -= 5;
        return { blob, score, idx };
      })
      .filter((r) => r.score > 0 && /°\s*C/i.test(r.blob))
      .sort((a, b) => b.score - a.score || a.idx - b.idx);
    if (tempRows.length) temp = firstTemp(tempRows[0].blob);
    if (!temp && weather) temp = firstTemp(weather.body);
    if (!temp && data.summary) temp = firstTemp(data.summary);

    let humidity = null;
    const humidRows = weatherRows.filter((r) => /濕度/.test(plain(r.label) + " " + plain(r.value)));
    const humidBlob = humidRows.map((r) => plain(r.label) + " " + plain(r.value)).join(" ");
    if (humidBlob) humidity = firstHumidity(humidBlob);
    if (!humidity && weather) humidity = firstHumidity(weather.body);
    if (!humidity && data.summary) humidity = firstHumidity(data.summary);

    const sky =
      weatherRows.find((r) => /^天氣/.test(plain(r.label))) ||
      weatherRows.find((r) => /今日天氣|今日預測|天氣概況|概況/.test(plain(r.label)));
    const condition = sky ? shortNote(sky.value, 42) : "";

    let aqhi = null;
    let aqhiDetail = "";
    const aqhiRanked = aqhiRows
      .map((r, idx) => {
        const label = plain(r.label);
        const value = plain(r.value);
        let score = 0;
        if (/觀塘/.test(label)) score += 5;
        if (/AQHI/i.test(label)) score += 3;
        if (/觀塘/.test(value)) score += 1;
        if (/分級|其他|預報|忠告|來源|預測/.test(label)) score -= 6;
        return { label, value, score, idx };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.idx - b.idx);
    if (aqhiRanked.length) {
      const row = aqhiRanked[0];
      aqhi = aqhiNumber(row.label + " " + row.value);
      const paren = row.value.match(/（([^）]+)）/);
      if (paren) aqhiDetail = shortNote(paren[1], 24);
    }
    if (!aqhi && aqhiSec) aqhi = aqhiNumber(aqhiSec.body);
    if (!aqhi && data.summary) aqhi = aqhiNumber(data.summary);

    const override = optionalFields(data);
    if (override.temp) temp = override.temp;
    if (override.humidity) humidity = override.humidity;
    if (override.aqhi) aqhi = override.aqhi;

    const band = aqhiBand(aqhi ? aqhi.n : null);
    return {
      temp: formatMeasure(temp),
      humidity: formatMeasure(humidity),
      condition,
      aqhi,
      aqhiDetail,
      band,
    };
  }

  function metricCard(opts) {
    const missing = opts.value == null || opts.value === "";
    const valueHtml = missing
      ? `<span class="metric-missing">—</span>`
      : `${escapeHtml(opts.value)}${opts.unit ? `<span class="metric-unit">${escapeHtml(opts.unit)}</span>` : ""}${
          opts.badge ? `<span class="metric-badge">${escapeHtml(opts.badge)}</span>` : ""
        }`;
    const compact = !missing && String(opts.value).length > 3 ? " compact" : "";
    return `
      <article class="metric ${opts.className || ""}"${opts.level ? ` data-level="${escapeHtml(opts.level)}"` : ""}>
        <h2 class="metric-label">${escapeHtml(opts.label)}</h2>
        <p class="metric-value${compact}" aria-label="${escapeHtml(opts.aria)}">${valueHtml}</p>
        <p class="metric-note">${opts.note ? escapeHtml(opts.note) : ""}</p>
      </article>`;
  }

  function renderMetrics(data) {
    const m = extractMetrics(data);
    const aqhiText = m.aqhi ? String(m.aqhi.n) + (m.aqhi.plus ? "+" : "") : null;
    const aqhiClass = m.aqhi ? "metric-aqhi aqhi-" + m.band.key : "metric-aqhi";
    const aqhiNote = m.aqhiDetail || (m.aqhi ? "觀塘" : "未有觀塘 AQHI");
    return `
      <section class="metrics" aria-label="天氣同空氣質素">
        ${metricCard({
          className: "metric-temp",
          label: "氣溫",
          value: m.temp,
          unit: m.temp ? "°C" : "",
          note: m.condition || (m.temp ? "天文台" : "未有氣溫"),
          aria: m.temp ? "氣溫 " + m.temp + " 度" : "未有氣溫",
        })}
        ${metricCard({
          className: "metric-humidity",
          label: "濕度",
          value: m.humidity,
          unit: m.humidity ? "%" : "",
          note: m.humidity ? "相對濕度" : "未有濕度",
          aria: m.humidity ? "相對濕度 " + m.humidity + " %" : "未有濕度",
        })}
        ${metricCard({
          className: aqhiClass,
          level: m.band.key,
          label: "觀塘 AQHI",
          value: aqhiText,
          badge: m.aqhi ? m.band.label : "",
          note: aqhiNote,
          aria: m.aqhi ? "觀塘空氣質素指數 " + aqhiText + "，" + m.band.label : "未有觀塘空氣質素指數",
        })}
      </section>`;
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
      cells.forEach((c) => {
        const marker = isChangeMarker(c) ? ' class="chg-cell"' : "";
        html += `<td${marker}>${inlineHtml(c)}</td>`;
      });
      html += "</tr>";
    });
    html += "</tbody></table>";
    return html;
  }

  /** A cell whose whole value is a day-over-day marker, not 「來源」 or 「（日常）」. */
  function isChangeMarker(raw) {
    const t = String(raw || "")
      .trim()
      .replace(/\*\*/g, "")
      .replace(/[【】]/g, "");
    return t === "新增" || t === "更新";
  }

  function changeBadge(kind) {
    const isNew = kind === "new";
    const label = isNew ? "新增" : "更新";
    return `<span class="dd-badge ${isNew ? "dd-badge-new" : "dd-badge-upd"}">${label}</span>`;
  }

  /** **新增** / **更新** and 【新增】 / 【更新】 only. Plain 「新增」 in a sentence stays text. */
  function applyChangeBadges(html) {
    return String(html)
      .replace(/<strong>\s*新增\s*<\/strong>/g, changeBadge("new"))
      .replace(/<strong>\s*更新\s*<\/strong>/g, changeBadge("upd"))
      .replace(/\*\*\s*新增\s*\*\*/g, changeBadge("new"))
      .replace(/\*\*\s*更新\s*\*\*/g, changeBadge("upd"))
      .replace(/【新增】/g, changeBadge("new"))
      .replace(/【更新】/g, changeBadge("upd"));
  }

  function inlineHtml(s) {
    let t = escapeHtml(s);
    t = t.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    t = applyChangeBadges(t);
    return t;
  }

  function headingLabel(heading) {
    const key = String(heading || "").trim();
    if (HEADINGS[key]) return HEADINGS[key];
    return key.replace(/_/g, " ");
  }

  const WEEKDAYS_ZH = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

  function weekdayFromIso(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    if (!m) return "";
    const utc = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    if (Number.isNaN(utc.getTime())) return "";
    return WEEKDAYS_ZH[utc.getUTCDay()];
  }

  function clipText(s, max) {
    const t = plain(s);
    if (!t || t.length <= max) return t;
    return t.slice(0, max - 1) + "…";
  }

  /** Parse a supplied temperature. Missing or non-numeric values stay empty. */
  function parseTempNumber(raw) {
    if (raw == null || raw === "") return null;
    if (typeof raw === "boolean") return null;
    if (typeof raw === "number") {
      if (!Number.isFinite(raw) || raw < -20 || raw > 50) return null;
      return Math.round(raw * 10) / 10;
    }
    const text = normalizeUnits(String(raw)).trim();
    if (!text || text === "—" || text === "-" || /^n\/?a$/i.test(text) || /未有|不適用/.test(text)) return null;
    const m = text.match(/-?\d+(?:\.\d+)?/);
    if (!m) return null;
    const n = Number(m[0]);
    if (!Number.isFinite(n) || n < -20 || n > 50) return null;
    return Math.round(n * 10) / 10;
  }

  function formatTemp(n) {
    if (n == null) return null;
    return Number.isInteger(n) ? String(n) : String(n);
  }

  function normalizeForecastDay(item) {
    if (!item || typeof item !== "object") return null;
    const date = /^\d{4}-\d{2}-\d{2}$/.exec(String(item.date || "")) ? String(item.date) : "";
    const rawLabel = plain(item.label || "");
    const label = rawLabel && !/^\d{4}-\d{2}-\d{2}$/.test(rawLabel)
      ? clipText(rawLabel, 8)
      : weekdayFromIso(date || rawLabel);
    const high = parseTempNumber(item.high);
    const low = parseTempNumber(item.low);
    const text = clipText(item.text || item.summary || "", 24);
    if (!label || (high == null && low == null && !text)) return null;
    return { date, label, high, low, text };
  }

  function forecastFromStructured(data) {
    const raw = data && data.forecast_3day;
    if (!Array.isArray(raw) || !raw.length) return [];
    return raw.map(normalizeForecastDay).filter(Boolean).slice(0, 3);
  }

  function splitTableLine(line) {
    return String(line)
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
  }

  /** Optional fallback: a sections item headed forecast_3day with a markdown table. */
  function forecastFromSection(data) {
    const sec = (data.sections || []).find((s) => /^forecast_3day$/i.test(String(s.heading || "").trim()));
    if (!sec || !sec.body) return [];
    const lines = String(sec.body).replace(/\r\n/g, "\n").split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].trim().startsWith("|")) continue;
      if (i + 1 >= lines.length || !/^\s*\|?\s*:?-/.test(lines[i + 1])) continue;
      const head = splitTableLine(lines[i]).map((h) => plain(h));
      const idx = (re) => head.findIndex((h) => re.test(h));
      const dayIdx = idx(/日子|日期|date|label|星期/i);
      const highIdx = idx(/最高|high/i);
      const lowIdx = idx(/最低|low/i);
      const textIdx = idx(/概況|天氣|text|說明|預測/i);
      if (highIdx < 0 && lowIdx < 0) continue;
      const days = [];
      for (let r = i + 2; r < lines.length && lines[r].trim().startsWith("|"); r++) {
        const cells = splitTableLine(lines[r]);
        const dayCell = dayIdx >= 0 ? plain(cells[dayIdx] || "") : "";
        const iso = /^\d{4}-\d{2}-\d{2}$/.test(dayCell) ? dayCell : "";
        days.push(
          normalizeForecastDay({
            date: iso,
            label: iso ? "" : dayCell,
            high: highIdx >= 0 ? cells[highIdx] : null,
            low: lowIdx >= 0 ? cells[lowIdx] : null,
            text: textIdx >= 0 ? cells[textIdx] : "",
          })
        );
      }
      return days.filter(Boolean).slice(0, 3);
    }
    return [];
  }

  function extractForecast(data) {
    if (!data || typeof data !== "object") return [];
    if (Array.isArray(data.forecast_3day)) return forecastFromStructured(data);
    return forecastFromSection(data);
  }

  function renderForecast(days) {
    if (!days || !days.length) return "";
    const cells = days
      .map((d) => {
        const high = d.high == null ? "—" : escapeHtml(formatTemp(d.high)) + "°";
        const low = d.low == null ? "—" : escapeHtml(formatTemp(d.low)) + "°";
        const highSpoken = d.high == null ? "未有" : formatTemp(d.high) + "度";
        const lowSpoken = d.low == null ? "未有" : formatTemp(d.low) + "度";
        const text = d.text
          ? `<p class="forecast-text">${escapeHtml(d.text)}</p>`
          : "";
        return `
      <article class="forecast-day">
        <h3 class="forecast-label">${escapeHtml(d.label)}</h3>
        <p class="forecast-temps" aria-label="${escapeHtml(d.label)} 最高 ${escapeHtml(highSpoken)}，最低 ${escapeHtml(lowSpoken)}"><span class="forecast-high">${high}</span><span class="forecast-sep">/</span><span class="forecast-low">${low}</span></p>
        ${text}
      </article>`;
      })
      .join("");
    return `<section class="forecast" aria-label="三日天氣預測">${cells}</section>`;
  }

  function renderReport(data, mount) {
    const el = document.getElementById(mount);
    if (!el) return;
    if (!data) {
      el.innerHTML = `<div class="empty">呢日未有資料。</div>`;
      return;
    }
    const forecast = extractForecast(data);
    const sections = (data.sections || [])
      .filter((s) => !(forecast.length && /^forecast_3day$/i.test(String(s.heading || "").trim())))
      .map(
        (s) => `
      <div class="section">
        <h3>${escapeHtml(headingLabel(s.heading || ""))}</h3>
        <div class="body">${renderBody(s.body || "")}</div>
      </div>`
      )
      .join("");
    const links = (data.links || [])
      .map((l) => {
        if (typeof l === "string") return `<a href="${escapeHtml(l)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l)}</a>`;
        return `<a href="${escapeHtml(l.url || "#")}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label || l.url || "連結")}</a>`;
      })
      .join("");
    el.innerHTML = `
      ${renderMetrics(data)}
      ${renderForecast(forecast)}
      <article class="panel">
        <h2>${escapeHtml(data.title || "")}</h2>
        <p class="meta">${escapeHtml(data.bot || "")} · ${escapeHtml(data.date || "")}</p>
        <p class="summary">${applyChangeBadges(escapeHtml(data.summary || ""))}</p>
        ${sections}
        ${links ? `<div class="links">${links}</div>` : ""}
      </article>`;
  }

  function wireDatePicker(date) {
    const input = document.getElementById("date-picker");
    if (input) {
      input.value = date;
      input.addEventListener("change", () => {
        if (input.value) goToDate(input.value);
      });
    }
    const prev = document.getElementById("date-prev");
    const next = document.getElementById("date-next");
    const todayBtn = document.getElementById("date-today");
    if (prev) prev.addEventListener("click", () => goToDate(shiftDate(date, -1)));
    if (next) next.addEventListener("click", () => goToDate(shiftDate(date, 1)));
    if (todayBtn) {
      const onToday = date === todayHK();
      todayBtn.classList.toggle("is-today", onToday);
      todayBtn.setAttribute("aria-current", onToday ? "date" : "false");
      todayBtn.addEventListener("click", () => goToDate(todayHK()));
    }
  }

  async function initPage(botKey) {
    if (!BOTS[botKey]) botKey = "news";
    const date = qs("date") || todayHK();
    wireOpenBrowser(date);
    wireDatePicker(date);
    setDateParam(date);
    const meta = document.getElementById("page-meta");
    if (meta) meta.textContent = `日期：${date}（香港時間）`;
    const report = document.getElementById("report");
    try {
      const data = await loadJson(botKey, date);
      renderReport(data, "report");
    } catch (e) {
      if (report) {
        report.innerHTML = `<div class="empty">未有 ${BOTS[botKey].label} ${escapeHtml(date)} 嘅檔案。<br><small>${escapeHtml(e.message)}</small></div>`;
      }
    }
  }

  function initHome() {
    return initPage("news");
  }

  window.DailyDash = {
    initPage,
    initHome,
    todayHK,
    shiftDate,
    extractMetrics,
    extractForecast,
    renderBody,
    aqhiBand,
  };
})();

(function () {
  var FONT_KEY = "dd-font";
  var THEME_KEY = "dd-theme";
  var FONT_MIN = 14;
  var FONT_MAX = 22;
  var FONT_DEFAULT = 17;
  var FONT_STEP = 1;

  function clampFont(n) {
    n = parseInt(n, 10);
    if (isNaN(n)) n = FONT_DEFAULT;
    return Math.max(FONT_MIN, Math.min(FONT_MAX, n));
  }

  function applyFont(size) {
    size = clampFont(size);
    document.documentElement.style.setProperty("--base-font", size + "px");
    try { localStorage.setItem(FONT_KEY, String(size)); } catch (e) {}
    var minus = document.getElementById("font-minus");
    var plus = document.getElementById("font-plus");
    if (minus) minus.disabled = size <= FONT_MIN;
    if (plus) plus.disabled = size >= FONT_MAX;
    return size;
  }

  function currentFont() {
    var raw = getComputedStyle(document.documentElement).getPropertyValue("--base-font");
    return clampFont(parseInt(raw, 10) || FONT_DEFAULT);
  }

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function applyTheme(theme) {
    theme = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f4f7fb" : "#0a1020");
    var btn = document.getElementById("theme-toggle");
    if (btn) {
      var toLight = theme !== "light";
      btn.textContent = toLight ? "淺色" : "深色";
      var action = toLight ? "轉做淺色" : "轉做深色";
      btn.title = action;
      btn.setAttribute("aria-label", action);
    }
    return theme;
  }

  function bindUi() {
    var themeBtn = document.getElementById("theme-toggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        applyTheme(currentTheme() === "light" ? "dark" : "light");
      });
    }
    var savedTheme = "dark";
    try {
      var stored = localStorage.getItem(THEME_KEY);
      if (stored === "light" || stored === "dark") savedTheme = stored;
    } catch (e) {}
    applyTheme(savedTheme);

    var refresh = document.getElementById("refresh-btn");
    if (refresh) {
      refresh.addEventListener("click", function () { location.reload(); });
    }
    var minus = document.getElementById("font-minus");
    var plus = document.getElementById("font-plus");
    if (minus) {
      minus.addEventListener("click", function () {
        applyFont(currentFont() - FONT_STEP);
      });
    }
    if (plus) {
      plus.addEventListener("click", function () {
        applyFont(currentFont() + FONT_STEP);
      });
    }
    var saved = FONT_DEFAULT;
    try { saved = localStorage.getItem(FONT_KEY); } catch (e) {}
    applyFont(saved != null ? saved : FONT_DEFAULT);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindUi);
  } else {
    bindUi();
  }
})();
