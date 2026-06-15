// evals/loadMeterAllocationData.js
// Data loader for the Tenant Usage Allocation tab.
// Ported from skyspark-tenant-meter-allocation — calls the same Axon functions
// but uses the mbcxDashboard API and haystack helpers.
window.mbcxDashboard = window.mbcxDashboard || {};
window.mbcxDashboard.evals = window.mbcxDashboard.evals || {};

(function (EVALS) {

  var API = window.mbcxDashboard.api;

  // ── Haystack cell helpers (ref / num) ────────────────────────────────────────
  function _ref(v) {
    if (!v || typeof v !== 'object') return null;
    var kind = (v._kind || '').toLowerCase();
    if (kind === 'ref') return { id: v.val || '', dis: (v.dis || v.val || '').trim() };
    return null;
  }
  function _num(v) {
    if (v == null) return { val: 0, unit: '' };
    if (typeof v === 'number') return { val: v, unit: '' };
    if (typeof v === 'object') {
      if ((v._kind || '').toLowerCase() === 'number') {
        return { val: typeof v.val === 'number' ? v.val : parseFloat(v.val) || 0, unit: v.unit || '' };
      }
    }
    return { val: parseFloat(v) || 0, unit: '' };
  }

  // ── Meter data (report_meterValidation_meterData) ────────────────────────────

  function _parseMeterGrid(grid) {
    if (!grid || !grid.rows) return [];
    if (grid.meta && grid.meta.err) {
      throw new Error(grid.meta.dis ? String(grid.meta.dis) : 'SkySpark returned an error grid');
    }
    return (grid.rows || []).map(function (row) {
      var id    = _ref(row.id)    || { id: '', dis: '' };
      var meter = _ref(row.meter) || { id: '', dis: '' };
      var usage = _num(row.usage);
      var perc  = _num(row.percOfPlant);
      var cost  = _num(row.cost);
      return {
        groupId:     id.id,
        groupName:   id.dis,
        meterId:     meter.id,
        meterName:   meter.dis,
        usage:       usage.val,
        usageUnit:   usage.unit || 'BTU',
        percOfPlant: perc.val,
        cost:        cost.val
      };
    });
  }

  function _loadMeterData(attestKey, projectName, siteRef, dates, utility) {
    var axon = 'report_meterValidation_meterData(' + siteRef + ', ' + dates + ', "' + utility + '")';
    return API.evalAxon(attestKey, projectName, axon)
      .then(function (grid) { return _parseMeterGrid(grid); });
  }

  EVALS.loadAllMeterAllocationUtilities = function (attestKey, projectName, siteRef, dates) {
    var UTILS = ['Cooling', 'Heating', 'Flow'];
    var errors = {};
    var promises = UTILS.map(function (u) {
      return _loadMeterData(attestKey, projectName, siteRef, dates, u)
        .catch(function (err) {
          errors[u] = err.message || String(err);
          return [];
        });
    });
    return Promise.all(promises).then(function (results) {
      var out = { _errors: errors };
      UTILS.forEach(function (u, i) { out[u] = results[i]; });
      return out;
    });
  };

  // ── Summary data (report_meterValidation_plantTotalsTable) ───────────────────

  function _parseSummaryGrid(grid) {
    if (!grid || !grid.rows) return null;
    if (grid.meta && grid.meta.err) {
      throw new Error(grid.meta.dis ? String(grid.meta.dis) : 'SkySpark returned an error grid');
    }
    if (!grid.rows.length) return null;
    var row  = grid.rows[0];
    var bill = _num(row.plantTotalBillUsage);
    var btu  = _num(row.plantTotalBTUUsage);
    var cost = _num(row.plantTotalCost);
    return { billUsage: bill.val, billUnit: bill.unit || 'therm', btuUsage: btu.val, btuUnit: btu.unit || 'BTU', cost: cost.val };
  }

  EVALS.loadAllMeterAllocationSummary = function (attestKey, projectName, siteRef, dates) {
    var UTILS = ['Cooling', 'Heating', 'Flow'];
    var errors = {};
    var promises = UTILS.map(function (u) {
      var axon = 'report_meterValidation_plantTotalsTable(' + siteRef + ', ' + dates + ', false, "' + u + '")';
      return API.evalAxon(attestKey, projectName, axon)
        .then(function (grid) { return _parseSummaryGrid(grid); })
        .catch(function (err) { errors[u] = err.message || String(err); return null; });
    });
    return Promise.all(promises).then(function (results) {
      var out = { _errors: errors };
      UTILS.forEach(function (u, i) { out[u] = results[i]; });
      return out;
    });
  };

  // ── Tenant totals (report_meterValidation_tenantTotalsTable) ─────────────────

  function _parseTenantGrid(grid) {
    if (!grid || !grid.rows) return [];
    if (grid.meta && grid.meta.err) {
      throw new Error(grid.meta.dis ? String(grid.meta.dis) : 'SkySpark returned an error grid');
    }
    return (grid.rows || []).map(function (row) {
      var usage = _num(row.totalTenanteUsage);
      return {
        tenantName: typeof row.tenant === 'string' ? row.tenant : String(row.tenant || ''),
        usage:      usage.val,
        usageUnit:  usage.unit || 'BTU'
      };
    });
  }

  EVALS.loadAllMeterAllocationTenantTotals = function (attestKey, projectName, siteRef, dates) {
    var UTILS = ['Cooling', 'Heating', 'Flow'];
    var errors = {};
    var promises = UTILS.map(function (u) {
      var axon = 'report_meterValidation_tenantTotalsTable(' + siteRef + ', ' + dates + ', false, "' + u + '")';
      return API.evalAxon(attestKey, projectName, axon)
        .then(function (grid) { return _parseTenantGrid(grid); })
        .catch(function (err) { errors[u] = err.message || String(err); return []; });
    });
    return Promise.all(promises).then(function (results) {
      var out = { _errors: errors };
      UTILS.forEach(function (u, i) { out[u] = results[i]; });
      return out;
    });
  };

  // ── Residential totals (report_meterValidation_residentialMeterTotal) ────────

  function _parseNestedMeterGrid(gridVal) {
    if (!gridVal || !gridVal.rows) return [];
    return gridVal.rows.map(function (row) {
      var id    = _ref(row.id) || { id: '', dis: '' };
      var usage = _num(row.usage);
      return { name: id.dis, id: id.id, usage: usage.val, unit: usage.unit || 'BTU' };
    });
  }

  function _parseResidentialGrid(grid) {
    if (!grid || !grid.rows) return null;
    if (grid.meta && grid.meta.err) {
      throw new Error(grid.meta.dis ? String(grid.meta.dis) : 'SkySpark returned an error grid');
    }
    if (!grid.rows.length) return null;
    var row = grid.rows[0];
    function n(f) { var r = _num(row[f]); return { val: r.val, unit: r.unit || 'BTU' }; }
    function m(f) { return _parseNestedMeterGrid(row[f]); }
    return {
      group1Sum: n('group1Sum'), group2Sum: n('group2Sum'), group3Sum: n('group3Sum'),
      group4Sum: n('group4Sum'), group5Sum: n('group5Sum'), group6Sum: n('group6Sum'),
      group1Plus2: n('group1Plus2'), group3Minus5: n('group3Minus5'),
      group4Minus5Minus6: n('group4Minus5Minus6'), resSum: n('resSum'),
      group1Meters: m('group1Meters'), group2Meters: m('group2Meters'),
      group3Meters: m('group3Meters'), group4Meters: m('group4Meters'),
      group5Meters: m('group5Meters'), group6Meters: m('group6Meters')
    };
  }

  EVALS.loadAllMeterAllocationResidential = function (attestKey, projectName, siteRef, dates) {
    var RES_UTILS = ['Cooling', 'Heating'];
    var errors = {};
    var promises = RES_UTILS.map(function (u) {
      var axon = 'report_meterValidation_residentialMeterTotal(' + siteRef + ', ' + dates + ', "' + u + '")';
      return API.evalAxon(attestKey, projectName, axon)
        .then(function (grid) { return _parseResidentialGrid(grid); })
        .catch(function (err) { errors[u] = err.message || String(err); return null; });
    });
    return Promise.all(promises).then(function (results) {
      var out = { _errors: errors };
      RES_UTILS.forEach(function (u, i) { out[u] = results[i]; });
      return out;
    });
  };

})(window.mbcxDashboard.evals);
