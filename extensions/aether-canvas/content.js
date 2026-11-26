(function () {
  let style = document.getElementById("aether-canvas-style");
  if (!style) {
    style = document.createElement("style");
    style.id = "aether-canvas-style";
    document.documentElement.appendChild(style);
  }
  function apply(preset) {
    style.textContent = AETHER_PRESETS[preset] || "";
  }
  chrome.storage.local.get({ preset: "original" }, (data) => apply(data.preset));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.preset) apply(changes.preset.newValue);
  });
})();
