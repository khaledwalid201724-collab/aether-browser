// Aether Settings — a calm, modern control centre for the browser.

const THEMES = [
  { name: "Aether Aurora", id: "aurora", css: "linear-gradient(150deg,#1b1d2c,#2d2f46 55%,#8b7cff)" },
  { name: "Aether Midnight", id: "midnight", css: "linear-gradient(150deg,#0d1222,#182236 60%,#3b82f6)" },
  { name: "Aether Emerald", id: "emerald", css: "linear-gradient(150deg,#10201e,#18302c 60%,#34d399)" },
  { name: "Aether Rose", id: "rose", css: "linear-gradient(150deg,#261620,#3a2030 60%,#fb7185)" },
  { name: "Aether Graphite", id: "graphite", css: "linear-gradient(150deg,#1c1d20,#2a2c30 60%,#64748b)" },
  { name: "Aether Paper", id: "paper", css: "linear-gradient(150deg,#eef0f7,#dfe3f0 60%,#a5b4fc)" }
];

const FEATURES = [
  { name: "Aether Shield", icon: "🛡", desc: "Ads, trackers and annoyance scripts" },
  { name: "Aether Vertical Tabs", icon: "▤", desc: "A slim tab panel on the side" },
  { name: "Aether Spotlight", icon: "⌕", desc: "Keyboard command palette and search" },
  { name: "Aether Canvas", icon: "✦", desc: "Ambient styling for web pages" },
  { name: "Aether Controls", icon: "⌘", desc: "Shortcuts, Settings and the Aether Store" }
];

const ENGINES = [
  { id: "ddg", name: "DuckDuckGo", sub: "Privacy first" },
  { id: "brave", name: "Brave", sub: "Independent index" },
  { id: "startpage", name: "Startpage", sub: "Google results, privately" },
  { id: "wiki", name: "Wikipedia", sub: "Knowledge" },
  { id: "gh", name: "GitHub", sub: "Code search" }
];

const PANELS = {
  appearance: ["Appearance", "Shape the way Aether looks and feels.", "MAKE IT YOURS"],
  privacy: ["Privacy & safety", "Small, auditable protections you control.", "YOUR BROWSER"],
  search: ["Search engine", "Choose where your searches go.", "FIND THINGS"],
  shortcuts: ["Keyboard shortcuts", "Everything important, without the mouse.", "MOVE FAST"],
  store: ["Aether Store", "Extensions made for Aether.", "GROW YOUR BROWSER"],
  about: ["About", "The browser, in a few words.", "HELLO"]
};

let installed = new Map();
let prefs = {};

function send(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
}

function openUrl(url) { send({ type: "open-url", url }); }

async function savePref(key, value) {
  prefs[key] = value;
  await new Promise((resolve) => chrome.storage.local.set({ [key]: value }, resolve));
}

/* ---------------- Navigation ---------------- */
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    const panel = item.dataset.panel;
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n === item));
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === `panel-${panel}`));
    const [title, sub, eyebrow] = PANELS[panel];
    document.getElementById("pageTitle").textContent = title;
    document.getElementById("pageSub").textContent = sub;
    document.querySelector(".eyebrow").textContent = eyebrow;
    window.scrollTo(0, 0);
  });
});

/* ---------------- Themes ---------------- */
function renderThemes() {
  const grid = document.getElementById("themeGrid");
  grid.replaceChildren();
  const active = THEMES.find((t) => installed.get(t.name)?.enabled);
  const chosenId = prefs["aether.theme"] || active?.id;
  const pending = chosenId && chosenId !== active?.id;
  const chosen = THEMES.find((t) => t.id === chosenId);
  const status = document.getElementById("themeStatus");
  status.textContent = pending ? `${chosen?.name.replace("Aether ", "")} · restart` : (active?.name.replace("Aether ", "") || "Default");

  for (const theme of THEMES) {
    const on = theme.id === chosenId;
    const tile = document.createElement("button");
    tile.className = `theme-tile${on ? " on" : ""}${on && pending ? " pending" : ""}`;
    tile.innerHTML = `
      <div class="theme-preview" style="background:${theme.css}"></div>
      <div class="theme-name">${theme.name.replace("Aether ", "")}${on && pending ? " ↻" : ""}</div>`;
    tile.addEventListener("click", async () => {
      await savePref("aether.theme", theme.id);
      renderThemes();
      toast(theme.id === active?.id
        ? `${theme.name} is active`
        : `Saved. Close and reopen Aether to apply ${theme.name}.`);
    });
    grid.appendChild(tile);
  }
}

/* ---------------- Features ---------------- */
function renderFeatures() {
  const list = document.getElementById("featureList");
  list.replaceChildren();
  let on = 0;
  for (const feature of FEATURES) {
    const ext = installed.get(feature.name);
    const enabled = !!ext?.enabled;
    if (enabled) on++;
    const locked = feature.name === "Aether Controls";

    const row = document.createElement("div");
    row.className = "feature";
    row.innerHTML = `
      <div class="feature-icon">${feature.icon}</div>
      <div class="feature-info"><strong>${feature.name}</strong><span>${feature.desc}</span></div>
      <span class="feature-state ${enabled ? "on" : ""}">${enabled ? "On" : "Off"}</span>
      <button class="switch ${enabled ? "on" : ""}" aria-label="Toggle ${feature.name}"></button>`;
    const toggle = row.querySelector(".switch");

    if (locked) {
      toggle.disabled = true;
      toggle.title = "Settings and the Store live inside Aether Controls";
    } else {
      toggle.addEventListener("click", async () => {
        if (!ext) { toast(`${feature.name} is not bundled in this Aether build.`); return; }
        toggle.disabled = true;
        try {
          await chrome.management.setEnabled(ext.id, !enabled);
          toast(`${feature.name} ${enabled ? "disabled" : "enabled"}`);
          await refresh();
        } catch (err) {
          toast(`Could not change ${feature.name}: ${err.message}`);
          toggle.disabled = false;
        }
      });
    }
    list.appendChild(row);
  }
  document.getElementById("privacyStatus").textContent = `${on} of ${FEATURES.length} on`;
}

/* ---------------- Search engines / toggles ---------------- */
function renderEngines() {
  const grid = document.getElementById("engineGrid");
  grid.replaceChildren();
  for (const engine of ENGINES) {
    const btn = document.createElement("button");
    btn.className = `engine${prefs["aether.searchEngine"] === engine.id ? " on" : ""}`;
    btn.innerHTML = `<b>${engine.name}</b><small>${engine.sub}</small>`;
    btn.addEventListener("click", async () => {
      await savePref("aether.searchEngine", engine.id);
      renderEngines();
      toast(`${engine.name} will be used on new tabs`);
    });
    grid.appendChild(btn);
  }
}

function syncSwitch(id, key) {
  const el = document.getElementById(id);
  el.classList.toggle("on", !!prefs[key]);
  el.onclick = async () => {
    await savePref(key, !prefs[key]);
    el.classList.toggle("on", !!prefs[key]);
    toast("Saved — opens on your next Aether tab");
  };
}

document.querySelectorAll("#pageSeg button").forEach((btn) => {
  btn.addEventListener("click", async () => {
    await savePref("aether.startPage", btn.dataset.v);
    document.querySelectorAll("#pageSeg button").forEach((b) => b.classList.toggle("on", b === btn));
    toast(`Saved. Set startpage=${btn.dataset.v} in aether.conf to apply at launch.`);
  });
});

/* ---------------- Buttons ---------------- */
document.getElementById("homeBtn").onclick = () => openUrl("chrome://newtab");
document.getElementById("advancedBtn").onclick = () => openUrl("chrome://settings");
document.getElementById("aboutAdvanced").onclick = () => openUrl("chrome://settings");
document.getElementById("storeBtn").onclick = () => openUrl(chrome.runtime.getURL("store.html"));
document.getElementById("openStore").onclick = () => openUrl(chrome.runtime.getURL("store.html"));
document.getElementById("openExt").onclick = () => openUrl("chrome://extensions");

async function siteUrl() {
  const res = await send({ type: "get-site-url" });
  return res?.url || "https://khaledwalid201724-collab.github.io/aether-browser/";
}
document.getElementById("aboutSite").onclick = async () => openUrl(await siteUrl());
document.getElementById("siteSave").onclick = async () => {
  const url = document.getElementById("siteInput").value.trim();
  if (!/^https?:\/\//.test(url)) { toast("Enter a full http:// or https:// address"); return; }
  await send({ type: "set-site-url", url });
  toast("Website address saved");
};

/* ---------------- Boot ---------------- */
async function refresh() {
  installed = new Map((await new Promise((resolve) => chrome.management.getAll(resolve))).map((i) => [i.name, i]));
  renderThemes();
  renderFeatures();
}

(async () => {
  prefs = await new Promise((resolve) => chrome.storage.local.get({
    "aether.theme": "", "aether.searchEngine": "ddg", "aether.ambient": true,
    "aether.motion": true, "aether.startPage": "modern"
  }, resolve));
  document.getElementById("siteInput").value = await siteUrl();
  document.getElementById("versionLabel").textContent = `Aether · v${chrome.runtime.getManifest().version}`;
  const ua = navigator.userAgent.match(/Chrome\/([\d.]+)/);
  document.getElementById("aboutBrowser").textContent = ua ? `Aether · Chromium ${ua[1]}` : "Aether browser";
  document.querySelectorAll("#pageSeg button").forEach((b) => b.classList.toggle("on", b.dataset.v === prefs["aether.startPage"]));
  syncSwitch("ambientSwitch", "aether.ambient");
  syncSwitch("motionSwitch", "aether.motion");
  renderEngines();
  await refresh();
})();
