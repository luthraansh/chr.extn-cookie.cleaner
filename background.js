// perform cleanup on restart
chrome.runtime.onStartup.addListener(() => {
  console.log('Chrome has started, running extension:', chrome.runtime.getManifest().name);
  clearCookies().then(() => {
    return true;
  }).catch(e => {
    throw e;
  });
});

// Listen for a message from the popup to perform a cleanup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "clearCookies") {
    // Call the async function and handle the response
    clearCookies().then(() => {
      // Send a success response back to the popup
      sendResponse({ status: "Cookies removed." });
    }).catch(e => {
      sendResponse({ status: "Error during cookie removal", error: e.message });
      throw e;
    });

    // Return true to indicate that you will send a response asynchronously.
    return true; 
  }
});

async function clearCookies() {
  const whitelist = (await chrome.storage.local.get({ whitelist: [] })).whitelist;
  const whitelistDomains = whitelist.map(d => 'https://' + d).concat(whitelist.map(d => 'http://' + d));
  const allDomains = await getAllDomains();
  const domainsNotWhitelisted = allDomains.filter(domain => {
    return !whitelist.includes(getParentDomain(domain));
  });

  chrome.browsingData.remove(
    {
      excludeOrigins: whitelistDomains,
    }, {
      "appcache": true,
      "cacheStorage": true,
      "cookies": true,
      "fileSystems": true,
      "indexedDB": true,
      "localStorage": true,
      "serviceWorkers": true,
      "webSQL": true,
    }
  );
  console.log('Data cleared for domains not in whitelist:', domainsNotWhitelisted);
}

async function getAllDomains() {
  const allDomains = new Set();
  const cookies = await chrome.cookies.getAll({});
  cookies.forEach(cookie => {
    const protocol = cookie.secure ? 'https://' : 'http://';
    allDomains.add(protocol + cookie.domain);
  });

  return Array.from(allDomains);
}

function getParentDomain(url) {
    // Remove the protocol (http:// or https://) if it exists
    const domain = url.replace(/^https?:\/\//, '').split('/')[0]; // Strip protocol and path

    // Remove leading dot if it exists
    const cleanDomain = domain.startsWith('.') ? domain.substring(1) : domain;

    // Split the domain into parts (subdomains and the main domain + TLD)
    const domainParts = cleanDomain.split('.');

    // If the domain has more than two parts, assume the last two parts are the parent domain
    if (domainParts.length > 2) {
        return domainParts.slice(domainParts.length - 2).join('.');
    }

    // If it's already a simple domain (e.g., github.com or example.com)
    return cleanDomain;
}

async function clearCookiesOld() {
  const whitelist = (await chrome.storage.local.get({ whitelist: [] })).whitelist;
  const whitelistDomains = whitelist.map(d => 'https://' + d).concat(whitelist.map(d => 'http://' + d));
  const allDomains = await getAllDomains()
  const domainsToClear = allDomains.filter(domain => {
    return !whitelist.includes(getParentDomain(domain));
  });
  // chrome.browsingData.remove({
  //   excludeOrigins: whitelistDomains,
  // }, {
  //   "appcache": true,
  //   "cacheStorage": true,
  //   "cookies": true,
  //   "fileSystems": true,
  //   "indexedDB": true,
  //   "localStorage": true,
  //   "serviceWorkers": true,
  //   "webSQL": true,
  // });
}
