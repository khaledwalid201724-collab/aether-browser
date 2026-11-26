const PAGE = chrome.runtime.getURL("palette.html");

async function openPalette() {
  const existing = await chrome.tabs.query({ url: PAGE });
  if (existing.length) {
    await chrome.tabs.update(existing[0].id, { active: true });
    await chrome.windows.update(existing[0].windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: PAGE });
  }
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-palette") openPalette();
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "open") openPalette().then(() => sendResponse({ ok: true }));
  return true;
});
