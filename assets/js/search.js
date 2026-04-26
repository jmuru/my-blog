(function () {
  'use strict';

  var overlay      = document.getElementById('nav-overlay');
  var trigger      = document.getElementById('search-trigger');
  var closeBtn     = document.getElementById('nav-overlay-close');
  var backdrop     = document.getElementById('nav-overlay-backdrop');
  var searchInput  = document.getElementById('nav-search-input');
  var resultsEl    = document.getElementById('nav-search-results');

  if (!overlay) return;

  var posts        = null;
  var searchTimer  = null;
  var selectedIdx  = -1;

  // ── Overlay open / close ──────────────────────────────────────────────────

  function openOverlay() {
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    // Delay focus so the CSS transition has started
    setTimeout(function () { if (searchInput) searchInput.focus(); }, 60);
    fetchPosts();
  }

  function closeOverlay() {
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (searchInput) searchInput.value = '';
    clearResults();
    // Return focus to trigger when closing
    if (trigger) trigger.focus();
  }

  // ── Post index (loaded once) ──────────────────────────────────────────────

  function fetchPosts() {
    if (posts !== null) return;
    fetch('/search.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { posts = data; })
      .catch(function () { posts = []; });
  }

  // ── Search ────────────────────────────────────────────────────────────────

  function runSearch(query) {
    query = query.trim();
    if (!posts || !query) {
      clearResults();
      return;
    }

    var q = query.toLowerCase();
    var matches = posts.filter(function (post) {
      return (
        post.title.toLowerCase().indexOf(q) !== -1 ||
        post.excerpt.toLowerCase().indexOf(q) !== -1 ||
        (post.tags && post.tags.some(function (t) { return t.toLowerCase().indexOf(q) !== -1; })) ||
        (post.categories && post.categories.some(function (c) { return c.toLowerCase().indexOf(q) !== -1; }))
      );
    }).slice(0, 8);

    renderResults(matches, query);
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function highlight(text, query) {
    var safe = escapeHtml(text);
    var escapedQ = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safe.replace(new RegExp('(' + escapedQ + ')', 'gi'), '<mark>$1</mark>');
  }

  function renderResults(matches, query) {
    selectedIdx = -1;

    if (!matches.length) {
      resultsEl.innerHTML =
        '<p class="nav-search-empty">No posts found for “' + escapeHtml(query) + '”</p>';
      return;
    }

    var html = '<ul class="nav-search-list" role="listbox">';
    matches.forEach(function (post) {
      var meta = post.date;
      if (post.tags && post.tags.length) {
        meta += ' &middot; ' + escapeHtml(post.tags.slice(0, 3).join(', '));
      }
      html +=
        '<li class="nav-search-item" role="option">' +
          '<a class="nav-search-link" href="' + escapeHtml(post.url) + '">' +
            '<span class="nav-search-title">' + highlight(post.title, query) + '</span>' +
            '<span class="nav-search-meta">' + meta + '</span>' +
            '<span class="nav-search-excerpt">' + highlight(post.excerpt, query) + '</span>' +
          '</a>' +
        '</li>';
    });
    html += '</ul>';

    resultsEl.innerHTML = html;
  }

  function clearResults() {
    resultsEl.innerHTML = '';
    selectedIdx = -1;
  }

  function moveSelection(dir) {
    var items = resultsEl.querySelectorAll('.nav-search-item');
    if (!items.length) return;

    if (selectedIdx >= 0) {
      items[selectedIdx].classList.remove('is-selected');
    }

    selectedIdx = (selectedIdx + dir + items.length) % items.length;
    items[selectedIdx].classList.add('is-selected');
    items[selectedIdx].scrollIntoView({ block: 'nearest' });
  }

  function activateSelected() {
    if (selectedIdx < 0) return;
    var items = resultsEl.querySelectorAll('.nav-search-item');
    var link = items[selectedIdx] && items[selectedIdx].querySelector('a');
    if (link) window.location.href = link.href;
  }

  // ── Event wiring ──────────────────────────────────────────────────────────

  if (trigger) {
    trigger.addEventListener('click', openOverlay);
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeOverlay);
  }

  if (backdrop) {
    backdrop.addEventListener('click', closeOverlay);
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        runSearch(searchInput.value);
      }, 180);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (!overlay.classList.contains('is-open')) return;

    switch (e.key) {
      case 'Escape':
        closeOverlay();
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveSelection(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveSelection(-1);
        break;
      case 'Enter':
        activateSelected();
        break;
    }
  });

  // On mobile (≤800px) intercept the hamburger label so it opens the overlay
  // instead of the default CSS dropdown.
  var hamburger = document.querySelector('label[for="nav-trigger"]');
  if (hamburger) {
    hamburger.addEventListener('click', function (e) {
      if (window.innerWidth <= 800) {
        e.preventDefault();
        var checkbox = document.getElementById('nav-trigger');
        if (checkbox) checkbox.checked = false; // keep it closed
        openOverlay();
      }
    });
  }

}());
