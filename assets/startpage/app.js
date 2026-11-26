const KEY = "aether.home.v2";
const ENGINES = {
  ddg: "https://duckduckgo.com/?q=", brave: "https://search.brave.com/search?q=",
  startpage: "https://www.startpage.com/sp/search?query=",
  wiki: "https://en.wikipedia.org/w/index.php?search=", gh: "https://github.com/search?q="
};
const ACCENTS = ["violet","cyan","mint","rose","amber","ice"];
const WALLS = ["aurora","sunset","forest","midnight","paper"];
const DEFAULTS = {
  accent:"violet", wall:"aurora", layout:"grid", density:"cozy",
  brand:"Aether", engine:"ddg", motion:true,
  show:{hero:true,links:true,notes:true,focus:true,footer:true},
  notes:"", links:[
    {name:"GitHub",url:"https://github.com",glyph:"⌘"},
    {name:"YouTube",url:"https://youtube.com",glyph:"▶"},
    {name:"Wikipedia",url:"https://wikipedia.org",glyph:"📖"},
    {name:"Reddit",url:"https://reddit.com",glyph:"◉"},
    {name:"Mail",url:"https://mail.google.com",glyph:"✉"},
    {name:"Hacker News",url:"https://news.ycombinator.com",glyph:"▲"},
    {name:"Settings",url:"chrome://settings",glyph:"⚙"},
    {name:"Extensions",url:"chrome://extensions",glyph:"🧩"}
  ]
};

let S = load();
function load() {
  try { return {...structuredClone(DEFAULTS), ...JSON.parse(localStorage.getItem(KEY) || "{}")}; }
  catch { return structuredClone(DEFAULTS); }
}
function save() { localStorage.setItem(KEY, JSON.stringify(S)); }

function apply() {
  document.body.dataset.accent = S.accent;
  document.body.dataset.wall = S.wall;
  document.body.dataset.layout = S.layout;
  document.body.dataset.density = S.density;
  document.body.classList.toggle("no-motion", !S.motion);
  document.getElementById("brandName").textContent = S.brand || "Aether";
  document.getElementById("engine").value = S.engine;
  document.getElementById("engineInput").value = S.engine;
  document.getElementById("brandInput").value = S.brand;
  document.getElementById("notes").value = S.notes || "";
  for (const el of document.querySelectorAll("[data-show]")) {
    const key = el.dataset.show;
    el.checked = key === "motion" ? !!S.motion : !!S.show[key];
  }
  for (const el of document.querySelectorAll("#accents .swatch")) el.classList.toggle("on", el.dataset.v === S.accent);
  for (const el of document.querySelectorAll("#walls .swatch")) el.classList.toggle("on", el.dataset.v === S.wall);
  for (const el of document.querySelectorAll("#layoutSeg button")) el.classList.toggle("on", el.dataset.v === S.layout);
  for (const el of document.querySelectorAll("#densitySeg button")) el.classList.toggle("on", el.dataset.v === S.density);
  for (const [id,key] of [["hero","hero"],["linksCard","links"],["notesCard","notes"],["focusCard","focus"],["footer","footer"]]) {
    document.getElementById(id).style.display = S.show[key] ? "" : "none";
  }
  renderLinks();
}

function renderLinks() {
  const box = document.getElementById("links");
  box.replaceChildren();
  (S.links || []).forEach((link, i) => {
    const a = document.createElement("a");
    a.className = "tile"; a.href = link.url; a.title = link.url;
    const g = document.createElement("span"); g.className = "glyph"; g.textContent = link.glyph || (link.name || "?")[0];
    const n = document.createElement("span"); n.textContent = link.name;
    const d = document.createElement("button"); d.className = "del"; d.textContent = "×"; d.title = "Remove";
    d.addEventListener("click", (e) => { e.preventDefault(); S.links.splice(i,1); save(); renderLinks(); });
    a.append(g,n,d); box.appendChild(a);
  });
}

// --- Settings UI ----------------------------------------------------------
const accentBox = document.getElementById("accents");
for (const a of ACCENTS) {
  const s = document.createElement("button"); s.className = "swatch"; s.dataset.v = a;
  s.style.background = `linear-gradient(140deg, ${getComputedStyle(document.documentElement).getPropertyValue("--x") || "#8b7cff"}, #22d3ee)`;
  s.title = a;
  s.addEventListener("click", () => { S.accent = a; save(); apply(); });
  accentBox.appendChild(s);
}
const wallBox = document.getElementById("walls");
const WALL_STYLE = {
  aurora:"linear-gradient(135deg,#6d5ef8,#22d3ee)", sunset:"linear-gradient(135deg,#fb7185,#f59e0b)",
  forest:"linear-gradient(135deg,#34d399,#0ea5e9)", midnight:"linear-gradient(135deg,#1e3a8a,#0b0d17)",
  paper:"linear-gradient(135deg,#e7e9f4,#a5b4fc)"
};
for (const w of WALLS) {
  const s = document.createElement("button"); s.className = "swatch"; s.dataset.v = w;
  s.style.background = WALL_STYLE[w]; s.title = w;
  s.addEventListener("click", () => { S.wall = w; save(); apply(); });
  wallBox.appendChild(s);
}
// colour the accent swatches properly after palette definitions exist
const ACCENT_COLORS = {violet:"#8b7cff",cyan:"#22d3ee",mint:"#34d399",rose:"#fb7185",amber:"#fbbf24",ice:"#93c5fd"};
[...accentBox.children].forEach((el,i) => { el.style.background = `linear-gradient(135deg,${ACCENT_COLORS[ACCENTS[i]]},#ffffff44)`; });

for (const [id,key] of [["layoutSeg","layout"],["densitySeg","density"]]) {
  document.getElementById(id).addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    S[key] = b.dataset.v; save(); apply();
  });
}
document.getElementById("brandInput").addEventListener("input", (e) => { S.brand = e.target.value; save(); document.getElementById("brandName").textContent = S.brand || "Aether"; });
document.getElementById("engineInput").addEventListener("change", (e) => { S.engine = e.target.value; save(); apply(); });
for (const el of document.querySelectorAll("[data-show]")) {
  el.addEventListener("change", () => {
    const k = el.dataset.show;
    if (k === "motion") S.motion = el.checked; else S.show[k] = el.checked;
    save(); apply();
  });
}
document.getElementById("configBtn").addEventListener("click", () => document.getElementById("drawer").classList.toggle("open"));
document.getElementById("drawer").addEventListener("click", (e) => {
  if (e.target.id === "drawer") e.currentTarget.classList.remove("open");
});
document.getElementById("addLink").addEventListener("click", () => {
  const name = prompt("Link name:"); if (!name) return;
  let url = prompt("URL:", "https://"); if (!url) return;
  if (!/^https?:\/\//.test(url) && !url.startsWith("chrome://")) url = "https://" + url;
  S.links.push({name, url, glyph:name[0].toUpperCase()}); save(); renderLinks();
});
let noteTimer;
document.getElementById("notes").addEventListener("input", (e) => {
  S.notes = e.target.value; clearTimeout(noteTimer);
  noteTimer = setTimeout(() => { save(); const s = document.getElementById("saved"); s.classList.add("on"); setTimeout(() => s.classList.remove("on"), 900); }, 350);
});
document.getElementById("exportBtn").addEventListener("click", async () => {
  await navigator.clipboard.writeText(JSON.stringify(S, null, 2)); alert("Settings copied to clipboard.");
});
document.getElementById("importBtn").addEventListener("click", () => {
  const raw = prompt("Paste exported settings JSON:");
  if (!raw) return;
  try { S = {...structuredClone(DEFAULTS), ...JSON.parse(raw)}; save(); apply(); }
  catch { alert("That didn't look like valid settings JSON."); }
});
document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm("Reset all home customizations?")) { localStorage.removeItem(KEY); S = load(); apply(); }
});

// --- Clock, search, timer --------------------------------------------------
function tick() {
  const n = new Date(), h = n.getHours();
  document.getElementById("clock").textContent = n.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
  document.getElementById("greeting").textContent = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  document.getElementById("date").textContent = n.toLocaleDateString([], {weekday:"long", month:"long", day:"numeric"});
}
tick(); setInterval(tick, 15000);
document.getElementById("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = document.getElementById("q").value.trim(); if (!q) return;
  location.href = (ENGINES[S.engine] || ENGINES.ddg) + encodeURIComponent(q);
});

let seconds = 1500, running = false, phase = "focus", interval = null;
function paintTimer() {
  const m = String(Math.floor(seconds/60)).padStart(2,"0"), s = String(seconds%60).padStart(2,"0");
  document.getElementById("timer").textContent = m + ":" + s;
  document.getElementById("phase").textContent = phase === "focus" ? "focus · 25 min" : "break · 5 min";
}
document.getElementById("startTimer").addEventListener("click", () => {
  running = !running;
  document.getElementById("startTimer").textContent = running ? "Pause" : "Start";
  clearInterval(interval);
  if (running) interval = setInterval(() => {
    seconds--;
    if (seconds < 0) { phase = phase === "focus" ? "break" : "focus"; seconds = phase === "focus" ? 1500 : 300; }
    paintTimer();
  }, 1000);
});
document.getElementById("resetTimer").addEventListener("click", () => {
  running = false; clearInterval(interval); seconds = 1500; phase = "focus";
  document.getElementById("startTimer").textContent = "Start"; paintTimer();
});
paintTimer();

// --- Extension-page helpers ------------------------------------------------
// When the home page is used as the new-tab page it runs at a
// chrome-extension:// origin, where chrome:// links need the tabs API.
const IN_EXTENSION = typeof chrome !== "undefined" && !!(chrome && chrome.tabs);
function openInternal(url) {
  if (IN_EXTENSION) chrome.tabs.create({ url });
  else location.href = url;
}
if (IN_EXTENSION) {
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="chrome://"]');
    if (!a) return;
    e.preventDefault();
    const url = a.href.startsWith("chrome://settings")
      ? chrome.runtime.getURL("settings.html")
      : a.href;
    chrome.tabs.create({ url });
  });
}

// --- Command palette -------------------------------------------------------
const COMMANDS = [
  {i:"⌕", name:"Search the web", run:(q) => { if (q) location.href = (ENGINES[S.engine]||ENGINES.ddg)+encodeURIComponent(q); else document.getElementById("q").focus(); }},
  {i:"✦", name:"Customize this page", run:() => document.getElementById("drawer").classList.add("open")},
  {i:"☾", name:"Toggle dark wallpaper", run:() => { S.wall = S.wall === "midnight" ? "aurora" : "midnight"; save(); apply(); }},
  {i:"◧", name:"Toggle list layout", run:() => { S.layout = S.layout === "grid" ? "list" : "grid"; save(); apply(); }},
  {i:"◴", name:"Toggle focus timer", run:() => { S.show.focus = !S.show.focus; save(); apply(); }},
  {i:"✎", name:"Toggle scratchpad", run:() => { S.show.notes = !S.show.notes; save(); apply(); }},
  {i:"⚙", name:"Open Aether Settings", run:() => openInternal(IN_EXTENSION ? chrome.runtime.getURL("settings.html") : "chrome://settings")},
  {i:"🧩", name:"Open extensions", run:() => openInternal("chrome://extensions")},
  {i:"🛍", name:"Open Aether Store", run:() => { if (IN_EXTENSION) chrome.tabs.create({url: chrome.runtime.getURL("store.html")}); else openInternal("chrome://extensions"); }},
  {i:"+", name:"New quick link", run:() => document.getElementById("addLink").click()}
];
let selected = 0;
const palette = document.getElementById("palette"), cmdInput = document.getElementById("cmdInput"), cmdList = document.getElementById("cmdList");
function renderCommands() {
  const q = cmdInput.value.trim().toLowerCase();
  const items = COMMANDS.filter(c => !q || c.name.toLowerCase().includes(q));
  cmdList.replaceChildren();
  items.forEach((c, i) => {
    const el = document.createElement("div"); el.className = "cmd" + (i === selected ? " sel" : "");
    const icon = document.createElement("span"); icon.className = "i"; icon.textContent = c.i;
    const label = document.createElement("span"); label.textContent = c.name;
    el.append(icon,label); el.addEventListener("click", () => runCommand(c, q)); cmdList.appendChild(el);
  });
  if (!items.length) cmdList.innerHTML = '<div class="cmd" style="opacity:.6">No commands — press Enter to search the web</div>';
}
function runCommand(c, q) { palette.classList.remove("open"); if (c) c.run(q || ""); }
function openPalette() { palette.classList.add("open"); cmdInput.value=""; selected=0; renderCommands(); cmdInput.focus(); }
document.getElementById("paletteBtn").addEventListener("click", openPalette);
palette.addEventListener("click", e => { if (e.target === palette) palette.classList.remove("open"); });
cmdInput.addEventListener("input", () => { selected=0; renderCommands(); });
cmdInput.addEventListener("keydown", (e) => {
  const items = COMMANDS.filter(c => !cmdInput.value || c.name.toLowerCase().includes(cmdInput.value.toLowerCase()));
  if (e.key === "ArrowDown") { selected = Math.min(selected+1, items.length-1); renderCommands(); }
  else if (e.key === "ArrowUp") { selected = Math.max(selected-1, 0); renderCommands(); }
  else if (e.key === "Enter") {
    if (items[selected]) runCommand(items[selected], cmdInput.value.trim());
    else if (cmdInput.value.trim()) runCommand(COMMANDS[0], cmdInput.value.trim());
  } else if (e.key === "Escape") palette.classList.remove("open");
});
addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); return; }
  if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); document.getElementById("q").focus(); }
});

apply(); renderCommands();

// Aether Settings can override the search engine, ambience and motion.
if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
  chrome.storage.local.get({
    "aether.searchEngine": "", "aether.ambient": true, "aether.motion": true
  }, (prefs) => {
    if (prefs["aether.searchEngine"] && ENGINES[prefs["aether.searchEngine"]]) {
      S.engine = prefs["aether.searchEngine"];
    }
    S.motion = prefs["aether.motion"] !== false;
    apply();
    document.body.classList.toggle("no-glow", prefs["aether.ambient"] === false);
  });
}
