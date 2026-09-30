(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // High-contrast pairs that read well from a distance and through glass.
  const THEMES = [
    { id: 'wb', bg: '#000000', fg: '#ffffff' },
    { id: 'bw', bg: '#ffffff', fg: '#000000' },
    { id: 'yb', bg: '#000000', fg: '#ffd60a' },
    { id: 'by', bg: '#ffd60a', fg: '#000000' },
    { id: 'wr', bg: '#d00000', fg: '#ffffff' },
    { id: 'wu', bg: '#1d4ed8', fg: '#ffffff' },
    { id: 'gb', bg: '#000000', fg: '#39ff14' },
    { id: 'wg', bg: '#15803d', fg: '#ffffff' }
  ];

  const PHRASES = [
    'Welcome!', 'Taxi', 'Thank you!', 'Over here!', 'Wait for me', 'Call me',
    "I can't hear you", 'Help', '欢迎', '接机', '谢谢', '请稍等'
  ];

  const STORE_KEY = 'bigtext:v1';
  const MAX_RECENT = 8;

  const state = {
    text: '',
    theme: 'wb',
    mode: 'fit', // 'fit' | 'scroll'
    blink: false,
    mirror: false,
    bold: true,
    speed: 4,
    recent: []
  };

  // ---- Persistence (per-device convenience only; the app works without it) ----
  function load() {
    try {
      Object.assign(state, JSON.parse(localStorage.getItem(STORE_KEY)) || {});
    } catch (e) {}
  }
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  // ---- Editor UI ----
  const textInput = $('textInput');
  const stage = $('stage');
  const sign = $('sign');
  const signText = $('signText');

  function renderThemes() {
    $('themes').replaceChildren(...THEMES.map((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.textContent = 'Aa';
      b.style.background = t.bg;
      b.style.color = t.fg;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', `${t.fg} on ${t.bg}`);
      b.dataset.theme = t.id;
      b.addEventListener('click', () => {
        state.theme = t.id;
        syncControls();
        save();
      });
      return b;
    }));
  }

  function chip(text, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = text.replace(/\n/g, ' ⏎ ');
    b.title = text;
    b.addEventListener('click', onClick);
    return b;
  }

  function renderChips() {
    $('phrases').replaceChildren(...PHRASES.map((p) => chip(p, () => {
      textInput.value = p;
      show();
    })));
    $('recent').replaceChildren(...state.recent.map((r) => chip(r, () => {
      textInput.value = r;
      show();
    })));
    $('recentLabel').hidden = state.recent.length === 0;
  }

  function syncControls() {
    document.querySelectorAll('.swatch').forEach((s) => {
      const on = s.dataset.theme === state.theme;
      s.classList.toggle('active', on);
      s.setAttribute('aria-checked', on);
    });
    document.querySelectorAll('#modeSeg button').forEach((b) => {
      b.classList.toggle('active', b.dataset.mode === state.mode);
    });
    $('speedRow').hidden = state.mode !== 'scroll';
    $('blinkToggle').checked = state.blink;
    $('mirrorToggle').checked = state.mirror;
    $('boldToggle').checked = state.bold;
    $('speed').value = state.speed;
  }

  // ---- The sign ----
  const CJK = /[⺀-鿿가-힯豈-﫿＀-￯]/;
  let scrollRaf = 0;
  let wakeLock = null;
  let barTimer = 0;
  let rotated = false;

  function applyTheme() {
    const t = THEMES.find((x) => x.id === state.theme) || THEMES[0];
    stage.style.setProperty('--sign-bg', t.bg);
    stage.style.setProperty('--sign-fg', t.fg);
  }

  // Largest font size at which the text fits the sign box (binary search).
  function fitText() {
    const style = getComputedStyle(sign);
    const boxW = sign.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const boxH = sign.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    let lo = 8;
    let hi = Math.max(boxH, 16);
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      signText.style.fontSize = `${mid}px`;
      const fits = signText.scrollWidth <= boxW + 0.5 && signText.scrollHeight <= boxH + 0.5;
      if (fits) lo = mid;
      else hi = mid;
    }
    signText.style.fontSize = `${Math.floor(lo)}px`;
  }

  function startScroll() {
    cancelAnimationFrame(scrollRaf);
    const boxW = sign.clientWidth;
    const boxH = sign.clientHeight;
    signText.style.fontSize = `${Math.floor(boxH * 0.72)}px`;
    const textW = signText.scrollWidth;
    const pxPerSec = boxH * 0.12 * state.speed;
    let x = boxW;
    let last = performance.now();
    const flip = state.mirror ? ' scaleX(-1)' : '';
    const step = (now) => {
      x -= (pxPerSec * (now - last)) / 1000;
      last = now;
      if (x < -textW) x = boxW;
      signText.style.transform = `translateX(${x}px)${flip}`;
      scrollRaf = requestAnimationFrame(step);
    };
    scrollRaf = requestAnimationFrame(step);
  }

  function layout() {
    if (stage.hidden) return;
    cancelAnimationFrame(scrollRaf);
    signText.style.transform = '';
    if (state.mode === 'scroll') startScroll();
    else fitText();
  }

  function renderSign() {
    signText.textContent = state.text;
    applyTheme();
    stage.classList.toggle('scroll', state.mode === 'scroll');
    stage.classList.toggle('blink', state.blink);
    stage.classList.toggle('mirrored', state.mirror && state.mode !== 'scroll');
    stage.classList.toggle('thin', !state.bold);
    stage.classList.toggle('cjk', CJK.test(state.text));
    stage.classList.toggle('rotated', rotated);
    layout();
  }

  async function keepAwake() {
    try {
      if ('wakeLock' in navigator && !stage.hidden) wakeLock = await navigator.wakeLock.request('screen');
    } catch (e) {}
  }

  function show() {
    const text = textInput.value.trim();
    if (!text) {
      textInput.focus();
      toast('Type something first');
      return;
    }
    state.text = text;
    state.recent = [text, ...state.recent.filter((r) => r !== text)].slice(0, MAX_RECENT);
    save();
    renderChips();
    openStage();
  }

  function openStage() {
    stage.hidden = false;
    document.body.style.overflow = 'hidden';
    // Back button / gesture closes the sign instead of leaving the app.
    if (!history.state?.sign) history.pushState({ sign: true }, '');
    const fs = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
    if (fs && !document.fullscreenElement) {
      try {
        const p = fs.call(document.documentElement, { navigationUI: 'hide' });
        if (p && p.catch) p.catch(() => {});
      } catch (e) {}
    }
    keepAwake();
    renderSign();
    flashBar();
    // Fonts / fullscreen change the size shortly after opening.
    setTimeout(layout, 350);
  }

  function closeStage(fromHistory = false) {
    if (stage.hidden) return;
    stage.hidden = true;
    document.body.style.overflow = '';
    cancelAnimationFrame(scrollRaf);
    if (wakeLock) wakeLock.release().catch(() => {});
    wakeLock = null;
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    if (!fromHistory && history.state?.sign) history.back();
  }

  function flashBar() {
    stage.classList.add('show-bar');
    clearTimeout(barTimer);
    barTimer = setTimeout(() => stage.classList.remove('show-bar'), 3000);
  }

  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => {
      el.hidden = true;
    }, 2200);
  }

  // ---- Share link: ?t=text&c=theme&m=scroll&b=1 (blink)&r=1 (mirror) ----
  function shareUrl() {
    const p = new URLSearchParams({ t: textInput.value.trim() || state.text, c: state.theme });
    if (state.mode === 'scroll') p.set('m', 'scroll');
    if (state.blink) p.set('b', '1');
    if (state.mirror) p.set('r', '1');
    return `${location.origin}${location.pathname}?${p}`;
  }

  async function share() {
    const url = shareUrl();
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: 'Big Text', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast('Link copied');
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      prompt('Copy this link:', url);
    }
  }

  function readUrl() {
    const p = new URLSearchParams(location.search);
    const t = p.get('t');
    if (!t) return false;
    textInput.value = t;
    if (THEMES.some((x) => x.id === p.get('c'))) state.theme = p.get('c');
    state.mode = p.get('m') === 'scroll' ? 'scroll' : 'fit';
    state.blink = p.get('b') === '1';
    state.mirror = p.get('r') === '1';
    return true;
  }

  // ---- Wire up ----
  function init() {
    load();
    renderThemes();
    const fromLink = readUrl();
    if (!fromLink && state.text) textInput.value = state.text;
    renderChips();
    syncControls();

    $('showBtn').addEventListener('click', show);
    $('shareBtn').addEventListener('click', share);
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) show();
    });
    document.querySelectorAll('#modeSeg button').forEach((b) => b.addEventListener('click', () => {
      state.mode = b.dataset.mode;
      syncControls();
      save();
    }));
    [['blinkToggle', 'blink'], ['mirrorToggle', 'mirror'], ['boldToggle', 'bold']].forEach(([id, key]) => {
      $(id).addEventListener('change', (e) => {
        state[key] = e.target.checked;
        save();
      });
    });
    $('speed').addEventListener('input', (e) => {
      state.speed = Number(e.target.value);
      save();
    });

    // Sign controls: tap shows the bar; buttons act without closing it.
    stage.addEventListener('click', (e) => {
      if (e.target.closest('.stage-bar')) return;
      flashBar();
    });
    $('stageClose').addEventListener('click', () => closeStage());
    $('stageTheme').addEventListener('click', () => {
      const i = THEMES.findIndex((t) => t.id === state.theme);
      state.theme = THEMES[(i + 1) % THEMES.length].id;
      save();
      syncControls();
      renderSign();
      flashBar();
    });
    $('stageRotate').addEventListener('click', () => {
      rotated = !rotated;
      renderSign();
      flashBar();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeStage();
    });
    window.addEventListener('popstate', () => closeStage(true));
    window.addEventListener('resize', layout);
    window.addEventListener('orientationchange', () => setTimeout(layout, 200));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') keepAwake();
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

    // A shared link opens the sign straight away (without fullscreen: that needs a tap).
    if (fromLink) {
      state.text = textInput.value.trim();
      openStage();
    }

    if ('serviceWorker' in navigator) {
      if (navigator.serviceWorker.controller) {
        let reloaded = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!reloaded) {
            reloaded = true;
            location.reload();
          }
        });
      }
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  init();
})();
