// ==UserScript==
// @name         M-Team 排行榜悬浮大图预览
// @name:en      M-Team Rankings Hover Preview
// @namespace    https://github.com/Eliaukzzz/m-team-rankings-hover-preview
// @version      1.1.1
// @description  鼠标悬浮 M-Team 排行榜（/rankings）任意一行，在行侧弹出该种子的海报大图；Alt+P 或右下角按钮开关
// @author       Eliaukzzz
// @homepageURL  https://github.com/Eliaukzzz/m-team-rankings-hover-preview
// @supportURL   https://github.com/Eliaukzzz/m-team-rankings-hover-preview/issues
// @license      MIT
// @match        *://*.m-team.cc/*
// @run-at       document-idle
// @noframes
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  /* ==================================================================
   * 配置：一般情况下只需要改这里
   * ================================================================== */
  const CONFIG = {
    // 生效路径（前缀匹配）。想让老版排行榜 /top 也生效，加一项 '/top' 即可
    paths: ['/rankings'],
    // true = 全站所有页面生效（不只排行榜）
    allPages: false,

    // 一行（一个种子条目）的匹配选择器；新版页面用 antd Table
    rowSelector: 'tr.ant-table-row, tr[data-row-key], table.table-fixed tbody tr',
    // 缩略图最小可见边长（px），用于过滤图标、旗帜、状态点等小图
    // 注意：antd 的 .ant-image-img 与详情链接里的图片不受此限制
    thumbMinSize: 32,

    // 悬浮多久后弹出（ms），避免快速划过多行时闪烁
    showDelay: 110,
    // 移开后多久收起（ms）
    hideDelay: 90,

    // 大图最大尺寸：占视口宽/高的比例，以及绝对宽度上限
    maxWidthRatio: 0.46,
    maxHeightRatio: 0.68,
    maxWidthPx: 760,
    // 大图最小边长（px）
    minPreviewPx: 140,
    // 大图与行之间的间距（px）
    gap: 16,

    // 大图底部是否叠加标题
    showCaption: true,
    // 是否在右下角显示开关按钮
    showToggleButton: true,

    // 视口宽度小于该值时不启用（窄屏放不下）
    minViewportWidth: 720,

    // 自然宽度小于该值、且存在“大图变体”时，改试变体（表格里通常不触发）
    preferLargeMinWidth: 360,

    storage: {
      enabled: 'mthp:enabled',
      debug: 'mthp:debug',
    },
  };

  /* ==================================================================
   * 小工具
   * ================================================================== */
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : v;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, String(value));
      } catch (e) {
        /* 隐私模式下静默失败 */
      }
    },
  };

  const DEBUG =
    /(?:^|[?&])mthp_debug=1(?:&|$)/.test(location.search) ||
    store.get(CONFIG.storage.debug, '0') === '1';

  function log() {
    if (!DEBUG) return;
    const args = ['[mthp]'].concat([].slice.call(arguments));
    console.log.apply(console, args);
  }

  /* ==================================================================
   * 状态
   * ================================================================== */
  const state = {
    enabled: store.get(CONFIG.storage.enabled, '1') !== '0',
    row: null,        // 当前悬浮的行
    showTimer: 0,
    hideTimer: 0,
    token: 0,         // 用于作废过期的异步加载
  };

  let root = null;    // 预览容器（fixed）
  let imgEl = null;   // 预览图片
  let capEl = null;   // 标题
  let toggleEl = null;
  const thumbCache = new WeakMap();

  /* ==================================================================
   * 样式
   * ================================================================== */
  const CSS = [
    '#mthp-root{position:fixed;top:0;left:0;z-index:2147483000;display:none;opacity:0;',
    'pointer-events:none;transition:opacity .16s ease;will-change:opacity,transform;}',
    '#mthp-card{position:relative;border-radius:14px;overflow:hidden;background:#101010;',
    'box-shadow:0 24px 64px rgba(0,0,0,.38),0 2px 10px rgba(0,0,0,.22);}',
    '#mthp-img{display:block;object-fit:contain;background:#161616;}',
    '#mthp-cap{position:absolute;left:0;right:0;bottom:0;padding:22px 12px 10px;',
    'font:500 12px/1.5 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif;color:#fff;',
    'background:linear-gradient(to top,rgba(0,0,0,.82),rgba(0,0,0,0));',
    'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;',
    'text-shadow:0 1px 2px rgba(0,0,0,.65);word-break:break-all;pointer-events:none;}',
    '#mthp-cap[hidden]{display:none;}',
    '#mthp-toggle{position:fixed;right:14px;bottom:14px;z-index:2147482999;display:flex;',
    'align-items:center;gap:6px;padding:7px 12px;border:0;border-radius:999px;',
    'background:rgba(17,17,17,.62);color:#fff;cursor:pointer;opacity:.34;',
    'font:500 12px/1 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif;',
    'backdrop-filter:blur(6px);box-shadow:0 4px 14px rgba(0,0,0,.25);',
    'transition:opacity .2s,background .2s,transform .2s;}',
    '#mthp-toggle:hover{opacity:1;transform:translateY(-1px);}',
    '#mthp-toggle[data-off="1"]{background:rgba(122,32,32,.66);}',
    '#mthp-toggle .mthp-dot{width:6px;height:6px;border-radius:50%;background:#3ddc84;flex:0 0 auto;}',
    '#mthp-toggle[data-off="1"] .mthp-dot{background:#ff6b6b;}',
    '@media (prefers-reduced-motion: reduce){#mthp-root{transition:none;}',
    '#mthp-toggle{transition:none;}}',
  ].join('');

  /* ==================================================================
   * DOM 构建
   * ================================================================== */
  function ensureStyle() {
    if (document.getElementById('mthp-style')) return;
    const style = document.createElement('style');
    style.id = 'mthp-style';
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensurePreview() {
    if (root) return;
    ensureStyle();

    root = document.createElement('div');
    root.id = 'mthp-root';

    const card = document.createElement('div');
    card.id = 'mthp-card';

    imgEl = document.createElement('img');
    imgEl.id = 'mthp-img';
    imgEl.alt = '';
    imgEl.decoding = 'async';

    capEl = document.createElement('div');
    capEl.id = 'mthp-cap';
    capEl.hidden = true;

    card.appendChild(imgEl);
    card.appendChild(capEl);
    root.appendChild(card);
    document.body.appendChild(root);

    root.addEventListener('transitionend', function () {
      if (root && root.style.opacity === '0') root.style.display = 'none';
    });
  }

  function ensureToggle() {
    if (toggleEl || !CONFIG.showToggleButton || !document.body) return;
    toggleEl = document.createElement('button');
    toggleEl.id = 'mthp-toggle';
    toggleEl.type = 'button';
    toggleEl.innerHTML = '<span class="mthp-dot"></span><span class="mthp-text"></span>';
    toggleEl.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      setEnabled(!state.enabled);
    });
    document.body.appendChild(toggleEl);
    syncToggle();
  }

  function syncToggle() {
    if (!toggleEl) return;
    toggleEl.dataset.off = state.enabled ? '0' : '1';
    toggleEl.title = state.enabled
      ? '悬浮大图预览已开启（Alt+P 关闭）'
      : '悬浮大图预览已关闭（Alt+P 开启）';
    toggleEl.lastElementChild.textContent = state.enabled ? '大图' : '大图 关';
  }

  /* ==================================================================
   * 页面判断
   * ================================================================== */
  function isActivePage() {
    if (CONFIG.allPages) return true;
    const path = location.pathname.replace(/\/+$/, '') || '/';
    for (let i = 0; i < CONFIG.paths.length; i++) {
      const p = CONFIG.paths[i];
      if (path === p || path.indexOf(p + '/') === 0) return true;
    }
    return false;
  }

  function ready() {
    return (
      state.enabled &&
      isActivePage() &&
      window.innerWidth >= CONFIG.minViewportWidth &&
      !!document.body
    );
  }

  /* ==================================================================
   * 找行 & 找缩略图
   * ================================================================== */
  function getRow(target) {
    if (!(target instanceof Element)) return null;
    if (root && root.contains(target)) return null;
    if (toggleEl && toggleEl.contains(target)) return null;
    return target.closest(CONFIG.rowSelector);
  }

  function rawSrcOf(img) {
    return (
      img.getAttribute('data-src') ||
      img.getAttribute('data-original') ||
      img.currentSrc ||
      img.src ||
      ''
    );
  }

  function isUsableSrc(src) {
    return !!src && !/^data:/i.test(src) && !/\.svg(?:[?#]|$)/i.test(src);
  }

  // 一行里可能混着图标、旗帜、状态点；挑“最像海报”的那张
  function pickThumb(row) {
    if (thumbCache.has(row)) {
      const cached = thumbCache.get(row);
      if (cached && cached.isConnected) return cached;
      thumbCache.delete(row);
    }

    const imgs = row.querySelectorAll('img');
    let best = null;
    let bestScore = -1;

    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      if (img === imgEl) continue;

      const src = rawSrcOf(img);
      if (!isUsableSrc(src)) continue;

      const rect = img.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // antd 的图片、或详情链接里的图片，即使很小也认为是封面
      const isPosterish =
        img.classList.contains('ant-image-img') ||
        !!img.closest('a[href*="/detail/"]');

      if (!isPosterish && Math.max(w, h) < CONFIG.thumbMinSize) continue;

      // 面积越大越像封面；antd Image 再加权；竖版再加权
      let score = Math.max(w, h) * Math.max(1, Math.min(w, h));
      if (img.classList.contains('ant-image-img')) score *= 2.5;
      if (isPosterish) score *= 1.6;
      if (h > w * 0.9) score *= 1.4;

      if (score > bestScore) {
        bestScore = score;
        best = img;
      }
    }

    if (best) thumbCache.set(row, best);
    return best;
  }

  // 大图地址候选：表格里缩略图通常就是原图；卡片/列表里尝试站点约定的 -N.jpg -> jp-N.jpg
  function largeCandidates(img) {
    const raw = rawSrcOf(img);
    const list = [];

    if (raw && !img.closest('table')) {
      const jp = raw.replace(/-(\d+\.jpe?g)$/i, 'jp-$1');
      if (jp !== raw) list.push(jp);
    }
    if (raw && list.indexOf(raw) === -1) list.push(raw);

    // 兜底：raw 加载失败时再试一次 jp 变体
    if (raw) {
      const jp2 = raw.replace(/-(\d+\.jpe?g)$/i, 'jp-$1');
      if (jp2 !== raw && list.indexOf(jp2) === -1) list.push(jp2);
    }
    return list;
  }

  // 依次尝试候选地址；成功但明显偏小时，若还有更大的候选则继续
  function loadBest(urls, token) {
    return new Promise(function (resolve, reject) {
      if (!urls.length) return reject(new Error('empty'));

      let index = 0;
      let found = null;

      function tryNext() {
        if (index >= urls.length) {
          if (found) return resolve(found);
          return reject(new Error('all failed'));
        }
        const url = urls[index++];
        const probe = new Image();
        probe.onload = function () {
          if (token !== state.token) return reject(new Error('stale'));
          if (!found) found = probe;
          else if (probe.naturalWidth > found.naturalWidth) found = probe;

          if (probe.naturalWidth < CONFIG.preferLargeMinWidth && index < urls.length) {
            tryNext();
            return;
          }
          resolve(found);
        };
        probe.onerror = function () {
          if (token !== state.token) return reject(new Error('stale'));
          tryNext();
        };
        probe.src = url;
      }

      tryNext();
    });
  }

  /* ==================================================================
   * 展示
   * ================================================================== */
  function captionOf(row) {
    if (!CONFIG.showCaption) return '';
    const link =
      row.querySelector('a[href*="/detail/"]') ||
      row.querySelector('a[href*="/torrent"]') ||
      null;
    let text = link ? link.textContent : '';
    if (!text) {
      const cell = row.querySelector('td:nth-child(2)');
      text = cell ? cell.textContent : '';
    }
    return (text || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  }

  function hideNow() {
    state.token += 1;
    if (!root) return;
    root.style.opacity = '0';
  }

  function cancelHide() {
    clearTimeout(state.hideTimer);
    state.hideTimer = 0;
  }

  function scheduleHide() {
    cancelHide();
    state.token += 1;
    state.hideTimer = setTimeout(hideNow, CONFIG.hideDelay);
  }

  function scheduleShow(row) {
    clearTimeout(state.showTimer);
    state.showTimer = setTimeout(function () {
      if (state.row === row && ready()) show(row);
    }, CONFIG.showDelay);
  }

  function show(row) {
    const thumb = pickThumb(row);
    if (!thumb) {
      log('row has no thumbnail', row);
      return hideNow();
    }

    const urls = largeCandidates(thumb);
    const token = ++state.token;
    log('preview', { urls: urls, row: row });

    loadBest(urls, token).then(
      function (probe) {
        if (token !== state.token || state.row !== row || !row.isConnected) return;
        render(probe, row);
      },
      function (err) {
        log('load failed', err);
        if (token === state.token) hideNow();
      }
    );
  }

  function render(probe, row) {
    if (!root) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const nw = probe.naturalWidth || 300;
    const nh = probe.naturalHeight || 450;

    // 按比例缩放到“最大可视框”内
    const boxW = Math.min(vw * CONFIG.maxWidthRatio, CONFIG.maxWidthPx);
    const boxH = vh * CONFIG.maxHeightRatio;
    let w = boxW;
    let h = w * (nh / nw);
    if (h > boxH) {
      h = boxH;
      w = h * (nw / nh);
    }
    w = Math.max(CONFIG.minPreviewPx, Math.min(w, boxW));
    h = Math.max(CONFIG.minPreviewPx, Math.min(h, boxH));

    imgEl.src = probe.src;
    imgEl.style.width = Math.round(w) + 'px';
    imgEl.style.height = Math.round(h) + 'px';

    const caption = captionOf(row);
    if (caption) {
      capEl.textContent = caption;
      capEl.hidden = false;
    } else {
      capEl.hidden = true;
      capEl.textContent = '';
    }

    // 先排版再量尺寸，避免标题高度导致的抖动
    root.style.display = 'block';
    root.style.opacity = '0';

    const cw = root.offsetWidth;
    const ch = root.offsetHeight;
    const rect = row.getBoundingClientRect();

    // 默认贴在行的右侧；右侧放不下就翻到左侧
    let x = rect.right + CONFIG.gap;
    if (x + cw > vw - 12) x = rect.left - cw - CONFIG.gap;
    if (x < 12) x = Math.min(Math.max(12, vw - cw - 12), Math.max(12, rect.right + CONFIG.gap));

    // 顶部与行顶对齐，越界时夹取
    let y = rect.top - 6;
    if (y + ch > vh - 12) y = vh - ch - 12;
    if (y < 12) y = 12;

    root.style.left = Math.round(x) + 'px';
    root.style.top = Math.round(y) + 'px';

    // 上面已强制过一次布局（读取 offsetWidth），这里直接改透明度即可触发过渡；
    // 不用 rAF：某些环境（后台标签页、无头浏览器）rAF 可能长时间不回调，预览会一直透明
    root.style.opacity = '1';
  }

  /* ==================================================================
   * 事件
   * ================================================================== */
  function onPointerOver(e) {
    if (!ready()) return;
    if (e.pointerType && e.pointerType !== 'mouse') return;
    if (e.altKey) return;

    const sel = window.getSelection && window.getSelection();
    if (sel && String(sel).length > 0) return;

    const row = getRow(e.target);
    if (!row) return;

    // 页面是 SPA：切到排行榜后按需补建 UI
    ensurePreview();
    ensureToggle();

    if (row === state.row) {
      cancelHide();
      return;
    }

    state.row = row;
    cancelHide();
    scheduleShow(row);
  }

  function onPointerOut(e) {
    if (!state.row) return;

    const row = getRow(e.target);
    if (!row || row !== state.row) return;

    // 移动到该行内部的其它元素，不视为离开
    const to = e.relatedTarget;
    if (to instanceof Node && row.contains(to)) return;

    state.row = null;
    scheduleHide();
  }

  function setEnabled(on) {
    state.enabled = !!on;
    store.set(CONFIG.storage.enabled, state.enabled ? '1' : '0');
    syncToggle();
    if (!state.enabled) {
      state.row = null;
      hideNow();
    }
    log('enabled =', state.enabled);
  }

  function onKeyDown(e) {
    if (e.altKey && (e.key === 'p' || e.key === 'P' || e.code === 'KeyP')) {
      e.preventDefault();
      e.stopPropagation();
      setEnabled(!state.enabled);
    }
  }

  function hideOnScroll() {
    if (root && root.style.display !== 'none') {
      state.row = null;
      hideNow();
    }
  }

  /* ==================================================================
   * 启动
   * ================================================================== */
  function boot() {
    if (isActivePage()) {
      ensurePreview();
      ensureToggle();
    }

    window.addEventListener('pointerover', onPointerOver, true);
    window.addEventListener('pointerout', onPointerOut, true);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('scroll', hideOnScroll, true);
    window.addEventListener('resize', hideOnScroll);
    window.addEventListener('popstate', hideOnScroll);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) hideOnScroll();
    });

    log('booted', {
      page: location.pathname,
      active: isActivePage(),
      enabled: state.enabled,
    });
  }

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot, { once: true });
})();
