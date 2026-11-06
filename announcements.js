/**
 * 大庄國小 71 週年校慶運動會 - 大會即時推播與通告 (Google 試算表雲端同步模組)
 * 支援：
 * 1. 自動從 Google 試算表「大會公告」工作表同步最新通告
 * 2. 斷網/尚未設定試算表時自動平滑降級（Fallback 預設公告）
 * 3. 標籤色彩智慧適配（緊急通知、賽程快訊、志工培訓、好康抽獎等）
 * 4. 一鍵即時重新整理與小鈴鐺未讀紅點智慧提示
 */

(function () {
  const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbyGQ7p0Miioq7GMv_klUgy8kFaiNHoG9L0PvnHsnRzlOC3Eijwi5Ow5jsaT-3AEU0zh/exec';
  const STORAGE_KEY_GAS_URL = 'dachuang_71_gas_url';
  const STORAGE_KEY_LAST_READ = 'dachuang_71_announcement_last_read';
  const STORAGE_KEY_CACHE = 'dachuang_71_announcements_cache';

  // 內建預設備援公告（當完全離線或首次載入時顯示）
  const FALLBACK_ANNOUNCEMENTS = [
    {
      time: '大會置頂',
      tag: '【緊急通知】',
      content: '薪傳大隊接力與親子趣味競賽報名將於 11/27 (五) 中午 12:00 截止，額滿將自動轉為候補名冊！',
      status: '顯示'
    },
    {
      time: '賽事快報',
      tag: '【地點提醒】',
      content: '「圈力衝刺」親子趣味賽於操場中央草皮區舉行；「庄情薪傳」大隊接力賽於大操場跑道進行。',
      status: '顯示'
    },
    {
      time: '志工招募',
      tag: '【好康抽獎】',
      content: '線上應援牆累計元氣達標，校慶當日將於大會服務台抽出 100 份校慶 71 週年紀念保溫杯！',
      status: '顯示'
    }
  ];

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
    } else if (text.includes('賽事') || text.includes('賽程') || text.includes('接力')) {
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

  // 取得或渲染公告卡片
  function renderAnnouncementsList(announcements, container, isLive) {
    if (!container) return;

    if (!announcements || announcements.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center text-on-surface-variant text-xs flex flex-col items-center gap-2">
          <span class="material-symbols-outlined text-4xl text-on-surface-variant/40">notifications_off</span>
          <p>目前尚無最新大會公告</p>
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

  // 載入雲端試算表公告
  async function fetchAnnouncements() {
    const gasUrl = getGasUrl();
    if (!gasUrl) return null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6秒超時防護

      const url = `${gasUrl}${gasUrl.includes('?') ? '&' : '?'}action=getAnnouncements&_t=${Date.now()}`;
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('HTTP ' + response.status);
      const json = await response.json();

      if (json && json.status === 'success' && Array.isArray(json.announcements) && json.announcements.length > 0) {
        localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(json.announcements));
        return json.announcements;
      }
    } catch (err) {
      console.warn('[Announcements] 無法從 GAS 讀取，降級使用本地快取/預設公告:', err.message);
    }

    // 嘗試從快取讀取
    try {
      const cached = localStorage.getItem(STORAGE_KEY_CACHE);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}

    return FALLBACK_ANNOUNCEMENTS;
  }

  // 升級頁面上的 modal-notifications 結構
  function setupNotificationModal() {
    const modal = document.getElementById('modal-notifications');
    if (!modal) return;

    // 尋找或建立公告列表容器
    let container = document.getElementById('announcements-container');
    if (!container) {
      // 替換原 modal 的內部區塊
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
                  Google 試算表雲端即時連動中
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
              ※ 由大會管理組即時發布
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
        renderAnnouncementsList(data, container, true);

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

    // 先顯示快取或備援
    let cached = FALLBACK_ANNOUNCEMENTS;
    try {
      const c = localStorage.getItem(STORAGE_KEY_CACHE);
      if (c) cached = JSON.parse(c);
    } catch (e) {}
    renderAnnouncementsList(cached, container, false);

    // 背景安靜請求最新公告
    const liveData = await fetchAnnouncements();
    if (liveData && liveData.length > 0) {
      renderAnnouncementsList(liveData, container, true);
    }
  }

  // 自動在 DOM Ready 時啟動
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnnouncements);
  } else {
    initAnnouncements();
  }

  // 導出全域物件供頁面需要時呼叫
  window.LiveAnnouncements = {
    refresh: fetchAnnouncements,
    init: initAnnouncements
  };
})();
