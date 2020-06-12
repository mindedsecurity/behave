// Preference values
const prefs = getPrefs() || {
  os_notifications_enabled: false,
  number_of_port_trigger: 20,
  // TODO : add whitelisted_domains: [],
  DEBUG: true
};

//////////////////////////////////////////////////////////

/**Pairs requests and IP from response:
 *{
   [requestId]: {
     "tabId": tabId Number
     "initiator_url": {
       "hostname": "www.google.com"
       "origin": "https://www.google.com"
       "port": port or protocol Eg: 231 or "https"
       "protocol": "https:"
     },
     "target_url": same as intiator_url,
     "type": "image"
   }
 */
var requestMap = Object.create(null);

/**
  {
    [hostname]: {
      private_ips:[],
      public_ips:[]
    }
  }
 */
var resolvedHostnames = Object.create(null);

/**Pairs IP and hostname:
  {
    [IP]: 
    [
      {
        "initiator": initiator_host,
        "target": target_url.hostname,
        "port": target_ip_port,
        "tabId": XX
      }
     , ...
    ]
  }
 */
var requestedIPMap = Object.create(null);

/**
  {
    [port]: {
      [target_url.hostname]: [
        {
          initiator: initiator_url.hostname || undefined,
          tabId: reqMap.tabId
         }
      ]
    }
  }
 *  
 */
var portScanMap = Object.create(null);

/**
 * {
    [hostname]: {
      private_ips:[]
      public_ips:[],
      initiator: initiator_hostname,
      tabId: request.tabId
    }
}
 */
var reboundHostnamesMap = Object.create(null);


// Private IPs regex
// IP comes from onResponseStarted API and can be considered trusted.
// https://developer.chrome.com/extensions/webRequest
const pvt_ip_reg = /(^127\.)|(^192\.168\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^::1$)|(^[fF][cCdD])/;
const ip_reg = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/

// Event types
const EVENT_PORTSCAN = "ps";
const EVENT_IP = "ip";
const EVENT_REBIND = "dns";

// Reset Data
function resetData() {
  portScanMap = Object.create(null);
  reboundHostnamesMap = Object.create(null);
  requestedIPMap = Object.create(null);
  chrome.browserAction.setBadgeText({
    text: ''
  });
}

//////////////////////////////////////////////////////////////
// Preferences methods

function setPrefs() {
  localStorage.setItem("prefs", JSON.stringify(prefs));
}

function getPrefs() {
  return JSON.parse(localStorage.getItem("prefs"));
}

///////////// Notifications prefs
function getOSNotificationEnabled() {
  return prefs.os_notifications_enabled;
}

function setOSNotificationEnabled(value) {
  prefs.os_notifications_enabled = !!value;
  setPrefs();
}
///////////// Debug prefs
function getDebugEnabled() {
  return prefs.DEBUG;
}

function setDebugEnabled(value) {
  prefs.DEBUG = !!value;
  setPrefs();
}

///////////// Threshold prefs
function getPortThreshold() {
  return prefs.number_of_port_trigger;
}

function setPortThreshold(val) {
  prefs.number_of_port_trigger = +val;
  setPrefs();
}

////////////////////////////////////
/// helper Functions

function parseUrl(url) {
  try {
    const p = new URL(url);
    return {
      hostname: p.hostname,
      port: p.port || p.protocol,
      // Maybe these won't be useful
      origin: p.origin,
      protocol: p.protocol
    };
  } catch (exc) {
    debuglog(exc, url);
  }
}

function is_ip(host) {
  return ip_reg.test(host);
}

function is_private_ip(ip) {
  return pvt_ip_reg.test(ip);
}

function isDuplicatePortScan(obj, hostname, initiator_hostname, tabId) {
  
  if (typeof obj !== "undefined" && typeof obj[hostname] !== "undefined" && obj[hostname].length > 0) {
    return obj[hostname].some(el => {
      return el.initiator === initiator_hostname && el.tabId === tabId;
    });
  }
  return false;
}

function setRequestMap(details) {
  return requestMap[details.requestId] = {
    tabId: details.tabId,
    type: details.type,
    initiator_url: parseUrl(details.initiator),
    target_url: parseUrl(details.url)
  };
}

function setResolvedHostname(hostname, ip, is_private_ip) {
  if (!resolvedHostnames[hostname]) {
    resolvedHostnames[hostname] = {
      public_ips: [],
      private_ips: []
    };
  }
  const hostname_object = resolvedHostnames[hostname];
  if (is_private_ip) {
    if (hostname_object.private_ips.indexOf(ip) === -1)
      hostname_object.private_ips.push(ip);
  } else {
    if (hostname_object.public_ips.indexOf(ip) === -1)
      hostname_object.public_ips.push(ip);
  }
}

function setRequestedIP(ip, request) {
  const initiator_hostname = request.initiator_url && request.initiator_url.hostname;
  //// Store infos about who and what
  requestedIPMap[ip] = requestedIPMap[ip] || [];
  requestedIPMap[ip].push({
    initiator: initiator_hostname,
    target: request.target_url.hostname,
    port: request.target_url.port,
    tabId: request.tabId
  });
}

// function setRequestedIP(details) {
//   maybeInternalAccess(details.ip, requestMap[details.requestId]);
//   delete requestMap[details.requestId];
// }

function push(obj, key, val) {
  if (typeof obj[key] === "undefined") {
    obj[key] = [];
  }
  obj[key].push(val);
}

function debuglog() {
  if (prefs.DEBUG)
    console.log.apply(console, arguments);
}

///////////////////////////////////////
////// check functions

// check for portscan attemps
function maybePortScan(reqMap) {
  if (reqMap.target_url.port.startsWith("http")) {
    return;
  }
  const initiator_object = {
    initiator: reqMap.initiator_url ? reqMap.initiator_url.hostname : "undefined",
    tabId: reqMap.tabId
  };
  if (!isDuplicatePortScan(portScanMap[reqMap.target_url.port], reqMap.target_url.hostname, initiator_object.initiator, initiator_object.tabId)) {
    if (!portScanMap[reqMap.target_url.port]) {
      portScanMap[reqMap.target_url.port] = Object.create(null);
    }
    push(portScanMap[reqMap.target_url.port], reqMap.target_url.hostname, initiator_object);
    if (Object.keys(portScanMap).length > prefs.number_of_port_trigger) {
      debuglog("PortScan!", portScanMap);
      notify(`There might be a port scan: ${Object.keys(portScanMap).length}`, EVENT_PORTSCAN);
    }
  }
}

// check for access to private IPs attemps
function maybeInternalAccess(ip, request) {
  const initiator_hostname = request.initiator_url && request.initiator_url.hostname;

  const requested_is_private = is_private_ip(ip);


  // requesting a hostname resolved to a private IP 
  if (requested_is_private &&
    // and comes from an explicit IPs which is not private
    !is_private_ip(initiator_hostname)
    // and the initiator hostname is different from the target hostname
    &&
    ((initiator_hostname !== request.target_url.hostname)
      // OR hostnames are equals by the initiator hostname is already considered a bad boi (resolves multiple mixed IP)
      ||
      reboundHostnamesMap[initiator_hostname]
    )
  ) {

    const msg = `Attempting access to ${ip} from ${initiator_hostname} !!!!`;
    debuglog(msg);

    //// Store infos about who and what
    // requestedIPMap[ip] = requestedIPMap[ip] || [];
    // requestedIPMap[ip].push({
    //   initiator: initiator_hostname,
    //   tabId: request.tabId
    // });
    setRequestedIP(ip, request);
    notify(msg, EVENT_IP);
  }
}

// check for access to DNS rebinding attemps
// Rebinding will trigger on Private IPs only.
// So http://www.alf.nu/BrowserCacheAndDnsRebinding will not be alerted
function maybeRebinding(ip, request) {
  const initiator_hostname = request.initiator_url && request.initiator_url.hostname;
  const requested_is_private = is_private_ip(ip);

  setResolvedHostname(request.target_url.hostname, ip, requested_is_private);

  var foundRebinding = false;
  for (let [host, ips] of Object.entries(resolvedHostnames)) {
    if (ips.private_ips.length > 0 && ips.public_ips.length > 0) {
      reboundHostnamesMap[host] = {
        private_ips: ips.private_ips,
        public_ips: ips.public_ips,
        initiator: initiator_hostname,
        tabId: request.tabId
      };
      foundRebinding = true;
    }
  }
  if (foundRebinding) {
    notify(`Found possible rebinding attack! on ${Object.keys(reboundHostnamesMap)}`, EVENT_REBIND);
  }
}

//////////////////////////////////////
//// Actions
addEventListener("message", onNotify);

var extensionURL = chrome.runtime.getURL('/').slice(0,-1);

function notify(msg, type) {
  postMessage({
    msg,
    type
  });
}

function onNotify({
  origin,
  data
}) {
  var msg = data.msg;
  var type = data.type;
  if (origin === extensionURL) {
    setBadges(10, type);
    if (prefs.os_notifications_enabled)
      chrome.notifications.create(
        'name-for-notification', {
          type: 'basic',
          iconUrl: "img/favicon_io/favicon-32x32.png",
          title: "Behave!",
          message: msg
        },
        function () {}
      );

    updateToolTip();
  }
}

function updateToolTip() {
  var tooltip_text = `Behave! Ports accessed: ${Object.keys(portScanMap).length}\nPvt IPs: ${Object.keys(requestedIPMap)}`
  chrome.browserAction.setTitle({
    title: tooltip_text
  });
}

function setBadges(times, eventtype) {
  switch (eventtype) {
    case EVENT_IP:
      setBadgeForIP();
      break;
    case EVENT_REBIND:
      setBadgeForRebinding();
      break;
    case EVENT_PORTSCAN:
      setBadgeForPortScan(Object.keys(portScanMap).length);
      break;
    default:
      console.error("UNEXPECTED EVENT", eventtype);
  }
}

function setBadgeForIP() {
  chrome.browserAction.setBadgeBackgroundColor({
    color: [255, 0, 100, 230]
  });
  chrome.browserAction.setBadgeText({
    text: "IP!"
  });
}

function setBadgeForPortScan(data) {
  chrome.browserAction.setBadgeBackgroundColor({
    color: [255, 0, 0, 230]
  });
  chrome.browserAction.setBadgeText({
    text: '' + data
  });
}

function setBadgeForRebinding() {
  chrome.browserAction.setBadgeBackgroundColor({
    color: [255, 100, 0, 230]
  });
  chrome.browserAction.setBadgeText({
    text: 'DNS!'
  });
}
///////////////////////////////////////
/// WebRequest Listeners 

const FILTER_ALL_URLS = {
  urls: ["<all_urls>"]
};

chrome.webRequest.onBeforeRequest.addListener(function (details) {
  // Firefox
   if(typeof browser !== "udenfined" && details.originUrl && typeof details.initiator === "undefined"){
    details.initiator = details.originUrl ;
   }
    if (typeof details.initiator === "undefined") {
      return;
    }
    if (details.tabId !== -1) {
      debuglog(details);
      const requestInfo = setRequestMap(details);

      const hostname = requestInfo.target_url.hostname;
      // Although there's no details.ip, if hostname is an IP
      // we can check it since the IP is already normalized.
      // Anyway, it won't work with malicious DNS for FQDN (see OnResponseStarted for resolved IPs). 
      if (is_ip(hostname))
        maybeInternalAccess(hostname, requestInfo);

      // checks for notifications
      maybePortScan(requestInfo);

    }
  }, FILTER_ALL_URLS
  /* ,  ["blocking"] */
);

chrome.webRequest.onResponseStarted.addListener(function (details) {
  const requestInfo = requestMap[details.requestId];
  if (details.tabId !== -1 && requestInfo) {
    debuglog(details, requestInfo);

    maybeRebinding(details.ip, requestInfo);
    maybeInternalAccess(details.ip, requestInfo);

    delete requestMap[details.requestId];
  }
}, FILTER_ALL_URLS);