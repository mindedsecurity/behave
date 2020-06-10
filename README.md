# Behave!

A *(Still in Development)* monitoring browser extension for pages acting as bad boys 

## Port Scan Monitoring

Behave! will alert the user if the number of port or protocol used during a browser session exceeds a specific limit.

The limit is 20 by default, but it can be changed by the user via preferences.

Since Behave does not perform any DNS request, 


## Direct access to Private IPs Monitoring

Behave! will alert if a web page tries to directly access to:

- Loopback addresses IPv4 **127.0.0.1/8**
- Loopback addresses IPv6 **::1/128**
- Private Networks IPv4 **10.0.0.0/8** - **172.16.0.0/12** - **192.168.0.0/16**
- Unique Local Addresses IPv6 **fc00::/7**

### DNS Resolution to Private IPs

A malicious script can directly connect to a private IP or let the Browser  connect to a FQDN whose authoritative DNS resolves to a private IP.

Behave! does not perform any direct DNS request, and the IP is taken from the intercepted response. 


### DNS Rebinding Bypasses

Behave! does not perform any direct DNS request, and the IP is taken from the intercepted response. 

That means that it's not exposed to any TOCTOU attack like DNS Rebinding.

## DNS Rebinding Monitoring

Behave! keeps track if a hostname is resolved with multiple IPs, and will alert if there's some mixing between public IPs
and private ones.


# Install

Behave! is not yet available on your favourite playstore, so if you want to check and play a bit you can:

* Download the CRX from the [release](https://github.com/wisec/behave/releases)
* Open Google Chrome/Chromium go to chrome://extension 
* Activate Developer Mode
* Drag and Drop the CRX Extension
* Enjoy Behave!

Or:

* Clone it OR download zip and unzip
* Open Google Chrome/Chromium go to chrome://extension 
* Activate Developer Mode
* Push "Load Unpacked" and choose the Behave directory.
* Enjoy Behave!

