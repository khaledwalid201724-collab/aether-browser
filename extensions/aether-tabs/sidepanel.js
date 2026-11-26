const list = document.getElementById("list");
const search = document.getElementById("search");
let query = "";

function favicon(tab) {
  if (tab.favIconUrl && !tab.favIconUrl.startsWith("chrome://")) {
    const img = document.createElement("img");
    img.src = tab.favIconUrl;
    img.alt = "";
    return img;
  }
  return document.createTextNode((tab.title || "?").trim().charAt(0).toUpperCase());
}

async function render() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const shown = tabs.filter((tab) =>
    !query || (tab.title || "").toLowerCase().includes(query) ||
    (tab.url || "").toLowerCase().includes(query));

  list.replaceChildren();
  for (const tab of shown) {
    const row = document.createElement("div");
    row.className = "tab" + (tab.active ? " active" : "");
    row.title = tab.title || tab.url || "";

    const icon = document.createElement("div");
    icon.className = "icon";
    icon.appendChild(favicon(tab));

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = tab.title || tab.url || "Untitled";

    const close = document.createElement("button");
    close.className = "close";
    close.textContent = "×";
    close.title = "Close tab";
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      chrome.tabs.remove(tab.id);
    });

    row.addEventListener("click", () => chrome.tabs.update(tab.id, { active: true }));
    row.append(icon, title, close);
    list.appendChild(row);
  }
  if (!shown.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No tabs match.";
    list.appendChild(empty);
  }
}

search.addEventListener("input", () => {
  query = search.value.trim().toLowerCase();
  render();
});
search.addEventListener("keydown", (event) => {
  if (event.key === "Enter") document.querySelector(".tab")?.click();
});
document.getElementById("new").addEventListener("click", () => chrome.tabs.create({}));

["onCreated", "onRemoved", "onUpdated", "onMoved", "onActivated", "onReplaced"]
  .forEach((event) => chrome.tabs[event]?.addListener(render));
chrome.windows.onFocusChanged.addListener(render);

render();
