// components/SiteSelector.js — Custom site selector dropdown for dark topbar
window.mbcxDashboard = window.mbcxDashboard || {};

window.mbcxDashboard.siteSelector = (function () {

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  function create(opts) {
    var onChange = opts.onChange || function () {};
    var selectedRef = opts.selectedRef || '';
    var selectedDis = opts.selectedLabel || '— Select site —';
    var sites = [];

    var wrapper = el('div', 'ss-wrapper');
    var btn = el('button', 'ss-btn');
    var btnLabel = el('span', 'ss-btn-label', selectedDis);
    var btnArrow = el('span', 'ss-btn-arrow', '▾');
    btn.appendChild(btnLabel);
    btn.appendChild(btnArrow);
    wrapper.appendChild(btn);

    var dropdown = el('div', 'ss-dropdown');
    var searchWrap = el('div', 'ss-search-wrap');
    var searchInput = el('input', 'ss-search');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search sites…';
    searchInput.autocomplete = 'off';
    searchWrap.appendChild(searchInput);
    dropdown.appendChild(searchWrap);

    var listEl = el('div', 'ss-list');
    dropdown.appendChild(listEl);
    wrapper.appendChild(dropdown);

    dropdown.addEventListener('click', function (e) { e.stopPropagation(); });

    var open = false;

    function renderList(filter) {
      listEl.innerHTML = '';
      var q = (filter || '').toLowerCase();
      var filtered = sites.filter(function (s) {
        return !q || s.dis.toLowerCase().indexOf(q) !== -1;
      });
      if (!filtered.length) {
        listEl.appendChild(el('div', 'ss-empty', q ? 'No matches' : 'No sites loaded'));
        return;
      }
      filtered.forEach(function (s) {
        var item = el('div', 'ss-item' + (s.ref === selectedRef ? ' ss-item--active' : ''), s.dis);
        item.addEventListener('click', function (e) {
          e.stopPropagation();
          selectedRef = s.ref;
          selectedDis = s.dis;
          btnLabel.textContent = s.dis;
          closeDropdown();
          onChange(s.ref, s.dis);
        });
        listEl.appendChild(item);
      });
    }

    searchInput.addEventListener('input', function () {
      renderList(searchInput.value);
    });

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      open ? closeDropdown() : openDropdown();
    });

    function openDropdown() {
      open = true;
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
    });

    opts.container.appendChild(wrapper);

    return {
      setSites: function (siteList, ctxRef) {
        sites = siteList;
        if (ctxRef) {
          var match = sites.filter(function (s) { return s.ref === ctxRef; })[0];
          if (match) {
            selectedRef = match.ref;
            selectedDis = match.dis;
            btnLabel.textContent = match.dis;
          }
        }
        if (open) renderList(searchInput.value);
      },
      setLabel: function (label) {
        selectedDis = label;
        btnLabel.textContent = label;
      },
      getSelectedRef: function () { return selectedRef; },
      getSelectedDis: function () { return selectedDis; },
      destroy: function () {
        document.removeEventListener('click', outsideClick);
        if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
      }
    };
  }

  return { create: create };

})();
