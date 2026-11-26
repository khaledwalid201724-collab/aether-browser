const FILTERS = [
  { id: "ads", name: "Ads", note: "Banners, popups, display ads" },
  { id: "trackers", name: "Trackers", note: "Analytics and fingerprinting" },
  { id: "social", name: "Social widgets", note: "Embeds and share pixels" },
];

const box = document.getElementById("filters");

function render(enabled) {
  box.replaceChildren();
  for (const filter of FILTERS) {
    const row = document.createElement("label");
    row.className = "row";
    const text = document.createElement("span");
    text.textContent = filter.name;
    const small = document.createElement("small");
    small.textContent = filter.note;
    text.appendChild(small);
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = enabled.includes(filter.id);
    input.addEventListener("change", async () => {
      const current = await getEnabled();
      const next = input.checked
        ? [...new Set([...current, filter.id])]
        : current.filter((id) => id !== filter.id);
      const result = await chrome.runtime.sendMessage({ type: "set", ids: next });
      render(result.enabled);
    });
    row.append(text, input);
    box.appendChild(row);
  }
}

function getEnabled() {
  return chrome.runtime.sendMessage({ type: "get" });
}

getEnabled().then(({ enabled }) => render(enabled));
