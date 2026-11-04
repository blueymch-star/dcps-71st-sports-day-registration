# 專案進度交接與狀態筆記 (Handoff)

**專案名稱**：第 71 屆大庄校慶運動會線上報名入口系統  
**記錄時間**：2026-11-04  
**目前狀態**：大隊接力報名完成彈窗 5 點重要須知、自動 Email 雙向通知 (`stud03@ttps.hc.edu.tw`)、停止報名/截止提示方塊、姓名重複報名審查機制全面完成上線，GAS 後端與 clasp 已同步推送。

---

## 📌 最新完成事項

1. **大隊接力報名完成提示方塊 (`relay.html`)**：
   - 報名成功彈窗 (`#modal-success`) 完整呈現使用者指定的 5 點參賽重要須知：
     1. 報名經錄取後，比賽前1週在本報名網站公告錄取名單，請務必如期參加，如臨時缺席將造成活動無法順利進行，故請審慎考慮後再報名。
     2. 報名的校友及家長請在比賽前充分熱身，以利身體能在活動中舒展，避免運動傷害。
     3. 報名完畢後，將校慶前1週，將編排的組別及注意事項Email通知選手。
     4. 心臟功能不佳、氣喘或身體和不適者，請勿報名參加，請自負自身安全責任。
     5. 校慶當日請著運動鞋及方便運動衣褲。

2. **自動發送 Email 雙向通知機制 (`GAS_Backend_Code.gs`)**：
   - 報名成功後自動以 `MailApp.sendEmail` 發送確認信函給「報名者 (填寫之 Email)」及「管理者 (`stud03@ttps.hc.edu.tw`)」。
   - 信件內容完整包含選手報名資訊（編號、姓名、組別、性別、電話、錄取/候補狀態）與上述 5 點大會須知條款。

3. **停止報名/報名截止提示方塊 (`#modal-closed-notice`)**：
   - 當活動時間截止（11/27 中午 12:00）或額滿停止報名時，點擊按鈕或提交將自動跳出專屬顯示方塊：
     - **「報名截止」**
     - **「若有其它問題請洽活動承辦人員」**
     - 提供大庄國小學務處體育組電話：03-5384035 分機 607 與承辦信箱。

4. **重複報名審查機制 (姓名相同檢查阻擋)**：
   - 前端與後端皆設定重複報名檢驗，只要選手名字相同，立即跳出重複報名審查提示方塊 (`#modal-duplicate-notice`)，顯示「選手姓名重複報名」之字樣，並阻擋重複提交。

5. **Google Apps Script 後端推播 (`clasp push`)**：
   - 更新後的 `GAS_Backend_Code.gs` 已透過 `@google/clasp push` 同步推送到雲端專案。

---

## 🧭 目前專案檔案結構

- [`index.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/index.html)：大會首頁門戶 ＆ 數位通行證查詢 ＆ 後台入口（密碼：`183618`）
- [`admin.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/admin.html)：大會後台管理系統（名冊檢視、同步刪除、試算表直連、CSV 匯出）
- [`relay.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/relay.html)：薪傳大隊接力報名專頁（含重複審查、截止提示、5點須知、Email發送提示）
- [`family-games.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/family-games.html)：圈力衝刺親子趣味賽報名專頁
- [`volunteers.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/volunteers.html)：校慶熱血志工招募專頁
- [`dynamic-island.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/dynamic-island.html)：71校慶動態島 (3D/互動島)
- [`GAS_Backend_Code.gs`](file:///c:/Users/User/Documents/2026%20校慶運動會/GAS_Backend_Code.gs)：Google 試算表 Web App 接收代碼（支援寫入、刪除、清空、查詢、同名審查、雙向寄信）
- [`appsscript.json`](file:///c:/Users/User/Documents/2026%20校慶運動會/appsscript.json)：Apps Script 部署設定檔
- [`.clasp.json`](file:///c:/Users/User/Documents/2026%20校慶運動會/.clasp.json)：clasp 專案連線設定
- [`.claspignore`](file:///c:/Users/User/Documents/2026%20校慶運動會/.claspignore)：clasp 忽略規則

---

## 💡 實測與驗證步驟

1. 打開接力賽頁面 [relay.html](file:///c:/Users/User/Documents/2026%20校慶運動會/relay.html)：
   - 填寫姓名（例如「林志豪」）完成報名，確認彈窗包含 5 點完整字樣以及自動 Email 通知提示。
   - 再次以相同姓名「林志豪」送出報名，確認跳出「重複報名提示」方塊並阻擋送出。
   - 點擊頂部「11/27 (五) 中午 12:00 截止報名」標籤，確認立即彈出「報名截止 若有其它問題請洽活動承辦人員」顯示方塊。
