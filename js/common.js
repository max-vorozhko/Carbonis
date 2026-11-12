// Спільне для всіх сторінок Carbonis BBQ: мова (UA/EN), статистика GoatCounter, PWA (сервіс-воркер і підказка «Встановити»).
// Підключається звичайним <script src=".../js/common.js"> до скриптів сторінки; усе доступне як window.Carbonis.
(function () {
  'use strict';
  const CONFIG = {
    // Код сайту в GoatCounter (статистика без cookie): https://КОД.goatcounter.com
    goatcounter: 'carbonis-bbq',
    // Сайт компанії: куди ведуть кнопки «Де купити» і «Зв'язатися»
    site: { uk: 'https://carbonis.com.ua/', en: 'https://carbonis.com.ua/' }
  };
  const LIVE = /(^|\.)github\.io$/.test(location.hostname);
  const ROOT = (document.currentScript && document.currentScript.src) ? new URL('../', document.currentScript.src).href : './';

  const store = {
    get(k, d) { try { const v = localStorage.getItem('carbonis.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('carbonis.' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- мова ---------- */
  function detectLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'uk' || q === 'en') return q;
    const saved = store.get('lang', null);
    if (saved === 'uk' || saved === 'en') return saved;
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'uk';
    return /^(uk|ru|be)/i.test(nav) ? 'uk' : 'en';
  }
  let lang = detectLang();
  const listeners = [];
  function setLang(l) {
    if (l !== 'uk' && l !== 'en' || l === lang) return;
    lang = l; store.set('lang', l);
    document.documentElement.lang = l;
    listeners.forEach(fn => { try { fn(l); } catch (e) { console.error(e); } });
    paintSwitches();
    event('lang-' + l, 'Мова: ' + l.toUpperCase());
  }
  document.documentElement.lang = lang;
  // t({uk:'…', en:'…'}) або t('ключ', словник)
  const t = (v, dict) => {
    if (typeof v === 'string') v = dict && dict[v];
    if (v == null) return '';
    return typeof v === 'object' ? (v[lang] != null ? v[lang] : v.uk) : String(v);
  };
  // Елементи з data-i18n="ключ" беруть текст зі словника сторінки; data-i18n-html — HTML
  function applyDict(dict, root) {
    (root || document).querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n, dict); });
    (root || document).querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml, dict); });
    (root || document).querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh, dict); });
    (root || document).querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria, dict)); });
  }
  // Перемикач UA/EN: <div class="lang-switch" data-lang-switch></div>
  function paintSwitches() {
    document.querySelectorAll('[data-lang-switch]').forEach(box => {
      if (!box.childElementCount) {
        box.setAttribute('role', 'group');
        box.setAttribute('aria-label', 'Мова / Language');
        [['uk', 'UA'], ['en', 'EN']].forEach(([code, label]) => {
          const b = document.createElement('button');
          b.type = 'button'; b.dataset.lang = code; b.textContent = label;
          b.addEventListener('click', () => setLang(code));
          box.appendChild(b);
        });
      }
      box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    });
  }

  /* ---------- статистика ---------- */
  const analyticsOn = !!CONFIG.goatcounter && LIVE;
  function event(path, title) {
    if (!analyticsOn) return;
    const gc = window.goatcounter;
    if (gc && gc.count) gc.count({ path, title: title || path, event: true });
  }
  if (analyticsOn) {
    const s = document.createElement('script');
    s.async = true;
    s.dataset.goatcounter = 'https://' + CONFIG.goatcounter + '.goatcounter.com/count';
    s.src = 'https://gc.zgo.at/count.js';
    document.head.appendChild(s);
  }

  /* ---------- PWA ---------- */
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const inApp = typeof window.TelegramWebviewProxy !== 'undefined' || /Telegram|Instagram|FBAN|FBAV|Viber/i.test(ua);
  const standalone = window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    addEventListener('load', () => navigator.serviceWorker.register(ROOT + 'sw.js', { scope: ROOT }).catch(() => {}));
  }
  const INSTALL_TXT = {
    title: { uk: 'Carbonis BBQ на екрані телефона', en: 'Carbonis BBQ on your home screen' },
    ios: { uk: 'Натисни <b>Поділитися</b> внизу екрана → <b>«На початковий екран»</b> → «Додати».', en: 'Tap <b>Share</b> at the bottom → <b>Add to Home Screen</b> → Add.' },
    iosInApp: { uk: 'Відкрий сторінку в <b>Safari</b> (⋯ → «Відкрити в Safari»), а там: <b>Поділитися</b> → <b>«На початковий екран»</b>.', en: 'Open this page in <b>Safari</b> (⋯ → Open in Safari), then <b>Share</b> → <b>Add to Home Screen</b>.' },
    android: { uk: 'Калькулятор та ігри відкриватимуться з іконки, як звичайний додаток.', en: 'Open the calculator and games from an icon, like a regular app.' },
    install: { uk: 'Встановити', en: 'Install' },
    close: { uk: 'Закрити', en: 'Close' }
  };
  let installMode = null, deferred = null;
  function hiddenRecently() { const at = Number(store.get('install.hidden', 0)); return at && Date.now() - at < 14 * 86400000; }
  function installBar() {
    let bar = document.getElementById('cbInstall');
    if (bar) return bar;
    const css = document.createElement('style');
    css.textContent = '.cb-install{position:fixed;left:0;right:0;bottom:0;z-index:50;padding:12px max(16px,env(safe-area-inset-right,0px)) calc(12px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));background:#1e1e1e;border-top:1px solid #353535;color:#fff;font:14px/1.45 "Golos Text",system-ui,sans-serif;display:flex;gap:12px;align-items:center;box-shadow:0 -8px 24px rgba(0,0,0,.4)}'
      + '.cb-install img{width:40px;height:40px;border-radius:9px;flex:none}.cb-install div{flex:1;min-width:0}.cb-install b{font-weight:600}.cb-install strong{display:block;font-weight:600}'
      + '.cb-install p{margin:2px 0 0;color:#a3a3a3}.cb-install p b{color:#fff}.cb-install button{appearance:none;cursor:pointer;font:600 14px "Golos Text",system-ui,sans-serif;border-radius:6px}'
      + '.cb-install .go{background:#56b947;border:1px solid #56b947;color:#000;padding:10px 14px}.cb-install .x{background:transparent;border:0;color:#a3a3a3;font-size:22px;line-height:1;padding:6px 8px}';
    document.head.appendChild(css);
    bar = document.createElement('aside');
    bar.id = 'cbInstall'; bar.className = 'cb-install'; bar.hidden = true;
    bar.innerHTML = '<img src="' + ROOT + 'assets/icons/icon-192.png" alt=""><div><strong></strong><p></p></div><button type="button" class="go" hidden></button><button type="button" class="x">×</button>';
    bar.querySelector('.x').addEventListener('click', () => { bar.hidden = true; store.set('install.hidden', Date.now()); });
    bar.querySelector('.go').addEventListener('click', async () => {
      if (!deferred) return;
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      if (outcome === 'accepted') { bar.hidden = true; event('pwa-install', 'Встановлено як додаток'); }
    });
    document.body.appendChild(bar);
    return bar;
  }
  function paintInstall() {
    const bar = document.getElementById('cbInstall');
    if (!bar || !installMode) return;
    bar.querySelector('strong').textContent = t(INSTALL_TXT.title);
    bar.querySelector('p').innerHTML = t(INSTALL_TXT[installMode]);
    const go = bar.querySelector('.go'); go.textContent = t(INSTALL_TXT.install); go.hidden = installMode !== 'android';
    bar.querySelector('.x').setAttribute('aria-label', t(INSTALL_TXT.close));
  }
  // Сторінка сама вирішує, коли показати підказку (щоб не заважати в грі)
  function offerInstall() {
    if (standalone || hiddenRecently() || !installMode) return;
    const bar = installBar(); paintInstall(); bar.hidden = false;
  }
  if (standalone) event('pwa-open', 'Відкрито як додаток');
  else if (isIOS) installMode = inApp ? 'iosInApp' : 'ios';
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; installMode = 'android'; if (window.Carbonis.autoOfferInstall) offerInstall(); });
  addEventListener('appinstalled', () => { const b = document.getElementById('cbInstall'); if (b) b.hidden = true; });
  listeners.push(paintInstall);

  /* ---------- поділитися ---------- */
  // Системне меню «Поділитися» (месенджери), а де його немає — копіюємо текст із посиланням. Повертає 'shared' | 'copied' | 'failed'.
  function share(data) {
    if (navigator.share) return navigator.share(data).then(() => 'shared', () => 'cancelled');
    const text = [data.text, data.url].filter(Boolean).join(' ');
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(() => 'copied', () => 'failed');
    return Promise.resolve('failed');
  }
  const SHARE_MSG = {
    copied: { uk: 'Скопійовано. Вставте в месенджер і надішліть друзям.', en: 'Copied. Paste it into a messenger and send to friends.' },
    failed: { uk: 'Не вдалося поділитися. Скопіюйте адресу сторінки вручну.', en: "Couldn't share. Copy the page address manually." }
  };
  const shareMsg = r => (SHARE_MSG[r] ? t(SHARE_MSG[r]) : '');

  /* ---------- малюнки страв (спільні для калькулятора і гіда) ---------- */
  function foodShape(id) {
    let g = '';
    if (id === 'steak') g = '<path d="M-20-2C-18-10 6-12 16-7 24-3 22 5 12 7-2 10-22 8-20-2Z" fill="#a8553f" stroke="#ead3b8" stroke-width="2"/><path d="M-8-5l-4 9M2-6l-4 11M12-5l-4 9" stroke="#5a2a1c" stroke-width="1.6"/>';
    else if (id === 'shashlik') [-5, 4].forEach(dy => { g += '<path d="M-32 ' + dy + 'H32" stroke="#cfcfcf" stroke-width="1.4"/>'; for (let i = 0; i < 4; i++) g += '<rect x="' + (-24 + i * 12) + '" y="' + (dy - 4) + '" width="10" height="8" rx="2" fill="' + (i % 2 ? '#8a4a2f' : '#a8553f') + '"/>'; });
    else if (id === 'chicken') [-13, 11].forEach(dx => { g += '<ellipse cx="' + dx + '" cy="0" rx="11" ry="7" fill="#c98a4b"/><path d="M' + (dx + 10) + ' 0h8" stroke="#f1e6d6" stroke-width="3" stroke-linecap="round"/>'; });
    else if (id === 'ribs') { g = '<rect x="-28" y="-7" width="56" height="13" rx="5" fill="#8a4a2f"/>'; for (let j = 0; j < 6; j++) g += '<path d="M' + (-21 + j * 8.4) + '-6v11" stroke="#ead3b8" stroke-width="2" stroke-linecap="round"/>'; }
    else if (id === 'fish') g = '<ellipse cx="-3" cy="0" rx="22" ry="7.5" fill="#9fb3c1"/><path d="M18 0l12-7v14Z" fill="#9fb3c1"/><circle cx="-17" cy="-2" r="1.5" fill="#1a1a1a"/><path d="M-6-6l-3 12M2-6l-3 12M10-5l-3 10" stroke="#6f8492" stroke-width="1.3"/>';
    else if (id === 'sausage') [-6, 1, 8].forEach((dy, i) => { g += '<rect x="' + (-22 + i * 3) + '" y="' + (dy - 3) + '" width="40" height="6" rx="3" fill="#c8603a"/>'; });
    else g = '<circle cx="-20" cy="0" r="7" fill="#e23b2e"/><ellipse cx="-2" cy="0" rx="9" ry="6" fill="#7fae4a"/><circle cx="16" cy="0" r="6.5" fill="#f2d04b"/><circle cx="29" cy="1" r="5" fill="#d9cdbb"/>';
    return g;
  }
  const foodIcon = id => '<svg viewBox="-36 -14 72 28" aria-hidden="true">' + foodShape(id) + '</svg>';

  document.addEventListener('DOMContentLoaded', paintSwitches);

  window.Carbonis = {
    CONFIG, LIVE, ROOT, store, t, applyDict, event, offerInstall, autoOfferInstall: false, share, shareMsg, foodShape, foodIcon,
    get lang() { return lang; }, setLang,
    onLang(fn) { listeners.push(fn); },
    siteUrl() { return CONFIG.site[lang] || CONFIG.site.uk; }
  };
})();
