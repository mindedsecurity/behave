# Behave!

![Behave!Logo](https://user-images.githubusercontent.com/1196560/84408775-d7e64980-ac0c-11ea-87ed-38da5c38ffc6.png)

A *(Still in Development)* monitoring browser extension for pages acting as bad boys.

**NB**: This is the code repository of the project, if you're looking for the packed extensions:
- Firefox Extension: https://addons.mozilla.org/en-US/firefox/addon/behave/
- Chrome Extension: https://chrome.google.com/webstore/detail/mppjbkhgconmemoeagfbgilblohhcica/

## Introduction.

*Behave!* monitors and warn if a web page performs any of following actions:

- Browser based Port Scan
- Access to Private IPs
- DNS Rebinding attacks to Private IPs

Here's *Behave!* pointing the finger to at.tack.er page in the logs:

![image](https://user-images.githubusercontent.com/1196560/84412872-277a4480-ac10-11ea-8db2-0e8eec9adc21.png)

## Port Scan Monitoring

*Behave!* will alert the user if the number of port or protocol used during a browser session exceeds a specific limit.

The limit is 20 by default, but it can be changed by the user via preferences.

Since Behave does not perform any DNS request, 


## Direct access to Private IPs Monitoring

*Behave!* will alert if a web page tries to directly access to an IP belonging to any the following blocks:

- Loopback addresses IPv4 **127.0.0.1/8**
- Loopback addresses IPv6 **::1/128**
- Private Networks IPv4 **10.0.0.0/8** - **172.16.0.0/12** - **192.168.0.0/16**
- Unique Local Addresses IPv6 **fc00::/7**


### DNS Resolution to Private IPs

If a malicious script instructs the Browser to connect to a FQDN whose authoritative DNS resolves to a private IP
*Behave!* checks if the resolved IP is private.
Anyway, the IP information of a resolved hostname is available only if the port is open.

Since *Behave!*, in order to prevent TOCTOU issues, does not perform any external DNS request, if the port is closed there will be no IP resolution available and therefore, no alert.


### DNS Rebinding Bypasses

*Behave!* does not perform any direct DNS request, and the IP is taken from the intercepted response. 

That means that it's not exposed to any TOCTOU attack like DNS Rebinding.

## DNS Rebinding Monitoring

*Behave!* keeps track if a hostname is resolved with multiple IPs, and will alert if there's some mixing between public IPs
and private ones.


# Install

Firefox Extension: https://addons.mozilla.org/en-US/firefox/addon/behave/

Chrome Extension: https://chrome.google.com/webstore/detail/mppjbkhgconmemoeagfbgilblohhcica/

*Behave!* is not yet available on chrome playstore, so if you want to check and play a bit you can:

* Download the CRX from the [release](https://github.com/wisec/behave/releases)
* Open Google Chrome/Chromium go to chrome://extension 
* Activate Developer Mode
* Drag and Drop the CRX Extension
* Enjoy *Behave!*

Or:

* Clone it OR download zip and unzip
* Open Google Chrome/Chromium go to chrome://extension 
* Activate Developer Mode
* Push "Load Unpacked" and choose the Behave directory.
* Enjoy *Behave!*

# Wanna Test Behave! ?

See what happens when you go to one of the following:

Singularity of Origin DNS Rebinding Attack:
http://rebind.it:8080/manager.html

JavaScript Port Scan:
http://jsscan.sourceforge.net/jsscan2.html

**Nota Bene:**
At the moment it won't alert if DNS Rebinding attack is performed on non private IPs such as:
http://www.alf.nu/BrowserCacheAndDnsRebinding

# Wanna Help? 

You are welcome to help! 
Feel free to create an Issue or fork the project and make a PR.
