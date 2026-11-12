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

  document.addEventListener('DOMContentLoaded', paintSwitches);

  window.Carbonis = {
    CONFIG, LIVE, ROOT, store, t, applyDict, event, offerInstall, autoOfferInstall: false,
    get lang() { return lang; }, setLang,
    onLang(fn) { listeners.push(fn); },
    siteUrl() { return CONFIG.site[lang] || CONFIG.site.uk; }
  };
})();
