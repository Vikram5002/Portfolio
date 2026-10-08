(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var motion = !!(gsap && ScrollTrigger) && !reduce;

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  root.classList.add('ready');
  if (motion) gsap.registerPlugin(ScrollTrigger);

  // ---------- Text splitting ----------
  function splitChars(el) {
    var chars = Array.from(el.textContent);
    el.textContent = '';
    return chars.map(function (c, i) {
      var s = document.createElement('span');
      s.className = c === ' ' ? 'ch ch-space' : 'ch';
      s.textContent = c === ' ' ? ' ' : c;
      s.style.setProperty('--i', i);
      el.appendChild(s);
      return s;
    });
  }
  function splitWords(el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    return words.map(function (w, i) {
      var s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      return s;
    });
  }
  function textWidth(el) {
    var r = document.createRange();
    r.selectNodeContents(el);
    return r.getBoundingClientRect().width;
  }

  // ---------- Masthead + "Let's talk": set to fill the measure exactly ----------
  var mast = $('.masthead');
  var mastLines = $$('.mast-line');
  mastLines.forEach(splitChars);
  var talkLine = $('.talk-line');
  if (talkLine) splitChars(talkLine);

  function fitType() {
    if (mast) {
      var avail = mast.clientWidth * 0.995;
      var stacked = window.innerWidth <= 860;
      mast.classList.toggle('is-stacked', stacked);
      mast.style.fontSize = '100px';
      mastLines.forEach(function (l) { l.style.fontSize = ''; });
      if (stacked) {
        mastLines.forEach(function (l) { l.style.fontSize = (100 * avail / textWidth(l)) + 'px'; });
      } else {
        var total = mastLines.reduce(function (sum, l) { return sum + textWidth(l); }, 0) + 22;
        mast.style.fontSize = (100 * avail / total) + 'px';
      }
    }
    if (talkLine) {
      var talk = talkLine.parentElement;
      talk.style.fontSize = '100px';
      talk.style.fontSize = (100 * talk.clientWidth * 0.97 / textWidth(talkLine)) + 'px';
    }
  }
  fitType();
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { fitType(); if (motion) ScrollTrigger.refresh(); }, 120);
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { fitType(); if (motion) ScrollTrigger.refresh(); });
  }

  // ---------- Local time in Hyderabad ----------
  var clockFmt = null;
  try { clockFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) {}
  function tick() {
    if (!clockFmt) return;
    var t = clockFmt.format(new Date());
    $$('.clock-time').forEach(function (el) { el.textContent = t; });
  }
  tick();
  setInterval(tick, 15000);

  // ---------- Smooth scrolling ----------
  var lenis = null;
  if (motion && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function holdScroll(on) { if (lenis) { if (on) lenis.stop(); else lenis.start(); } }

  // Header steps aside while reading down and comes back on the way up
  var header = $('.site-header');
  var lastY = window.scrollY;
  var jumping = false;
  function onScrollY(y) {
    if (jumping) { lastY = y; return; }
    if (Math.abs(y - lastY) < 6) return;
    header.classList.toggle('is-hidden', y > lastY && y > window.innerHeight * 0.5);
    lastY = y;
  }
  if (lenis) lenis.on('scroll', function (e) { onScrollY(e.scroll); });
  else window.addEventListener('scroll', function () { onScrollY(window.scrollY); }, { passive: true });

  function scrollToHash(hash) {
    var target = hash === '#top' ? 0 : document.querySelector(hash);
    if (target === null) return false;
    if (lenis) {
      jumping = true;
      header.classList.remove('is-hidden');
      lenis.scrollTo(target, { duration: 1.6, onComplete: function () { jumping = false; } });
    }
    else if (target === 0) window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    return true;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.classList.contains('project') || a.classList.contains('skip')) return;
    var hash = a.getAttribute('href');
    if (hash.length < 2) return;
    setMenu(false);
    if (scrollToHash(hash)) e.preventDefault();
  });

  // ---------- Menu (small screens) ----------
  var menuBtn = $('.menu-toggle');
  var menu = $('#menu');
  function setMenu(open) {
    if (!menu || open === root.classList.contains('menu-open')) return;
    root.classList.toggle('menu-open', open);
    if (open) header.classList.remove('is-hidden');
    menuBtn.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    menu.inert = !open;
    holdScroll(open);
  }
  if (menuBtn) menuBtn.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 860) setMenu(false); });

  // ---------- Cursor ----------
  var cursor = $('.cursor');
  if (fine && !reduce && cursor) {
    root.classList.add('has-cursor');
    cursor.classList.add('is-hidden');
    var cursorLabel = $('.cursor-label', cursor);
    var cx = -100, cy = -100, tx = -100, ty = -100;
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY;
      if (cx < -50) { cx = tx; cy = ty; }
      cursor.classList.remove('is-hidden');
    }, { passive: true });
    (function loop() {
      cx += (tx - cx) * 0.24;
      cy += (ty - cy) * 0.24;
      cursor.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      requestAnimationFrame(loop);
    })();
    document.addEventListener('pointerover', function (e) {
      var labelled = e.target.closest('[data-cursor]');
      var link = e.target.closest('a, button, label, input, textarea');
      cursor.classList.toggle('is-label', !!labelled);
      cursor.classList.toggle('is-link', !labelled && !!link);
      if (labelled) cursorLabel.textContent = labelled.getAttribute('data-cursor');
    });
    document.documentElement.addEventListener('mouseleave', function () { cursor.classList.add('is-hidden'); });
  }

  // ---------- Case-study sheet ----------
  var sheet = $('#case-sheet');
  var cases = sheet ? $$('.case', sheet) : [];
  var keys = cases.map(function (c) { return c.getAttribute('data-case'); });
  var current = 0;
  var lastFocus = null;
  function rowTitle(key) {
    var row = $('.project[data-case="' + key + '"] .p-title-in');
    return row ? row.textContent : '';
  }
  function showCase(i) {
    current = (i + cases.length) % cases.length;
    cases.forEach(function (c, k) { c.hidden = k !== current; });
    $('.sheet-count', sheet).textContent = pad2(current + 1) + ' / ' + pad2(cases.length);
    $('.sheet-next-title', sheet).textContent = rowTitle(keys[(current + 1) % cases.length]);
    $('.sheet-panel', sheet).scrollTop = 0;
  }
  function openSheet(key, trigger) {
    var i = keys.indexOf(key);
    if (i < 0) return;
    lastFocus = trigger || document.activeElement;
    showCase(i);
    if (sheet.open) return;
    if (typeof sheet.showModal === 'function') sheet.showModal(); else sheet.setAttribute('open', '');
    root.classList.add('sheet-open');
    holdScroll(true);
    requestAnimationFrame(function () { requestAnimationFrame(function () { sheet.classList.add('is-in'); }); });
  }
  function closeSheet() {
    if (!sheet || !sheet.open) return;
    sheet.classList.remove('is-in');
    setTimeout(function () {
      if (typeof sheet.close === 'function') sheet.close(); else sheet.removeAttribute('open');
      root.classList.remove('sheet-open');
      holdScroll(false);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }, reduce ? 0 : 620);
  }
  if (sheet) {
    $$('.project').forEach(function (row) {
      row.addEventListener('click', function (e) {
        e.preventDefault();
        openSheet(row.getAttribute('data-case'), row);
      });
    });
    sheet.addEventListener('cancel', function (e) { e.preventDefault(); closeSheet(); });
    sheet.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeSheet(); });
    $('.sheet-next', sheet).addEventListener('click', function () {
      sheet.classList.remove('is-in');
      setTimeout(function () {
        showCase(current + 1);
        sheet.classList.add('is-in');
      }, reduce ? 0 : 420);
    });
    var deep = /^#case-(\w+)$/.exec(location.hash);
    if (deep) setTimeout(function () { openSheet(deep[1]); }, motion ? 2600 : 0);
  }

  // ---------- Copy email ----------
  var toastEl = $('.toast');
  var toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2000);
  }
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      function done(ok) {
        if (!ok) { toast(text); return; }
        btn.textContent = 'Copied';
        btn.classList.add('is-done');
        toast('Email copied');
        setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('is-done'); }, 1800);
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallbackCopy(text)); });
      } else {
        done(fallbackCopy(text));
      }
    });
  });
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }

  // ---------- Contact form ----------
  var form = $('.form');
  if (form) {
    // FormSubmit sends people back here after a message, wherever the site is hosted.
    if (/^https?:$/.test(location.protocol)) {
      var next = document.createElement('input');
      next.type = 'hidden';
      next.name = '_next';
      next.value = location.origin + location.pathname + '?sent=1#contact';
      form.appendChild(next);
    }
    var send = $('.send', form);
    var sendLabel = $('.send-label', form);
    form.addEventListener('submit', function () { send.classList.add('is-loading'); sendLabel.textContent = 'Sending…'; });
    window.addEventListener('pageshow', function () { send.classList.remove('is-loading'); sendLabel.textContent = 'Send message'; });
  }
  if (/[?&]sent=1/.test(location.search)) {
    var note = $('.form-note');
    if (note) note.hidden = false;
    toast("Sent. I'll reply soon.");
  }

  $$('.year').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // ---------- Without GSAP (or with reduced motion): show everything as is ----------
  if (!motion) {
    root.classList.remove('loading', 'intro');
    return;
  }

  // ---------- Intro: counter, curtain, then the cover ----------
  function heroIntro() {
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    gsap.set('.masthead', { opacity: 1 });
    tl.fromTo('.hero-portrait-inner', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.7, ease: 'expo.inOut' }, 0)
      .fromTo('.hero-portrait img', { scale: 1.3 }, { scale: 1, duration: 2.4 }, 0.1)
      .fromTo('.mast-line .ch', { yPercent: 118 }, { yPercent: 0, duration: 1.4, stagger: 0.035 }, 0.6)
      .fromTo('.hero [data-intro]', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 1.3, stagger: 0.1 }, 1.05)
      .fromTo('.site-header', { opacity: 0 }, { opacity: 1, duration: 1.2 }, 1.15);
    root.classList.remove('intro');
    return tl;
  }
  var loader = $('.loader');
  if (root.classList.contains('loading') && loader) {
    holdScroll(true);
    var count = { v: 0 };
    var countEl = $('.loader-count', loader);
    var intro = gsap.timeline({ delay: 0.15 });
    intro.to(count, {
      v: 100, duration: 1.6, ease: 'power3.inOut',
      onUpdate: function () { countEl.textContent = String(Math.round(count.v)).padStart(3, '0'); }
    })
      .to('.loader-bar', { scaleX: 1, duration: 1.6, ease: 'power3.inOut' }, 0)
      .addLabel('out', '+=0.2')
      .to(loader, { yPercent: -100, duration: 1.15, ease: 'expo.inOut' }, 'out')
      .add(heroIntro(), 'out+=0.5')
      .call(function () {
        root.classList.remove('loading');
        try { sessionStorage.setItem('gv-seen', '1'); } catch (e) {}
        holdScroll(false);
      }, null, 'out+=1.15');
  } else {
    root.classList.remove('loading');
    heroIntro();
  }

  // ---------- Hero: depth on scroll and pointer ----------
  var heroST = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
  gsap.to('.hero-portrait', { yPercent: 16, ease: 'none', scrollTrigger: heroST });
  gsap.to('.masthead', { yPercent: -40, ease: 'none', scrollTrigger: heroST });
  gsap.to('.hero-ui', { y: -90, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '55% top', scrub: true } });
  if (fine) {
    var px = gsap.quickTo('.hero-portrait-inner', 'x', { duration: 1.4, ease: 'power3' });
    var mx = gsap.quickTo('.mast-row', 'x', { duration: 1.4, ease: 'power3' });
    $('.hero').addEventListener('pointermove', function (e) {
      var r = e.clientX / window.innerWidth - 0.5;
      px(r * -22);
      mx(r * 30);
    });
  }

  // ---------- Running headers: rule draws, labels lift ----------
  $$('[data-run]').forEach(function (el) {
    gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 92%', once: true } })
      .fromTo(el, { '--draw': 0 }, { '--draw': 1, duration: 1.4, ease: 'expo.inOut' })
      .from(el.children, { y: 14, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out', clearProps: 'transform,opacity' }, 0.3);
  });

  // ---------- Statements light up word by word as you read ----------
  $$('.statement').forEach(function (el) {
    var words = splitWords(el);
    gsap.fromTo(words, { opacity: 0.13 }, {
      opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 48%', scrub: true }
    });
  });

  // ---------- Figures count up ----------
  $$('[data-count]').forEach(function (el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, {
      v: target, duration: 1.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      onUpdate: function () { el.textContent = Math.round(o.v); }
    });
  });

  // ---------- Generic reveals ----------
  $$('[data-reveal]').forEach(function (el) {
    if (el.closest('[data-stagger]')) return;
    gsap.from(el, { y: 36, opacity: 0, duration: 1.2, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  $$('[data-stagger]').forEach(function (group) {
    gsap.from($$('[data-reveal]', group), { y: 36, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, clearProps: 'transform,opacity', scrollTrigger: { trigger: group, start: 'top 88%', once: true } });
  });

  // ---------- Work list ----------
  $$('.project').forEach(function (row) {
    gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 92%', once: true } })
      .from($('.p-title-in', row), { yPercent: 112, duration: 1.3, ease: 'expo.out', clearProps: 'transform' })
      .from([$('.p-no', row), $('.p-kind', row), $('.p-result', row), $('.p-year', row)], { y: 14, opacity: 0, duration: 1, stagger: 0.05, ease: 'expo.out', clearProps: 'transform,opacity' }, 0.15);
  });

  var list = $('.projects');
  var preview = $('.preview');
  if (fine && list && preview) {
    var previewImgs = $$('img', preview);
    gsap.set(preview, { xPercent: -50, yPercent: -50, scale: 0.6, opacity: 0 });
    var pvX = gsap.quickTo(preview, 'x', { duration: 0.75, ease: 'power3' });
    var pvY = gsap.quickTo(preview, 'y', { duration: 0.75, ease: 'power3' });
    var pvR = gsap.quickTo(preview, 'rotation', { duration: 0.9, ease: 'power3' });
    var lastX = null;
    list.addEventListener('pointermove', function (e) {
      pvX(e.clientX);
      pvY(e.clientY);
      if (lastX !== null) pvR(clamp((e.clientX - lastX) * 0.9, -12, 12));
      lastX = e.clientX;
    });
    $$('.project', list).forEach(function (row) {
      row.addEventListener('pointerenter', function (e) {
        var key = row.getAttribute('data-case');
        previewImgs.forEach(function (img) { img.classList.toggle('is-active', img.getAttribute('data-case') === key); });
        if (lastX === null) { gsap.set(preview, { x: e.clientX, y: e.clientY }); }
        gsap.to(preview, { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' });
      });
    });
    list.addEventListener('pointerleave', function () {
      lastX = null;
      pvR(0);
      gsap.to(preview, { opacity: 0, scale: 0.6, duration: 0.5, ease: 'expo.out' });
    });
  }

  // ---------- Contact: the big line rises in ----------
  if (talkLine) {
    gsap.from($$('.ch', talkLine), {
      yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.04, clearProps: 'transform',
      scrollTrigger: { trigger: talkLine, start: 'top 88%', once: true }
    });
  }
})();
