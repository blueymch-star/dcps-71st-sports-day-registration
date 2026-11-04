# 專案進度交接與狀態筆記 (Handoff)

**專案名稱**：第 71 屆大庄校慶運動會線上報名入口系統  
**記錄時間**：2026-11-05  
**目前狀態**：大隊接力與親子趣味競賽之「報名完成重要須知彈窗」、「自動雙向 Email 通知 (`stud03@ttps.hc.edu.tw`)」、「停止報名/截止提示方塊」、「姓名重複報名審查機制」皆全面完成上線，GAS 後端與 clasp 已同步推送。

---

## 📌 最新完成事項

1. **大隊接力賽事機制 (`relay.html`)**：
   - **報名完成彈窗重要須知**（1~5點完整字樣）：
     1. 報名經錄取後，比賽前1週在本報名網站公告錄取名單，請務必如期參加，如臨時缺席將造成活動無法順利進行，故請審慎考慮後再報名。
     2. 報名的校友及家長請在比賽前充分熱身，以利身體能在活動中舒展，避免運動傷害。
     3. 報名完畢後，將校慶前1週，將編排的組別及注意事項Email通知選手。
     4. 心臟功能不佳、氣喘或身體和不適者，請勿報名參加，請自負自身安全責任。
     5. 校慶當日請著運動鞋及方便運動衣褲。
   - **自動 Email 雙向通知**：報名者 + 管理者 (`stud03@ttps.hc.edu.tw`)。
   - **停止報名顯示方塊**：跳出「報名截止 若有其它問題請洽活動承辦人員」（電話：03-5384035 分機 607）。
   - **重複報名審查機制**：選手名字相同阻擋報名並跳出提示方塊。

2. **圈力衝刺親子趣味競賽機制 (`family-games.html`)**：
   - **報名完成彈窗重要須知**（1~3點完整字樣）：
     1. 報名經錄取後，比賽前會發下分組通知，請務必如期參加。
     2. 報名的親子請在比賽前充分熱身，以利身體能在活動中舒展，避免運動傷害。
     3. 報名完畢後，將校慶前1 週，將編排的組別及注意事項通知貴家長。
   - **自動 Email 雙向通知**：報名者家長 + 管理者 (`stud03@ttps.hc.edu.tw`)。
   - **停止報名顯示方塊**：正選 20 組 + 候補 2 組額滿或時間截止，跳出「報名截止 若有其它問題請洽活動承辦人員」（電話：03-5384035 分機 607）。
   - **重複報名審查機制**：學生姓名或家長姓名相同時阻擋報名並跳出提示方塊。

3. **Google Apps Script 後端推播 (`clasp push`)**：
   - 接力賽與親子賽之分流寫入、重複比對審查、停止報名檢查與雙向 Email 自動發送信函已全數同步更新至 Apps Script 雲端專案。

---

## 🧭 目前專案檔案結構

- [`index.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/index.html)：大會首頁門戶 ＆ 數位通行證查詢 ＆ 後台入口（密碼：`183618`）
- [`admin.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/admin.html)：大會後台管理系統（名冊檢視、同步刪除、試算表直連、CSV 匯出）
- [`relay.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/relay.html)：薪傳大隊接力報名專頁（含重複審查、截止提示、5點須知、Email發送提示）
- [`family-games.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/family-games.html)：圈力衝刺親子趣味賽報名專頁（含重複審查、截止提示、3點須知、Email發送提示）
- [`volunteers.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/volunteers.html)：校慶熱血志工招募專頁
- [`dynamic-island.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/dynamic-island.html)：71校慶動態島 (3D/互動島)
- [`GAS_Backend_Code.gs`](file:///c:/Users/User/Documents/2026%20校慶運動會/GAS_Backend_Code.gs)：Google 試算表 Web App 接收代碼（支援寫入、刪除、清空、查詢、同名審查、雙向寄信）
- [`appsscript.json`](file:///c:/Users/User/Documents/2026%20校慶運動會/appsscript.json)：Apps Script 部署設定檔
- [`.clasp.json`](file:///c:/Users/User/Documents/2026%20校慶運動會/.clasp.json)：clasp 專案連線設定
- [`.claspignore`](file:///c:/Users/User/Documents/2026%20校慶運動會/.claspignore)：clasp 忽略規則

---

## 💡 實測與驗證步驟

1. 打開親子趣味賽頁面 [family-games.html](file:///c:/Users/User/Documents/2026%20校慶運動會/family-games.html)：
   - 點擊「一鍵示範填寫」完成報名，確認彈窗包含 3 點完整字樣以及自動 Email 通知提示。
   - 再次以相同姓名送出報名，確認跳出「重複報名提示」方塊並阻擋送出。
   - 點擊頂部「11/27 (五) 中午 12:00 止」標籤，確認立即彈出「報名截止 若有其它問題請洽活動承辦人員」顯示方塊。
