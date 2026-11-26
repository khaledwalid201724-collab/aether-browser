const OPTIONS = { path: "sidepanel.html", enabled: true };

async function initPanel() {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  await chrome.sidePanel.setOptions(OPTIONS);
}

chrome.runtime.onInstalled.addListener(initPanel);
chrome.runtime.onStartup.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

async function toggle() {
  const { on } = await chrome.storage.local.get({ on: false });
  if (on) {
    await chrome.sidePanel.setOptions({ enabled: false });
    await chrome.storage.local.set({ on: false });
    return;
  }
  const window = await chrome.windows.getCurrent();
  await chrome.sidePanel.setOptions(OPTIONS);
  await chrome.sidePanel.open({ windowId: window.id });
  await chrome.storage.local.set({ on: true });
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-vertical-tabs") await toggle();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "toggle") toggle().then(() => sendResponse({ ok: true }));
  return true;
});
