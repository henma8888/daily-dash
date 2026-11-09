# daily-dash

新聞bot 朝早 dashboard。GitHub Pages 讀 `data/news-YYYY-MM-DD.json`，首頁顯示大字氣溫、濕度、觀塘 AQHI，下面係流感同醫療摘要。

## 網頁

- GitHub Pages：`https://henma8888.github.io/daily-dash/`
- `news.html` 會轉去首頁（保留 `?date=`）
- 日期選擇、左右一日（香港日曆）、「今日」、F5 重新載入、A− / A+ 字體、以及「開 bot」（新聞bot）都喺首頁

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

小節正文同 `links` 入面嘅 http(s) 連結會開新分頁。

Raw 例子：
`https://raw.githubusercontent.com/henma8888/daily-dash/main/data/news-2026-11-05.json`

## Bot 上載

用 GitHub Contents API 更新 `data/news-YYYY-MM-DD.json`，或喺群組交 JSON（由助手代推）。
