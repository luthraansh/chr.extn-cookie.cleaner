document.addEventListener('DOMContentLoaded', () => {
  const whitelistInput = document.getElementById('whitelistInput');
  const saveButton = document.getElementById('saveButton');
  const clearCookiesButton = document.getElementById('clearCookiesButton');
  const messageElement = document.getElementById('message');
  const currentDomainElement = document.getElementById('currentDomain');
  const addCurrentLink = document.getElementById('addCurrentLink');
  const removeCurrentLink = document.getElementById('removeCurrentLink');

  let currentParentDomain = null;

  async function initializePopup() {
    // Load whitelist from storage
    const { whitelist } = await chrome.storage.local.get({ whitelist: [] });
    // Sort the whitelist before displaying
    whitelist.sort();
    whitelistInput.value = whitelist.join('\n');

    // Get current tab URL
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      try {
        const url = new URL(tab.url);
        if (url.protocol.startsWith('http')) {
          currentParentDomain = getParentDomain(url.hostname);
          
          if (whitelist.includes(currentParentDomain)) {
            removeCurrentLink.innerHTML = `Remove <strong>${currentParentDomain}</strong> from Whitelist`;
            removeCurrentLink.style.display = 'block';
            addCurrentLink.style.display = 'none';
            currentDomainElement.style.display = 'none';
          } else {
            addCurrentLink.innerHTML = `Add <strong>${currentParentDomain}</strong> to Whitelist`;
            addCurrentLink.style.display = 'block';
            removeCurrentLink.style.display = 'none';
            currentDomainElement.style.display = 'none';
          }
        } else {
          currentDomainElement.textContent = "Cannot get domain for current tab.";
        }
      } catch (e) {
        currentDomainElement.textContent = "Invalid URL";
      }
    } else {
      currentDomainElement.textContent = "No active tab found.";
    }
  }

  initializePopup();

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

  saveButton.addEventListener('click', () => {
    const whitelist = whitelistInput.value.split('\n').map(s => s.trim()).filter(Boolean);
    // Sort before saving
    whitelist.sort();
    chrome.storage.local.set({ whitelist }, () => {
      messageElement.textContent = 'Whitelist saved!';
      setTimeout(() => { messageElement.textContent = ''; }, 3000);
      initializePopup();
    });
  });

  clearCookiesButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "clearCookies" }, (response) => {
      messageElement.textContent = response.status;
      setTimeout(() => { messageElement.textContent = ''; }, 3000);
    });
  });
  
  addCurrentLink.addEventListener('click', async (e) => {
    e.preventDefault();
    if (currentParentDomain) {
      const { whitelist } = await chrome.storage.local.get({ whitelist: [] });
      if (!whitelist.includes(currentParentDomain)) {
        whitelist.push(currentParentDomain);
        // Sort after adding new item
        whitelist.sort();
        await chrome.storage.local.set({ whitelist: whitelist });
        whitelistInput.value = whitelist.join('\n');
        messageElement.innerHTML = `<strong>${currentParentDomain}</strong> added to whitelist.`;
        initializePopup();
      } else {
        messageElement.textContent = `${currentParentDomain} is already in the whitelist.`;
      }
      setTimeout(() => { messageElement.textContent = ''; }, 3000);
    }
  });
  
  removeCurrentLink.addEventListener('click', async (e) => {
    e.preventDefault();
    if (currentParentDomain) {
      const { whitelist } = await chrome.storage.local.get({ whitelist: [] });
      const newWhitelist = whitelist.filter(domain => domain !== currentParentDomain);
      if (newWhitelist.length !== whitelist.length) {
        // The list is already sorted, but we call initializePopup to refresh
        await chrome.storage.local.set({ whitelist: newWhitelist });
        whitelistInput.value = newWhitelist.join('\n');
        messageElement.innerHTML = `<strong>${currentParentDomain}</strong> removed from whitelist.`;
        initializePopup();
      } else {
        messageElement.textContent = `${currentParentDomain} was not found in the whitelist.`;
      }
      setTimeout(() => { messageElement.textContent = ''; }, 3000);
    }
  });
});
