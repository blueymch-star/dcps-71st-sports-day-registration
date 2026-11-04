# 專案進度交接與狀態筆記 (Handoff)

**專案名稱**：第 71 屆大庄校慶運動會線上報名入口系統  
**記錄時間**：2026-11-05  
**目前狀態**：Google 試算表電話欄位保留開頭 0 機制全面生效、即時重複姓名審查、額滿防超額鎖定、雙向通知信件發送機制皆已就緒。

---

## 📌 今日完成事項

1. **Google Sheets 資料庫電話號碼保留開頭 0 機制**：
   - **寫入防除 0**：在 `GAS_Backend_Code.gs` 中引入 `formatPhoneForSheet()`，在電話欄位前加上試算表純文字前綴 `'`，並將該欄儲存格格式設定為 `@`（純文字），徹底防止 Google 試算表自動將 `09xxxxxxxx` 轉為純數字而吃掉開頭的 `0`。
   - **既有資料自動校正**：新增 `fixExistingPhones()` 函式，隨每次同步自動檢視並修復試算表中過去遺失開頭 0 的 9 碼電話號碼。
   - **讀取還原**：在 `getAllRegistrations()` 中加入 `cleanPhoneVal()`，向前端 API 回傳 JSON 時保證電話號碼具備完整的 `09xxxxxxxx` 格式。
   - **前端匯出與表單相容**：
     - 前台各表單（接力賽、親子賽、志工）送出時，若使用者誤輸入 9 碼（如 `912345678`），系統自動補齊開頭 `0`。
     - 後台管理系統 [`admin.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/admin.html) 表格呈現與 CSV 匯出均加入 Tab 字元保護，確保以 Excel 或任何試算表軟體開啟時，開頭的 `0` 均能完整顯示不被省略。

2. **Apps Script 部署升級**：
   - 透過 clasp 更新部署至版本 `@6`，維持相同 Web App URL。

---

## 🧭 目前專案檔案結構

- [`index.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/index.html)：大會首頁門戶 ＆ 數位通行證查詢 ＆ 後台入口（密碼：`183618`）
- [`admin.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/admin.html)：大會後台管理系統（名冊檢視、同步刪除、試算表直連、CSV 匯出、電話保留 0）
- [`relay.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/relay.html)：薪傳大隊接力報名專頁
- [`family-games.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/family-games.html)：圈力衝刺親子趣味賽報名專頁
- [`volunteers.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/volunteers.html)：校慶熱血志工招募專頁
- [`dynamic-island.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/dynamic-island.html)：71校慶動態島 (3D/互動島)
- [`GAS_Backend_Code.gs`](file:///c:/Users/User/Documents/2026%20校慶運動會/GAS_Backend_Code.gs)：Google 試算表 Web App 接收代碼
- [`appsscript.json`](file:///c:/Users/User/Documents/2026%20校慶運動會/appsscript.json)：Apps Script 部署設定檔
- [`.clasp.json`](file:///c:/Users/User/Documents/2026%20校慶運動會/.clasp.json)：clasp 專案連線設定
