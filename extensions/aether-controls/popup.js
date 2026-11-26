for (const button of document.querySelectorAll("button[data-command]")) {
  button.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "run", command: button.dataset.command });
    window.close();
  });
}

document.querySelector("button[data-action='store']").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("store.html") });
  window.close();
});
