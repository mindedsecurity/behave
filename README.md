# Behave!



A monitoring browser extension for pages acting as bad boys 



## Port Scan Monitoring

Behave! will alert the user if the number of port or protocol used during a browser session exceeds a specific limit.

The limit is 20 by default, but it can be changed by  the user via preferences.

Since Behave does not perform any DNS request, 

## Direct access to Private IPs

Behave! will alert if a web page tries to directly access to:

- Loopback addresses IPv4 **127.0.0.1/8**
- Loopback addresses IPv6 **::1/128**
- Private Networks IPv4 **10.0.0.0/8** - **172.16.0.0/12** - **192.168.0.0/16**
- Unique Local Addresses IPv6 **fc00::/7**



### DNS Resolution to Private IPs

A malicious script can directly connect to a private IP or let the Browser  connect to a FQDN whose authoritative DNS resolves to a private IP.

Behave! does not perform any direct DNS request, and the IP is taken from the intercepted response. 



### DNS Rebinding 

Behave! does not perform any direct DNS request, and the IP is taken from the intercepted response. 

That means that it's not exposed to any TOCTOU attack like DNS Rebinding.



## How it works



### Port Scan Monitoring

Access to 