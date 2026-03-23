// utils/svg.js
// SVG element creation helpers
window.reheatDashboard = window.reheatDashboard || {};

(function (NS) {
  NS.svg = {};

  NS.svg.create = function (tag, attrs, parent) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) {
      if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(e);
    return e;
  };

  NS.svg.text = function (content, attrs, parent) {
    var e = NS.svg.create('text', attrs, parent);
    e.textContent = content;
    return e;
  };

  NS.svg.dotFill = function (flag, sel) {
    if (sel) return '#f59e0b';
    if (flag === 'faulty') return '#ef4444';
    if (flag === 'leaking') return '#8b5cf6';
    return '#3b82f6';
  };

  NS.svg.dotStroke = function (flag, sel) {
    if (sel) return '#b45309';
    if (flag === 'faulty') return '#b91c1c';
    if (flag === 'leaking') return '#5b21b6';
    return '#1d4ed8';
  };
})(window.reheatDashboard);
