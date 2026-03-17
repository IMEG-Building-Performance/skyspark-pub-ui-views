window.EventAnnotationsPlot = window.EventAnnotationsPlot || {};
window.EventAnnotationsPlot.table = {};

window.EventAnnotationsPlot.table.createEventsTable = function(container, eventsData) {
  // Clear existing content
  container.innerHTML = '';

  // Create table container
  var tableContainer = document.createElement('div');
  tableContainer.style.width = '100%';
  tableContainer.style.backgroundColor = 'white';
  tableContainer.style.borderRadius = '8px';
  tableContainer.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
  tableContainer.style.padding = '20px';
  tableContainer.style.marginTop = '20px';
  container.appendChild(tableContainer);

  // Create header with event count
  var headerContainer = document.createElement('div');
  headerContainer.style.display = 'flex';
  headerContainer.style.justifyContent = 'space-between';
  headerContainer.style.alignItems = 'center';
  headerContainer.style.marginBottom = '20px';
  headerContainer.style.paddingBottom = '15px';
  headerContainer.style.borderBottom = '1px solid #e0e0e0';
  tableContainer.appendChild(headerContainer);

  // Event count
  var eventCount = document.createElement('div');
  eventCount.textContent = eventsData.length + ' Events';
  eventCount.style.fontSize = '24px';
  eventCount.style.fontWeight = '700';
  eventCount.style.color = '#2c3e50';
  headerContainer.appendChild(eventCount);

  // Table content container
  var tableContent = document.createElement('div');
  tableContent.style.width = '100%';
  tableContainer.appendChild(tableContent);

  // Create table
  var table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  tableContent.appendChild(table);

  // Create header row
  var thead = document.createElement('thead');
  table.appendChild(thead);
  var headerRow = document.createElement('tr');
  headerRow.style.borderBottom = '2px solid #e0e0e0';
  thead.appendChild(headerRow);

  var headers = ['', 'event', 'eventID', 'totalCost'];
  headers.forEach(function(headerText, index) {
    var th = document.createElement('th');
    th.textContent = headerText;
    th.style.padding = '15px 10px';
    th.style.textAlign = index === 0 ? 'center' : (index === headers.length - 1 ? 'right' : 'left');
    th.style.fontSize = '14px';
    th.style.fontWeight = '600';
    th.style.color = '#6c757d';
    headerRow.appendChild(th);
  });

  // Create body rows
  var tbody = document.createElement('tbody');
  table.appendChild(tbody);

  eventsData.forEach(function(event) {
    var row = document.createElement('tr');
    row.style.borderBottom = '1px solid #e0e0e0';
    row.style.transition = 'background-color 0.2s';
    row.addEventListener('mouseenter', function() {
      row.style.backgroundColor = '#f8f9fa';
    });
    row.addEventListener('mouseleave', function() {
      row.style.backgroundColor = 'transparent';
    });
    tbody.appendChild(row);

    // Radio button
    var radioCell = document.createElement('td');
    radioCell.style.padding = '15px 10px';
    radioCell.style.textAlign = 'center';
    radioCell.style.width = '50px';
    var radio = document.createElement('div');
    radio.style.width = '20px';
    radio.style.height = '20px';
    radio.style.border = '2px solid #ccc';
    radio.style.borderRadius = '50%';
    radio.style.margin = '0 auto';
    radio.style.cursor = 'pointer';
    radioCell.appendChild(radio);
    row.appendChild(radioCell);

    // Event name
    var nameCell = document.createElement('td');
    nameCell.textContent = event.event || '';
    nameCell.style.padding = '15px 10px';
    nameCell.style.fontSize = '14px';
    nameCell.style.color = '#2c3e50';
    row.appendChild(nameCell);

    // Event ID
    var idCell = document.createElement('td');
    idCell.textContent = event.eventID || '';
    idCell.style.padding = '15px 10px';
    idCell.style.fontSize = '14px';
    idCell.style.color = '#2c3e50';
    row.appendChild(idCell);

    // Total cost - handle Haystack number format {_kind: "number", val: X}
    var costCell = document.createElement('td');
    var totalCost = event.totalCost;
    var costVal = 0;
    if (totalCost) {
      if (totalCost._kind === 'number' && totalCost.val !== undefined) {
        costVal = totalCost.val;
      } else if (typeof totalCost === 'object' && totalCost.val !== undefined) {
        costVal = totalCost.val;
      } else if (typeof totalCost === 'number') {
        costVal = totalCost;
      } else if (typeof totalCost === 'string' && !isNaN(parseFloat(totalCost))) {
        costVal = parseFloat(totalCost);
      }
    }
    costCell.textContent = '$' + costVal.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    costCell.style.padding = '15px 10px';
    costCell.style.fontSize = '14px';
    costCell.style.fontWeight = '600';
    costCell.style.color = '#2c3e50';
    costCell.style.textAlign = 'right';
    row.appendChild(costCell);
  });
};
