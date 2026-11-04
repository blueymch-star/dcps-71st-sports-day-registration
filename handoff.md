# 專案進度交接與狀態筆記 (Handoff)

**專案名稱**：第 71 屆大庄校慶運動會線上報名入口系統  
**記錄時間**：2026-11-04  
**目前狀態**：核心頁面獨立重構完成、多餘冗餘代碼全數清理完畢、已本地 Git 版控存檔。

---

## 📌 今日完成事項

1. **大會首頁 (`index.html`)**：
   - 頂部倒數標籤與首頁倒數計時器精確同步（設定為 2026.12.12 (六) 08:00 準時登場）。
   - 「為七一校慶點燃熱情」集氣計數歸零，從 0 開始累計。
   - 移除舊版大會便民指南區塊與便民指南彈窗 (`modal-guide`)。
   - 徹底移除舊版單頁式視圖 (`view-relay`, `view-family-games`, `view-volunteers`, `view-dynamic-island`) 與未使用的舊提交函數（共精簡 880 行）。
   - 保留首頁門戶展示、推播通告與選手/志工數位通行證查詢功能（支援 `#registration-inquiry` 錨點自動載入）。

2. **薪傳大隊接力 (`relay.html`)**：
   - 參賽組別點選卡片即自動選定（師長組 8+2、家長組 8+2、校友組 24+6），表單內顯示當前選定提示標籤並以 hidden 傳遞組別。
   - 移除手機端遮擋視線之底部重複浮動島 (`sticky bottom-20`) 與無用 `scrollToForm()`。
   - 底部導覽列補齊「大會首頁」分頁（統一為 5 標籤導覽列），移除冗餘 `data-path`。
   - 重構報名人數統計邏輯 (`updateRelayCount()`)，動態過濾大隊接力項目，取代原本寫死的 magic number。

3. **圈力衝刺親子賽 (`family-games.html`)**：
   - 參賽地點更新為「本校操場中央草皮區」。
   - 去除四大陣營卡片，版面精簡聚焦於競賽規程與動線圖解。
   - 報名欄位完全參照 BeClass 系統設計：家長姓名、電郵信箱、聯絡電話、學生姓名、學生年級（一年級～六年級單選）、學生班級（甲班～戊班下拉選單）。
   - 名額即時動態控管：正選 20 組 + 候補 2 組（共 22 組），額滿自動鎖定，支援名額退訂遞補與動態進度條。
   - 清理多餘底部浮動條，補齊底部導覽列「大會首頁」分頁。

4. **熱血志工招募 (`volunteers.html`)**：
   - 招募名額精確設定為限定 20 人，預設報名 14 人、剩餘 6 名，並支援 GAS 雲端試算表連線同步。

5. **71動態島 (`dynamic-island.html`)**：
   - 包含大庄 71 週年浮空全景、五力飛揚（品格、健康、智慧、合作、創新）試煉探索、即時廣播。

6. **後端 Google Apps Script (`GAS_Backend_Code.gs`)**：
   - 提供接力賽、親子趣味賽、志工名冊三合一 Web App 後端接收與資料庫存取腳本。

---

## 🧭 目前專案檔案結構

- [`index.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/index.html)：大會首頁門戶 ＆ 數位通行證查詢
- [`relay.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/relay.html)：薪傳大隊接力報名專頁
- [`family-games.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/family-games.html)：圈力衝刺親子趣味賽報名專頁
- [`volunteers.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/volunteers.html)：校慶熱血志工招募專頁
- [`dynamic-island.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/dynamic-island.html)：71校慶動態島 (3D/互動島)
- [`GAS_Backend_Code.gs`](file:///c:/Users/User/Documents/2026%20校慶運動會/GAS_Backend_Code.gs)：Google 試算表 Web App 接收代碼
- [`README.md`](file:///c:/Users/User/Documents/2026%20校慶運動會/README.md)：專案說明文件
- [`handoff.md`](file:///c:/Users/User/Documents/2026%20校慶運動會/handoff.md)：交接與狀態筆記

---

## 💡 下一步建議（若要繼續推進）

1. **部署 Google Apps Script Web App**：
   - 將 `GAS_Backend_Code.gs` 貼入 Google 雲端試算表的 Apps Script 編輯器，部署為「網頁應用程式」，並在各頁面右上角的資料庫圖示中貼入正式 Web App URL。
2. **遠端託管與上線**：
   - 可將本專案推送到 GitHub（如使用 `gh repo create`），並開啟 GitHub Pages 或部屬至 Netlify，即可提供學校親師生與校友直接手機掃碼報名。
