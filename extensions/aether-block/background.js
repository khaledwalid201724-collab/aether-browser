const RULESETS = ["ads-a", "ads-b", "trackers", "social"];
const GROUPS = { ads: ["ads-a", "ads-b"], trackers: ["trackers"], social: ["social"] };
const DEFAULTS = ["ads", "trackers"];

function expand(ids) {
  return [...new Set(ids.flatMap((id) => GROUPS[id] || [id]))];
}

function collapse(ids) {
  return Object.keys(GROUPS).filter((group) =>
    GROUPS[group].every((id) => ids.includes(id)));
}

async function getEnabled() {
  const { enabled } = await chrome.storage.local.get({ enabled: DEFAULTS });
  return Array.isArray(enabled) ? enabled : DEFAULTS;
}

async function setEnabled(groups) {
  const next = expand(groups);
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: next,
    disableRulesetIds: RULESETS.filter((r) => !next.includes(r)),
  });
  await chrome.storage.local.set({ enabled: collapse(next) });
  return collapse(next);
}

chrome.runtime.onInstalled.addListener(() => setEnabled(DEFAULTS));
chrome.runtime.onStartup.addListener(async () => setEnabled(await getEnabled()));

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-ads") {
    const enabled = await getEnabled();
    await setEnabled(enabled.length ? [] : DEFAULTS);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "get") {
    getEnabled().then((enabled) => sendResponse({ enabled }));
  } else if (message.type === "set") {
    setEnabled(message.ids).then((enabled) => sendResponse({ enabled }));
  }
  return true;
});
