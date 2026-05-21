// components/DateRangePicker.js — SkySpark-style date range picker
window.mbcxDashboard = window.mbcxDashboard || {};

window.mbcxDashboard.datePicker = (function () {

  var MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
  var MONTHS_ABB = ['Jan','Feb','Mar','Apr','May','Jun',
                    'Jul','Aug','Sep','Oct','Nov','Dec'];
  var DOW = ['S','M','T','W','T','F','S'];

  // ── Date helpers ────────────────────────────────────────────────

  function today() { var d = new Date(); d.setHours(0,0,0,0); return d; }
  function fmt(d)  { return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function pad(n)  { return n < 10 ? '0'+n : ''+n; }

  function parseDate(s) {
    if (!s) return null;
    var p = s.split('-');
    return new Date(+p[0], +p[1]-1, +p[2]);
  }

  function addDays(d, n) { var r = new Date(d); r.setDate(r.getDate()+n); return r; }

  function startOfWeek(d) {           // Monday-based
    var r = new Date(d);
    var dow = r.getDay();
    r.setDate(r.getDate() - (dow === 0 ? 6 : dow-1));
    return r;
  }
  function endOfWeek(d) { return addDays(startOfWeek(d), 6); }

  function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function endOfMonth(d)   { return new Date(d.getFullYear(), d.getMonth()+1, 0); }

  function qStart(y, q) { return new Date(y, q*3, 1); }
  function qEnd(y, q)   { return new Date(y, q*3+3, 0); }

  function sameDay(a, b) {
    return a && b &&
      a.getFullYear()===b.getFullYear() &&
      a.getMonth()===b.getMonth() &&
      a.getDate()===b.getDate();
  }

  function fmtShort(d)     { return MONTHS_ABB[d.getMonth()]+' '+d.getDate(); }
  function fmtShortY(d)    { return fmtShort(d)+', '+d.getFullYear(); }
  function fmtDisplay(iso) {       // YYYY-MM-DD → MM - DD - YYYY
    if (!iso) return '';
    var p = iso.split('-');
    return p[1]+' - '+p[2]+' - '+p[0];
  }
  function parseDisplay(s) {       // MM - DD - YYYY → YYYY-MM-DD
    s = (s||'').replace(/\s/g,'');
    var m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    return m ? m[3]+'-'+pad(+m[1])+'-'+pad(+m[2]) : null;
  }

  // ── Range builders ───────────────────────────────────────────────

  function rangeDay(d) {
    var iso = fmt(d), t = today();
    var lbl = sameDay(d,t) ? 'Today' : sameDay(d,addDays(t,-1)) ? 'Yesterday' : fmtShortY(d);
    return { start: iso, end: iso, label: lbl };
  }

  function rangeWeek(anchorDate) {
    var s = startOfWeek(anchorDate), e = endOfWeek(anchorDate);
    var t = today();
    var lbl;
    if (sameDay(s, startOfWeek(t)))                    lbl = 'This Week';
    else if (sameDay(s, startOfWeek(addDays(t,-7))))   lbl = 'Last Week';
    else lbl = fmtShort(s)+' – '+fmtShort(e);
    return { start: fmt(s), end: fmt(e), label: lbl };
  }

  function rangeMonth(y, m) {
    var d = new Date(y, m, 1), t = today();
    var lbl = (y===t.getFullYear() && m===t.getMonth())
      ? MONTHS[m]+' '+y : MONTHS_ABB[m]+' '+y;
    return { start: fmt(startOfMonth(d)), end: fmt(endOfMonth(d)), label: lbl };
  }

  function rangeQuarter(y, q) {
    return {
      start: fmt(qStart(y,q)), end: fmt(qEnd(y,q)),
      label: 'Q'+(q+1)+' '+y
    };
  }

  function rangeYear(y) {
    return { start: y+'-01-01', end: y+'-12-31', label: ''+y };
  }

  // ── DOM helper ───────────────────────────────────────────────────

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  // ── Year grid (shared by month/quarter/year modes) ────────────────

  function buildYearGrid(selectedYear, onSelect) {
    var cur = today().getFullYear();
    var years = [];
    for (var y = cur+2; y >= 2010; y--) years.push(y);
    var half = Math.ceil(years.length / 2);

    var grid = el('div', 'dp-year-grid');
    [years.slice(0, half), years.slice(half)].forEach(function(col) {
      var colEl = el('div', 'dp-year-col');
      col.forEach(function(y) {
        var b = el('button', 'dp-grid-btn'+(y===selectedYear?' dp-grid-btn--active':''), ''+y);
        b.addEventListener('click', function(e) { e.stopPropagation(); onSelect(y); });
        colEl.appendChild(b);
      });
      grid.appendChild(colEl);
    });
    return grid;
  }

  // ── Calendar renderer (Day & Week modes) ──────────────────────────

  function buildCalendar(year, month, opts) {
    // opts: { mode:'day'|'week', selectedDay, weekAnchor, onDayClick, onNavigate }
    while (month > 11) { month -= 12; year++; }
    while (month < 0)  { month += 12; year--; }

    var wrap = el('div', 'dp-cal-wrap');

    // Header
    var hdr = el('div', 'dp-cal-hdr');
    var prev = el('button', 'dp-cal-nav', '‹');
    prev.addEventListener('click', function(e) {
      e.stopPropagation(); opts.onNavigate(year, month-1);
    });

    var mSel = document.createElement('select');
    mSel.className = 'dp-cal-month-sel';
    MONTHS.forEach(function(m, i) {
      var o = document.createElement('option');
      o.value = i; o.textContent = m;
      if (i === month) o.selected = true;
      mSel.appendChild(o);
    });
    mSel.addEventListener('change', function(e) {
      e.stopPropagation(); opts.onNavigate(year, +mSel.value);
    });

    var yWrap = el('div', 'dp-cal-year-wrap');
    var yVal  = el('span', 'dp-cal-year-val', ''+year);
    var yBtns = el('div', 'dp-cal-year-btns');
    var yUp   = el('button', 'dp-cal-spin-btn', '▲');
    var yDn   = el('button', 'dp-cal-spin-btn', '▼');
    yUp.addEventListener('click', function(e) { e.stopPropagation(); opts.onNavigate(year+1, month); });
    yDn.addEventListener('click', function(e) { e.stopPropagation(); opts.onNavigate(year-1, month); });
    yBtns.appendChild(yUp); yBtns.appendChild(yDn);
    yWrap.appendChild(yVal); yWrap.appendChild(yBtns);

    var next = el('button', 'dp-cal-nav', '›');
    next.addEventListener('click', function(e) {
      e.stopPropagation(); opts.onNavigate(year, month+1);
    });

    hdr.appendChild(prev); hdr.appendChild(mSel);
    hdr.appendChild(yWrap); hdr.appendChild(next);
    wrap.appendChild(hdr);

    // DOW
    var dowRow = el('div', 'dp-cal-dow');
    DOW.forEach(function(d) { dowRow.appendChild(el('span','dp-cal-dow-cell',d)); });
    wrap.appendChild(dowRow);

    // Grid
    var grid = el('div', 'dp-cal-grid');
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month+1, 0).getDate();

    for (var i = 0; i < firstDay; i++) {
      grid.appendChild(el('span','dp-cal-cell dp-cal-blank',''));
    }

    var wkStart = opts.weekAnchor ? startOfWeek(opts.weekAnchor) : null;
    var wkEnd   = wkStart ? endOfWeek(opts.weekAnchor) : null;

    for (var d = 1; d <= daysInMonth; d++) {
      var cellDate = new Date(year, month, d);
      var cell = el('span', 'dp-cal-cell', ''+d);

      if (opts.mode === 'day') {
        if (opts.selectedDay && sameDay(cellDate, opts.selectedDay)) {
          cell.classList.add('dp-cal-cell--sel');
        }
      } else if (opts.mode === 'week' && wkStart) {
        var inWk = cellDate >= wkStart && cellDate <= wkEnd;
        if (inWk) {
          cell.classList.add('dp-cal-cell--range');
          if (sameDay(cellDate, wkStart)) cell.classList.add('dp-cal-cell--sel','dp-cal-cell--start');
          if (sameDay(cellDate, wkEnd))   cell.classList.add('dp-cal-cell--sel','dp-cal-cell--end');
        }
      }

      (function(date) {
        cell.addEventListener('click', function(e) {
          e.stopPropagation(); opts.onDayClick(date);
        });
      })(cellDate);

      grid.appendChild(cell);
    }
    wrap.appendChild(grid);
    return wrap;
  }

  // ── Main factory ─────────────────────────────────────────────────

  function create(opts) {
    var onChange = opts.onChange || function() {};
    var t = today();

    // Applied range
    var period = 'week';
    var currentLabel = 'Last Week';
    var currentStart = null;
    var currentEnd   = null;

    // Per-period pending state
    var dayPick    = addDays(t, -1);
    var weekAnchor = startOfWeek(addDays(t, -7));
    var monthY = t.getMonth()>0 ? t.getFullYear() : t.getFullYear()-1;
    var monthM = t.getMonth()>0 ? t.getMonth()-1  : 11;
    var qtrY   = Math.floor(t.getMonth()/3)>0 ? t.getFullYear() : t.getFullYear()-1;
    var qtrQ   = Math.floor(t.getMonth()/3)>0 ? Math.floor(t.getMonth()/3)-1 : 3;
    var yearPick = t.getFullYear() - 1;
    var otherStart = null, otherEnd = null, otherSel = 'start';
    var leftCalY = t.getFullYear(), leftCalM = t.getMonth();
    var rightCalY = t.getFullYear(), rightCalM = t.getMonth()+1;
    if (rightCalM > 11) { rightCalM = 0; rightCalY++; }

    var calNavY = t.getFullYear(), calNavM = t.getMonth();

    var dropdownOpen = false;

    // Init: prefer opts.startDate/endDate; fall back to Last Week
    (function() {
      if (opts.startDate && opts.endDate) {
        currentStart = opts.startDate;
        currentEnd   = opts.endDate;
        var s = parseDate(opts.startDate), e = parseDate(opts.endDate);
        if (s && e) {
          currentLabel = s.getFullYear() === e.getFullYear()
            ? fmtShort(s) + ' – ' + fmtShort(e) + ', ' + s.getFullYear()
            : fmtShortY(s) + ' – ' + fmtShortY(e);
        } else {
          currentLabel = opts.startDate + ' – ' + opts.endDate;
        }
        otherStart = opts.startDate;
        otherEnd   = opts.endDate;
        period = 'other';
      } else {
        var r = rangeWeek(weekAnchor);
        currentStart = r.start; currentEnd = r.end; currentLabel = r.label;
      }
    })();

    // ── DOM: compact control
    var wrapper  = el('div', 'dp-wrapper');
    var control  = el('div', 'dp-control');
    var btnPrev  = el('button', 'dp-nav-btn', '‹');
    var labelBtn = el('button', 'dp-label-btn');
    var labelText = el('span', 'dp-label-text', currentLabel);
    labelBtn.appendChild(labelText);
    var btnNext = el('button', 'dp-nav-btn', '›');
    control.appendChild(btnPrev); control.appendChild(labelBtn); control.appendChild(btnNext);
    wrapper.appendChild(control);

    // ── DOM: dropdown
    var dropdown = el('div', 'dp-dropdown');
    wrapper.appendChild(dropdown);

    // Period tabs
    var tabRow = el('div', 'dp-period-row');
    var PERIODS = ['day','week','month','quarter','year','other','recent'];
    var PLABELS = { day:'Day',week:'Week',month:'Month',quarter:'Quarter',year:'Year',other:'Other',recent:'Recent' };
    var pBtns = {};
    PERIODS.forEach(function(pid) {
      var b = el('button', 'dp-period-btn', PLABELS[pid]);
      b.addEventListener('click', function(e) {
        e.stopPropagation();
        period = pid;
        renderAll();
      });
      pBtns[pid] = b;
      tabRow.appendChild(b);
    });
    dropdown.appendChild(tabRow);

    // Two-column content area
    var contentArea  = el('div', 'dp-content-area');
    var selectorPane = el('div', 'dp-selector-pane');
    var shortcutPane = el('div', 'dp-shortcut-pane');
    contentArea.appendChild(selectorPane);
    contentArea.appendChild(shortcutPane);
    dropdown.appendChild(contentArea);

    // Footer: date inputs (Other mode) + Ok
    var footer = el('div', 'dp-footer');

    var dateInputRow = el('div', 'dp-date-input-row');
    function makeDtField() {
      var w   = el('div', 'dp-dt-field');
      var inp = el('input', 'dp-dt-date-input');
      inp.type = 'text'; inp.placeholder = 'MM - DD - YYYY'; inp.maxLength = 14;
      var t2 = el('span', 'dp-dt-time', '  00 : 00 : 00 am');
      w.appendChild(inp); w.appendChild(t2);
      return { wrap: w, input: inp };
    }
    var startField = makeDtField();
    var endField   = makeDtField();
    dateInputRow.appendChild(startField.wrap);
    dateInputRow.appendChild(endField.wrap);
    footer.appendChild(dateInputRow);

    var okBtn = el('button', 'dp-ok-btn', 'Ok');
    footer.appendChild(okBtn);
    dropdown.appendChild(footer);

    dropdown.addEventListener('click', function(e) { e.stopPropagation(); });

    // ── Shortcuts config
    var SHORTCUTS = {
      day: [
        { label:'Today',     fn: function() { return rangeDay(today()); } },
        { label:'Yesterday', fn: function() { return rangeDay(addDays(today(),-1)); } }
      ],
      week: [
        { label:'This Week', fn: function() { return rangeWeek(today()); } },
        { label:'Last Week', fn: function() { return rangeWeek(addDays(today(),-7)); } },
        { label:'Past Week', fn: function() {
          var t2=today();
          return { start:fmt(addDays(t2,-6)), end:fmt(t2), label:'Past Week' };
        }}
      ],
      month: [
        { label:'This Month', fn: function() { var t2=today(); return rangeMonth(t2.getFullYear(),t2.getMonth()); } },
        { label:'Last Month', fn: function() {
          var t2=today(), m=t2.getMonth()-1, y=t2.getFullYear();
          if (m<0){m=11;y--;} return rangeMonth(y,m);
        }},
        { label:'Past Month', fn: function() {
          var t2=today();
          return { start:fmt(addDays(t2,-29)), end:fmt(t2), label:'Past Month' };
        }}
      ],
      quarter: [
        { label:'This Quarter', fn: function() { var t2=today(); return rangeQuarter(t2.getFullYear(),Math.floor(t2.getMonth()/3)); } },
        { label:'Last Quarter', fn: function() {
          var t2=today(), q=Math.floor(t2.getMonth()/3)-1, y=t2.getFullYear();
          if (q<0){q=3;y--;} return rangeQuarter(y,q);
        }},
        { label:'Past Quarter', fn: function() {
          var t2=today(), q=Math.floor(t2.getMonth()/3)-1, y=t2.getFullYear();
          if (q<0){q=3;y--;} return rangeQuarter(y,q);
        }}
      ],
      year: [
        { label:'This Year', fn: function() { return rangeYear(today().getFullYear()); } },
        { label:'Last Year', fn: function() { return rangeYear(today().getFullYear()-1); } },
        { label:'Past Year', fn: function() { return rangeYear(today().getFullYear()-1); } }
      ],
      recent: [
        { label:'Last 7 Days',  fn: function() { var t2=today(); return { start:fmt(addDays(t2,-6)),  end:fmt(t2), label:'Last 7 Days' }; } },
        { label:'Last 14 Days', fn: function() { var t2=today(); return { start:fmt(addDays(t2,-13)), end:fmt(t2), label:'Last 14 Days' }; } },
        { label:'Last 30 Days', fn: function() { var t2=today(); return { start:fmt(addDays(t2,-29)), end:fmt(t2), label:'Last 30 Days' }; } },
        { label:'Last 90 Days', fn: function() { var t2=today(); return { start:fmt(addDays(t2,-89)), end:fmt(t2), label:'Last 90 Days' }; } }
      ]
    };

    // ── Apply a confirmed range
    function applyRange(start, end, label) {
      currentStart = start; currentEnd = end; currentLabel = label;
      labelText.textContent = label;
      closeDropdown();
      onChange(start, end);
    }

    // ── Render helpers
    function renderShortcuts() {
      shortcutPane.innerHTML = '';
      (SHORTCUTS[period] || []).forEach(function(s) {
        var b = el('button', 'dp-shortcut-btn', s.label);
        b.addEventListener('click', function(e) {
          e.stopPropagation();
          var r = s.fn();
          if (period === 'week')    weekAnchor = parseDate(r.start);
          if (period === 'month')   { var d=parseDate(r.start); monthY=d.getFullYear(); monthM=d.getMonth(); }
          if (period === 'quarter') { var d=parseDate(r.start); qtrY=d.getFullYear(); qtrQ=Math.floor(d.getMonth()/3); }
          if (period === 'year')    yearPick=parseDate(r.start).getFullYear();
          if (period === 'day')     dayPick=parseDate(r.start);
          applyRange(r.start, r.end, r.label);
        });
        shortcutPane.appendChild(b);
      });
    }

    function renderDayPane() {
      selectorPane.innerHTML = '';
      selectorPane.appendChild(buildCalendar(calNavY, calNavM, {
        mode: 'day',
        selectedDay: dayPick,
        onDayClick: function(d) { dayPick = d; calNavY=d.getFullYear(); calNavM=d.getMonth(); renderDayPane(); },
        onNavigate: function(y,m) { calNavY=y; calNavM=m; renderDayPane(); }
      }));
    }

    function renderWeekPane() {
      selectorPane.innerHTML = '';
      selectorPane.appendChild(buildCalendar(calNavY, calNavM, {
        mode: 'week',
        weekAnchor: weekAnchor,
        onDayClick: function(d) {
          weekAnchor = startOfWeek(d);
          calNavY=d.getFullYear(); calNavM=d.getMonth();
          renderWeekPane(); renderShortcuts();
        },
        onNavigate: function(y,m) { calNavY=y; calNavM=m; renderWeekPane(); }
      }));
    }

    function renderMonthPane() {
      selectorPane.innerHTML = '';
      var row = el('div', 'dp-month-year-row');

      var yg = buildYearGrid(monthY, function(y) {
        monthY = y; renderMonthPane();
      });

      var mg = el('div', 'dp-month-grid');
      [MONTHS_ABB.slice(0,6), MONTHS_ABB.slice(6)].forEach(function(col, ci) {
        var colEl = el('div', 'dp-month-col');
        col.forEach(function(abbr, ri) {
          var mi = ci*6 + ri;
          var b = el('button', 'dp-grid-btn'+(mi===monthM?' dp-grid-btn--active':''), abbr);
          b.addEventListener('click', function(e) {
            e.stopPropagation(); monthM = mi; renderMonthPane();
          });
          colEl.appendChild(b);
        });
        mg.appendChild(colEl);
      });

      row.appendChild(yg);
      row.appendChild(mg);
      selectorPane.appendChild(row);
    }

    function renderQuarterPane() {
      selectorPane.innerHTML = '';
      var row = el('div', 'dp-month-year-row');

      var yg = buildYearGrid(qtrY, function(y) {
        qtrY = y; renderQuarterPane();
      });

      var qg = el('div', 'dp-quarter-grid');
      ['Q1','Q2','Q3','Q4'].forEach(function(ql, qi) {
        var b = el('button', 'dp-grid-btn'+(qi===qtrQ?' dp-grid-btn--active':''), ql);
        b.addEventListener('click', function(e) {
          e.stopPropagation(); qtrQ = qi; renderQuarterPane();
        });
        qg.appendChild(b);
      });

      row.appendChild(yg);
      row.appendChild(qg);
      selectorPane.appendChild(row);
    }

    function renderYearPane() {
      selectorPane.innerHTML = '';
      selectorPane.appendChild(buildYearGrid(yearPick, function(y) {
        yearPick = y; renderYearPane();
      }));
    }

    function renderOtherPane() {
      selectorPane.innerHTML = '';
      var leftCal = buildCalendar(leftCalY, leftCalM, {
        mode: 'day',
        selectedDay: otherStart ? parseDate(otherStart) : null,
        onDayClick: onOtherDayClick,
        onNavigate: function(y,m) { leftCalY=y; leftCalM=m; renderOtherPane(); }
      });
      var rightCal = buildCalendar(rightCalY, rightCalM, {
        mode: 'day',
        selectedDay: otherEnd ? parseDate(otherEnd) : null,
        onDayClick: onOtherDayClick,
        onNavigate: function(y,m) { rightCalY=y; rightCalM=m; renderOtherPane(); }
      });
      markOtherRange(leftCal,  leftCalY,  leftCalM);
      markOtherRange(rightCal, rightCalY, rightCalM);

      var dualWrap = el('div', 'dp-cal-dual');
      dualWrap.appendChild(leftCal);
      dualWrap.appendChild(rightCal);
      selectorPane.appendChild(dualWrap);

      startField.input.value = fmtDisplay(otherStart);
      endField.input.value   = fmtDisplay(otherEnd);
    }

    function markOtherRange(calEl, year, month) {
      if (!otherStart || !otherEnd) return;
      var s = parseDate(otherStart), e = parseDate(otherEnd);
      calEl.querySelectorAll('.dp-cal-cell').forEach(function(cell) {
        var d = +cell.textContent;
        if (!d) return;
        var date = new Date(year, month, d);
        var isS = sameDay(date,s), isE = sameDay(date,e);
        var inR = date > s && date < e;
        if (isS) { cell.classList.add('dp-cal-cell--sel','dp-cal-cell--start'); }
        if (isE) { cell.classList.add('dp-cal-cell--sel','dp-cal-cell--end'); }
        if (inR) { cell.classList.add('dp-cal-cell--range'); }
      });
    }

    function onOtherDayClick(date) {
      var iso = fmt(date);
      if (otherSel === 'start' || !otherStart) {
        otherStart = iso; otherEnd = null; otherSel = 'end';
      } else {
        if (iso < otherStart) { otherEnd = otherStart; otherStart = iso; }
        else otherEnd = iso;
        otherSel = 'start';
      }
      renderOtherPane();
    }

    function renderAll() {
      PERIODS.forEach(function(pid) {
        pBtns[pid].classList.toggle('dp-period-btn--active', pid === period);
      });
      dateInputRow.style.display = period === 'other' ? 'flex' : 'none';

      if      (period === 'day')     { renderDayPane();     renderShortcuts(); }
      else if (period === 'week')    { renderWeekPane();    renderShortcuts(); }
      else if (period === 'month')   { renderMonthPane();   renderShortcuts(); }
      else if (period === 'quarter') { renderQuarterPane(); renderShortcuts(); }
      else if (period === 'year')    { renderYearPane();    renderShortcuts(); }
      else if (period === 'other')   { renderOtherPane();   shortcutPane.innerHTML = ''; }
      else if (period === 'recent')  { selectorPane.innerHTML = ''; renderShortcuts(); }
    }

    // ── Ok button
    okBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      var r;
      if      (period === 'day')     r = rangeDay(dayPick);
      else if (period === 'week')    r = rangeWeek(weekAnchor);
      else if (period === 'month')   r = rangeMonth(monthY, monthM);
      else if (period === 'quarter') r = rangeQuarter(qtrY, qtrQ);
      else if (period === 'year')    r = rangeYear(yearPick);
      else if (period === 'other') {
        var ns = parseDisplay(startField.input.value);
        var ne = parseDisplay(endField.input.value);
        if (ns) otherStart = ns;
        if (ne) otherEnd   = ne;
        if (!otherStart || !otherEnd) return;
        if (otherEnd < otherStart) { var tmp=otherStart; otherStart=otherEnd; otherEnd=tmp; }
        var s=parseDate(otherStart), e=parseDate(otherEnd);
        var lbl = s.getFullYear()===e.getFullYear()
          ? fmtShort(s)+' – '+fmtShort(e)+', '+s.getFullYear()
          : fmtShortY(s)+' – '+fmtShortY(e);
        r = { start: otherStart, end: otherEnd, label: lbl };
      }
      if (r) applyRange(r.start, r.end, r.label);
    });

    // ── Compact nav (prev/next)
    btnPrev.addEventListener('click', function(e) {
      e.stopPropagation();
      var r;
      if      (period==='day')     { dayPick=addDays(dayPick,-1); r=rangeDay(dayPick); }
      else if (period==='week')    { weekAnchor=addDays(weekAnchor,-7); r=rangeWeek(weekAnchor); }
      else if (period==='month')   {
        monthM--; if(monthM<0){monthM=11;monthY--;} r=rangeMonth(monthY,monthM);
      }
      else if (period==='quarter') {
        qtrQ--; if(qtrQ<0){qtrQ=3;qtrY--;} r=rangeQuarter(qtrY,qtrQ);
      }
      else if (period==='year')    { yearPick--; r=rangeYear(yearPick); }
      if (r) applyRange(r.start, r.end, r.label);
    });

    btnNext.addEventListener('click', function(e) {
      e.stopPropagation();
      var t2=today(), r;
      if (period==='day') {
        var nd=addDays(dayPick,1); if(nd>t2)return; dayPick=nd; r=rangeDay(dayPick);
      } else if (period==='week') {
        var nw=addDays(weekAnchor,7); if(nw>t2)return; weekAnchor=nw; r=rangeWeek(weekAnchor);
      } else if (period==='month') {
        var nm=monthM+1, ny=monthY; if(nm>11){nm=0;ny++;} if(new Date(ny,nm,1)>t2)return; monthM=nm;monthY=ny; r=rangeMonth(monthY,monthM);
      } else if (period==='quarter') {
        var nq=qtrQ+1, nqy=qtrY; if(nq>3){nq=0;nqy++;} if(qStart(nqy,nq)>t2)return; qtrQ=nq;qtrY=nqy; r=rangeQuarter(qtrY,qtrQ);
      } else if (period==='year') {
        if(yearPick>=t2.getFullYear())return; yearPick++; r=rangeYear(yearPick);
      }
      if (r) applyRange(r.start, r.end, r.label);
    });

    // ── Dropdown open/close
    labelBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdownOpen ? closeDropdown() : openDropdown();
    });

    function openDropdown() {
      dropdownOpen = true;
      dropdown.classList.add('dp-dropdown--open');
      renderAll();
      setTimeout(function() { document.addEventListener('click', outsideClick); }, 0);
    }
    function closeDropdown() {
      dropdownOpen = false;
      dropdown.classList.remove('dp-dropdown--open');
      document.removeEventListener('click', outsideClick);
    }
    function outsideClick(e) {
      if (!wrapper.contains(e.target)) closeDropdown();
    }

    opts.container.appendChild(wrapper);

    return {
      getStartDate: function() { return currentStart; },
      getEndDate:   function() { return currentEnd; },
      destroy: function() {
        document.removeEventListener('click', outsideClick);
        if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
      }
    };
  }

  return { create: create };

})();
