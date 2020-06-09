'use strict';
const MAX_PORT = 0xffff;
const MIN_PORT = 1;
chrome.runtime.getBackgroundPage(function (win) {
  // UI Initialization 
  document.querySelector(".tabcontent#log_portscan_tab").style.display = "block";
  document.getElementById("log_ipaccess_tab").dataset.number = ` (${Object.keys(win.requestedIPs).length})`;
  document.getElementById("log_portscan_tab").dataset.number = ` (${Object.keys(win.portScanMap).length})`;
  document.getElementById("log_rebinding_tab").dataset.number = ` (${Object.keys(win.reboundedHostnames).length})`;

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
  showPortScanData(win.portScanMap);
  showIPAccessData(win.requestedIPs);
  // PortScan Table 
  function showPortScanData(data) {
   
    var tbody = document.querySelector('#log_portscan_tab  tbody');
    var tr = '<tr>';
    Object.getOwnPropertyNames(data).forEach(function (port) {
      Object.getOwnPropertyNames(data[port]).forEach(hostname => {
        tr += `<td>${port.toString().replace(/</g,"&lt;")}</td>
              <td>${hostname}</td><td>`;
        data[port][hostname].forEach(initiator_data => {
          tr+=`<a href="#" id="tabids" data-tabid="${initiator_data.tabId}">
              ${initiator_data.initiator_origin.replace(/</g,"&lt;")}</a><br>`;
        });
        tr +='</td></tr>';
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
        tr += `<td>${ip.toString().replace(/</g,"&lt;")}</td>
              <td><a href="#" id="tabids" data-tabid="${data[ip][i].tabId}">${data[ip][i].initiator.toString().replace(/</g,"&lt;")}</a></td>
              </tr>`;
        tbody.innerHTML += tr;
      }
    });
  }
  
  document.addEventListener('click', function(ev){
    if(ev.target.id==="tabids"){
      console.log(ev.target);
      //chrome.tabs.highlight({tabs:+ev.target.dataset.tabid});
      chrome.tabs.update(+ev.target.dataset.tabid,{selected: true});
    }
  });

});