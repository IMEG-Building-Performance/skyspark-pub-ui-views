/**
 * Documentation.js
 *
 * Full-page Documentation panel that displays the project README
 * as formatted HTML content.
 *
 * Accessed via "Documentation" button in the header.
 * Replaces the main content area; "Back to Chart" restores it.
 *
 * CSS namespace: doc- (Documentation)
 */

window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};
window.EventAnnotationsPlot.documentation = {};

// ── State ────────────────────────────────────────────────────────────────

window.EventAnnotationsPlot.documentation._state = {
  isOpen: false,
  _savedContent: null
};

// ── README Content ───────────────────────────────────────────────────────

window.EventAnnotationsPlot.documentation.getReadmeHTML = function() {
  return '' +
    '<div class="doc-readme">' +

    '<h1>Event Annotations on Plot</h1>' +
    '<p class="doc-subtitle">An interactive time-series visualization with color-coded event sidebar for SkySpark using Chart.js.</p>' +

    '<div class="doc-status">' +
      '<span class="doc-badge doc-badge-success">Fully Functional</span>' +
      '<span class="doc-note">Chart.js annotation plugin has compatibility limitations in SkySpark environment. Vertical annotation lines on chart may not appear, but the visualization is complete and functional through the color-coded sidebar.</span>' +
    '</div>' +

    '<h2>Overview</h2>' +
    '<ul>' +
      '<li><strong>Time-series data visualization</strong> with a line chart</li>' +
      '<li><strong>Color-coded event sidebar</strong> with matching indicators</li>' +
      '<li><strong>Interactive UI</strong> with hover and click effects</li>' +
      '<li><strong>Sample data generation</strong> for immediate testing</li>' +
      '<li><strong>Responsive layout</strong> with proper scrolling and sizing</li>' +
    '</ul>' +

    '<h2>Features</h2>' +
    '<div class="doc-features">' +
      '<div class="doc-feature-item"><span class="doc-check">&#10003;</span> <strong>Chart Display</strong> &mdash; Temperature line graph with time scale</div>' +
      '<div class="doc-feature-item"><span class="doc-check">&#10003;</span> <strong>Event Sidebar</strong> &mdash; Color-coded with detailed information</div>' +
      '<div class="doc-feature-item"><span class="doc-check">&#10003;</span> <strong>Visual Connection</strong> &mdash; Matching colors between events and chart</div>' +
      '<div class="doc-feature-item"><span class="doc-check">&#10003;</span> <strong>Interactive</strong> &mdash; Click events to highlight them</div>' +
      '<div class="doc-feature-item"><span class="doc-check">&#10003;</span> <strong>Responsive</strong> &mdash; Proper sizing and scrolling</div>' +
      '<div class="doc-feature-item"><span class="doc-check">&#10003;</span> <strong>Fallback Loading</strong> &mdash; Chart loads even if annotation plugin fails</div>' +
    '</div>' +

    '<h2>Quick Start</h2>' +

    '<h3>1. Install Files</h3>' +
    '<p>Copy the JavaScript file to your SkySpark pub/ui directory:</p>' +
    '<pre><code>cp eventAnnotationsPlot.js {var}/pub/ui/</code></pre>' +
    '<p>Where <code>{var}</code> is your SkySpark var directory (e.g., <code>/var/skyspark/proj/myProject/</code>)</p>' +

    '<h3>2. Configure uiMeta</h3>' +
    '<p>Ensure your application\'s <code>uiMeta</code> record includes the <code>includePub</code> marker:</p>' +
    '<pre><code>dis: "My Application Meta"\nuiMeta\nincludePub\nappName: myApp</code></pre>' +

    '<h3>3. Create View Record</h3>' +
    '<p>Add the view record from <code>eventAnnotationsPlot-viewRecord.trio</code> to your project.</p>' +

    '<p><strong>Option A: Via Folio</strong></p>' +
    '<ol>' +
      '<li>Open Folio tool</li>' +
      '<li>Create new record</li>' +
      '<li>Paste the trio content</li>' +
      '<li>Save</li>' +
    '</ol>' +

    '<p><strong>Option B: Via Apps Builder</strong></p>' +
    '<ol>' +
      '<li>Open your app in Apps Builder</li>' +
      '<li>Add new view</li>' +
      '<li>Configure with the trio settings</li>' +
    '</ol>' +

    '<p><strong>View Record:</strong></p>' +
    '<pre><code>dis: "Event Annotations Plot"\nappName: myApp\nview: eventAnnotationsPlot\nsrc:\n  view:      { inherit:"js" }\n  jsHandler: { var defVal:"eventAnnotationsPlotHandler" }\n  data:      { expr:"readAll(site).keepCols([\\"dis\\"])" }</code></pre>' +

    '<h3>4. Restart and View</h3>' +
    '<ol>' +
      '<li>Restart SkySpark service</li>' +
      '<li>Navigate to your application</li>' +
      '<li>Open the "Event Annotations Plot" view</li>' +
    '</ol>' +

    '<h2>Technical Details</h2>' +

    '<h3>Dependencies</h3>' +
    '<p>The visualization uses <strong>Chart.js v4.4.0</strong>, which is automatically loaded from CDN. No manual installation required.</p>' +

    '<h3>Architecture</h3>' +
    '<p><strong>Handler Structure:</strong></p>' +
    '<pre><code>var eventAnnotationsPlotHandler = {};\n\neventAnnotationsPlotHandler.onUpdate = function(arg) {\n  // Main rendering logic\n  // - Loads Chart.js if needed\n  // - Generates sample data\n  // - Creates chart with annotations\n  // - Builds event list UI\n};</code></pre>' +

    '<p><strong>Key Functions:</strong></p>' +
    '<ul>' +
      '<li><code>loadChartJs()</code> &mdash; Dynamically loads Chart.js library</li>' +
      '<li><code>generateSampleData()</code> &mdash; Creates 7 days of hourly temperature data</li>' +
      '<li><code>generateSampleEvents()</code> &mdash; Defines 5 sample event annotations</li>' +
      '<li><code>createChart()</code> &mdash; Initializes Chart.js with annotations plugin</li>' +
      '<li><code>createEventList()</code> &mdash; Builds the interactive events sidebar</li>' +
    '</ul>' +

    '<h3>Sample Data</h3>' +
    '<table class="doc-table">' +
      '<thead><tr><th>Property</th><th>Value</th></tr></thead>' +
      '<tbody>' +
        '<tr><td>Data Points</td><td>168 (7 days &times; 24 hours)</td></tr>' +
        '<tr><td>Metric</td><td>Simulated zone temperature (&deg;F)</td></tr>' +
        '<tr><td>Pattern</td><td>Daily sinusoidal with random noise</td></tr>' +
        '<tr><td>Base Temperature</td><td>68&deg;F</td></tr>' +
        '<tr><td>Variation</td><td>&plusmn;8&deg;F</td></tr>' +
      '</tbody>' +
    '</table>' +

    '<h3>Event Annotations</h3>' +
    '<table class="doc-table">' +
      '<thead><tr><th>#</th><th>Event</th><th>Date/Time</th><th>Color</th></tr></thead>' +
      '<tbody>' +
        '<tr><td>1</td><td>HVAC Maintenance</td><td>Dec 2, 8:30 AM</td><td><span class="doc-color-swatch" style="background:rgba(54,162,235,0.8)"></span> Blue</td></tr>' +
        '<tr><td>2</td><td>Temperature Spike</td><td>Dec 3, 2:00 PM</td><td><span class="doc-color-swatch" style="background:rgba(255,99,132,0.8)"></span> Red</td></tr>' +
        '<tr><td>3</td><td>System Reset</td><td>Dec 4, 10:15 AM</td><td><span class="doc-color-swatch" style="background:rgba(75,192,192,0.8)"></span> Teal</td></tr>' +
        '<tr><td>4</td><td>Alarm Cleared</td><td>Dec 5, 4:45 PM</td><td><span class="doc-color-swatch" style="background:rgba(153,102,255,0.8)"></span> Purple</td></tr>' +
        '<tr><td>5</td><td>Filter Replaced</td><td>Dec 6, 9:00 AM</td><td><span class="doc-color-swatch" style="background:rgba(255,159,64,0.8)"></span> Orange</td></tr>' +
      '</tbody>' +
    '</table>' +

    '<h2>Customization</h2>' +

    '<h3>Adding Real Data</h3>' +
    '<p>To connect to actual SkySpark point data, modify the view record\'s data expression:</p>' +
    '<pre><code>src:\n  view:      { inherit:"js" }\n  pointRef:  { var kind:"Ref" }\n  startDate: { var kind:"Date", defVal:today() - 7day }\n  endDate:   { var kind:"Date", defVal:today() }\n  jsHandler: { var defVal:"eventAnnotationsPlotHandler" }\n  data:      { expr:"hisRead($pointRef, $startDate..$endDate)" }</code></pre>' +

    '<h3>Changing Colors</h3>' +
    '<p>Event colors are defined in <code>generateSampleEvents()</code>:</p>' +
    '<pre><code>{\n  time: new Date(\'2025-12-02T08:30:00\'),\n  label: \'HVAC Maintenance\',\n  description: \'Scheduled maintenance performed\',\n  color: \'rgba(54, 162, 235, 0.8)\'  // Change this!\n}</code></pre>' +

    '<h3>Adjusting Chart Options</h3>' +
    '<p>Chart.js configuration is in the <code>createChart()</code> function:</p>' +
    '<pre><code>options: {\n  responsive: true,\n  plugins: {\n    title: {\n      text: \'Your Custom Title\'\n    }\n  },\n  scales: {\n    x: {\n      type: \'time\',\n      time: {\n        unit: \'day\'  // Change to \'hour\', \'week\', etc.\n      }\n    }\n  }\n}</code></pre>' +

    '<h2>Use Cases</h2>' +

    '<div class="doc-use-cases">' +
      '<div class="doc-use-case">' +
        '<h3>Building Management</h3>' +
        '<ul>' +
          '<li>Visualize zone temperatures with maintenance events</li>' +
          '<li>Track HVAC system changes and their impact</li>' +
          '<li>Correlate alarms with operational events</li>' +
        '</ul>' +
      '</div>' +
      '<div class="doc-use-case">' +
        '<h3>Energy Analysis</h3>' +
        '<ul>' +
          '<li>Plot energy consumption with building occupancy events</li>' +
          '<li>Mark equipment start/stop times</li>' +
          '<li>Identify anomalies with contextual annotations</li>' +
        '</ul>' +
      '</div>' +
      '<div class="doc-use-case">' +
        '<h3>Fault Detection</h3>' +
        '<ul>' +
          '<li>Display sensor data with diagnostic events</li>' +
          '<li>Annotate when faults were detected and cleared</li>' +
          '<li>Track system performance before/after interventions</li>' +
        '</ul>' +
      '</div>' +
    '</div>' +

    '<h2>Troubleshooting</h2>' +

    '<h3>Chart Not Displaying</h3>' +
    '<p><strong>Symptoms:</strong> Blank view or loading message persists</p>' +
    '<ol>' +
      '<li>Check browser console for errors (F12)</li>' +
      '<li>Verify Chart.js loaded: Look for <code>chart.umd.min.js</code> in Network tab</li>' +
      '<li>Ensure handler name matches: <code>eventAnnotationsPlotHandler</code></li>' +
      '<li>Confirm <code>includePub</code> marker is set in uiMeta</li>' +
    '</ol>' +

    '<h3>Annotations Not Showing</h3>' +
    '<p><strong>Symptoms:</strong> Chart displays but no vertical lines</p>' +
    '<ol>' +
      '<li>Verify Chart.js version is 4.x</li>' +
      '<li>Check console for annotation plugin errors</li>' +
      '<li>Ensure event times fall within the data range</li>' +
      '<li>Review annotation configuration in <code>createChart()</code></li>' +
    '</ol>' +

    '<h3>Common JavaScript Errors</h3>' +
    '<table class="doc-table">' +
      '<thead><tr><th>Error</th><th>Cause</th><th>Fix</th></tr></thead>' +
      '<tbody>' +
        '<tr><td><code>Chart is not defined</code></td><td>Chart.js not loaded</td><td>Check script URL and network</td></tr>' +
        '<tr><td><code>Cannot read properties of undefined</code></td><td>Handler name mismatch</td><td>Verify jsHandler defVal</td></tr>' +
        '<tr><td><code>canvas.getContext is not a function</code></td><td>Canvas not created</td><td>Check DOM element creation</td></tr>' +
      '</tbody>' +
    '</table>' +

    '<h3>Performance Issues</h3>' +
    '<p>If the chart is slow or laggy:</p>' +
    '<ol>' +
      '<li>Reduce data points (limit sample data to fewer days)</li>' +
      '<li>Decrease point radius: <code>pointRadius: 0</code></li>' +
      '<li>Disable animations: <code>animation: false</code></li>' +
      '<li>Simplify tooltip callbacks</li>' +
    '</ol>' +

    '<h2>Development Notes</h2>' +

    '<h3>Browser Compatibility</h3>' +
    '<table class="doc-table">' +
      '<thead><tr><th>Browser</th><th>Minimum Version</th></tr></thead>' +
      '<tbody>' +
        '<tr><td>Chrome</td><td>90+</td></tr>' +
        '<tr><td>Firefox</td><td>88+</td></tr>' +
        '<tr><td>Safari</td><td>14+</td></tr>' +
        '<tr><td>Edge</td><td>90+</td></tr>' +
      '</tbody>' +
    '</table>' +

    '<div class="doc-footer">' +
      '<p><strong>Version:</strong> 1.0 &nbsp;|&nbsp; <strong>Created:</strong> December 2025 &nbsp;|&nbsp; <strong>Last Updated:</strong> December 3, 2025</p>' +
    '</div>' +

    '</div>';
};

// ── Open Panel ───────────────────────────────────────────────────────────

window.EventAnnotationsPlot.documentation.openPanel = function(mainContainer) {
  var doc = window.EventAnnotationsPlot.documentation;
  var docState = doc._state;

  // Save the current main content so we can restore on close
  docState._savedContent = [];
  while (mainContainer.firstChild) {
    docState._savedContent.push(mainContainer.removeChild(mainContainer.firstChild));
  }
  docState.isOpen = true;

  // Root container
  var container = document.createElement('div');
  container.className = 'doc-container';
  mainContainer.appendChild(container);

  // Header
  var header = document.createElement('div');
  header.className = 'doc-header';

  var titleEl = document.createElement('h2');
  titleEl.textContent = 'Documentation';
  header.appendChild(titleEl);

  var backBtn = document.createElement('button');
  backBtn.className = 'doc-back-btn';
  backBtn.innerHTML = '\u2190 Back to Chart';
  backBtn.onclick = function() {
    doc.closePanel(mainContainer);
  };
  header.appendChild(backBtn);
  container.appendChild(header);

  // Content area
  var content = document.createElement('div');
  content.className = 'doc-content';
  content.innerHTML = doc.getReadmeHTML();
  container.appendChild(content);
};

// ── Close Panel ──────────────────────────────────────────────────────────

window.EventAnnotationsPlot.documentation.closePanel = function(mainContainer) {
  var docState = window.EventAnnotationsPlot.documentation._state;
  docState.isOpen = false;

  // Restore saved content
  mainContainer.innerHTML = '';
  if (docState._savedContent) {
    docState._savedContent.forEach(function(child) {
      mainContainer.appendChild(child);
    });
    docState._savedContent = null;
  }
};
