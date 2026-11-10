# daily-dash

新聞bot 朝早 dashboard。GitHub Pages 讀 `data/news-YYYY-MM-DD.json`，首頁顯示大字氣溫、濕度、觀塘 AQHI，下面係流感同醫療摘要。

## 網頁

- GitHub Pages：`https://henma8888.github.io/daily-dash/`
- `news.html` 會轉去首頁（保留 `?date=`）
- 日期選擇、左右一日（香港日曆）、「今日」、F5 重新載入、A− / A+ 字體、「淺色／深色」、以及「開瀏覽器」都喺首頁
- 「淺色」同「深色」會記住喺呢部瀏覽器（`localStorage` 鍵 `dd-theme`）。預設係深色。
- 「開瀏覽器」用新分頁打開 `https://henma8888.github.io/daily-dash/`，並帶上而家揀咗嘅 `?date=`。喺 iframe 入面撳都會離開個框。

## 資料

`data/news-YYYY-MM-DD.json`

```json
{
  "date": "2026-11-05",
  "bot": "新聞bot",
  "title": "…",
  "summary": "…",
  "sections": [
    { "heading": "weather", "body": "| 項目 | 內容 |\n| --- | --- |\n| 氣溫 | 27°C |\n| 相對濕度 | 82% |" },
    { "heading": "aqhi_kwun_tong", "body": "| 項目 | 內容 |\n| --- | --- |\n| 觀塘 AQHI | **3**（低／好） |" }
  ],
  "links": [{ "label": "天文台", "url": "https://www.weather.gov.hk/" }]
}
```

首頁由 `weather` / `aqhi_kwun_tong` 小節入面嘅 markdown 表抽出三個數字，唔使改 schema。AQHI 色：1–3 綠（低）、4–6 黃（中）、7 或以上紅（高）。

可選 `fields` 會覆蓋解析結果（舊檔冇呢個欄都照顯示）：

```json
"fields": { "temperature": 27, "humidity": 82, "aqhi": 3 }
```

可選 `forecast_3day` 會喺三張大卡片下面多一行較細嘅三日預報（日子、最高／最低 °C、短句）。冇呢個欄、或者係空陣列，就完全唔顯示，亦唔會報錯。頁面唔會自己估溫度。

```json
"forecast_3day": [
  {"date": "2026-11-09", "label": "今日", "high": 26, "low": 19, "text": "天晴乾燥"},
  {"date": "2026-11-10", "label": "明日", "high": 24, "low": 16, "text": "清涼"},
  {"date": "2026-11-11", "label": "後日", "high": 25, "low": 18, "text": "氣溫回升"}
]
```

`label` 留空就用日期嘅星期。最多顯示 3 日。若未有頂層欄，而 `sections` 有 heading 為 `forecast_3day` 嘅 markdown 表（欄位例如日子／最高／最低／概況），會用嗰張表做後備。

小節正文同 `links` 入面嘅 http(s) 連結會開新分頁。

Raw 例子：
`https://raw.githubusercontent.com/henma8888/daily-dash/main/data/news-2026-11-05.json`

## Bot 上載

用 GitHub Contents API 更新 `data/news-YYYY-MM-DD.json`，或喺群組交 JSON（由助手代推）。
