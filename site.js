/* site.js — shared motion layer: Lenis smooth scroll, custom cursor, scroll reveals,
   split-text, counters, magnetics, tilt, parallax, nav shrink, scroll progress, ripple.
   Attribute-driven and re-scans the DOM as the design streams in. */
(function () {
  if (window.__siteFX) return;
  window.__siteFX = true;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = window.matchMedia('(pointer: coarse)').matches;
  var scrollY = 0;

  /* ---------- Lenis smooth scroll (opt-in via <body data-lenis>) ---------- */
  function initLenis() {
    if (reduce || touch || !window.Lenis || window.__lenis) return;
    var lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.6, syncTouch: false });
    window.__lenis = lenis;
    document.documentElement.style.scrollBehavior = 'auto';
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    lenis.on('scroll', function (e) { scrollY = e.scroll; queueScroll(); });
  }
  var lenisTries = 0;
  var lenisTimer = setInterval(function () { if (window.Lenis || ++lenisTries > 20) { clearInterval(lenisTimer); initLenis(); } }, 100);

  /* ---------- custom cursor ---------- */
  function initCursor() {
    if (touch || document.getElementById('fx-cursor')) return;
    var dot = document.createElement('div');
    dot.id = 'fx-cursor';
    var ring = document.createElement('div');
    ring.id = 'fx-cursor-ring';
    var base = 'position:fixed;top:0;left:0;z-index:99999;pointer-events:none;border-radius:999px;mix-blend-mode:normal;';
    dot.style.cssText = base + 'width:6px;height:6px;background:#0A66FF;transform:translate(-50%,-50%);';
    ring.style.cssText = base + 'width:36px;height:36px;border:1px solid rgba(10,102,255,0.45);background:rgba(10,102,255,0.05);backdrop-filter:blur(2px);transition:width .35s cubic-bezier(.16,1,.3,1),height .35s cubic-bezier(.16,1,.3,1),background .35s ease,border-color .35s ease;';
    document.body.appendChild(dot); document.body.appendChild(ring);
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    (function tick() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
      requestAnimationFrame(tick);
    })();
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest && e.target.closest('a,button,[data-cursor]');
      if (t) {
        var big = t.getAttribute('data-cursor') === 'big';
        ring.style.width = ring.style.height = big ? '96px' : '64px';
        ring.style.background = 'rgba(10,102,255,0.10)';
        ring.style.borderColor = 'rgba(10,102,255,0.7)';
      } else {
        ring.style.width = ring.style.height = '36px';
        ring.style.background = 'rgba(10,102,255,0.05)';
        ring.style.borderColor = 'rgba(10,102,255,0.45)';
      }
    });
  }

  /* ---------- reveals ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      io.unobserve(el);
      var d = parseFloat(el.getAttribute('data-delay') || '0');
      setTimeout(function () {
        el.style.transition = 'opacity 1.05s cubic-bezier(.16,1,.3,1), transform 1.15s cubic-bezier(.16,1,.3,1), filter 1.1s ease, clip-path 1.2s cubic-bezier(.16,1,.3,1)';
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.filter = 'none';
        el.style.clipPath = 'inset(0% 0% 0% 0%)';
        el.setAttribute('data-revealed', '');
      }, d * 1000);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  function prep(el) {
    var kind = el.getAttribute('data-reveal') || 'up';
    if (reduce) { el.style.opacity = '1'; return; }
    el.style.willChange = 'opacity, transform, filter';
    el.style.opacity = '0';
    if (kind === 'up') el.style.transform = 'translate3d(0,42px,0)';
    else if (kind === 'blur') { el.style.filter = 'blur(14px)'; el.style.transform = 'translate3d(0,18px,0)'; }
    else if (kind === 'scale') el.style.transform = 'scale(0.92)';
    else if (kind === 'mask') { el.style.clipPath = 'inset(0% 0% 100% 0%)'; el.style.opacity = '1'; el.style.transform = 'translate3d(0,0,0)'; }
    else if (kind === 'left') el.style.transform = 'translate3d(-46px,0,0)';
    else if (kind === 'right') el.style.transform = 'translate3d(46px,0,0)';
    else if (kind === 'rotate') el.style.transform = 'perspective(900px) rotateX(14deg) translate3d(0,40px,0)';
    // above-the-fold content must not sit blank waiting on the observer
    var r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92) {
      var d0 = Math.min(0.28, parseFloat(el.getAttribute('data-delay') || '0'));
      requestAnimationFrame(function () {
        setTimeout(function () {
          el.style.transition = 'opacity .7s cubic-bezier(.16,1,.3,1), transform .8s cubic-bezier(.16,1,.3,1), filter .7s ease, clip-path .8s cubic-bezier(.16,1,.3,1)';
          el.style.opacity = '1'; el.style.transform = 'none'; el.style.filter = 'none';
          el.style.clipPath = 'inset(0% 0% 0% 0%)';
          el.setAttribute('data-revealed', '');
        }, d0 * 1000);
      });
      return;
    }
    io.observe(el);
    // safety net: never leave content stuck hidden (paused tabs, odd browsers, no-IO)
    setTimeout(function () {
      if (el.hasAttribute('data-revealed')) return;
      el.style.transition = 'opacity .6s ease, transform .6s ease, filter .6s ease, clip-path .6s ease';
      el.style.opacity = '1'; el.style.transform = 'none'; el.style.filter = 'none';
      el.style.clipPath = 'inset(0% 0% 0% 0%)';
      el.setAttribute('data-revealed', '');
    }, 6000);
  }

  /* ---------- split text ---------- */
  function reveal(el) {
    el.querySelectorAll(':scope > span > span').forEach(function (s) {
      s.style.transform = 'translateY(0) rotate(0deg)';
      s.style.opacity = '1';
    });
  }

  function split(el) {
    if (el.hasAttribute('data-split-done')) return;   // idempotent: never re-park revealed text
    var mode = el.getAttribute('data-split') || 'words';
    var text = el.textContent;
    el.textContent = '';
    var units = mode === 'chars' ? text.split('') : text.split(/(\s+)/);
    units.forEach(function (u, i) {
      if (/^\s+$/.test(u)) { el.appendChild(document.createTextNode(u)); return; }
      var wrap = document.createElement('span');
      wrap.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:top;padding:0.02em 0.12em 0.14em;margin:-0.02em -0.12em -0.14em;';
      var inner = document.createElement('span');
      inner.textContent = u;
      inner.style.cssText = 'display:inline-block;transform:translateY(110%) rotate(3deg);opacity:0;transition:transform .95s cubic-bezier(.16,1,.3,1),opacity .7s ease;transition-delay:' + (i * (mode === 'chars' ? 0.018 : 0.04) + Math.min(0.24, parseFloat(el.getAttribute('data-delay') || 0))) + 's';
      wrap.appendChild(inner);
      el.appendChild(wrap);
    });
    var rect = el.getBoundingClientRect();
    el.setAttribute('data-split-done', '');
    if (rect.top < window.innerHeight * 0.92) {
      requestAnimationFrame(function () { reveal(el); });
      return;
    }
    var sio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        sio.unobserve(el);
        reveal(el);
      });
    }, { threshold: 0.15 });
    sio.observe(el);
  }

  /* one document-wide sweep: anything still parked gets revealed, whatever went wrong */
  function sweepSplits() {
    document.querySelectorAll('[data-split] > span > span').forEach(function (s) {
      if (getComputedStyle(s).opacity === '1') return;
      var r = s.getBoundingClientRect();
      if (r.top > window.innerHeight * 1.4) return;   // leave genuinely below-fold text to its observer
      s.style.transform = 'translateY(0) rotate(0deg)';
      s.style.opacity = '1';
    });
  }
  setTimeout(sweepSplits, 2500);
  setTimeout(sweepSplits, 6000);
  addEventListener('scroll', function () {
    clearTimeout(window.__splitSweep);
    window.__splitSweep = setTimeout(sweepSplits, 900);
  }, { passive: true });

  /* ---------- counters ---------- */
  function counter(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (!isFinite(target)) return false;
    var suffix = el.getAttribute('data-suffix') || '';
    if (suffix.indexOf('{{') === 0) suffix = '';
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(el);
        var t0 = performance.now(), dur = 1900;
        (function step(now) {
          var p = Math.min(1, (now - t0) / dur);
          var e = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * e).toLocaleString() + suffix;
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.4 });
    el.textContent = '0' + suffix;
    cio.observe(el);
  }

  /* ---------- magnetic ---------- */
  function magnetic(el) {
    if (touch) return;
    var s = parseFloat(el.getAttribute('data-magnetic') || '0.35');
    el.style.transition = 'transform .5s cubic-bezier(.16,1,.3,1)';
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      el.style.transition = 'transform .18s ease-out';
      el.style.transform = 'translate(' + dx * s + 'px,' + dy * s + 'px)';
    });
    el.addEventListener('pointerleave', function () {
      el.style.transition = 'transform .7s cubic-bezier(.16,1,.3,1)';
      el.style.transform = 'translate(0,0)';
    });
  }

  /* ---------- tilt ---------- */
  function tilt(el) {
    if (touch) return;
    var amt = parseFloat(el.getAttribute('data-tilt') || '8');
    el.style.transformStyle = 'preserve-3d';
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transition = 'transform .15s ease-out';
      el.style.transform = 'perspective(1000px) rotateY(' + px * amt + 'deg) rotateX(' + -py * amt + 'deg) translateZ(6px)';
      el.style.setProperty('--mx', (px * 100 + 50) + '%');
      el.style.setProperty('--my', (py * 100 + 50) + '%');
    });
    el.addEventListener('pointerleave', function () {
      el.style.transition = 'transform .9s cubic-bezier(.16,1,.3,1)';
      el.style.transform = 'perspective(1000px) rotateY(0) rotateX(0)';
    });
  }

  /* ---------- ripple ---------- */
  function ripple(el) {
    el.style.position = el.style.position || 'relative';
    el.style.overflow = 'hidden';
    el.addEventListener('pointerdown', function (e) {
      var r = el.getBoundingClientRect();
      var d = document.createElement('span');
      var size = Math.max(r.width, r.height) * 2.2;
      d.style.cssText = 'position:absolute;pointer-events:none;border-radius:999px;background:rgba(255,255,255,0.35);width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - r.left - size / 2) + 'px;top:' + (e.clientY - r.top - size / 2) + 'px;transform:scale(0);opacity:1;transition:transform .7s cubic-bezier(.16,1,.3,1),opacity .8s ease;';
      el.appendChild(d);
      requestAnimationFrame(function () { d.style.transform = 'scale(1)'; d.style.opacity = '0'; });
      setTimeout(function () { d.remove(); }, 900);
    });
  }

  /* ---------- scroll-driven ---------- */
  var parallaxEls = [], navEls = [], progressEls = [];
  /* ---------- anchor links use native smooth scroll ---------- */
  function initSmooth() {
    // Lenis writes scrollTop every frame — native smooth would retarget each write and stall it.
    // Only opt into CSS smooth when Lenis is NOT driving the page.
    document.documentElement.style.scrollBehavior = (window.__lenis || reduce) ? 'auto' : 'smooth';
    document.addEventListener('click', function (e) {
      var link = e.target.closest && e.target.closest('a[href^="#"]');
      if (!link) return;
      var id = link.getAttribute('href').slice(1);
      var t = id && document.getElementById(id);
      if (!t) return;
      e.preventDefault();
      if (window.__lenis) window.__lenis.scrollTo(t, { offset: -90 });
      else window.scrollTo({ top: t.getBoundingClientRect().top + scrollTop() - 90, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  function scroller() {
    var b = document.body, d = document.documentElement;
    if (d.scrollHeight - d.clientHeight > 4) return d;
    if (b && b.scrollHeight - b.clientHeight > 4) return b;
    return d;
  }
  function scrollTop() {
    if (window.__lenis) return scrollY;
    var el = scroller();
    return el.scrollTop || window.scrollY || 0;
  }
  var cache = { max: 1, vh: 0, para: [] };
  function measure() {
    var sc = scroller();
    cache.max = Math.max(1, sc.scrollHeight - sc.clientHeight);
    cache.vh = innerHeight;
    cache.para = parallaxEls.map(function (el) {
      var prev = el.style.transform;
      el.style.transform = 'none';
      var r = el.getBoundingClientRect();
      var top = r.top + scrollTop();
      el.style.transform = prev;
      return { el: el, mid: top + r.height / 2, sp: parseFloat(el.getAttribute('data-parallax')) || 0 };
    });
  }
  var queued = false, navOn = null;
  function queueScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; onScroll(0); });
  }
  function onScroll(vel) {
    var y = scrollTop();
    for (var i = 0; i < cache.para.length; i++) {
      var p = cache.para[i];
      p.el.style.transform = 'translate3d(0,' + (-(p.mid - y - cache.vh / 2) * p.sp) + 'px,0)';
    }
    var on = y > 40;
    if (on !== navOn) {
      navOn = on;
      navEls.forEach(function (el) {
        el.style.transform = on ? 'translateY(-5px) scale(0.975)' : 'none';
        el.style.background = on ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.42)';
        el.style.boxShadow = on ? '0 18px 50px -24px rgba(10,102,255,0.35)' : '0 10px 40px -30px rgba(10,102,255,0.25)';
      });
    }
    var prog = Math.min(1, y / cache.max);
    progressEls.forEach(function (el) { el.style.transform = 'scaleX(' + prog + ')'; });
  }
  addEventListener('scroll', queueScroll, { passive: true, capture: true });
  document.addEventListener('scroll', queueScroll, { passive: true, capture: true });
  addEventListener('resize', function () { measure(); queueScroll(); }, { passive: true });

  /* ---------- scan ---------- */
  var seen = new WeakSet();
  function scan() {
    // WeakSet keyed to the LIVE node: a data-* flag survives React re-renders and would
    // leave a replaced node stuck at opacity:0 with its observer bound to the dead one.
    var q = function (s, f) { document.querySelectorAll(s).forEach(function (el) { if (seen.has(el)) return; if (f(el) === false) return; seen.add(el); }); };
    q('[data-reveal]', prep);
    q('[data-split]', function (el) { reduce ? null : split(el); });
    q('[data-count]', counter);
    q('[data-magnetic]', magnetic);
    q('[data-tilt]', tilt);
    q('[data-ripple]', ripple);
    q('[data-parallax]', function (el) { el.style.willChange = 'transform'; parallaxEls.push(el); });
    q('[data-nav]', function (el) { el.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1),background .5s ease,box-shadow .5s ease'; navEls.push(el); });
    q('[data-progress]', function (el) { el.style.transformOrigin = 'left center'; el.style.transform = 'scaleX(0)'; progressEls.push(el); });
    measure();
    onScroll(0);
  }
  function boot() { initCursor(); scan(); }
  if (document.body) boot(); else addEventListener('DOMContentLoaded', boot);
  initSmooth();
  new MutationObserver(function () { if (document.body) boot(); }).observe(document.documentElement, { childList: true, subtree: true });
  window.SiteFX = { scan: scan };
})();
