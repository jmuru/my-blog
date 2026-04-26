(function () {
  'use strict';

  var overlay        = document.getElementById('nav-overlay');
  var trigger        = document.getElementById('search-trigger');
  var closeBtn       = document.getElementById('nav-overlay-close');
  var searchInput    = document.getElementById('nav-search-input');
  var resultsEl      = document.getElementById('nav-search-results');
  var resultsSection = document.getElementById('overlay-results-section');
  var resultsCount   = document.getElementById('results-count');
  var quickLinks     = document.getElementById('search-quick-links');
  var postCountEl    = document.getElementById('search-post-count');
  var wordmark       = document.getElementById('ov-wordmark');
  var cursorDot      = document.getElementById('cursor-dot');
  var cursorRing     = document.getElementById('cursor-ring');

  if (!overlay) return;

  var posts       = null;
  var searchTimer = null;
  var selectedIdx = -1;

  // ── Custom cursor ─────────────────────────────────────────────────────────
  var mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

  function initCursor() {
    if (!cursorDot || !cursorRing) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    overlay.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.left = mouseX + 'px';
      cursorDot.style.top  = mouseY + 'px';
    });

    (function animateRing() {
      ringX += (mouseX - ringX) * 0.09;
      ringY += (mouseY - ringY) * 0.09;
      cursorRing.style.left = ringX + 'px';
      cursorRing.style.top  = ringY + 'px';
      requestAnimationFrame(animateRing);
    }());

    overlay.addEventListener('mouseover', function (e) {
      if (e.target.closest('a,button,input,.ov-quick-tag,.ov-result-row')) {
        cursorRing.classList.add('is-hovering');
      }
    });
    overlay.addEventListener('mouseout', function (e) {
      if (e.target.closest('a,button,input,.ov-quick-tag,.ov-result-row')) {
        cursorRing.classList.remove('is-hovering');
      }
    });
  }

  // ── Wordmark parallax ─────────────────────────────────────────────────────
  function initParallax() {
    if (!wordmark) return;
    overlay.addEventListener('mousemove', function (e) {
      if (!overlay.classList.contains('is-open')) return;
      var cx = window.innerWidth  / 2;
      var cy = window.innerHeight / 2;
      var dx = (e.clientX - cx) / cx;
      var dy = (e.clientY - cy) / cy;
      wordmark.style.transform =
        'translate(calc(-50% + ' + (dx * 16) + 'px), calc(-50% + ' + (dy * 9) + 'px))';
    });
  }

  // ── Open / close ──────────────────────────────────────────────────────────
  function openOverlay() {
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    if (trigger) trigger.setAttribute('aria-expanded', 'true');

    fetchPosts();

    // Focus after entrance animations settle
    setTimeout(function () {
      if (searchInput) searchInput.focus();
    }, 800);
  }

  function closeOverlay() {
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('is-open');
    overlay.classList.remove('is-typing');
    document.body.style.overflow = '';
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus();
    }

    // Reset wordmark parallax
    if (wordmark) wordmark.style.transform = '';

    if (searchInput) searchInput.value = '';
    clearResults();
    showQuickLinks();
  }

  // ── Post index ────────────────────────────────────────────────────────────
  function fetchPosts() {
    if (posts !== null) return;
    fetch('/search.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        posts = data;
        if (postCountEl) postCountEl.textContent = '( ' + posts.length + ' posts )';
      })
      .catch(function () { posts = []; });
  }

  // ── Search ────────────────────────────────────────────────────────────────
  function runSearch(query) {
    query = query.trim();

    if (!query || query.length < 2) {
      overlay.classList.remove('is-typing');
      clearResults();
      showQuickLinks();
      return;
    }

    overlay.classList.add('is-typing');
    hideQuickLinks();

    if (!posts) { clearResults(); return; }

    var q = query.toLowerCase();
    var matches = posts.filter(function (post) {
      return (
        post.title.toLowerCase().indexOf(q) !== -1 ||
        (post.categories && post.categories.some(function (c) {
          return c.toLowerCase().indexOf(q) !== -1;
        }))
      );
    }).slice(0, 7);

    renderResults(matches, query);
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function highlight(text, query) {
    var safe = escHtml(text);
    var re   = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return safe.replace(re, '<mark>$1</mark>');
  }

  function renderResults(matches, query) {
    selectedIdx = -1;
    if (resultsSection) resultsSection.classList.add('is-visible');

    var countText = matches.length
      ? matches.length + (matches.length === 1 ? ' post found' : ' posts found')
      : '0 posts found';
    if (resultsCount) resultsCount.textContent = countText;

    if (!matches.length) {
      resultsEl.innerHTML =
        '<p class="ov-empty">No posts found for &ldquo;' + escHtml(query) + '&rdquo;</p>';
      return;
    }

    var html = '';
    matches.forEach(function (post, i) {
      var cat = post.categories && post.categories.length
        ? post.categories[0].toUpperCase()
        : '';
      html +=
        '<a class="ov-result-row" href="' + escHtml(post.url) + '" role="option"' +
            ' style="transition-delay:' + (i * 50) + 'ms">' +
          '<span class="ov-result-num">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<span class="ov-result-cat">'  + escHtml(cat)               + '</span>' +
          '<span class="ov-result-title">' + highlight(post.title, query) + '</span>' +
          '<span class="ov-result-date">'  + escHtml(post.date)          + '</span>' +
          '<span class="ov-result-arrow">&#8599;</span>' +
        '</a>';
    });

    resultsEl.innerHTML = html;

    // Double rAF so initial opacity:0 state is painted before transitioning in
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        resultsEl.querySelectorAll('.ov-result-row').forEach(function (row) {
          row.classList.add('is-visible');
        });
      });
    });
  }

  function clearResults() {
    resultsEl.innerHTML = '';
    selectedIdx = -1;
    if (resultsSection) resultsSection.classList.remove('is-visible');
    if (resultsCount)   resultsCount.textContent = '';
  }

  function showQuickLinks() {
    if (quickLinks) quickLinks.classList.remove('is-hidden');
  }

  function hideQuickLinks() {
    if (quickLinks) quickLinks.classList.add('is-hidden');
  }

  // ── Keyboard navigation ───────────────────────────────────────────────────
  function moveSelection(dir) {
    var rows = resultsEl.querySelectorAll('.ov-result-row');
    if (!rows.length) return;
    if (selectedIdx >= 0) rows[selectedIdx].classList.remove('is-selected');
    selectedIdx = (selectedIdx + dir + rows.length) % rows.length;
    rows[selectedIdx].classList.add('is-selected');
  }

  function activateSelected() {
    if (selectedIdx < 0) return;
    var rows = resultsEl.querySelectorAll('.ov-result-row');
    if (rows[selectedIdx]) window.location.href = rows[selectedIdx].href;
  }

  // ── Event wiring ──────────────────────────────────────────────────────────
  if (trigger)  trigger.addEventListener('click', openOverlay);
  if (closeBtn) closeBtn.addEventListener('click', closeOverlay);

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { runSearch(searchInput.value); }, 180);
    });
  }

  document.querySelectorAll('.ov-quick-tag').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!searchInput) return;
      searchInput.value = btn.dataset.query;
      runSearch(btn.dataset.query);
      searchInput.focus();
    });
  });

  document.addEventListener('keydown', function (e) {
    if (!overlay.classList.contains('is-open')) return;
    switch (e.key) {
      case 'Escape':
        if (searchInput && searchInput.value) {
          searchInput.value = '';
          runSearch('');
        } else {
          closeOverlay();
        }
        break;
      case 'ArrowDown': e.preventDefault(); moveSelection(1);  break;
      case 'ArrowUp':   e.preventDefault(); moveSelection(-1); break;
      case 'Enter':     activateSelected(); break;
    }
  });

  // Mobile: intercept hamburger to open overlay instead of dropdown
  var hamburger = document.querySelector('label[for="nav-trigger"]');
  if (hamburger) {
    hamburger.addEventListener('click', function (e) {
      if (window.innerWidth <= 800) {
        e.preventDefault();
        var cb = document.getElementById('nav-trigger');
        if (cb) cb.checked = false;
        openOverlay();
      }
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    initCursor();
    initParallax();
  });

}());
