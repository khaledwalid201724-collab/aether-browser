const PRESETS = [
  {id:"original", i:"◇", name:"Original", note:"Leave sites as they are"},
  {id:"reader", i:"📖", name:"Reader", note:"Clean serif reading layout"},
  {id:"night", i:"☾", name:"Night shift", note:"Invert pages for dark reading"},
  {id:"focus", i:"◎", name:"Focus", note:"Hide sidebars and clutter"},
  {id:"large", i:"Aa", name:"Large text", note:"Bump up typography 20%"},
  {id:"calm", i:"≈", name:"Calm", note:"Stop animations, drop banners"}
];
const box = document.getElementById("presets");
function render(current) {
  box.replaceChildren();
  for (const p of PRESETS) {
    const b = document.createElement("button");
    b.className = p.id === current ? "on" : "";
    const i = document.createElement("span"); i.className="i"; i.textContent=p.i;
    const t = document.createElement("span"); t.textContent=p.name;
    const s = document.createElement("small"); s.textContent=p.note; t.appendChild(s);
    b.append(i,t);
    b.addEventListener("click", () => chrome.storage.local.set({preset:p.id}, () => render(p.id)));
    box.appendChild(b);
  }
}
chrome.storage.local.get({preset:"original"}, d => render(d.preset));
