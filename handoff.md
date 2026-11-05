# 專案進度交接與狀態筆記 (Handoff)

**專案名稱**：第 71 屆大庄校慶運動會線上報名入口系統  
**記錄時間**：2026-11-05 08:30  
**目前狀態**：全系統核心功能、後台管理、Google Sheets 雲端資料庫雙向串接、取消報名移轉封存與候補釋出、個資遮罩防護與電話號碼保全、**LINE 官方機器人（Messaging API）智慧推播與 LIFF 一鍵自動授權連動機制（方案 A）** 全面開發與部署完竣（GAS Version 8）。

---

## 📌 本次完成重點：LINE 官方機器人智慧推播與 LIFF 自動授權（方案 A）

1. **前端 LINE LIFF 模組建置 ([`line-liff.js`](file:///c:/Users/User/Documents/2026%20校慶運動會/line-liff.js))**：
   - 封裝 LINE LIFF SDK 初始化、自動識別是否處於 LINE App 環境或已授權登入。
   - 報名者透過手機相機或 LINE 掃描聯絡簿 QR Code 點開網頁時，自動取得 `lineUserId` 與 `lineDisplayName`。
   - 在表單上方提供自適應「LINE 連動狀態通知列」：
     - 若在 LINE 內開啟：顯示 `🟢 已連動 LINE：[暱稱]`，提示報名完成將由機器人發送收執單，錄取與賽前通知亦直達手機。
     - 若在一般瀏覽器開啟：友善顯示「一般瀏覽器報名模式」，不阻擋填寫。
   - 表單送出時，自動注入 `lineUserId` 與 `lineDisplayName` 至 Google 試算表。

2. **後端 Google Apps Script 擴充與版本升級（clasp Version 8）**：
   - 在 [`GAS_Backend_Code.gs`](file:///c:/Users/User/Documents/2026%20校慶運動會/GAS_Backend_Code.gs) 中新增 LINE Messaging API 核心推播函式 `sendLinePush()`。
   - **自動維護試算表表頭**：`ensureLineColumns()` 自動在「親子趣味競賽名冊」、「大隊接力報名名冊」、「校慶服務志工名冊」末端增設 `LINE_USER_ID`、`LINE暱稱`、`通知狀態` 三個欄位，完全相容舊有資料。
   - **三階段專屬 Flex Message 卡片產生器**：
     - **第 1 階段：報名完成數位收執單**（表單送出寫入試算表當下，GAS 立即推播收執卡片）。
     - **第 2 階段：正式錄取出賽通知書**（含檢錄時間、場地、提醒攜帶健保卡）。
     - **第 3 階段：賽前行前提醒與廣播**（自訂標題、公告內文、天候與穿著叮嚀）。
   - 提供安全儲存長期權杖之 `Script Properties` 機制（`setLineToken`）與管理員連線測試 API（`testLinePush`）。
   - 透過 clasp 部署更新至 **Version 8**，維持現有 Web App URL 不變。

3. **後台管理系統擴充 ([`admin.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/admin.html))**：
   - 新增 **【LINE 官方機器人推播廣播中心】** 控制面板，即時顯示 LINE 連動人數統計與 Messaging API 狀態。
   - 新增 **【發送錄取通知】** 彈窗：可選取特定項目或全體正選名單，一鍵發送精美錄取卡片，並即時回填試算表通知狀態。
   - 新增 **【發送賽前通知】** 彈窗：提供預設範本與自訂內文編輯器，賽前一鍵群發廣播給全體選手。
   - 新增 **【LINE 設定 / 測試連線】** 彈窗：可設定 Channel Access Token、LIFF ID，並可輸入 LINE User ID 即時發送測試訊息驗證連線。
   - 各組別報名名冊表格新增 **「LINE 狀態」** 欄位（顯示綠燈暱稱標籤或純網頁標籤）。

---

## 🧭 目前專案檔案結構

- [`index.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/index.html)：大會首頁門戶 ＆ 雙重核驗個資去識別化查詢 ＆ 後台入口（密碼：`183618`）
- [`admin.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/admin.html)：大會後台管理系統（名冊檢視、同步刪除、CSV 匯出、LINE 推播廣播中心、錄取/賽前發送）
- [`relay.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/relay.html)：薪傳大隊接力報名專頁（含 LIFF 連動與即時收執單）
- [`family-games.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/family-games.html)：圈力衝刺親子趣味賽報名專頁（含 LIFF 連動與即時收執單）
- [`volunteers.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/volunteers.html)：校慶熱血志工招募專頁（含 LIFF 連動與即時收執單）
- [`line-liff.js`](file:///c:/Users/User/Documents/2026%20校慶運動會/line-liff.js)：LINE LIFF 核心智慧連動前端模組
- [`GAS_Backend_Code.gs`](file:///c:/Users/User/Documents/2026%20校慶運動會/GAS_Backend_Code.gs)：Google Apps Script 後端代碼（LINE Messaging API 推播、試算表分流、Email 通知、部署至 Version 8）
- [`relay.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/relay.html)：薪傳大隊接力報名專頁（自動組別判定、重複審查、移轉至「已取消報名」工作表退選機制）
- [`family-games.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/family-games.html)：圈力衝刺親子趣味賽報名專頁（22組額滿鎖定、重複審查、移轉至「已取消報名」工作表退選機制）
- [`volunteers.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/volunteers.html)：校慶熱血志工招募專頁（20人額滿鎖定、校友優先審查、移轉至「已取消報名」工作表退選機制）
- [`dynamic-island.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/dynamic-island.html)：71校慶動態島 (3D/互動島)
- [`GAS_Backend_Code.gs`](file:///c:/Users/User/Documents/2026%20校慶運動會/GAS_Backend_Code.gs)：Google 試算表 Web App 接收代碼（已部署 Version 7，支援寫入、移轉至「已取消報名」、自動通知信）
- [`appsscript.json`](file:///c:/Users/User/Documents/2026%20校慶運動會/appsscript.json)：Apps Script 部署設定檔
- [`.clasp.json`](file:///c:/Users/User/Documents/2026%20校慶運動會/.clasp.json)：clasp 專案連線設定
- [`line-liff.js`](file:///c:/Users/User/Documents/2026%20校慶運動會/line-liff.js)：LINE LIFF 智慧連動模組（預留擴充）

---

## 💡 下一步建議

1. **實機掃碼測試**：
   - 以手機實際測試各頁面填表、Email 接收確認信、取消退選後移至「已取消報名」工作表與名額釋出等完整流程。
2. **靜態網站正式發布**：
   - 可透過 GitHub Pages 或 Netlify 進行公開網址部署，產出活動海報用 QR Code。
