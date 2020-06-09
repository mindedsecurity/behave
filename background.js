// Preference values
const prefs = getPrefs() || {
  os_notifications_enabled: false,
  number_of_port_trigger: 3,
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
        "initiator": initiator_host
        "tabId": XX
      }
     , ...
    ]
  }
 */
var requestedIPs = Object.create(null);

/**
  {
    [port]: {
      [target_url.hostname]: [
        {
          initiator_origin: initiator_url.origin || undefined,
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
      public_ips:[]
    }
}
 */
var reboundedHostnames = Object.create(null);


// Private IPs regex
// IP comes from onResponseStarted API and can be considered trusted.
// https://developer.chrome.com/extensions/webRequest
const pvt_ip_reg = /(^127\.)|(^192\.168\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^::1$)|(^[fF][cCdD])/;
const ip_reg = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/

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
      origin: p.origin,
      protocol: p.protocol,
      hostname: p.hostname,
      port: p.port || p.protocol
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

function maybeRebinding() {

  var foundRebinding = false;
  for (let [host, ips] of Object.entries(resolvedHostnames)) {
     if(ips.private_ips.length > 0 && ips.public_ips.length > 0){
      reboundedHostnames[host] = ips;
      foundRebinding = true;
     }
  }
  if(foundRebinding){
    notify(`Found possible rebinding attack! on ${Object.keys(reboundedHostnames)}`);
  }
}

function setRequestedIP(ip, request) {
  const initiator_hostname = request.initiator_url && request.initiator_url.hostname;
  //// Store infos about who and what
  requestedIPs[ip] = requestedIPs[ip] || [];
  requestedIPs[ip].push({
    initiator: initiator_hostname,
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

/// add 
function maybePortScan(reqMap) {
  if (!portScanMap[reqMap.target_url.port]) {
    portScanMap[reqMap.target_url.port] = Object.create(null);
  }
  push(portScanMap[reqMap.target_url.port], reqMap.target_url.hostname, {
    initiator_origin: reqMap.initiator_url ? reqMap.initiator_url.origin : undefined,
    tabId: reqMap.tabId
  });

  if (Object.keys(portScanMap).length > prefs.number_of_port_trigger) {
    debuglog("PortScan!", portScanMap);
    notify(`There might be a port scan: ${Object.keys(portScanMap).length}`);
  }
}

function maybeInternalAccess(ip, request) {
  const initiator_hostname = request.initiator_url && request.initiator_url.hostname;
  const requested_is_private = is_private_ip(ip);

  setResolvedHostname(ip, request.target_url.hostname, requested_is_private);

  // If responding IP is internal and initiator does not match it then we have a problem..maybe
  if (requested_is_private &&
    !is_private_ip(initiator_hostname)
    // Can't use it because of Rebinding.. ? 
    // && (request.initiator_url.hostname!==request.target_url.hostname)
  ) {
    const msg = `Attempting access to ${ip} from ${request.initiator_url.hostname} !!!!`;
    debuglog(msg);

    //// Store infos about who and what
    // requestedIPs[ip] = requestedIPs[ip] || [];
    // requestedIPs[ip].push({
    //   initiator: initiator_hostname,
    //   tabId: request.tabId
    // });
    setRequestedIP(ip, request);
    notify(msg);
  }
}

//////////////////////////////////////
//// Actions
addEventListener("message", onNotify);

var extensionURL = `chrome-extension://${chrome.runtime.id}`;

function notify(msg) {
  postMessage(msg);
}

function onNotify({
  origin,
  data
}) {
  var msg = data;
  if (origin === extensionURL) {
    setBadges();
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
  var tooltip_text = `Behave! Ports accessed: ${Object.keys(portScanMap).length}\nPvt IPs: ${Object.keys(requestedIPs)}`
  chrome.browserAction.setTitle({
    title: tooltip_text
  });
}


function setBadges(times) {

  setBadgeForIP();
  setBadgeForPortScan(Object.keys(portScanMap).length);
}

function setBadgeForIP() {
  chrome.browserAction.setBadgeBackgroundColor({
    color: [255, 0, 100, 230]
  });
  chrome.browserAction.setBadgeText({
    text: "IP !"
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


chrome.browserAction.onClicked.addListener(
  function (tab) {

  }
);

///////////////////////////////////////
/// WebRequest Listeners 

const FILTER_ALL_URLS = {
  urls: ["<all_urls>"]
};

chrome.webRequest.onBeforeRequest.addListener(function (details) {
    if (details.tabId !== -1) {
      debuglog(details);
      const requestInfo = setRequestMap(details);

      // checks for notifications
      maybePortScan(requestInfo);

      const hostname = requestInfo.target_url.hostname;
      // Altough there's no details.ip, if hostname is an IP
      // we can check it since the IP is already normalized.
      // Anyway, it won't work with malicious DNS for FQDN (see OnResponseStarted for resolved IPs). 
      if (is_ip(hostname))
        maybeInternalAccess(hostname, requestInfo);
    }
  }, FILTER_ALL_URLS
  /* ,  ["blocking"] */
);

chrome.webRequest.onResponseStarted.addListener(function (details) {
  if (details.tabId !== -1) {
    const requestInfo = requestMap[details.requestId];
    debuglog(details, requestInfo);
    maybeInternalAccess(details.ip, requestInfo);
    delete requestMap[details.requestId];
  }
}, FILTER_ALL_URLS);

/*
chrome.webRequest.onErrorOccurred.addListener(
  function (details) {

    console.log("Error:", details);
  }, FILTER_ALL_URLS
);

chrome.webRequest.onSendHeaders.addListener(
  function(details) {

    console.log("OnBefore",details);
  }, FILTER_ALL_URLS
  );
*/