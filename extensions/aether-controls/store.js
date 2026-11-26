// Aether Store catalogue and management UI.

const CATALOG = [
  {
    name: "Aether Shield",
    icon: "🛡",
    category: "privacy",
    label: "Privacy",
    desc: "Blocks ads, trackers and annoyance scripts with MV3 declarative rules. No page rewriting, almost zero RAM.",
    tags: ["ad blocker", "tracker blocking", "MV3"],
    detail: "Rules are split into small rulesets so the parser stays fast. Toggle it off instantly if a site misbehaves. Shortcut: <code>Alt+Shift+A</code>."
  },
  {
    name: "Aether Vertical Tabs",
    icon: "▤",
    category: "productivity",
    label: "Productivity",
    desc: "Moves your tabs into a slim side panel so you can actually see the page. Great on wide monitors.",
    tags: ["tabs", "side panel", "layout"],
    detail: "Open the tab panel with <code>Alt+Shift+V</code>. Tabs stay fully functional — nothing is rewritten."
  },
  {
    name: "Aether Controls",
    icon: "⌘",
    category: "productivity",
    label: "Productivity",
    desc: "Keyboard-first navigation: new tab, incognito, settings and home, plus the Aether new-tab page.",
    tags: ["shortcuts", "new tab", "commands"],
    detail: "Shortcuts: <code>Alt+Shift+N</code> new tab, <code>Alt+Shift+I</code> incognito, <code>Alt+Shift+S</code> settings, <code>Alt+Shift+H</code> home."
  },
  {
    name: "Aether Spotlight",
    icon: "⌕",
    category: "productivity",
    label: "Productivity",
    desc: "A dark command palette for searching the web, jumping to sites and running Aether actions.",
    tags: ["search", "palette", "speed"],
    detail: "Press <code>Alt+Shift+K</code> to search or run a command without leaving the keyboard."
  },
  {
    name: "Aether Canvas",
    icon: "✦",
    category: "appearance",
    label: "Appearance",
    desc: "Adds subtle ambient gradients and glass textures to pages without touching their content.",
    tags: ["theme", "ambient", "glass"],
    detail: "A lightweight style layer that only affects pages you choose. Disable it any time from here."
  }
];

const grid = document.getElementById("grid");
const search = document.getElementById("search");
let installed = new Map();
let filter = "all";

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2400);
}

function send(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

async function refresh() {
  const all = await new Promise((resolve) => chrome.management.getAll(resolve));
  installed = new Map(all.map((item) => [item.name, item]));
  const on = CATALOG.filter((item) => installed.get(item.name)?.enabled).length;
  document.getElementById("installedCount").textContent = on;
  document.getElementById("availableCount").textContent = CATALOG.length;
  render();
}

function render() {
  const query = search.value.trim().toLowerCase();
  const items = CATALOG.filter((item) => {
    if (filter !== "all" && item.category !== filter) return false;
    if (!query) return true;
    return (item.name + " " + item.desc + " " + item.tags.join(" ")).toLowerCase().includes(query);
  });

  grid.innerHTML = "";
  if (!items.length) {
    grid.innerHTML = `<p style="color:var(--muted);grid-column:1/-1">No extensions match “${query}”.</p>`;
    return;
  }

  for (const item of items) {
    const ext = installed.get(item.name);
    const enabled = !!ext?.enabled;

    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="card-head">
        <div class="card-icon">${item.icon}</div>
        <div>
          <div class="card-title">${item.name}</div>
          <div class="card-sub">${item.label}</div>
        </div>
      </div>
      <p>${item.desc}</p>
      <div class="tags">${item.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
      <div class="card-foot">
        <span class="status ${enabled ? "on" : ""}"><i class="dot"></i>${enabled ? "Enabled" : "Not installed"}</span>
        <button class="small detailsBtn">Details</button>
        <button class="switch ${enabled ? "on" : ""}" aria-label="Toggle ${item.name}" title="${enabled ? "Disable" : "Install"} ${item.name}"></button>
      </div>
      <div class="details">${item.detail}${ext ? `<br><br>ID: <code>${ext.id}</code> · Version ${ext.version}` : ""}</div>`;

    const toggle = card.querySelector(".switch");
    toggle.addEventListener("click", async () => {
      if (item.name === "Aether Controls") {
        toast("The Store is part of Aether Controls — change controls=on/off in aether.conf.");
        return;
      }
      if (!ext) {
        toast("This extension is bundled with Aether — restart the browser if it is missing.");
        return;
      }
      toggle.disabled = true;
      try {
        await chrome.management.setEnabled(ext.id, !enabled);
        toast(`${item.name} ${!enabled ? "enabled" : "disabled"}`);
        await refresh();
      } catch (err) {
        toast(`Could not change ${item.name}: ${err.message}`);
        toggle.disabled = false;
      }
    });

    card.querySelector(".detailsBtn").addEventListener("click", () => {
      card.querySelector(".details").classList.toggle("show");
    });

    grid.appendChild(card);
  }
}

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    filter = chip.dataset.filter;
    render();
  });
});

search.addEventListener("input", render);

document.getElementById("homeBtn").addEventListener("click", () => {
  send({ type: "open-url", url: "chrome://newtab" });
});

document.getElementById("extBtn").addEventListener("click", () => {
  send({ type: "open-url", url: "chrome://extensions" });
});

async function openSite() {
  const res = await send({ type: "get-site-url" });
  send({ type: "open-url", url: res?.url || "https://khaledwalid201724-collab.github.io/aether-browser/" });
}
document.getElementById("siteBtn").addEventListener("click", openSite);
document.getElementById("moreBtn").addEventListener("click", openSite);

refresh();
