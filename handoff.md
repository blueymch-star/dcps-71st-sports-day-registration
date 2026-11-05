# 專案進度交接與狀態筆記 (Handoff)

**專案名稱**：第 71 屆大庄校慶運動會線上報名入口系統  
**記錄時間**：2026-11-05 10:40  
**目前狀態**：全系統核心功能、後台管理、Google Sheets 雲端資料庫雙向串接、取消報名移轉封存與候補釋出、個資遮罩防護與電話號碼保全、**GitHub 儲存庫建立與 GitHub Pages 上線**、**Vercel 正式生產環境上線（正式網址已配置完成）**。

---

## 🌐 正式線上部署網址清單

| 平台 | 網址 | 備註 |
| :--- | :--- | :--- |
| **Vercel 正式站** | **`https://dcps-71st-sports-day-registration.vercel.app`** | 亞太極速 CDN，具備資安標頭防護，產製宣傳單 QR Code 首選！ |
| **GitHub Pages** | **`https://blueymch-star.github.io/dcps-71st-sports-day-registration/`** | GitHub 官方原生靜態託管備援站 |
| **GitHub 儲存庫** | **`https://github.com/blueymch-star/dcps-71st-sports-day-registration`** | 原始碼集中託管，推送代碼後 Vercel 會自動重新部署 |
| **GAS 雲端後端** | `https://script.google.com/macros/s/AKfycbyGQ7p0Miioq7GMv_klUgy8kFaiNHoG9L0PvnHsnRzlOC3Eijwi5Ow5jsaT-3AEU0zh/exec` | Version 9（支援試算表分流、取消移轉、LINE/Email 推播） |

---

## 📌 本次完成重點

1. **部署至 GitHub (GitHub CLI)**：
   - 建立公開儲存庫 `blueymch-star/dcps-71st-sports-day-registration`。
   - 將本地所有 Commit 推送至 `main` 分支。
   - 透過 GitHub API 自動啟用 **GitHub Pages** 服務（Branch: `main`, Path: `/`）。

2. **發布至 Vercel (Vercel MCP)**：
   - 專案名稱正式命名為 **`dcps-71st-sports-day-registration`**。
   - 成功連結 GitHub 儲存庫 `blueymch-star/dcps-71st-sports-day-registration`，建置狀態：`READY`。
   - 自動指派並驗證正式生產別名：**`https://dcps-71st-sports-day-registration.vercel.app`**（HTTP 200 OK）。

3. **資安防護與隱私強化完竣**：
   - 移除前端硬編碼之管理員明文密碼，全面實施 SHA-256 單向雜湊防護，並支援本地端自訂修改密碼。
   - `.clasp.json` 與敏感憑證已從 Git 追蹤中剔除，絕不外流。
   - 配置 [vercel.json](file:///c:/Users/User/Documents/2026%20校慶運動會/vercel.json) 資安標頭，全面防範跨站攻擊與點擊劫持。

---

## 🧭 目前專案檔案結構

- [`index.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/index.html)：大會首頁門戶 ＆ 雙重核驗個資去識別化查詢 ＆ 後台入口（密碼：`183618`）
- [`admin.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/admin.html)：大會後台管理系統（名冊檢視、同步刪除、CSV 匯出、密碼修改、LINE 廣播中心）
- [`relay.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/relay.html)：薪傳大隊接力報名專頁（自動組別判定、重複審查、移轉至「已取消報名」工作表退選機制）
- [`family-games.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/family-games.html)：圈力衝刺親子趣味賽報名專頁（22組額滿鎖定、重複審查、移轉至「已取消報名」工作表退選機制）
- [`volunteers.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/volunteers.html)：校慶熱血志工招募專頁（20人額滿鎖定、校友優先審查、移轉至「已取消報名」工作表退選機制）
- [`dynamic-island.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/dynamic-island.html)：71校慶動態島 (3D/互動島)
- [`line-liff.js`](file:///c:/Users/User/Documents/2026%20校慶運動會/line-liff.js)：LINE LIFF 核心智慧連動前端模組
- [`GAS_Backend_Code.gs`](file:///c:/Users/User/Documents/2026%20校慶運動會/GAS_Backend_Code.gs)：Google Apps Script 後端代碼（LINE Messaging API 推播、試算表分流、Email 通知、部署至 Version 9）
- [`vercel.json`](file:///c:/Users/User/Documents/2026%20校慶運動會/vercel.json)：Vercel 部署設定檔（資安標頭、乾淨路徑）
- [`appsscript.json`](file:///c:/Users/User/Documents/2026%20校慶運動會/appsscript.json)：Apps Script 部署設定檔
- [`.clasp.json`](file:///c:/Users/User/Documents/2026%20校慶運動會/.clasp.json)：clasp 專案連線設定（本機保留，已受 `.gitignore` 保護）

---

## 💡 下一步建議

1. **宣傳單 / 聯絡簿 QR Code 產製**：
   - 建議使用正式網址 **`https://dcps-71st-sports-day-registration.vercel.app`** 產製 QR Code，印製於全校學生聯絡簿通知單與活動海報。
2. **實機掃碼演練**：
   - 以手機實際測試各頁面填表、Email 接收確認信、取消退選後移至「已取消報名」工作表與名額釋出等完整流程。
