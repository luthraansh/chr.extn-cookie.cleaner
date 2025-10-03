// perform cleanup on restart
chrome.runtime.onStartup.addListener(() => {
  console.log('Chrome has started, running extension:', chrome.runtime.getManifest().name);
  clearCookies().then(() => {
    return true;
  }).catch(e => {
    throw e;
  });
});

let optionsWindowId = null;

// Listen for a message from the popup to perform a cleanup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "clearCookies") {
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
  } else if (message.action === "openOptionsWindow") {
    if (optionsWindowId !== null) {
      // Check if the window is still open
      chrome.windows.get(optionsWindowId, { populate: false }, (win) => {
        if (chrome.runtime.lastError || !win) {
          // Window is closed or invalid, open a new one
          openOptionsWindow();
        } else {
          // Window is open, focus it
          chrome.windows.update(optionsWindowId, { focused: true });
        }
      });
    } else {
      openOptionsWindow();
    }
    sendResponse({ status: "processing" });
    return true; // indicates async response
  }
});

function openOptionsWindow() {
  chrome.windows.create({
    url: chrome.runtime.getURL("options.html"),
    type: "popup",
    width: 500,
    height: 600
  }, (newWindow) => {
    optionsWindowId = newWindow.id;

    // If the user closes it manually, reset the ID
    chrome.windows.onRemoved.addListener(function closedListener(closedId) {
      if (closedId === optionsWindowId) {
        optionsWindowId = null;
        chrome.windows.onRemoved.removeListener(closedListener);
      }
    });
  });
}


async function clearCookies() {
  const whitelist = (await chrome.storage.local.get({ whitelist: [] })).whitelist;
  const allDomains = await getAllDomains();
  const whitelistDomains = whitelist.map(d => 'https://' + d).concat(whitelist.map(d => 'http://' + d));
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
  const domainsNotWhitelisted = allDomains.filter(domain => {
    return !whitelist.includes(getParentDomain(domain));
  });
  console.log('Data cleared for domains not in whitelist:', domainsNotWhitelisted.toString());
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
