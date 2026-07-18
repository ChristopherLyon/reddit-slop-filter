const classifier = globalThis.SlopFilterClassifier;
const extensionApi = globalThis.browser || globalThis.chrome;
const categories = [
  ["cloneware", "Cloneware", "Calculators, task managers, trackers and similar repeats"],
  ["thinWrapper", "Thin AI wrappers", "Generic interfaces around existing AI APIs"],
  ["launchTemplate", "Launch theatre", "Formulaic launches and inflated marketing"],
  ["adoptionWhining", "Adoption whining", "Posts complaining about missing users or traction"],
  ["validationFarming", "Validation farming", "Low-effort requests for approval or feedback"]
];
let settings = classifier.mergeSettings();
let allowedPosts = {};

const categoryRoot = document.querySelector("#categories");
for (const [key, label, help] of categories) {
  const row = document.createElement("label");
  row.className = "category";
  row.innerHTML = `<span><strong>${label}</strong><small>${help}</small></span><input data-category="${key}" type="range" min="0" max="150" step="10"><output></output>`;
  categoryRoot.append(row);
  const input = row.querySelector("input");
  input.addEventListener("input", () => { row.querySelector("output").textContent = `${input.value}%`; });
}

function render() {
  document.querySelector("#threshold").value = String(Math.round(settings.threshold * 100));
  document.querySelector("#thresholdValue").textContent = `${Math.round(settings.threshold * 100)}%`;
  document.querySelector("#mode").value = settings.mode;
  document.querySelector("#showScore").checked = settings.showScore;
  document.querySelector("#allowSubreddits").value = settings.allowSubreddits.join("\n");
  document.querySelectorAll("[data-category]").forEach(input => {
    input.value = String(Math.round((settings.categoryWeights[input.dataset.category] || 0) * 100));
    input.nextElementSibling.textContent = `${input.value}%`;
  });
  document.querySelector("#correctionCount").textContent = `${Object.keys(allowedPosts).length} post correction${Object.keys(allowedPosts).length === 1 ? "" : "s"} saved.`;
}

extensionApi.storage.local.get(["settings", "allowedPosts"]).then(stored => {
  settings = classifier.mergeSettings(stored.settings);
  allowedPosts = stored.allowedPosts || {};
  render();
});
document.querySelector("#threshold").addEventListener("input", event => { document.querySelector("#thresholdValue").textContent = `${event.target.value}%`; });
document.querySelector("#save").addEventListener("click", () => {
  settings.threshold = Number(document.querySelector("#threshold").value) / 100;
  settings.mode = document.querySelector("#mode").value;
  settings.showScore = document.querySelector("#showScore").checked;
  settings.allowSubreddits = document.querySelector("#allowSubreddits").value.split(/\n|,/).map(value => value.trim()).filter(Boolean);
  document.querySelectorAll("[data-category]").forEach(input => { settings.categoryWeights[input.dataset.category] = Number(input.value) / 100; });
  extensionApi.storage.local.set({ settings }).then(() => {
    const status = document.querySelector("#status");
    status.textContent = "Saved";
    window.setTimeout(() => { status.textContent = ""; }, 1600);
  });
});
document.querySelector("#clearCorrections").addEventListener("click", () => {
  allowedPosts = {};
  extensionApi.storage.local.set({ allowedPosts }).then(render);
});
