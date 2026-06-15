// components/SiteSelector.js — Multi-select site dropdown for dark topbar
window.mbcxDashboard = window.mbcxDashboard || {};

window.mbcxDashboard.siteSelector = (function () {

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  // Returns a label string for the current selection set.
  function _selectionLabel(selectedRefs, sites) {
    if (!selectedRefs.length) return '— Select site —';
    if (selectedRefs[0] === '__all__') return 'All Sites';
    if (selectedRefs.length === 1) {
      var m = sites.filter(function (s) { return s.ref === selectedRefs[0]; })[0];
      return m ? m.dis : selectedRefs[0];
    }
    return selectedRefs.length + ' sites selected';
  }

  function create(opts) {
    var onChange     = opts.onChange || function () {};
    // selectedRefs: array of ref strings, or ['__all__'] for all sites
    var selectedRefs = opts.selectedRefs
      ? opts.selectedRefs.slice()
      : (opts.selectedRef ? [opts.selectedRef] : []);
    var sites        = [];
    var open         = false;
    // Tracks the pending selection while the dropdown is open.
    var pendingRefs  = selectedRefs.slice();

    // ── DOM ─────────────────────────────────────────────────────────────
    var wrapper  = el('div', 'ss-wrapper');
    var btn      = el('button', 'ss-btn');
    var btnLabel = el('span', 'ss-btn-label', opts.selectedLabel || _selectionLabel(selectedRefs, sites));
    var btnArrow = el('span', 'ss-btn-arrow', '▾');
    btn.appendChild(btnLabel);
    btn.appendChild(btnArrow);
    wrapper.appendChild(btn);

    var dropdown   = el('div', 'ss-dropdown');
    var searchWrap = el('div', 'ss-search-wrap');
    var searchInput = el('input', 'ss-search');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search sites…';
    searchInput.autocomplete = 'off';
    searchWrap.appendChild(searchInput);
    dropdown.appendChild(searchWrap);

    var listEl = el('div', 'ss-list');
    dropdown.appendChild(listEl);

    // Footer: Apply button
    var footer    = el('div', 'ss-footer');
    var applyBtn  = el('button', 'ss-apply-btn', 'Apply');
    footer.appendChild(applyBtn);
    dropdown.appendChild(footer);

    wrapper.appendChild(dropdown);
    dropdown.addEventListener('click', function (e) { e.stopPropagation(); });

    // ── Render list ──────────────────────────────────────────────────────
    function renderList(filter) {
      listEl.innerHTML = '';
      var q = (filter || '').toLowerCase();

      // "All Sites" row (always shown, hidden when filtering)
      if (!q) {
        var allRow = el('div', 'ss-item ss-item--all' + (pendingRefs[0] === '__all__' ? ' ss-item--checked' : ''));
        var allCk  = el('span', 'ss-ck', pendingRefs[0] === '__all__' ? '☑' : '☐');
        var allLbl = el('span', '', 'All Sites');
        allRow.appendChild(allCk);
        allRow.appendChild(allLbl);
        allRow.addEventListener('click', function () {
          if (pendingRefs[0] === '__all__') {
            pendingRefs = [];
          } else {
            pendingRefs = ['__all__'];
          }
          renderList(searchInput.value);
        });
        listEl.appendChild(allRow);

        // Divider
        listEl.appendChild(el('div', 'ss-divider'));
      }

      var filtered = sites.filter(function (s) {
        return !q || s.dis.toLowerCase().indexOf(q) !== -1;
      });

      if (!filtered.length) {
        listEl.appendChild(el('div', 'ss-empty', q ? 'No matches' : 'No sites loaded'));
        return;
      }

      var isAllSelected = pendingRefs[0] === '__all__';
      filtered.forEach(function (s) {
        var checked = isAllSelected || pendingRefs.indexOf(s.ref) !== -1;
        var item = el('div', 'ss-item' + (checked ? ' ss-item--checked' : ''));
        var ck   = el('span', 'ss-ck', checked ? '☑' : '☐');
        var lbl  = el('span', '', s.dis);
        item.appendChild(ck);
        item.appendChild(lbl);
        item.addEventListener('click', function () {
          // Clicking a specific site clears "all" first
          if (pendingRefs[0] === '__all__') {
            pendingRefs = sites.map(function (x) { return x.ref; });
          }
          var idx = pendingRefs.indexOf(s.ref);
          if (idx !== -1) {
            pendingRefs.splice(idx, 1);
          } else {
            pendingRefs.push(s.ref);
          }
          // If every site is now individually checked, upgrade to __all__
          if (pendingRefs.length === sites.length) {
            pendingRefs = ['__all__'];
          }
          renderList(searchInput.value);
        });
        listEl.appendChild(item);
      });
    }

    // ── Apply ────────────────────────────────────────────────────────────
    applyBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!pendingRefs.length) return; // nothing selected — don't apply
      selectedRefs = pendingRefs.slice();
      btnLabel.textContent = _selectionLabel(selectedRefs, sites);
      closeDropdown();
      onChange(selectedRefs.slice(), _selectionLabel(selectedRefs, sites));
    });

    // ── Search ───────────────────────────────────────────────────────────
    searchInput.addEventListener('input', function () {
      renderList(searchInput.value);
    });

    // ── Open / close ─────────────────────────────────────────────────────
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      open ? closeDropdown() : openDropdown();
    });

    function openDropdown() {
      open = true;
      pendingRefs = selectedRefs.slice(); // reset pending to committed state
      dropdown.classList.add('ss-dropdown--open');
      searchInput.value = '';
      renderList('');
      setTimeout(function () {
        searchInput.focus();
        document.addEventListener('click', outsideClick);
      }, 0);
    }

    function closeDropdown() {
      open = false;
      dropdown.classList.remove('ss-dropdown--open');
      document.removeEventListener('click', outsideClick);
    }

    function outsideClick(e) {
      if (!wrapper.contains(e.target)) closeDropdown();
    }

    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDropdown();
      if (e.key === 'Enter' && pendingRefs.length) applyBtn.click();
    });

    opts.container.appendChild(wrapper);

    // ── Public API ───────────────────────────────────────────────────────
    return {
      setSites: function (siteList, ctxRef) {
        sites = siteList;
        // If we have no selection yet, seed from ctxRef
        if (!selectedRefs.length && ctxRef) {
          selectedRefs = [ctxRef];
          pendingRefs  = [ctxRef];
          btnLabel.textContent = _selectionLabel(selectedRefs, sites);
        }
        if (open) renderList(searchInput.value);
      },
      setLabel: function (label) {
        btnLabel.textContent = label;
      },
      // Legacy compat — returns the first selected ref (single-site callers)
      getSelectedRef: function () {
        if (!selectedRefs.length) return '';
        if (selectedRefs[0] === '__all__') return '__all__';
        return selectedRefs[0];
      },
      getSelectedRefs: function () { return selectedRefs.slice(); },
      // Returns true when "All Sites" is active
      isAllSites: function () { return selectedRefs[0] === '__all__'; },
      getSelectedDis: function () { return _selectionLabel(selectedRefs, sites); },
      destroy: function () {
        document.removeEventListener('click', outsideClick);
        if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
      }
    };
  }

  return { create: create };

})();
