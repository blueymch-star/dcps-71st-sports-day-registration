/**
 * 大庄國小 71 週年校慶運動會 - 大會即時推播與通告 (Google 試算表雲端同步模組)
 * 支援雙通道讀取：
 * 通道 1: Google 試算表 GViz 即時讀取 (只要試算表設為知道連結可檢視，打字即時生效，免更新 GAS 版本)
 * 通道 2: Google Apps Script Web App API
 * 容錯機制: 移除所有測試假資料，無資料時顯示乾淨的「目前尚無大會公告」
 */

(function () {
  const SPREADSHEET_ID = '1YEfrsFcoD2DMbzaYmAn8WQeiFs91XaxSG4I2lS7iv3U';
  const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbyGQ7p0Miioq7GMv_klUgy8kFaiNHoG9L0PvnHsnRzlOC3Eijwi5Ow5jsaT-3AEU0zh/exec';
  const STORAGE_KEY_GAS_URL = 'dachuang_71_gas_url';
  const STORAGE_KEY_CACHE = 'dachuang_71_announcements_cache';

  function getGasUrl() {
    return localStorage.getItem(STORAGE_KEY_GAS_URL) || DEFAULT_GAS_URL;
  }

  function getTagBadgeStyle(tag) {
    const text = String(tag || '');
    if (text.includes('緊急') || text.includes('截止') || text.includes('重要')) {
      return 'bg-rose-100 text-rose-800 border-rose-300';
    } else if (text.includes('志工') || text.includes('培訓')) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    } else if (text.includes('抽獎') || text.includes('好康') || text.includes('禮物')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    } else if (text.includes('賽事') || text.includes('賽程') || text.includes('接力') || text.includes('趣味')) {
      return 'bg-amber-100 text-amber-900 border-amber-300';
    }
    return 'bg-primary/10 text-primary border-primary/20';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  // 渲染公告卡片
  function renderAnnouncementsList(announcements, container) {
    if (!container) return;

    if (!announcements || announcements.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center text-on-surface-variant text-xs flex flex-col items-center gap-2">
          <span class="material-symbols-outlined text-4xl text-on-surface-variant/40">campaign</span>
          <p class="font-bold text-on-surface text-sm">目前尚無大會最新公告</p>
          <p class="text-[11px] text-on-surface-variant">若有賽程變更、檢錄廣播或緊急通知，將即時在此推播發布！</p>
        </div>
      `;
      return;
    }

    let html = announcements.map(item => {
      const badgeStyle = getTagBadgeStyle(item.tag);
      return `
        <div class="p-3.5 rounded-xl bg-surface-container-low border border-surface-container shadow-xs hover:border-primary/30 transition-all flex flex-col gap-1.5">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-md border ${badgeStyle}">
              ${escapeHtml(item.tag || '【大會公告】')}
            </span>
            <span class="text-[10px] text-on-surface-variant font-medium flex items-center gap-1">
              <span class="material-symbols-outlined text-[13px] opacity-70">schedule</span>
              ${escapeHtml(item.time || '即時')}
            </span>
          </div>
          <p class="text-xs text-on-surface font-medium leading-relaxed">
            ${escapeHtml(item.content)}
          </p>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  // 通道 1：從 Google 試算表 GViz 直接讀取（只要試算表設為「知道連結者可檢視」即可瞬間同步）
  async function fetchFromGViz() {
    try {
      const sheetName = encodeURIComponent('大會公告');
      const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheetName}&_t=${Date.now()}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const text = await res.text();
      // 解析 google gviz 的 json 格式
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) return null;
      const data = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
      
      const rows = data.table && data.table.rows ? data.table.rows : [];
      if (rows.length === 0) return [];

      const list = [];
      rows.forEach((r, idx) => {
        const c = r.c || [];
        const timeVal = c[0] ? (c[0].f || c[0].v || '') : '';
        const tagVal = c[1] ? (c[1].f || c[1].v || '') : '';
        const contentVal = c[2] ? (c[2].f || c[2].v || '') : '';
        const statusVal = c[3] ? (c[3].f || c[3].v || '顯示') : '顯示';

        // 排除標題列重複
        if (String(timeVal).includes('發布時間') || String(contentVal).includes('公告內容')) return;

        if (String(statusVal).trim() !== '隱藏' && (tagVal || contentVal)) {
          list.push({
            id: idx,
            time: String(timeVal).trim(),
            tag: String(tagVal).trim() || '【大會公告】',
            content: String(contentVal).trim(),
            status: String(statusVal).trim()
          });
        }
      });

      // 倒序排列（最新發布在最上面）
      return list.reverse();
    } catch (e) {
      console.warn('[Announcements] GViz 讀取失敗（可能試算表尚未開啟知道連結可檢視）:', e.message);
      return null;
    }
  }

  // 通道 2：從 Google Apps Script Web App 讀取
  async function fetchFromGAS() {
    const gasUrl = getGasUrl();
    if (!gasUrl) return null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const url = `${gasUrl}${gasUrl.includes('?') ? '&' : '?'}action=getAnnouncements&_t=${Date.now()}`;
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) return null;
      const json = await response.json();

      if (json && json.status === 'success' && Array.isArray(json.announcements)) {
        return json.announcements;
      }
    } catch (err) {
      console.warn('[Announcements] GAS 讀取失敗:', err.message);
    }
    return null;
  }

  // 雙通道整合查詢
  async function fetchAnnouncements() {
    // 優先嘗試 GViz（最即時、打字立即可見）
    let list = await fetchFromGViz();
    
    // 若 GViz 沒讀到，改試 GAS
    if (!list) {
      list = await fetchFromGAS();
    }

    if (Array.isArray(list)) {
      localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(list));
      return list;
    }

    // 嘗試讀快取
    try {
      const cached = localStorage.getItem(STORAGE_KEY_CACHE);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}

    // 完全無資料時回傳空陣列（徹底不再出現任何測試假訊息！）
    return [];
  }

  // 升級頁面上的 modal-notifications 結構
  function setupNotificationModal() {
    const modal = document.getElementById('modal-notifications');
    if (!modal) return;

    let container = document.getElementById('announcements-container');
    if (!container) {
      const modalBox = modal.querySelector('.bg-surface-container-lowest') || modal.firstElementChild;
      if (modalBox) {
        modalBox.innerHTML = `
          <div class="p-4 bg-gradient-to-r from-primary to-primary-container text-white flex items-center justify-between shadow-xs">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[22px]">notifications_active</span>
              <div>
                <h3 class="font-bold text-base leading-tight">大會即時推播與通告</h3>
                <p class="text-[10px] text-white/80 flex items-center gap-1 mt-0.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Google 試算表雲端連動中
                </p>
              </div>
            </div>
            <button onclick="toggleModal('modal-notifications')" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <!-- 即時狀態條 -->
          <div class="px-4 py-2 bg-surface-container flex items-center justify-between text-[11px] text-on-surface-variant border-b border-surface-container-high">
            <span id="announcements-status-text" class="flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px] text-primary">cloud_done</span>
              雲端公告已同步
            </span>
            <button type="button" id="btn-refresh-announcements" class="font-bold text-primary hover:text-primary-container flex items-center gap-1 active:scale-95 transition-all">
              <span class="material-symbols-outlined text-[14px]">refresh</span>
              即時重新整理
            </button>
          </div>

          <!-- 公告列表本體 -->
          <div class="p-4 space-y-2.5 max-h-[55vh] overflow-y-auto" id="announcements-container">
            <div class="p-6 text-center text-on-surface-variant text-xs flex flex-col items-center gap-2">
              <span class="material-symbols-outlined text-3xl animate-spin text-primary">sync</span>
              <p>正在同步試算表最新公告...</p>
            </div>
          </div>

          <!-- 底部控制按鈕 -->
          <div class="p-3 bg-surface-container border-t border-surface-container flex items-center justify-between gap-2">
            <span class="text-[10px] text-on-surface-variant opacity-80">
              ※ 由大會管理端即時發布
            </span>
            <button onclick="toggleModal('modal-notifications')" class="px-4 py-1.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary/90 active:scale-95 transition-all shadow-xs">
              我知道了
            </button>
          </div>
        `;
        container = document.getElementById('announcements-container');
      }
    }

    // 綁定手動刷新按鈕
    const refreshBtn = document.getElementById('btn-refresh-announcements');
    if (refreshBtn) {
      refreshBtn.onclick = async function () {
        refreshBtn.classList.add('opacity-50', 'pointer-events-none');
        const icon = refreshBtn.querySelector('.material-symbols-outlined');
        if (icon) icon.classList.add('animate-spin');

        const statusEl = document.getElementById('announcements-status-text');
        if (statusEl) statusEl.innerHTML = '<span class="material-symbols-outlined text-[14px] animate-spin">sync</span> 正在同步雲端...';

        const data = await fetchAnnouncements();
        renderAnnouncementsList(data, container);

        if (statusEl) {
          statusEl.innerHTML = '<span class="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span> 已更新至最新版';
        }
        if (icon) icon.classList.remove('animate-spin');
        refreshBtn.classList.remove('opacity-50', 'pointer-events-none');
      };
    }
  }

  // 初始載入
  async function initAnnouncements() {
    setupNotificationModal();
    const container = document.getElementById('announcements-container');

    // 讀取快取
    let cached = [];
    try {
      const c = localStorage.getItem(STORAGE_KEY_CACHE);
      if (c) cached = JSON.parse(c);
    } catch (e) {}

    // 先顯示快取（若無快取先不顯示假資料）
    if (cached.length > 0) {
      renderAnnouncementsList(cached, container);
    }

    // 背景請求最新公告
    const liveData = await fetchAnnouncements();
    renderAnnouncementsList(liveData, container);
  }

  // 自動在 DOM Ready 時啟動
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnnouncements);
  } else {
    initAnnouncements();
  }

  window.LiveAnnouncements = {
    refresh: fetchAnnouncements,
    init: initAnnouncements
  };
})();
