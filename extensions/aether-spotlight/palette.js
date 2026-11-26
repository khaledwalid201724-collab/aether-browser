const COMMANDS = [
  { i:"⌕", name:"Search the web", note:"DuckDuckGo · or paste a URL", run:go },
  { i:"+", name:"New tab", run:() => chrome.tabs.create({}) },
  { i:"⊞", name:"New window", run:() => chrome.windows.create({}) },
  { i:"◐", name:"Incognito window", run:() => chrome.windows.create({incognito:true}) },
  { i:"⌂", name:"Aether home", run:() => chrome.tabs.create({url:chrome.runtime.getURL("home.html")}) },
  { i:"⚙", name:"Browser settings", run:() => chrome.tabs.create({url:"chrome://settings"}) },
  { i:"🧩", name:"Extensions", run:() => chrome.tabs.create({url:"chrome://extensions"}) },
  { i:"◷", name:"History", run:() => chrome.tabs.create({url:"chrome://history"}) },
  { i:"↓", name:"Downloads", run:() => chrome.tabs.create({url:"chrome://downloads"}) },
  { i:"⧉", name:"Copy current URL", run:copyUrl },
  { i:"×", name:"Close this tab", run:closeTab }
];

function go(query) {
  const q = (query || "").trim();
  if (!q) return;
  const url = /^https?:\/\//i.test(q) ? q : "https://duckduckgo.com/?q=" + encodeURIComponent(q);
  return chrome.tabs.create({ url });
}
async function copyUrl() {
  const [tab] = await chrome.tabs.query({ active:true, currentWindow:true });
  if (tab?.url) await navigator.clipboard.writeText(tab.url);
}
async function closeTab() {
  const [tab] = await chrome.tabs.query({ active:true, currentWindow:true });
  if (tab) await chrome.tabs.remove(tab.id);
}

const input = document.getElementById("q"), list = document.getElementById("list");
let selected = 0;
function shown() {
  const q = input.value.trim().toLowerCase();
  return COMMANDS.filter(c => !q || c.name.toLowerCase().includes(q));
}
function render() {
  const items = shown();
  list.replaceChildren();
  items.forEach((c, i) => {
    const el = document.createElement("div");
    el.className = "item" + (i === selected ? " sel" : "");
    const icon = document.createElement("span"); icon.className = "i"; icon.textContent = c.i;
    const text = document.createElement("span"); text.textContent = c.name;
    const note = document.createElement("small"); note.textContent = c.note || "";
    if (c.note) text.appendChild(note);
    el.append(icon, text);
    el.addEventListener("click", () => run(items[i]));
    list.appendChild(el);
  });
  if (!items.length) {
    const el = document.createElement("div");
    el.className = "item"; el.style.opacity = ".6";
    el.textContent = "Press Enter to search for “" + input.value.trim() + "”";
    list.appendChild(el);
  }
}
function run(c) {
  const query = input.value.trim();
  if (c) Promise.resolve(c.run(c === COMMANDS[0] ? query : "")).catch(() => {});
  else go(query);
  window.close();
}
input.addEventListener("input", () => { selected = 0; render(); });
input.addEventListener("keydown", (e) => {
  const items = shown();
  if (e.key === "ArrowDown") { selected = Math.min(selected + 1, items.length - 1); render(); }
  else if (e.key === "ArrowUp") { selected = Math.max(selected - 1, 0); render(); }
  else if (e.key === "Enter") {
    const q = input.value.trim();
    if (!q && items[0]) run(items[0]);
    else if (q && !items.length) run(null);
    else run(items[selected] || items[0]);
  } else if (e.key === "Escape") chrome.tabs.getCurrent(t => t && chrome.tabs.remove(t.id));
});
render();
