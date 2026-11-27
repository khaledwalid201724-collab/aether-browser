const PANEL_PATH = "sidepanel.html";
const openWindows = new Set();

// Keep the panel configured on every service-worker start. Older builds could
// leave it disabled after a toggle, which made later shortcuts look dead.
Promise.resolve(chrome.sidePanel?.setOptions?.({ path: PANEL_PATH, enabled: true }))
  .catch(() => {});
Promise.resolve(chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true }))
  .catch(() => {});

// The service worker can be suspended and restarted, so rebuild the open-state
// map from the live side-panel contexts instead of trusting a saved boolean.
async function restoreOpenWindows() {
  const getContexts = chrome.runtime?.getContexts;
  const sidePanelContext = chrome.runtime?.ContextType?.SIDE_PANEL;
  if (!getContexts || !sidePanelContext) return;
  try {
    const contexts = await getContexts({ contextTypes: [sidePanelContext] });
    for (const context of contexts) {
      if (Number.isInteger(context.windowId) && context.windowId >= 0) {
        openWindows.add(context.windowId);
      }
    }
  } catch (_) {
    // The panel simply has not been opened in this session yet.
  }
}

restoreOpenWindows();
chrome.runtime.onInstalled.addListener(restoreOpenWindows);
chrome.runtime.onStartup.addListener(restoreOpenWindows);

chrome.sidePanel?.onOpened?.addListener?.((info) => {
  if (!info?.path || info.path === PANEL_PATH) openWindows.add(info.windowId);
});
chrome.sidePanel?.onClosed?.addListener?.((info) => {
  if (!info?.path || info.path === PANEL_PATH) openWindows.delete(info.windowId);
});
chrome.windows.onRemoved.addListener((windowId) => openWindows.delete(windowId));

function openPanel(windowId) {
  // Chrome only permits sidePanel.open() while the user gesture is still
  // active. This call must stay synchronous in the shortcut handler: awaiting
  // storage, tab queries or window lookups first silently kills the gesture.
  if (!chrome.sidePanel?.open) return Promise.reject(new Error("Side Panel API unavailable"));
  return Promise.resolve(chrome.sidePanel.open({ windowId })).then(() => {
    openWindows.add(windowId);
  });
}

function closePanel(windowId) {
  if (chrome.sidePanel?.close) {
    return Promise.resolve(chrome.sidePanel.close({ windowId }));
  }
  // Fallback for older Chromium builds: disabling hides an open panel. The
  // next open restores the normal configuration.
  return Promise.resolve(chrome.sidePanel.setOptions({ enabled: false }))
    .then(() => chrome.sidePanel.setOptions({ path: PANEL_PATH, enabled: true }));
}

function togglePanel(windowId) {
  if (!Number.isInteger(windowId)) return Promise.resolve(false);
  if (openWindows.has(windowId)) {
    return closePanel(windowId).then(() => {
      openWindows.delete(windowId);
      return false;
    });
  }
  return openPanel(windowId).then(() => true);
}

function toggleFromWindowLookup() {
  chrome.windows.getCurrent((current) => {
    togglePanel(current?.id).catch(() => {});
  });
}

chrome.commands?.onCommand?.addListener((command, tab) => {
  if (command !== "toggle-vertical-tabs") return;
  // The shortcut is window-scoped, so Chrome normally passes the tab it was
  // pressed in. Use its windowId directly to keep the gesture alive.
  if (Number.isInteger(tab?.windowId)) {
    togglePanel(tab.windowId).catch(() => {});
    return;
  }
  toggleFromWindowLookup();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "toggle") return false;
  const windowId = sender.tab?.windowId;
  if (Number.isInteger(windowId)) {
    togglePanel(windowId).then(
      () => sendResponse({ ok: true }),
      () => sendResponse({ ok: false }),
    );
    return true;
  }
  chrome.windows.getCurrent((current) => {
    togglePanel(current?.id).then(
      () => sendResponse({ ok: true }),
      () => sendResponse({ ok: false }),
    );
  });
  return true;
});
