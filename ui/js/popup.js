'use strict';
const MAX_PORT = 0xffff;
const MIN_PORT = 1;

function escapeHTML(str) {
  return str.toString().replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace().replace(/'/g, "&#39;")
}

// PortScan Table 
function showPortScanData(data) {

  var tbody = document.querySelector('#log_portscan_tab  tbody');
  var tr = '<tr>';
  Object.getOwnPropertyNames(data).forEach(function (port) {
    Object.getOwnPropertyNames(data[port]).forEach(hostname => {
      tr += `<td>${escapeHTML(port)}</td>
              <td>${escapeHTML(hostname)}</td><td>`;
      data[port][hostname].forEach(initiator_data => {
        tr += `<a href="#" id="tabids" data-tabid="${escapeHTML(initiator_data.tabId)}">
              ${escapeHTML(initiator_data.initiator)}</a><br>`;
      });
      tr += '</td></tr>';
    });
  });
  tbody.innerHTML = tr;
}

// IPAccess Table 
function showIPAccessData(data) {
  var tbody = document.querySelector('#log_ipaccess_tab  tbody');
  var tr = '<tr>';
  Object.getOwnPropertyNames(data).forEach(function (ip) {
    for (var i = 0; i < data[ip].length; i++) {
      tr += `<td>${escapeHTML(ip+":"+data[ip][i].port)}</td>
              <td>${escapeHTML(data[ip][i].target)}</td>
              <td>
              <a href="#" id="tabids" data-tabid="${escapeHTML(data[ip][i].tabId)}">
              ${escapeHTML(data[ip][i].initiator)}</a></td>
              </tr>`;
      tbody.innerHTML += tr;
    }
  });
}

// Rebind Table 
function showReboundData(data) {
  var tbody = document.querySelector('#log_rebinding_tab  tbody');
  var tr = '<tr>';
  Object.getOwnPropertyNames(data).forEach(function (hostname) {
      tr += `<td>${escapeHTML(hostname)}</td>
              <td>${escapeHTML(data[hostname].private_ips)}, <br> ${escapeHTML(data[hostname].public_ips)}</td>
              <td>
              <a href="#" id="tabids" data-tabid="${escapeHTML(data[hostname].tabId)}">
              ${escapeHTML(data[hostname].initiator)}</a></td>
              </tr>`;
      tbody.innerHTML += tr;
  });
}
chrome.runtime.getBackgroundPage(function (win) {

  function init_ui() {
    var reqIp_length = Object.keys(win.requestedIPs).length;
    var portScan_length = Object.keys(win.portScanMap).length;
    var reboundHost_length = Object.keys(win.reboundHostnamesMap).length;

    // UI Initialization 
    var first_visible_element;

    document.getElementById("log_ipaccess_tab").dataset.number = ` (${reqIp_length})`;
    document.getElementById("log_portscan_tab").dataset.number = ` (${portScan_length})`;
    document.getElementById("log_rebinding_tab").dataset.number = ` (${reboundHost_length})`;

    // Set visibility priority 
    if (reqIp_length) {
      first_visible_element = document.getElementById("log_ipaccess_tab");
    } else if (portScan_length) {
      first_visible_element = document.getElementById("log_portscan_tab");
    } else if (reboundHost_length) {
      first_visible_element = document.getElementById("log_rebinding_tab");
    } else {
      first_visible_element = document.getElementById("prefs_tab");
    }
    //first_visible_element.style.display = "block";
    first_visible_element.click()
  }

  /// Threshold Preferences 
  var threshold_el = document.getElementById("threshold");
  threshold_el.value = win.getPortThreshold();
  // check threshold and set it to user val.
  threshold_el.addEventListener("change",
    function (ev) {
      var value = ev.target.value;
      if (isNaN(value))
        return;
      if (value > MAX_PORT)
        value = MAX_PORT;
      if (value < MIN_PORT)
        value = MIN_PORT;

      win.setPortThreshold(value);
    });

  /// Notification Preferences 
  var notification_enable_el = document.getElementById("notification_enable");
  notification_enable_el.checked = win.getOSNotificationEnabled();
  notification_enable_el.addEventListener("change", function (ev) {
    win.setOSNotificationEnabled(ev.target.checked);
  });

  /// Debug Preferences 
  var debug_enable_el = document.getElementById("debug_enable");
  debug_enable_el.checked = win.getDebugEnabled();
  debug_enable_el.addEventListener("change", function (ev) {
    win.setDebugEnabled(ev.target.checked);
  });

  // TAB Clicking
  document.getElementById("tab").addEventListener("click", function (ev) {
    var i, tabcontent, tablinks;
    tabcontent = document.querySelectorAll(".tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
    }

    tablinks = document.querySelectorAll(".tablinks");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.querySelector(".tabcontent#" + ev.target.id).style.display = "block";
    ev.target.className += " active";
  });
  
  init_ui();
  // Populate data
  showPortScanData(win.portScanMap);
  showIPAccessData(win.requestedIPs);
  showReboundData(win.reboundHostnamesMap);

  document.addEventListener('click', function (ev) {
    if (ev.target.id === "tabids") {
      //chrome.tabs.highlight({tabs:+ev.target.dataset.tabid});
      chrome.tabs.update(+ev.target.dataset.tabid, {
        selected: true
      });
    }
  });

});