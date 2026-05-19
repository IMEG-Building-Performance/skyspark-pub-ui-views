/**
 * DateRangePicker.js — SkySpark-style compact date range picker
 *
 * Renders a compact control:  [<]  Past Week  [>]
 * Clicking the label opens a dropdown with period buttons + dual calendar
 * for "Other" mode — matching SkySpark's native date picker layout.
 */

window.EventCostV2 = window.EventCostV2 || {};

window.EventCostV2.datePicker = (function () {

  var MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
  var MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun',
                      'Jul','Aug','Sep','Oct','Nov','Dec'];
  var DOW = ['S','M','T','W','T','F','S'];

  // ── Date helpers ─────────────────────────────────────────────────

  function today() {
    var d = new Date();
    d.setHours(0,0,0,0);
    return d;
  }

  function fmt(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function parseDate(s) {
    if (!s) return null;
    var parts = s.split('-');
    return new Date(+parts[0], +parts[1] - 1, +parts[2]);
  }

  function addDays(d, n) {
    var r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }

  function startOfWeek(d) {
    var r = new Date(d);
    var dow = r.getDay();
    var delta = dow === 0 ? -6 : 1 - dow;
    r.setDate(r.getDate() + delta);
    return r;
  }

  function startOfMonth(d)  { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function endOfMonth(d)    { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

  function startOfQuarter(d) {
    var q = Math.floor(d.getMonth() / 3);
    return new Date(d.getFullYear(), q * 3, 1);
  }
  function endOfQuarter(d) {
    var q = Math.floor(d.getMonth() / 3);
    return new Date(d.getFullYear(), q * 3 + 3, 0);
  }

  function startOfYear(d) { return new Date(d.getFullYear(), 0, 1); }
  function endOfYear(d)   { return new Date(d.getFullYear(), 11, 31); }

  function sameDay(a, b) {
    return a && b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth()    === b.getMonth()    &&
      a.getDate()     === b.getDate();
  }

  function fmtShort(d)     { return MONTHS_SHORT[d.getMonth()] + ' ' + d.getDate(); }
  function fmtShortYear(d) { return fmtShort(d) + ', ' + d.getFullYear(); }

  // Format as  MM - DD - YYYY  (display style matching SkySpark)
  function fmtDisplay(isoStr) {
    if (!isoStr) return '';
    var p = isoStr.split('-');
    return p[1] + ' - ' + p[2] + ' - ' + p[0];
  }

  // Parse  MM - DD - YYYY  or  MM-DD-YYYY  → ISO
  function parseDisplayDate(s) {
    s = s.replace(/\s/g, '');
    var m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (!m) return null;
    return m[3] + '-' + pad(+m[1]) + '-' + pad(+m[2]);
  }

  // ── Period math ──────────────────────────────────────────────────

  function computeRange(period, offset) {
    var t = today();
    var s, e, label;

    if (period === 'day') {
      s = addDays(t, offset); e = new Date(s);
      label = offset === 0 ? 'Today' : offset === -1 ? 'Yesterday' : fmtShortYear(s);
    } else if (period === 'week') {
      var mon = startOfWeek(t);
      s = addDays(mon, offset * 7); e = addDays(s, 6);
      if (offset === 0) label = 'This Week';
      else if (offset === -1) label = 'Past Week';
      else {
        label = fmtShort(s) + ' – ' + fmtShort(e);
        if (s.getFullYear() !== t.getFullYear()) label += ', ' + s.getFullYear();
      }
    } else if (period === 'month') {
      var base = new Date(t.getFullYear(), t.getMonth() + offset, 1);
      s = startOfMonth(base); e = endOfMonth(base);
      label = offset === 0
        ? MONTHS[base.getMonth()] + ' ' + base.getFullYear()
        : MONTHS_SHORT[base.getMonth()] + ' ' + base.getFullYear();
    } else if (period === 'quarter') {
      var qBase = new Date(t.getFullYear(), t.getMonth(), 1);
      qBase.setMonth(qBase.getMonth() + offset * 3);
      s = startOfQuarter(qBase); e = endOfQuarter(qBase);
      label = 'Q' + (Math.floor(s.getMonth() / 3) + 1) + ' ' + s.getFullYear();
    } else if (period === 'year') {
      var yBase = new Date(t.getFullYear() + offset, 0, 1);
      s = startOfYear(yBase); e = endOfYear(yBase);
      label = '' + yBase.getFullYear();
    } else if (period === 'recent') {
      s = addDays(t, -29); e = t;
      label = 'Last 30 Days';
    }

    return { start: fmt(s), end: fmt(e), label: label };
  }

  function canGoForward(period, offset) {
    if (period === 'recent' || period === 'other') return false;
    return parseDate(computeRange(period, offset + 1).start) <= today();
  }

  // ── DOM helpers ──────────────────────────────────────────────────

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ── Calendar renderer ────────────────────────────────────────────

  function renderCalendar(container, year, month, selStart, selEnd, onDayClick, onNavigate) {
    container.innerHTML = '';

    // Normalise month overflow
    while (month > 11) { month -= 12; year++; }
    while (month < 0)  { month += 12; year--; }

    // ── Header: [‹] [Month ▲▼] [Year ▲▼] [›]
    var hdr = el('div', 'dp-cal-hdr');

    var prev = el('button', 'dp-cal-nav', '‹');
    prev.addEventListener('click', function(e) {
      e.stopPropagation();
      onNavigate(year, month - 1);
    });

    // Month select
    var monthSel = document.createElement('select');
    monthSel.className = 'dp-cal-month-sel';
    MONTHS.forEach(function(m, i) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = m;
      if (i === month) opt.selected = true;
      monthSel.appendChild(opt);
    });
    monthSel.addEventListener('change', function(e) {
      e.stopPropagation();
      onNavigate(year, +monthSel.value);
    });

    // Year spinner
    var yearWrap = el('div', 'dp-cal-year-wrap');
    var yearVal  = el('span', 'dp-cal-year-val', '' + year);
    var yearBtns = el('div', 'dp-cal-year-btns');
    var yUp   = el('button', 'dp-cal-spin-btn', '▲');
    var yDown = el('button', 'dp-cal-spin-btn', '▼');
    yUp.addEventListener('click',   function(e) { e.stopPropagation(); onNavigate(year + 1, month); });
    yDown.addEventListener('click', function(e) { e.stopPropagation(); onNavigate(year - 1, month); });
    yearBtns.appendChild(yUp);
    yearBtns.appendChild(yDown);
    yearWrap.appendChild(yearVal);
    yearWrap.appendChild(yearBtns);

    var next = el('button', 'dp-cal-nav', '›');
    next.addEventListener('click', function(e) {
      e.stopPropagation();
      onNavigate(year, month + 1);
    });

    hdr.appendChild(prev);
    hdr.appendChild(monthSel);
    hdr.appendChild(yearWrap);
    hdr.appendChild(next);
    container.appendChild(hdr);

    // ── Day-of-week header
    var dowRow = el('div', 'dp-cal-dow');
    DOW.forEach(function(d) { dowRow.appendChild(el('span', 'dp-cal-dow-cell', d)); });
    container.appendChild(dowRow);

    // ── Day grid
    var grid = el('div', 'dp-cal-grid');
    var firstDay    = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var startD = selStart ? parseDate(selStart) : null;
    var endD   = selEnd   ? parseDate(selEnd)   : null;

    for (var i = 0; i < firstDay; i++) {
      grid.appendChild(el('span', 'dp-cal-cell dp-cal-blank', ''));
    }

    for (var d = 1; d <= daysInMonth; d++) {
      var cellDate = new Date(year, month, d);
      var cell = el('span', 'dp-cal-cell', '' + d);
      var isStart = startD && sameDay(cellDate, startD);
      var isEnd   = endD   && sameDay(cellDate, endD);
      var inRange = startD && endD && cellDate > startD && cellDate < endD;
      if (isStart) cell.classList.add('dp-cal-cell--start');
      if (isEnd)   cell.classList.add('dp-cal-cell--end');
      if (inRange) cell.classList.add('dp-cal-cell--range');
      if (isStart || isEnd) cell.classList.add('dp-cal-cell--sel');
      (function(date) {
        cell.addEventListener('click', function(e) {
          e.stopPropagation(); onDayClick(date);
        });
      })(cellDate);
      grid.appendChild(cell);
    }
    container.appendChild(grid);
  }

  // ── Main factory ─────────────────────────────────────────────────

  function create(opts) {
    var onChange = opts.onChange || function() {};

    var period = 'week';
    var offset = -1;
    var otherStart = null;
    var otherEnd   = null;
    var otherSelecting = 'start';

    if (opts.startDate && opts.endDate) {
      otherStart = opts.startDate;
      otherEnd   = opts.endDate;
    }

    var t = today();
    var leftCal  = { year: t.getFullYear(), month: t.getMonth() };
    var rightCal = { year: t.getFullYear(), month: t.getMonth() + 1 };
    if (rightCal.month > 11) { rightCal.month = 0; rightCal.year++; }

    var dropdownOpen = false;

    // ── Wrapper
    var wrapper = el('div', 'dp-wrapper');

    // ── Compact control
    var control = el('div', 'dp-control');
    var btnPrev  = el('button', 'dp-nav-btn', '‹');
    var labelBtn = el('button', 'dp-label-btn');
    var labelText = el('span', 'dp-label-text');
    labelBtn.appendChild(labelText);
    var btnNext = el('button', 'dp-nav-btn', '›');
    control.appendChild(btnPrev);
    control.appendChild(labelBtn);
    control.appendChild(btnNext);
    wrapper.appendChild(control);

    // ── Dropdown
    var dropdown = el('div', 'dp-dropdown');
    wrapper.appendChild(dropdown);

    // Period buttons
    var periodRow = el('div', 'dp-period-row');
    var PERIODS = [
      { id: 'day',     label: 'Day'     },
      { id: 'week',    label: 'Week'    },
      { id: 'month',   label: 'Month'   },
      { id: 'quarter', label: 'Quarter' },
      { id: 'year',    label: 'Year'    },
      { id: 'other',   label: 'Other'   },
      { id: 'recent',  label: 'Recent'  }
    ];
    var periodBtns = {};
    PERIODS.forEach(function(p) {
      var b = el('button', 'dp-period-btn', p.label);
      b.setAttribute('data-period', p.id);
      periodRow.appendChild(b);
      periodBtns[p.id] = b;
    });
    dropdown.appendChild(periodRow);

    // Dual calendars (Other mode)
    var calArea = el('div', 'dp-cal-area');
    var calLeft  = el('div', 'dp-cal');
    var calRight = el('div', 'dp-cal');
    calArea.appendChild(calLeft);
    calArea.appendChild(calRight);
    dropdown.appendChild(calArea);

    // ── Date+time input row (SkySpark style)
    //    [MM - DD - YYYY  00 : 00 : 00 am]  [MM - DD - YYYY  00 : 00 : 00 am]  [Ok]
    var dateInputRow = el('div', 'dp-date-input-row');

    function makeDtField() {
      var wrap = el('div', 'dp-dt-field');
      var dateInput = el('input', 'dp-dt-date-input');
      dateInput.type = 'text';
      dateInput.placeholder = 'MM - DD - YYYY';
      dateInput.maxLength = 14;
      var timePart = el('span', 'dp-dt-time', '  00 : 00 : 00 am');
      wrap.appendChild(dateInput);
      wrap.appendChild(timePart);
      return { wrap: wrap, input: dateInput };
    }

    var startField = makeDtField();
    var endField   = makeDtField();
    var okBtn = el('button', 'dp-ok-btn', 'Ok');

    dateInputRow.appendChild(startField.wrap);
    dateInputRow.appendChild(endField.wrap);
    dateInputRow.appendChild(okBtn);
    dropdown.appendChild(dateInputRow);

    // ── Update functions

    function fmtForInput(isoStr) { return fmtDisplay(isoStr); }

    function updateLabel() {
      if (period === 'other') {
        if (otherStart && otherEnd) {
          var s = parseDate(otherStart), e = parseDate(otherEnd);
          labelText.textContent = s.getFullYear() === e.getFullYear()
            ? fmtShort(s) + ' – ' + fmtShort(e) + ', ' + s.getFullYear()
            : fmtShortYear(s) + ' – ' + fmtShortYear(e);
        } else {
          labelText.textContent = 'Custom Range';
        }
      } else if (period === 'recent') {
        labelText.textContent = 'Last 30 Days';
      } else {
        labelText.textContent = computeRange(period, offset).label;
      }
    }

    function updatePeriodBtns() {
      PERIODS.forEach(function(p) {
        periodBtns[p.id].classList.toggle('dp-period-btn--active', p.id === period);
      });
    }

    function updateNavBtns() {
      btnPrev.disabled = false;
      btnNext.disabled = period === 'other' || period === 'recent' || !canGoForward(period, offset);
    }

    function updateCalendars() {
      var showOther = period === 'other';
      calArea.style.display      = showOther ? 'flex' : 'none';
      dateInputRow.style.display = showOther ? 'flex' : 'none';
      if (!showOther) return;

      renderCalendar(calLeft, leftCal.year, leftCal.month, otherStart, otherEnd,
        onCalDayClick,
        function(y, m) { leftCal.year = y; leftCal.month = m; updateCalendars(); }
      );
      renderCalendar(calRight, rightCal.year, rightCal.month, otherStart, otherEnd,
        onCalDayClick,
        function(y, m) { rightCal.year = y; rightCal.month = m; updateCalendars(); }
      );

      startField.input.value = fmtForInput(otherStart);
      endField.input.value   = fmtForInput(otherEnd);
    }

    function onCalDayClick(date) {
      var iso = fmt(date);
      if (otherSelecting === 'start' || !otherStart) {
        otherStart = iso; otherEnd = null; otherSelecting = 'end';
      } else {
        if (iso < otherStart) { otherEnd = otherStart; otherStart = iso; }
        else { otherEnd = iso; }
        otherSelecting = 'start';
      }
      updateCalendars();
      updateLabel();
    }

    function fireChange() {
      var range;
      if (period === 'other') {
        if (!otherStart || !otherEnd) return;
        range = { start: otherStart, end: otherEnd };
      } else if (period === 'recent') {
        range = computeRange('recent', 0);
      } else {
        range = computeRange(period, offset);
      }
      onChange(range.start, range.end);
    }

    function refresh() {
      updateLabel(); updatePeriodBtns(); updateNavBtns(); updateCalendars();
    }

    // ── Event wiring

    PERIODS.forEach(function(p) {
      periodBtns[p.id].addEventListener('click', function(e) {
        e.stopPropagation();
        period = p.id;
        offset = p.id === 'week' ? -1 : 0;
        refresh();
        if (p.id !== 'other') { closeDropdown(); fireChange(); }
      });
    });

    btnPrev.addEventListener('click', function(e) {
      e.stopPropagation();
      if (period === 'other' || period === 'recent') return;
      offset--; refresh(); fireChange();
    });

    btnNext.addEventListener('click', function(e) {
      e.stopPropagation();
      if (period === 'other' || period === 'recent') return;
      if (!canGoForward(period, offset)) return;
      offset++; refresh(); fireChange();
    });

    labelBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdownOpen ? closeDropdown() : openDropdown();
    });

    okBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      var ns = parseDisplayDate(startField.input.value);
      var ne = parseDisplayDate(endField.input.value);
      if (ns) otherStart = ns;
      if (ne) otherEnd   = ne;
      if (otherStart && otherEnd) {
        if (otherEnd < otherStart) { var tmp = otherStart; otherStart = otherEnd; otherEnd = tmp; }
        closeDropdown(); updateLabel(); fireChange();
      }
    });

    startField.input.addEventListener('change', function() {
      var v = parseDisplayDate(startField.input.value);
      if (v) { otherStart = v; otherSelecting = 'end'; updateCalendars(); }
    });
    endField.input.addEventListener('change', function() {
      var v = parseDisplayDate(endField.input.value);
      if (v) { otherEnd = v; otherSelecting = 'start'; updateCalendars(); }
    });

    // ── Dropdown management

    function openDropdown() {
      dropdownOpen = true;
      dropdown.classList.add('dp-dropdown--open');
      if (period === 'other' && otherStart) {
        var d = parseDate(otherStart);
        leftCal  = { year: d.getFullYear(), month: d.getMonth() };
        rightCal = { year: d.getFullYear(), month: d.getMonth() + 1 };
        if (rightCal.month > 11) { rightCal.month = 0; rightCal.year++; }
      }
      refresh();
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

    dropdown.addEventListener('click', function(e) { e.stopPropagation(); });

    refresh();
    opts.container.appendChild(wrapper);

    return {
      getStartDate: function() {
        if (period === 'other') return otherStart;
        if (period === 'recent') return computeRange('recent', 0).start;
        return computeRange(period, offset).start;
      },
      getEndDate: function() {
        if (period === 'other') return otherEnd;
        if (period === 'recent') return computeRange('recent', 0).end;
        return computeRange(period, offset).end;
      },
      destroy: function() {
        document.removeEventListener('click', outsideClick);
        if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
      }
    };
  }

  return { create: create };

})();
