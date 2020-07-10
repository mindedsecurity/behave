'use strict';
const MAX_PORT = 0xffff;
const MIN_PORT = 1;

const MAX_LINES_PER_PAGES = 20;

function escapeHTML(str) {
  if (str)
    return str.toString().replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace().replace(/'/g, "&#39;")
  else {
    return "undefined";
  }
}

function getFormattedDate(timestamp) {
  var d = new Date(timestamp);
  return `${d.getHours().toString().padStart(2,0)}:${d.getMinutes().toString().padStart(2,0)}:${d.getSeconds().toString().padStart(2,0)}`;
}

// // OLD PortScan Table 
// function showPortScanData2(data) {
//   var tbody = document.querySelector('#log_portscan_tab  tbody');
//   var tr = '<tr>'; 
//   Object.getOwnPropertyNames(data).forEach(function (port) {
//     Object.getOwnPropertyNames(data[port]).forEach(hostname => {
//       data[port][hostname].forEach(initiator_data => {
//         tr += `<td>${escapeHTML(port)}</td>
//               <td>${escapeHTML(hostname)}</td>
//               <td>
//                <a href="#" id="tabids" data-tabid="${escapeHTML(initiator_data.tabId)}">
//                  ${escapeHTML(initiator_data.initiator)}</a>
//               </td>
//               <td>${escapeHTML(getFormattedDate(initiator_data.timestamp))}</td></tr>`;
//       });
//     });
//   });
//   tbody.innerHTML = tr;
// }

// PortScan Table 

function arrayFromPortScan(psdata) {
  var array = [];
  // [{
  //   "initiator":
  //   "tabId"
  //   port,
  //   host/ip,
  //   timestamp:
  // },..];

  Object.getOwnPropertyNames(psdata).forEach(function (port) {
    Object.getOwnPropertyNames(psdata[port]).forEach(hostname => {
      psdata[port][hostname].forEach(initiator_data => {
        array.unshift({
          tabId: initiator_data.tabId,
          initiator: initiator_data.initiator,
          timestamp: initiator_data.timestamp,
          port,
          hostname,
        });
      });

    });
  });
  var sorted = array.sort(function (a, b) {
    return b.timestamp - a.timestamp;
  });
  return sorted;
}

function showPortScanData(data, from) {
  from = parseInt(from) || 0;
  var tbody = document.querySelector('#log_portscan_tab  tbody');
  var tr = '<tr>';
  const end = from + MAX_LINES_PER_PAGES;
  var array = arrayFromPortScan(data);

  array.slice(from, end).forEach(function (scan_el) {
    tr += `<td>${escapeHTML(scan_el.port)}</td>
              <td>${escapeHTML(scan_el.hostname)}</td>
              <td>
               <a href="#" id="tabids" data-tabid="${escapeHTML(scan_el.tabId)}">
                 ${escapeHTML(scan_el.initiator)}</a>
              </td>
              <td>${escapeHTML(getFormattedDate(scan_el.timestamp))}</td></tr>`;
  });
  tbody.innerHTML = tr;
  if (array.length > MAX_LINES_PER_PAGES) {
    var prev_disabled = "",
      next_disabled = "";
    if (from - MAX_LINES_PER_PAGES < 0) {
      prev_disabled = "disabled";
    }
    if (end >= array.length) {
      next_disabled = "disabled";
    }
    tbody.innerHTML += `<tr><td colspan="4" >
                       <button id="go_next_ps" ${prev_disabled} data-from="${escapeHTML(from-MAX_LINES_PER_PAGES)}">Prev</button>
                       <button id="go_next_ps" ${next_disabled} data-from="${escapeHTML(end)}">Next</button>
                       </td></tr>`;
  }
}

// IPAccess Table 
function arrayFromIPAccess(ipdata) {
  var array = [];
  /**
     *  // [{
  //   "initiator":
  //   "tabId"
  //   port,
  //   host/ip,
  //   timestamp:
  // },..];
     */
  Object.getOwnPropertyNames(ipdata).forEach(function (ip) {
    for (var i = 0; i < ipdata[ip].length; i++) {
      var ip_el = ipdata[ip][i];
      array.unshift({
        ip_port: ip + ":" + ip_el.port,
        target: ip_el.target,
        tabId: ip_el.tabId,
        initiator: ip_el.initiator,
        timestamp: ip_el.timestamp
      });
    }
  });
  var sorted = array.sort(function (a, b) {
    return b.timestamp - a.timestamp;
  });
  return sorted;
}

function showIPAccessData(data, from) {
  from = parseInt(from) || 0;
  var tbody = document.querySelector('#log_ipaccess_tab  tbody');
  var tr = '<tr>';
  const end = from + MAX_LINES_PER_PAGES;
  const array = arrayFromIPAccess(data);
  array.slice(from, end).forEach(function (scan_el) {
    tr += `<td>${escapeHTML(scan_el.ip_port)}</td>
              <td>${escapeHTML(scan_el.target)}</td>
              <td>
              <a href="#" id="tabids" data-tabid="${escapeHTML(scan_el.tabId)}">
              ${escapeHTML(scan_el.initiator)}</a></td>
              <td>${escapeHTML(getFormattedDate(scan_el.timestamp))}</td>
              </tr>`;
  });
  tbody.innerHTML = tr;
  if (array.length > MAX_LINES_PER_PAGES) {
    var prev_disabled = "",
      next_disabled = "";
    if (from - MAX_LINES_PER_PAGES < 0) {
      prev_disabled = "disabled";
    }
    if (end >= array.length) {
      next_disabled = "disabled";
    }
    tbody.innerHTML += `<tr><td colspan="4" >
                         <button id="go_next_ip" ${prev_disabled} data-from="${escapeHTML(from-MAX_LINES_PER_PAGES)}">Prev</button>
                         <button id="go_next_ip" ${next_disabled} data-from="${escapeHTML(end)}">Next</button>
                         </td></tr>`;
  }
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
              <td>${escapeHTML(getFormattedDate(data[hostname].timestamp))}</td>
              </tr>`;
  });
  tbody.innerHTML = tr;
}

////////////////////////////////////////////////
///// On load
window.addEventListener('load', function () {
  chrome.runtime.getBackgroundPage(function (win) {

    function init_ui(addListener) {
      var reqIp_length = Object.keys(win.requestedIPMap).length;
      var portScan_length = Object.keys(win.portScanMap).length;
      var reboundHost_length = Object.keys(win.reboundHostnamesMap).length;

      // UI Initialization 
      var first_visible_element;
      var log_ipaccess_tab_el = document.getElementById("log_ipaccess_tab");
      var log_portscan_tab_el = document.getElementById("log_portscan_tab");
      var log_rebinding_tab_el = document.getElementById("log_rebinding_tab");

      log_ipaccess_tab_el.dataset.number = ` (${reqIp_length})`;
      log_portscan_tab_el.dataset.number = ` (${portScan_length})`;
      log_rebinding_tab_el.dataset.number = ` (${reboundHost_length})`;
      if (addListener) {
        // Populate data on click
        log_ipaccess_tab_el.addEventListener("click", function () {
          showIPAccessData(win.requestedIPMap);
        });
        log_portscan_tab_el.addEventListener("click", function () {
          showPortScanData(win.portScanMap);
        });
        log_rebinding_tab_el.addEventListener("click", function () {
          showReboundData(win.reboundHostnamesMap);
        });
      }
      // Set visibility priority 
      if (reqIp_length) {
        first_visible_element = log_ipaccess_tab_el;
      } else if (portScan_length) {
        first_visible_element = log_portscan_tab_el;
      } else if (reboundHost_length) {
        first_visible_element = log_rebinding_tab_el;
      } else {
        first_visible_element = document.getElementById("prefs_tab");
      }
      //first_visible_element.style.display = "block";
      first_visible_element.click();
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

    /// Reset Monitor Data Preferences 
    const reset_button_el = document.getElementById("reset_button");
    reset_button_el.addEventListener("click", function (ev) {
      win.resetData();
      init_ui();
    });

    /// Monitoring Preferences 
    var monitor_enable_el = document.getElementById("monitor_enable");
    monitor_enable_el.checked = win.getMonitorEnabled();
    monitor_enable_el.addEventListener("change", function (ev) {
      win.setMonitorEnabled(ev.target.checked);
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

    init_ui(true /*sets click Listeners too */ );


    document.addEventListener('click', function (ev) {
      if (ev.target.id === "tabids") {
        //chrome.tabs.highlight({tabs:+ev.target.dataset.tabid});
        chrome.tabs.update(+ev.target.dataset.tabid, {
          selected: true
        });
      } else if (ev.target.id === "go_next_ps") {
        showPortScanData(win.portScanMap, ev.target.dataset.from);
      } else if (ev.target.id === "go_next_ip") {
        showIPAccessData(win.requestedIPMap, ev.target.dataset.from);
      }
    });
    window.addEventListener('blur', function () {
      win.resetBadge();
    })
  });
});