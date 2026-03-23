// components/VavTable.js
// Sortable, searchable VAV unit table
window.reheatDashboard = window.reheatDashboard || {};

(function (NS) {
  var tipLabels = NS.fields.tipLabels;
  var badgeCls = NS.fields.badgeCls;

  NS.VavTable = {};

  NS.VavTable.render = function (vavData, selectedId, sortCol, sortDir, searchVal, onSelect) {
    var q = searchVal.toLowerCase();
    var rows = vavData.filter(function (d) {
      return d.name.toLowerCase().indexOf(q) !== -1 ||
        tipLabels[d.flag].toLowerCase().indexOf(q) !== -1;
    });
    rows.sort(function (a, b) {
      var av = a[sortCol], bv = b[sortCol];
      return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * sortDir;
    });

    var rowCountEl = document.getElementById('rdRowCount');
    if (rowCountEl) rowCountEl.textContent = rows.length + ' of ' + vavData.length;

    var tbody = document.getElementById('rdTableBody');
    if (!tbody) return;
    tbody.innerHTML = rows.map(function (d) {
      return '<tr data-id="' + d.id + '" class="' + (d.id === selectedId ? 'selected' : '') + '">' +
        '<td class="name-cell">' + d.name + '</td>' +
        '<td>' + d.dat + ' \u00B0F</td>' +
        '<td>' + d.rh + '%</td>' +
        '<td><span class="' + badgeCls[d.flag] + '">' + tipLabels[d.flag] + '</span></td>' +
        '</tr>';
    }).join('');

    // Attach click handlers
    var trEls = tbody.querySelectorAll('tr[data-id]');
    for (var i = 0; i < trEls.length; i++) {
      (function (tr) {
        tr.addEventListener('click', function () {
          onSelect(parseInt(tr.getAttribute('data-id'), 10));
        });
      })(trEls[i]);
    }
  };
})(window.reheatDashboard);
