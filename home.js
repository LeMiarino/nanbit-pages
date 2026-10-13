/*
 * The landing page's two movements. The page reads in full without either.
 *
 * 1. The field of days behind the headline, on a canvas: a grid of dots, the
 *    past (left of today's dot, the headline's full stop) ticked as discs in
 *    Steel's heat with the odd habit color, the future as rings, which is how
 *    the app draws a day still to come. Every eight seconds a sweep of ticks
 *    crosses the past and lands on today, which flares and sends a ring out.
 *    Where the words and the phone are, the field goes quiet. With Reduce
 *    Motion on it is drawn once and stays still.
 * 2. Sections rising into place as they come into view (nanbit.css, [data-rise]).
 * 3. The iPhone under the headline playing three of the app's own screens in
 *    turn: 3 of 5, then a tick, then the tick that makes all five done, which
 *    lands as the sweep reaches today. Still, on the first, with Reduce Motion.
 * 4. A color chosen under "Make it yours" worn by a screen beside the colors
 *    and by that iPhone: the app's own Today in that color, light or dark as
 *    the reader's screen is. The pictures wait in a <template>, so one is
 *    fetched only when its color is chosen.
 *
 * Nothing here asks another site for anything, and nothing is stored.
 */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- rising */
  var rising = [].slice.call(document.querySelectorAll('[data-rise]'));
  if (still || !('IntersectionObserver' in window)) {
    rising.forEach(function (el) { el.classList.add('in'); });
  } else {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        seen.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rising.forEach(function (el) { seen.observe(el); });
  }

  /* ---------------------------------------------------------------- colors */
  var phone = document.querySelector('.top .phone');
  var wearing = false;
  (function () {
    var store = document.getElementById('colors');
    var tryOn = document.querySelector('.try');
    var worn = phone && phone.querySelector('.worn');
    var swatches = [].slice.call(document.querySelectorAll('.swatch'));
    if (!store || !store.content || !tryOn || !swatches.length) return;
    var dark = window.matchMedia('(prefers-color-scheme: dark)');
    var chosen = 'steel', asked = 0;

    function pictureOf(color) {
      var img = store.content.querySelector('img[data-color="' + color + '"][data-scheme="' + (dark.matches ? 'dark' : 'light') + '"]');
      return img ? img.getAttribute('src') : null;
    }
    function show(color, name, src) {
      // The screen beside the colors. Its <source> would outrank a new src, so it
      // goes, after the src is set, so the picture it was hiding is never fetched.
      tryOn.classList.add('swap');
      setTimeout(function () {
        tryOn.src = src;
        [].forEach.call(tryOn.parentNode.querySelectorAll('source'), function (s) { s.parentNode.removeChild(s); });
        tryOn.alt = "Nanbit's Today screen in " + name + '.';
        tryOn.classList.remove('swap');
      }, still ? 0 : 200);
      // The iPhone under the headline: Steel is the screens it plays; any other color is worn over them.
      if (!phone || !worn) return;
      wearing = color !== 'steel';
      if (wearing) { worn.src = src; worn.hidden = false; }
      phone.classList.toggle('wearing', wearing);
    }
    function wear(color) {
      var src = pictureOf(color);
      if (!src) return;
      chosen = color;
      var name = color;
      swatches.forEach(function (b) {
        var on = b.getAttribute('data-color') === color;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) name = b.textContent.replace(/\s+/g, ' ').trim();
      });
      var mine = ++asked;
      var ready = new Image();
      ready.onload = function () { if (mine === asked) show(color, name, src); };
      ready.src = src;
    }
    swatches.forEach(function (b) {
      b.addEventListener('click', function () { wear(b.getAttribute('data-color')); });
    });
    var again = function () { if (chosen !== 'steel') wear(chosen); };
    if (dark.addEventListener) dark.addEventListener('change', again); else if (dark.addListener) dark.addListener(again);
  })();

  /* ----------------------------------------------------------------- field */
  var top = document.querySelector('.top');
  var canvas = top && top.querySelector('canvas.field');
  var todayEl = top && top.querySelector('.today');
  if (!canvas || !todayEl || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var HEAT = ['#2C333C', '#3F4955', '#5E6A79', '#8E9BAB'];
  var HABIT = ['#6CC49B', '#7EA2FF', '#F08DA0', '#C79BEA', '#6CC3E0', '#D8B566'];
  var LOOP = 8, HIT = 4.6;
  var W = 0, H = 0, dots = [], today = { x: 0, y: 0, r: 0 }, unit = 1;

  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function clamp(x) { return Math.min(1, Math.max(0, x)); }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); }

  /* The boxes of the words themselves (a block is as wide as its column), and of the phone. */
  function quietBoxes(origin) {
    var boxes = [];
    [].forEach.call(top.querySelectorAll('[data-quiet]'), function (el) {
      var rects;
      if (el.getAttribute('data-quiet') === 'box') rects = [el.getBoundingClientRect()];
      else { var range = document.createRange(); range.selectNodeContents(el); rects = range.getClientRects(); }
      [].forEach.call(rects, function (r) {
        if (r.width > 2) boxes.push({ l: r.left - origin.left, t: r.top - origin.top, r: r.right - origin.left, b: r.bottom - origin.top });
      });
    });
    return boxes;
  }

  function build() {
    var box = top.getBoundingClientRect();
    var ratio = Math.min(2, window.devicePixelRatio || 1);
    W = box.width; H = box.height;
    canvas.width = Math.round(W * ratio); canvas.height = Math.round(H * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    var t = todayEl.getBoundingClientRect();
    today = { x: t.left - box.left + t.width / 2, y: t.top - box.top + t.height / 2, r: t.width / 2 };
    var step = W < 720 ? 24 : 30;
    unit = step / 34;
    var quiet = quietBoxes(box);
    var pad = 10 * unit, soft = 44 * unit;
    var random = rng(27);
    var ox = today.x % step, oy = today.y % step;
    dots = [];
    for (var y = oy - step; y < H + step; y += step) {
      for (var x = ox - step; x < W + step; x += step) {
        if (Math.abs(x - today.x) < 1 && Math.abs(y - today.y) < 1) continue;
        var q = 1;
        for (var i = 0; i < quiet.length; i++) {
          var b = quiet[i];
          var dx = Math.max(b.l - pad - x, 0, x - b.r - pad), dy = Math.max(b.t - pad - y, 0, y - b.b - pad);
          q = Math.min(q, smooth(0, soft, Math.sqrt(dx * dx + dy * dy)));
        }
        var dist = Math.sqrt(Math.pow(x - today.x, 2) + Math.pow((y - today.y) * 1.35, 2));
        var near = Math.exp(-dist / (1500 * unit));
        var past = x < today.x - step / 2 || (Math.abs(x - today.x) < step / 2 && y < today.y);
        var edge = smooth(-12, 90 * unit, Math.min(x, W - x, y, H - y));
        var done = past && random() < 0.3 + 0.42 * near;
        var level = 0;
        if (done) { var u = random() * (0.55 + 0.6 * near); level = u < 0.3 ? 0 : u < 0.55 ? 1 : u < 0.8 ? 2 : 3; }
        var habit = done && random() < 0.06 ? HABIT[Math.floor(random() * HABIT.length)] : null;
        var seen = q * edge;
        if (seen > 0.01) dots.push({ x: x, y: y, past: past, done: done, level: level, habit: habit, seen: seen, near: near, phase: random() });
      }
    }
  }

  function draw(time) {
    var t = ((time % LOOP) + LOOP) % LOOP;
    ctx.clearRect(0, 0, W, H);
    var front = -140 * unit + (today.x + 140 * unit) * smooth(0.4, HIT, t);
    var sweeping = t > 0.3 && t < HIT + 0.2;
    var ringAt = (t - HIT) * 980 * unit, ringWide = 110 * unit;
    var ringing = t > HIT && t < HIT + 2.2;
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      var away = Math.sqrt(Math.pow(d.x - today.x, 2) + Math.pow(d.y - today.y, 2));
      var ring = ringing ? Math.exp(-Math.pow(away - ringAt, 2) / (2 * ringWide * ringWide)) * (1 - (t - HIT) / 2.2) : 0;
      if (!d.past) {
        // A day still to come: a ring, fainter the further it is from today.
        ctx.globalAlpha = clamp(d.seen * (0.2 + 0.8 * Math.pow(d.near, 1.5)) * (0.7 + 0.5 * ring));
        ctx.strokeStyle = ring > 0.05 ? '#A3B1C2' : 'rgba(184,196,210,0.5)';
        ctx.lineWidth = 1.2 * unit;
        ctx.beginPath(); ctx.arc(d.x, d.y, 4.2 * unit * (1 + 0.35 * ring), 0, 6.2832); ctx.stroke();
        continue;
      }
      var lit = 0;
      if (sweeping && d.done) {
        var behind = front - d.x;
        if (behind > -26 * unit) lit = Math.exp(-Math.max(0, behind) / (115 * unit)) * smooth(-26 * unit, 9 * unit, behind);
      }
      var breathe = 0.5 + 0.5 * Math.sin(6.2832 * (t / LOOP * 2 + d.phase));
      var radius = (d.done ? [3.7, 4.6, 5.5, 6.4][d.level] : 1.45) * unit * (1 + 0.28 * lit + 0.35 * ring);
      ctx.globalAlpha = clamp(d.seen * (d.done ? [0.75, 0.82, 0.9, 1][d.level] * (0.86 + 0.14 * breathe) : 1));
      ctx.fillStyle = d.done ? (d.habit || HEAT[d.level]) : 'rgba(184,196,210,0.16)';
      ctx.beginPath(); ctx.arc(d.x, d.y, radius, 0, 6.2832); ctx.fill();
      var glow = Math.max(lit, ring * (d.done ? 1 : 0.7));
      if (glow > 0.02) {
        ctx.globalAlpha = clamp(glow * d.seen * (d.done ? 0.85 : 0.5));
        ctx.fillStyle = d.done ? '#E9EEF4' : '#A3B1C2';
        ctx.beginPath(); ctx.arc(d.x, d.y, radius * (d.done ? 0.62 : 1.2), 0, 6.2832); ctx.fill();
      }
    }
    // Today: a halo that breathes, and flares when the sweep arrives.
    var flare = t > HIT - 0.15 ? Math.exp(-(t - HIT) * 1.6) * smooth(HIT - 0.15, HIT + 0.05, t) : 0;
    var breath = 0.5 + 0.5 * Math.sin(6.2832 * t / (LOOP / 2));
    var halo = today.r * 11 * (1 + 0.08 * breath + 0.45 * flare);
    var g = ctx.createRadialGradient(today.x, today.y, today.r * 0.6, today.x, today.y, halo);
    g.addColorStop(0, 'rgba(255,139,85,' + (0.42 + 0.06 * breath + 0.35 * flare) + ')');
    g.addColorStop(0.35, 'rgba(255,139,85,' + (0.12 + 0.02 * breath + 0.15 * flare) + ')');
    g.addColorStop(1, 'rgba(255,139,85,0)');
    ctx.globalAlpha = 1; ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(today.x, today.y, halo, 0, 6.2832); ctx.fill();
    if (t > HIT && t < HIT + 1.6) {
      var k = (t - HIT) / 1.6;
      ctx.globalAlpha = (1 - k) * 0.7; ctx.strokeStyle = '#FF8B55'; ctx.lineWidth = (4 * (1 - k) + 1) * unit;
      ctx.beginPath(); ctx.arc(today.x, today.y, today.r * (1.3 + k * 9), 0, 6.2832); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    todayEl.style.transform = 'scale(' + (1 + 0.16 * flare) + ')';
    // The iPhone's screens, in step: a tick as the sweep nears, all done as it lands.
    if (phone && !still && !wearing) {
      var screen = t < 3.3 ? '1' : t < HIT ? '2' : t < 7.55 ? '3' : '1';
      if (phone.getAttribute('data-frame') !== screen) phone.setAttribute('data-frame', screen);
    }
  }

  var REST = 7.2;           // a moment of the loop with nothing in flight, for the still picture
  var started = null, frame = 0, visible = true, last = 0;
  function tick(now) {
    frame = 0;
    if (!visible || document.hidden) return;
    if (started === null) started = now - REST * 1000;
    if (now - last >= 33) { last = now; draw((now - started) / 1000); }
    frame = requestAnimationFrame(tick);
  }
  function wake() { if (!still && !frame) frame = requestAnimationFrame(tick); }
  function layout() { build(); if (still) draw(REST); else if (!frame) draw(REST); wake(); }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; wake(); }).observe(top);
  }
  document.addEventListener('visibilitychange', wake);
  var wait = 0;
  window.addEventListener('resize', function () { clearTimeout(wait); wait = setTimeout(layout, 150); });
  layout();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  window.addEventListener('load', layout);
})();
