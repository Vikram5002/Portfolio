(function () {
  var root = document.documentElement;
  var body = document.body;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var richMotion = finePointer && !reduceMotion;

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { return null; }
  }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  root.classList.add('ready');

  // ---------- Theme: dark by default, light on request, with a circular reveal ----------
  var themeBtn = $('.theme-toggle');
  var metaTheme = $('meta[name="theme-color"]');
  function isLight() { return root.getAttribute('data-theme') === 'light'; }
  function applyTheme(light) {
    if (light) root.setAttribute('data-theme', 'light'); else root.removeAttribute('data-theme');
    themeBtn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    if (metaTheme) metaTheme.setAttribute('content', light ? '#f5f6fa' : '#06070b');
    store('theme', light ? 'light' : 'dark');
  }
  if (themeBtn) {
    applyTheme(isLight());
    themeBtn.addEventListener('click', function () {
      var next = !isLight();
      if (!document.startViewTransition || reduceMotion) { applyTheme(next); return; }
      var r = themeBtn.getBoundingClientRect();
      var x = r.left + r.width / 2, y = r.top + r.height / 2;
      var end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      var vt = document.startViewTransition(function () { applyTheme(next); });
      vt.ready.then(function () {
        root.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 750, easing: 'cubic-bezier(.7, 0, .2, 1)', pseudoElement: '::view-transition-new(root)' }
        );
      });
    });
  }

  // ---------- Grid toggle: reveals the page's own 8pt grid and 12-column layout ----------
  var gridToggle = $('.grid-toggle');
  function setGrid(on) {
    body.classList.toggle('show-grid', on);
    gridToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    var label = on ? 'Hide the page grid' : 'Show the page grid';
    gridToggle.setAttribute('aria-label', label);
    gridToggle.title = label + ' (G)';
    store('showGrid', on ? '1' : '0');
  }
  if (gridToggle) {
    if (store('showGrid') === '1') setGrid(true);
    gridToggle.addEventListener('click', function () { setGrid(!body.classList.contains('show-grid')); });
    document.addEventListener('keydown', function (e) {
      if (e.key && e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey &&
          !/input|textarea|select/i.test(e.target.tagName) && !e.target.isContentEditable) {
        setGrid(!body.classList.contains('show-grid'));
      }
    });
  }

  // ---------- Mobile menu ----------
  var menuBtn = $('.menu-btn');
  var mobileNav = $('#mobile-nav');
  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mobileNav.setAttribute('aria-hidden', open ? 'false' : 'true');
    mobileNav.inert = !open;
  }
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
    mobileNav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); }
    });
    window.addEventListener('resize', function () {
      if (innerWidth > 1180 && root.classList.contains('menu-open')) setMenu(false);
    });
  }

  // ---------- Nav: active section + sliding indicator ----------
  var nav = $('.nav');
  var indicator = $('.nav-indicator');
  var navLinks = $$('.nav a');
  var mobileLinks = $$('.mobile-nav nav a');
  var activeLink = null;
  var hovering = false;
  function moveIndicator(link) {
    if (!indicator) return;
    if (!link) { indicator.style.opacity = '0'; return; }
    indicator.style.opacity = '1';
    indicator.style.width = link.offsetWidth + 'px';
    indicator.style.transform = 'translateX(' + link.offsetLeft + 'px)';
  }
  navLinks.forEach(function (a) {
    a.addEventListener('mouseenter', function () { hovering = true; moveIndicator(a); });
  });
  if (nav) nav.addEventListener('mouseleave', function () { hovering = false; moveIndicator(activeLink); });

  var sections = navLinks.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);
  var hero = $('#home');
  if ('IntersectionObserver' in window && sections.length) {
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = '#' + entry.target.id;
        activeLink = null;
        navLinks.forEach(function (a) {
          var on = a.getAttribute('href') === id;
          a.classList.toggle('active', on);
          if (on) activeLink = a;
        });
        mobileLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === id); });
        if (!hovering) moveIndicator(activeLink);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { navIO.observe(s); });
    if (hero) navIO.observe(hero);
  }
  function refreshIndicator() { if (!hovering) moveIndicator(activeLink); }
  window.addEventListener('resize', refreshIndicator);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshIndicator);

  // ---------- Split section titles into masked words ----------
  $$('.split').forEach(function (el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span');
            var wi = document.createElement('span');
            w.className = 'w';
            wi.className = 'wi';
            wi.style.setProperty('--i', i++);
            wi.textContent = part;
            w.appendChild(wi);
            frag.appendChild(w);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== 'SUP') {
          walk(child);
        }
      });
    })(el);
    el.setAttribute('data-reveal', '');
  });

  // ---------- Scroll reveal ----------
  $$('[data-stagger]').forEach(function (group) {
    $$('[data-reveal]', group).forEach(function (el, i) {
      if (el.parentElement.closest('[data-stagger]') === group) el.style.setProperty('--d', (i * 0.09) + 's');
    });
  });
  var revealEls = $$('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        revealIO.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    revealEls.forEach(function (el) { revealIO.observe(el); });
  }

  // ---------- About lead: words light up as you read down ----------
  var lead = $('.about-lead');
  var leadWords = [];
  var leadLit = -1;
  if (lead && !reduceMotion) {
    var words = lead.textContent.trim().split(/\s+/);
    lead.textContent = '';
    words.forEach(function (word, i) {
      var s = document.createElement('span');
      s.className = 'wd';
      s.textContent = word;
      lead.appendChild(s);
      if (i < words.length - 1) lead.appendChild(document.createTextNode(' '));
    });
    lead.classList.add('is-split');
    leadWords = $$('.wd', lead);
  }
  function updateLead() {
    if (!leadWords.length) return;
    var r = lead.getBoundingClientRect();
    var vh = innerHeight;
    var p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.3), 0, 1);
    var n = Math.round(p * leadWords.length);
    if (n === leadLit) return;
    leadLit = n;
    leadWords.forEach(function (w, i) { w.classList.toggle('on', i < n); });
  }

  // ---------- Scroll-driven bits: progress bar, top bar state, scroll cue ----------
  var progress = $('.progress');
  var topbar = $('.topbar');
  var cue = $('.scroll-cue');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var max = root.scrollHeight - innerHeight;
      var y = window.scrollY;
      if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
      if (topbar) topbar.classList.toggle('scrolled', y > 24);
      if (cue) cue.classList.toggle('is-gone', y > 80);
      updateLead();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // ---------- Count-up for the hero numbers ----------
  var counters = $$('[data-count]');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    counters.forEach(function (el) { el.textContent = '0'; });
    var countIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countIO.unobserve(entry.target);
        var el = entry.target;
        var target = parseInt(el.getAttribute('data-count'), 10);
        var fact = el.closest('.fact');
        var delay = fact ? parseFloat(getComputedStyle(fact).getPropertyValue('--d')) * 1000 || 0 : 0;
        setTimeout(function () {
          var start = performance.now(), dur = 1400;
          (function step(now) {
            var t = clamp((now - start) / dur, 0, 1);
            var eased = 1 - Math.pow(2, -10 * t);
            el.textContent = Math.round(target * (t === 1 ? 1 : eased));
            if (t < 1) requestAnimationFrame(step);
          })(start);
        }, delay);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { countIO.observe(el); });
  }

  // ---------- Pointer effects (desktop only) ----------
  if (richMotion) {
    // Custom cursor: a dot that tracks exactly and a ring that follows with easing
    root.classList.add('has-cursor');
    var cursor = $('.cursor');
    var dot = $('.cursor-dot');
    var ring = $('.cursor-ring');
    var label = $('.cursor-label');
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, seen = false;
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      if (!seen) { seen = true; rx = mx; ry = my; }
      cursor.classList.remove('is-hidden');
    }, { passive: true });
    (function loop() {
      rx += (mx - rx) * 0.2;
      ry += (my - ry) * 0.2;
      ring.style.transform = 'translate3d(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px,0)';
      requestAnimationFrame(loop);
    })();
    document.addEventListener('pointerover', function (e) {
      var labelled = e.target.closest('[data-cursor]');
      var field = e.target.closest('input, textarea');
      var link = e.target.closest('a, button, label, .chips li');
      cursor.classList.toggle('is-label', !!labelled);
      cursor.classList.toggle('is-text', !labelled && !!field);
      cursor.classList.toggle('is-link', !labelled && !field && !!link);
      if (labelled) label.textContent = labelled.getAttribute('data-cursor');
    });
    document.documentElement.addEventListener('pointerleave', function () { cursor.classList.add('is-hidden'); });
    window.addEventListener('pointerdown', function () { cursor.classList.add('is-down'); });
    window.addEventListener('pointerup', function () { cursor.classList.remove('is-down'); });

    // Magnetic buttons
    $$('.magnetic').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - (r.left + r.width / 2);
        var y = e.clientY - (r.top + r.height / 2);
        el.style.translate = (x * 0.22).toFixed(1) + 'px ' + (y * 0.32).toFixed(1) + 'px';
      });
      el.addEventListener('pointerleave', function () { el.style.translate = ''; });
    });

    // Spotlight cards
    $$('.spot').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    // 3D tilt on project screens
    $$('.tilt').forEach(function (el) {
      var fig = $('.case-figure', el);
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        fig.style.setProperty('--ry', (px * 10).toFixed(2) + 'deg');
        fig.style.setProperty('--rx', (-py * 8).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', function () {
        fig.style.setProperty('--ry', '0deg');
        fig.style.setProperty('--rx', '0deg');
      });
    });

    // Hero spotlight follows the pointer
    var heroBg = $('.hero');
    var spotlight = $('.spotlight');
    if (heroBg && spotlight) {
      heroBg.addEventListener('pointermove', function (e) {
        var r = heroBg.getBoundingClientRect();
        spotlight.style.setProperty('--sx', (e.clientX - r.left) + 'px');
        spotlight.style.setProperty('--sy', (e.clientY - r.top) + 'px');
      });
    }
  }

  // ---------- Toast ----------
  var toastEl = $('.toast');
  var toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  // ---------- Copy email ----------
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      function done(ok) {
        toast(ok ? 'Email copied to clipboard' : text);
        if (!ok) return;
        btn.classList.add('copied');
        setTimeout(function () { btn.classList.remove('copied'); }, 1800);
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
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    body.removeChild(ta);
    return ok;
  }

  // ---------- Contact form ----------
  var form = $('.contact-form');
  if (form) {
    // FormSubmit redirects here after sending; derived from wherever the site is hosted.
    if (/^https?:$/.test(location.protocol)) {
      var next = document.createElement('input');
      next.type = 'hidden';
      next.name = '_next';
      next.value = location.origin + location.pathname + '?sent=1#contact';
      form.appendChild(next);
    }
    var submitBtn = $('button[type="submit"]', form);
    var submitLabel = submitBtn && $('.btn-label', submitBtn);
    form.addEventListener('submit', function () {
      if (!submitBtn) return;
      submitBtn.classList.add('is-loading');
      if (submitLabel) submitLabel.textContent = 'Sending…';
    });
    window.addEventListener('pageshow', function () {
      if (!submitBtn) return;
      submitBtn.classList.remove('is-loading');
      if (submitLabel) submitLabel.textContent = 'Send message';
    });
  }
  if (/[?&]sent=1/.test(location.search)) {
    var note = $('.form-note');
    if (note) note.hidden = false;
    toast("Sent. I'll reply soon.");
  }

  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
