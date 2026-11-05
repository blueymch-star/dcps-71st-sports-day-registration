# 專案進度交接與狀態筆記 (Handoff)

**專案名稱**：第 71 屆大庄校慶運動會線上報名入口系統  
**記錄時間**：2026-11-05 08:17  
**目前狀態**：全系統核心功能、後台管理、Google Sheets 雲端資料庫雙向串接、取消報名移轉封存與候補釋出、個資遮罩防護與電話號碼保全、clasp 自動化部署均已驗證完成並正式上線（GAS Version 7）。

---

## 📌 本次完成重點

1. **取消報名自動移轉至【已取消報名】工作表（方案 A 增強版）**：
   - 選手或家長於報名表下方點擊 `[✓取消]` 並輸入手機號碼確認後，系統不直接刪除資料，而是自動移轉至 Google 試算表全新開設的「**已取消報名**」工作表。
   - 保留原報名時間、標記取消時間與原因（狀態：`已自主取消 (名額已釋出)`），且聯絡電話格式自動設為純文字 `@` 以保全開頭 `0`。
   - 原工作表（大隊接力／親子趣味／服務志工）中該列資料整行刪除，組別與席次名額**即時釋出**供後續選手報名或候補遞補。
   - 取消成功時，系統自動向體育組管理者信箱（`stud03@ttps.hc.edu.tw`）寄送備存通知信。

2. **Google Apps Script 雲端直接部署（clasp Version 7）**：
   - 使用官方 `clasp` 工具直接將最新後端代碼 [`GAS_Backend_Code.gs`](file:///c:/Users/User/Documents/2026%20校慶運動會/GAS_Backend_Code.gs) 推送至 Google Apps Script 雲端。
   - 重新部署現有 Web App（ID：`AKfycbzl7zf48nxLH2_BPzEL0T48NNR8EI0SO_ROErJ0cDszftJphDOJ1lG-OTfrsxERv-h57A`），版本更新至 **Version 7**，固定前端 URL，伺服器連線狀態為 `online`。

3. **首頁報名查詢：雙重身分核驗 ＋ 個資去識別化**：
   - 首頁報名查詢頁面改為「**真實姓名**」＋「**聯絡電話號碼**」雙重核驗機制，兩者皆符合才能查詢，徹底防止他人任意窺探他人資料。
   - 預設隱藏所有報名紀錄，僅顯示身分核驗安全指引。
   - 查詢結果全面實施去識別化遮罩（姓名：`陳○宏`、`王○`；電話：`0933-***-710`；隊伍與跑者名冊姓名同步遮罩），同時保留數位通關憑證 QR Code 供檢錄報到。

4. **去除各報名頁面最上方列的 GAS 資料庫設定按鈕**：
   - 乾淨移除 [`relay.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/relay.html)、[`family-games.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/family-games.html)、[`volunteers.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/volunteers.html) 最上方導覽列易引發使用者混淆的 GAS 設定齒輪／膠囊按鈕。
   - 頂部導覽列全面統一只保留「大會通知」與「報名查詢」捷徑。

5. **志工報名頁面（volunteers.html）全面淨化**：
   - 移除所有假測試資料與自動注入邏輯，輸入欄位預設皆為空白，報名人數校正為 `0 / 20 人 (0%)`。
   - 補齊重複報名審查機制（同名即時阻擋彈窗）及報名截止提示方塊。

---

## ⚠️ 踩坑經驗與注意事項 (Pitfalls)

1. **Google Sheets 純數字字串吃 0 問題**：
   - 寫入電話時使用 `@` 格式與單引號 `'` 前綴，確保無論在雲端試算表或本機 CSV 匯出時，開頭 `0` 均完整保存。
2. **clasp 重新部署更新**：
   - 執行 `npx @google/clasp create-deployment -i <deploymentId> -d "<說明>"`，可在維持既有 Web App 網址不變的情況下更新版本，避免前端重新設定 URL。
3. **取消報名雙向同步**：
   - 取消操作不僅要更新前端 LocalStorage 的剩餘名額，還必須以 `action: "cancel"` POST 通知 GAS 移轉試算表工作表，避免雲端與本地名額不一致。

---

## 🧭 目前專案檔案結構

- [`index.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/index.html)：大會首頁門戶 ＆ 雙重核驗個資去識別化查詢 ＆ 後台入口（密碼：`183618`）
- [`admin.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/admin.html)：大會後台管理系統（名冊檢視、同步刪除、試算表直連、CSV 匯出、電話保留 0）
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
