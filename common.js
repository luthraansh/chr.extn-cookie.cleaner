document.addEventListener('DOMContentLoaded', () => {
  const addDomainLink = document.getElementById('addDomainLink');
  const removeDomainLink = document.getElementById('removeDomainLink');
  const messageElement = document.getElementById('message');
  const clearCookiesLink = document.getElementById('clearCookiesLink');
  const optionsLink = document.getElementById('optionsLink');
  const whitelistInput = document.getElementById('whitelistInput');
  const saveButton = document.getElementById('saveButton');
  const clearCookiesButton = document.getElementById('clearCookiesButton');
  const closeOptionsButton = document.getElementById('closeOptionsButton');

  let currentParentDomain = null;

  async function initializeOptions() {
    // Load whitelist from storage
    const { whitelist } = await chrome.storage.local.get({ whitelist: [] });
    if (whitelistInput) {
      whitelistInput.value = whitelist.join('\n');
    }

    if (addDomainLink || removeDomainLink) {
      addDomainLink.style.display = 'none';
      removeDomainLink.style.display = 'none';
      // Get current tab URL
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        const url = new URL(tab.url);
        if (url.protocol.startsWith('http')) {
          currentParentDomain = getParentDomain(url.hostname);
          
          if (whitelist.includes(currentParentDomain)) {
            removeDomainLink.innerHTML = `Remove <strong>${currentParentDomain}</strong> from Whitelist`;
            removeDomainLink.style.display = 'block';
          } else {
            addDomainLink.innerHTML = `Add <strong>${currentParentDomain}</strong> to Whitelist`;
            addDomainLink.style.display = 'block';
          }
        }
      }
    }
  }

  initializeOptions();

  if (saveButton) {
    saveButton.addEventListener('click', () => {
      const whitelist = whitelistInput.value.split('\n').map(s => s.trim()).filter(Boolean);
      // Sort and dedupe before saving
      const sortedUniqueWhitelist = [...new Set(whitelist)].sort();
      chrome.storage.local.set({ whitelist: sortedUniqueWhitelist }, () => {
        messageElement.textContent = 'Whitelist saved!';
        setTimeout(() => { messageElement.textContent = ''; }, 3000);
      });
    });
  }

  if (closeOptionsButton) {
    closeOptionsButton.addEventListener('click', () => {
      window.close();
    });
  }

  if (clearCookiesButton) {
    clearCookiesButton.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: "clearCookies" }, (response) => {
        messageElement.textContent = response.status;
        setTimeout(() => { messageElement.textContent = ''; }, 3000);
      });
    });
  }
  
  if (optionsLink) {
    optionsLink.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  if (addDomainLink) {
    addDomainLink.addEventListener('click', async (e) => {
      e.preventDefault();
      if (currentParentDomain) {
        const { whitelist } = await chrome.storage.local.get({ whitelist: [] });
        if (!whitelist.includes(currentParentDomain)) {
          whitelist.push(currentParentDomain);
          // Sort after adding new item
          whitelist.sort();
          await chrome.storage.local.set({ whitelist });
          messageElement.innerHTML = `<strong>${currentParentDomain}</strong> added to whitelist.`;
          initializePopup();
        } else {
          messageElement.textContent = `${currentParentDomain} is already in the whitelist.`;
        }
        setTimeout(() => { messageElement.textContent = ''; }, 3000);
      }
    });
  }

  if (removeDomainLink) {
    removeDomainLink.addEventListener('click', async (e) => {
      e.preventDefault();
      if (currentParentDomain) {
        const { whitelist } = await chrome.storage.local.get({ whitelist: [] });
        const newWhitelist = whitelist.filter(domain => domain !== currentParentDomain);
        if (newWhitelist.length !== whitelist.length) {
          // The list is already sorted, but we call initializePopup to refresh
          await chrome.storage.local.set({ whitelist: newWhitelist });
          messageElement.innerHTML = `<strong>${currentParentDomain}</strong> removed from whitelist.`;
          initializePopup();
        } else {
          messageElement.textContent = `${currentParentDomain} was not found in the whitelist.`;
        }
        setTimeout(() => { messageElement.textContent = ''; }, 3000);
      }
    });
  }

  if (clearCookiesLink) {
    clearCookiesLink.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: "clearCookies" }, (response) => {
        messageElement.textContent = response.status;
        setTimeout(() => { messageElement.textContent = ''; }, 3000);
      });
    });
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

});
