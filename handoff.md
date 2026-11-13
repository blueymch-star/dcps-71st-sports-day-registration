# 專案進度交接與狀態筆記 (Handoff)

**專案名稱**：第 71 屆大庄校慶運動會線上報名入口系統  
**記錄時間**：2026-11-06 13:08 (收工存檔)  
**目前狀態**：全系統核心功能、後台管理、Google Sheets 雲端資料庫雙向串接、取消報名移轉封存與候補釋出、個資遮罩防護與電話號碼保全、**GitHub 儲存庫建立與 GitHub Pages 上線**、**Vercel 正式生產環境上線（正式網址已配置完成）**、**手機端體驗全面最佳化**、**Google 試算表雲端即時推播與首頁跑馬燈動態連動上線**。

---

## 🌐 正式線上部署網址清單

| 平台 | 網址 | 備註 |
| :--- | :--- | :--- |
| **Vercel 正式站** | **`https://dcps-71st-sports-day-registration.vercel.app`** | 亞太極速 CDN，具備資安標頭防護，產製宣傳單 QR Code 首選！ |
| **GitHub Pages** | **`https://blueymch-star.github.io/dcps-71st-sports-day-registration/`** | GitHub 官方原生靜態託管備援站 |
| **GitHub 儲存庫** | **`https://github.com/blueymch-star/dcps-71st-sports-day-registration`** | 原始碼集中託管，推送代碼後 Vercel 會自動重新部署 |
| **GAS 雲端後端** | `https://script.google.com/macros/s/AKfycbyGQ7p0Miioq7GMv_klUgy8kFaiNHoG9L0PvnHsnRzlOC3Eijwi5Ow5jsaT-3AEU0zh/exec` | 支援試算表分流、取消移轉、LINE/Email 推播、大會即時公告 API |

---

## 📌 本次工作完成重點 (2026-11-08 ~ 2026-11-13)

1. **三大賽事核心方塊全面內嵌專屬高畫質宣傳片**：
   - **庄情薪傳大隊接力賽**：更新為最新版 `大庄國小_薪傳接力宣傳片_wu_1080p.mp4`（1080p・01:00・熱血衝刺最新版）。
   - **圈力衝刺親子趣味賽**：內嵌 `film_720p_phone.mp4`（720p・00:35・實境示範）。
   - **校慶熱血志工招募**：內嵌 `校慶志工招募_16_9橫式大螢幕版_1080p.mp4`（1080p・00:51・幕後紀實）。

2. **智慧「滑過自動靜音播放 5 秒」微互動機制**：
   - **電腦桌機端（Hover）**：滑鼠移入卡片區域，自動以靜音模式平滑播放前 5 秒精華；播完 5 秒後自動優雅暫停，移出重置。
   - **手機／平板端（Scroll 視窗偵測）**：原生 `IntersectionObserver` 監聽，卡片滑至視窗中央（45% 以上）自動靜音動態播放 5 秒吸引眼球。
   - **一鍵解鎖原聲**：右上角配有「⚡ 5秒靜音預覽」動態微標籤，右下角浮動「🔊 點擊開啟聲音」按鈕，點擊後解除靜音並享受完整宣傳片。

3. **生產環境正式同步與自動部署**：
   - 原始碼集中推送至 GitHub `blueymch-star/dcps-71st-sports-day-registration`。
   - Vercel 正式站 `https://dcps-71st-sports-day-registration.vercel.app` 自動重新構建與極速發布。

---

## 📌 前次工作完成重點 (2026-11-05 ~ 2026-11-06)

1. **手機端介面深度適配與排版修復**：
   - **親子趣味賽專頁 (`family-games.html`)**：
     - 活動時間與地點移除 `truncate` 截斷限制，單欄適配完整呈現。
     - 賽程移動示意圖橘色與藍色箭頭改為垂直分行獨立呈現。
     - 步驟 1~3 的藥丸標籤（去程 10 公尺、折返點、回程 10 公尺）獨立排版，防長標題擠壓。
     - 徹底修復頁面底部 HTML 閉合外露問題，建立正規承辦洽詢窗口卡片與底部留白（`pb-36 sm:pb-40`），不再被底部導覽列遮擋。
   - **薪傳大隊接力專頁 (`relay.html`)**：
     - 上方標題完整呈現「大庄國小 115 學年度暨 71 週年校慶運動會」全稱。
     - 下方 3 個半透明資訊方塊重構為結構化卡片（標籤 + 主數字 + 規格備註），徹底消除手機端「位)」、「圈)」突兀孤字斷行。
   - **熱血服務志工專頁 (`volunteers.html`)**：
     - 將「甄選錄取順序」移出水平擠壓區，規劃為全寬公告條，完整清晰呈現「1. 畢業校友優先 2. 表單報名順序」，字樣 100% 不截斷。
   - **71動態島 (`dynamic-island.html`)**：
     - 導覽列與首頁按鈕加入「目前尚未開放」溫馨提示彈窗。

2. **Google 試算表雲端即時推播與通告系統 (`announcements.js`)**：
   - 全面啟用試算表直連推播功能，大會人員在 Google 試算表「大會公告」分頁打字即可全網同步。
   - 支援雙通道讀取技術（GViz 即時直連 + GAS API 容錯代理），打字秒級生效。
   - 徹底清除所有原本寫死的測試假資料，無資料時乾淨呈現「目前尚無大會最新公告」。
   - 智慧標籤色彩（緊急通知-紅標、賽程快訊-橘標、志工培訓-藍標、好康抽獎-綠標）。

3. **首頁跑馬燈（Marquee Ticker）與公告中心深度整合**：
   - 跑馬燈點擊直接彈出「大會即時推播與通告」中心，附「查看 ➔」指引。
   - 跑馬燈文字自動動態載入 Google 試算表最新發布的大會公告，實現即時廣播。

4. **學生聯絡簿通知單文案產出**：
   - 撰寫完成精簡版與含回條版兩款適合印製貼在學生聯絡簿上的家長 QR Code 報名通知單。

---

## 🧭 目前專案檔案結構

- [`index.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/index.html)：大會首頁門戶 ＆ 雙重核驗個資去識別化查詢 ＆ 動態跑馬燈 ＆ 後台入口
- [`admin.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/admin.html)：大會後台管理系統（名冊檢視、同步刪除、CSV 匯出、密碼修改、LINE 廣播中心）
- [`relay.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/relay.html)：薪傳大隊接力報名專頁
- [`family-games.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/family-games.html)：圈力衝刺親子趣味賽報名專頁
- [`volunteers.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/volunteers.html)：校慶熱血志工招募專頁
- [`dynamic-island.html`](file:///c:/Users/User/Documents/2026%20校慶運動會/dynamic-island.html)：71校慶動態島
- [`announcements.js`](file:///c:/Users/User/Documents/2026%20校慶運動會/announcements.js)：Google 試算表雲端即時推播與跑馬燈連動核心模組
- [`line-liff.js`](file:///c:/Users/User/Documents/2026%20校慶運動會/line-liff.js)：LINE LIFF 智慧連動前端模組
- [`GAS_Backend_Code.gs`](file:///c:/Users/User/Documents/2026%20校慶運動會/GAS_Backend_Code.gs)：Google Apps Script 後端代碼（含大會公告工作表自動初始化與讀寫 API）
- [`vercel.json`](file:///c:/Users/User/Documents/2026%20校慶運動會/vercel.json)：Vercel 部署設定檔（資安標頭、乾淨路徑）

---

## 🔒 資安與隱私檢查

- [x] 無任何明文密碼或硬編碼金鑰提交至 Git 倉庫。
- [x] `.clasp.json` 與本地憑證受 `.gitignore` 保護。
- [x] 前端查詢全面實施「姓名全遮罩（例：王*明）＋電話遮罩（例：0912-***-456）」雙重個資保護。
- [x] 工作區狀態乾淨，所有程式碼均已同步至 GitHub 與 Vercel 生產環境。

---

## 💡 下一步備忘

1. **試算表共用檢視權限確認**：
   - 若尚未開啟，可將試算表一般存取權設為「知道連結的任何人均可檢視」，以獲得秒級即時公告同步體驗。
2. **宣傳單 / 聯絡簿印製發放**：
   - 採用正式網址 `https://dcps-71st-sports-day-registration.vercel.app` 產製 QR Code 印製發放。
