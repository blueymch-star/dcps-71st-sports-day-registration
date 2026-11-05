/**
 * 第 71 屆大庄校慶運動會 - LINE LIFF 智慧連動模組
 * 負責前端 LIFF 初始化、自動獲取報名者 LINE User ID 及在表單頂部顯示連動狀態
 */

(function () {
  // 預設正式 LIFF ID（大庄校慶官方專屬）
  const STORAGE_KEY_LIFF_ID = 'dachuang_71_liff_id';
  const DEFAULT_LIFF_ID = '2012386503-guV8Oien'; // 正式 LIFF ID

  window.DACHUANG_LINE = {
    liffId: localStorage.getItem(STORAGE_KEY_LIFF_ID) || DEFAULT_LIFF_ID,
    isReady: false,
    isInClient: false,
    isLoggedIn: false,
    user: null, // { userId, displayName, pictureUrl }
    
    // 初始化 LIFF
    async init() {
      if (typeof liff === 'undefined') {
        console.warn('LINE LIFF SDK 尚未載入，請確認已引用 sdk.js');
        this.renderStatusBanner();
        return;
      }

      const activeLiffId = this.liffId;
      if (!activeLiffId || activeLiffId.includes('YOUR_LIFF_ID')) {
        console.log('尚未設定正式 LIFF ID，以標準網頁模式運作');
        this.renderStatusBanner();
        return;
      }

      try {
        await liff.init({ liffId: activeLiffId });
        this.isReady = true;
        this.isInClient = liff.isInClient();
        this.isLoggedIn = liff.isLoggedIn();

        if (this.isLoggedIn) {
          try {
            const profile = await liff.getProfile();
            this.user = {
              userId: profile.userId,
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl || ''
            };
            console.log('LINE LIFF 授權成功，使用者：', this.user.displayName, this.user.userId);
          } catch (profileErr) {
            console.warn('獲取 LINE Profile 失敗：', profileErr);
          }
        }
      } catch (err) {
        console.warn('LIFF 初始化失敗：', err);
      }

      this.renderStatusBanner();
    },

    // 取得當前 LINE 報名負載資料
    getPayload() {
      if (this.user && this.user.userId) {
        return {
          lineUserId: this.user.userId,
          lineDisplayName: this.user.displayName || '',
          lineLinked: true
        };
      }
      return {
        lineUserId: '',
        lineDisplayName: '',
        lineLinked: false
      };
    },

    // 設定或更新 LIFF ID
    setLiffId(newId) {
      if (newId) {
        this.liffId = newId.trim();
        localStorage.setItem(STORAGE_KEY_LIFF_ID, this.liffId);
      }
    },

    // 手動觸發 LINE 登入授權
    login() {
      if (typeof liff !== 'undefined' && this.isReady) {
        if (!liff.isLoggedIn()) {
          liff.login();
        }
      } else {
        window.location.href = `https://liff.line.me/${this.liffId}`;
      }
    },

    // 在頁面指定容器渲染「LINE 連動狀態通知列」
    renderStatusBanner() {
      const bannerContainer = document.getElementById('line-status-banner');
      if (!bannerContainer) return;

      if (this.user && this.user.userId) {
        // 已連動 LINE 狀態
        bannerContainer.innerHTML = `
          <div class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between gap-3 shadow-sm transition-all animate-fadeIn">
            <div class="flex items-center gap-3">
              <div class="relative shrink-0">
                ${this.user.pictureUrl 
                  ? `<img src="${this.user.pictureUrl}" alt="LINE Avatar" class="w-10 h-10 rounded-full border-2 border-emerald-500 object-cover shadow"/>` 
                  : `<div class="w-10 h-10 rounded-full bg-[#06C755] flex items-center justify-center text-white font-bold text-sm shadow">LINE</div>`}
                <span class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>
              <div class="flex flex-col">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="px-2 py-0.5 rounded-full bg-[#06C755] text-white font-bold text-[11px] tracking-wide inline-flex items-center gap-1">
                    <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M24 10.3c0-4.6-4.5-8.3-10-8.3-5.5 0-10 3.7-10 8.3 0 4.1 3.6 7.6 8.5 8.2.3.1.8.2 1 .7.1.4.1 1 0 1.4-.1.4-.4 1.5-.4 1.5s-.1.4.2.2c.3-.2 4.1-2.4 5.6-4.1 3.2-1.8 5.1-4.7 5.1-7.9z"/></svg>
                    LINE 已連動
                  </span>
                  <span class="font-bold text-sm text-emerald-900">${this.escape(this.user.displayName)}</span>
                </div>
                <p class="text-[11px] text-emerald-700 font-medium mt-0.5">
                  ✓ 報名成功將自動推播「數位收執單」，錄取與賽前通知亦將即時直達此裝置！
                </p>
              </div>
            </div>
          </div>
        `;
      } else {
        // 未在 LINE 內或未登入（純網頁模式）
        bannerContainer.innerHTML = `
          <div class="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container text-on-surface flex items-start justify-between gap-3 shadow-sm transition-all">
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-xl bg-[#06C755]/10 border border-[#06C755]/30 flex items-center justify-center text-[#06C755] shrink-0 mt-0.5">
                <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 10.3c0-4.6-4.5-8.3-10-8.3-5.5 0-10 3.7-10 8.3 0 4.1 3.6 7.6 8.5 8.2.3.1.8.2 1 .7.1.4.1 1 0 1.4-.1.4-.4 1.5-.4 1.5s-.1.4.2.2c.3-.2 4.1-2.4 5.6-4.1 3.2-1.8 5.1-4.7 5.1-7.9z"/></svg>
              </div>
              <div class="flex flex-col">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-bold text-xs text-on-surface">目前為「一般瀏覽器報名模式」</span>
                  <span class="text-[10px] text-on-surface-variant font-medium bg-surface-container px-1.5 py-0.5 rounded">免帳號即可報名</span>
                </div>
                <p class="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                  📱 <strong>溫馨提示</strong>：若使用手機相機或 LINE 掃描聯絡簿 QR Code 點開，系統將自動連動 LINE 官方機器人，即時傳送【報名確認單】與【錄取/賽前通知】。
                </p>
                <div class="mt-2">
                  <button type="button" onclick="window.DACHUANG_LINE.login()" class="px-3 py-1 rounded-lg bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs shadow-sm active:scale-95 transition-all inline-flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M24 10.3c0-4.6-4.5-8.3-10-8.3-5.5 0-10 3.7-10 8.3 0 4.1 3.6 7.6 8.5 8.2.3.1.8.2 1 .7.1.4.1 1 0 1.4-.1.4-.4 1.5-.4 1.5s-.1.4.2.2c.3-.2 4.1-2.4 5.6-4.1 3.2-1.8 5.1-4.7 5.1-7.9z"/></svg>
                    <span>點此登入 LINE 連動（享受即時推播）</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }
    },

    escape(str) {
      if (!str) return '';
      return String(str).replace(/[&<>"']/g, function (m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
      });
    }
  };

  // 自動在 DOM 載入時執行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.DACHUANG_LINE.init());
  } else {
    window.DACHUANG_LINE.init();
  }
})();
