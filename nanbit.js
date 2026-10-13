/*
 * "On this page": a row of chips under the top bar, one for each section, the
 * one in view marked. The pages read in full without it.
 */
(function () {
  var main = document.querySelector('main');
  if (!main) return;
  var heads = [].slice.call(main.querySelectorAll(':scope > section > h2'));
  if (heads.length < 3) return;

  var nav = document.createElement('nav');
  nav.className = 'toc';
  nav.setAttribute('aria-label', 'On this page');
  var chips = [];
  heads.forEach(function (h, i) {
    var section = h.parentNode;
    var id = section.id || 's' + (i + 1) + '-' + h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    section.id = id;
    var a = document.createElement('a');
    a.href = '#' + id;
    a.textContent = h.getAttribute('data-short') || h.textContent;
    nav.appendChild(a);
    chips.push({ a: a, section: section });
  });
  var hero = main.querySelector('.hero');
  main.insertBefore(nav, hero ? hero.nextSibling : main.firstChild);

  function mark(current) {
    chips.forEach(function (c) {
      var on = c === current;
      c.a.classList.toggle('on', on);
      if (on) c.a.setAttribute('aria-current', 'true'); else c.a.removeAttribute('aria-current');
    });
    if (current && nav.scrollWidth > nav.clientWidth) {
      var left = current.a.offsetLeft - (nav.clientWidth - current.a.offsetWidth) / 2;
      nav.scrollTo({ left: left, behavior: 'auto' });
    }
  }

  function update() {
    var line = window.innerHeight * 0.3;
    var current = null;
    chips.forEach(function (c) {
      if (c.section.getBoundingClientRect().top <= line) current = c;
    });
    mark(current);
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; update(); });
  }, { passive: true });
  update();
})();

/*
 * Support's questions, searched: a field above them that keeps the questions
 * whose words, or whose answer's words, hold everything typed. Nothing typed
 * leaves the page.
 */
(function () {
  var faq = document.querySelector('.card.faq');
  if (!faq) return;
  var items = [].slice.call(faq.querySelectorAll('details'));
  if (items.length < 4) return;
  var box = document.createElement('div');
  box.className = 'find';
  box.innerHTML = '<label class="sr" for="find">Search the questions</label>' +
    '<input id="find" type="search" placeholder="Search the questions" autocomplete="off" enterkeyhint="search">' +
    '<p class="none" role="status" hidden></p>';
  faq.insertBefore(box, items[0]);
  var input = box.querySelector('input'), none = box.querySelector('.none');
  var texts = items.map(function (d) { return d.textContent.toLowerCase().replace(/\s+/g, ' '); });
  input.addEventListener('input', function () {
    var words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    var shown = 0;
    items.forEach(function (d, i) {
      var keep = words.every(function (w) { return texts[i].indexOf(w) >= 0; });
      d.hidden = !keep;
      if (keep) shown++;
    });
    if (words.length && !shown) {
      none.textContent = 'No question matches \u201C' + input.value.trim() + '\u201D. Write to us and we will help.';
      none.hidden = false;
    } else {
      none.textContent = '';
      none.hidden = true;
    }
  });
})();

/*
 * The corner of the field of days on a written page, drawn live over the still
 * one in nanbit.css: rings for days still to come, today's dot among them, and
 * every eight seconds a ring going out from today through the rest. Left to the
 * still one with Reduce Motion on.
 */
(function () {
  var hero = document.querySelector('main:not(.home) > .hero');
  if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var canvas = document.createElement('canvas');
  if (!canvas.getContext) return;
  canvas.className = 'corner';
  canvas.setAttribute('aria-hidden', 'true');
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, rings = [], today = { x: 0, y: 0, r: 5.5 };
  var LOOP = 8, OUT = 1.2;

  function smooth(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function build() {
    var box = hero.getBoundingClientRect();
    var ratio = Math.min(2, window.devicePixelRatio || 1);
    W = box.width; H = box.height;
    canvas.width = Math.round(W * ratio); canvas.height = Math.round(H * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    var narrow = W < 640;
    // The still pattern's own grid: 30 apart, 16 in from the top and the right.
    today = narrow ? { x: W - 65, y: 27, r: 4.5 } : { x: W - 125, y: 87, r: 5.5 };
    rings = [];
    for (var y = 27; y < H + 30; y += 30) {
      for (var x = W - 35; x > -30; x -= 30) {
        if (Math.abs(x - today.x) < 1 && Math.abs(y - today.y) < 1) continue;
        var seen = narrow
          ? (1 - smooth(0.2, 0.8, Math.sqrt(Math.pow((W - x) / (0.7 * W), 2) + Math.pow(y / H, 2)))) * (1 - smooth(46, 62, y))
          : 1 - smooth(0.12, 0.72, Math.sqrt(Math.pow((W - x) / (0.62 * W), 2) + Math.pow(y / (1.2 * H), 2)));
        if (seen > 0.02) rings.push({ x: x, y: y, seen: seen, away: Math.sqrt(Math.pow(x - today.x, 2) + Math.pow(y - today.y, 2)) });
      }
    }
  }
  function draw(time) {
    var t = ((time % LOOP) + LOOP) % LOOP;
    ctx.clearRect(0, 0, W, H);
    var going = t > OUT && t < OUT + 3.2;
    var reach = (t - OUT) * 300, life = going ? 1 - (t - OUT) / 3.2 : 0;
    ctx.lineWidth = 1.15;
    for (var i = 0; i < rings.length; i++) {
      var r = rings[i];
      var wave = going ? Math.exp(-Math.pow(r.away - reach, 2) / 3200) * life : 0;
      ctx.globalAlpha = Math.min(1, r.seen * (0.42 + 0.58 * wave));
      ctx.strokeStyle = wave > 0.05 ? '#C7D1DD' : '#B8C4D2';
      ctx.beginPath(); ctx.arc(r.x, r.y, 4.05 * (1 + 0.3 * wave), 0, 6.2832); ctx.stroke();
    }
    var flare = t > OUT - 0.1 ? Math.exp(-(t - OUT) * 1.8) * smooth(OUT - 0.1, OUT + 0.05, t) : 0;
    var breath = 0.5 + 0.5 * Math.sin(6.2832 * t / (LOOP / 2));
    var halo = today.r * 8.4 * (1 + 0.08 * breath + 0.4 * flare);
    var g = ctx.createRadialGradient(today.x, today.y, today.r * 0.6, today.x, today.y, halo);
    g.addColorStop(0, 'rgba(255,139,85,' + (0.4 + 0.06 * breath + 0.3 * flare) + ')');
    g.addColorStop(0.4, 'rgba(255,139,85,' + (0.1 + 0.02 * breath + 0.12 * flare) + ')');
    g.addColorStop(1, 'rgba(255,139,85,0)');
    ctx.globalAlpha = 1; ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(today.x, today.y, halo, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#FF8B55';
    ctx.beginPath(); ctx.arc(today.x, today.y, today.r * (1 + 0.16 * flare), 0, 6.2832); ctx.fill();
  }

  hero.appendChild(canvas);
  hero.classList.add('live');
  var started = null, frame = 0, visible = true, last = 0;
  function tick(now) {
    frame = 0;
    if (!visible || document.hidden) return;
    if (started === null) started = now;
    if (now - last >= 33) { last = now; draw((now - started) / 1000); }
    frame = requestAnimationFrame(tick);
  }
  function wake() { if (!frame) frame = requestAnimationFrame(tick); }
  function layout() { build(); draw(started === null ? 0 : (performance.now() - started) / 1000); wake(); }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; wake(); }).observe(hero);
  }
  document.addEventListener('visibilitychange', wake);
  var wait = 0;
  window.addEventListener('resize', function () { clearTimeout(wait); wait = setTimeout(layout, 150); });
  layout();
})();
