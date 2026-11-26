const SITE_URL = "https://khaledwalid201724-collab.github.io/aether-browser/";
function isPlaceholder(url) {
  return /^http:\/\/localhost(:\d+)?\/?$/i.test(url)
    || /aether-browser\.(local|example|com)/i.test(url);
}

function run(command) {
  switch (command) {
    case "new-tab":
      return chrome.tabs.create({});
    case "incognito":
      return chrome.windows.create({ incognito: true });
    case "open-settings":
      return chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
    case "open-home":
      return chrome.tabs.create({ url: chrome.runtime.getURL("home.html") });
    case "open-store":
      return chrome.tabs.create({ url: chrome.runtime.getURL("store.html") });
  }
}

chrome.commands.onCommand.addListener((command) => run(command));
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== "string") return;

  if (message.type === "run") {
    Promise.resolve(run(message.command)).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "open-url" && typeof message.url === "string") {
    chrome.tabs.create({ url: message.url }, () => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "open-extension" && typeof message.id === "string") {
    chrome.tabs.create({ url: `chrome://extensions/?id=${message.id}` }, () => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "get-site-url") {
    chrome.storage.local.get({ siteUrl: SITE_URL }, (data) => {
      // Earlier builds shipped a localhost/placeholder address. Upgrade it to
      // the real site so existing profiles stop opening a dead local page.
      let url = data.siteUrl;
      if (!url || isPlaceholder(url)) {
        url = SITE_URL;
        chrome.storage.local.set({ siteUrl: url });
      }
      sendResponse({ url });
    });
    return true;
  }

  if (message.type === "set-site-url" && typeof message.url === "string") {
    chrome.storage.local.set({ siteUrl: message.url }, () => sendResponse({ ok: true }));
    return true;
  }
});
