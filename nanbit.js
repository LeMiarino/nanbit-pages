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
