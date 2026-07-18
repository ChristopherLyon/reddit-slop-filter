const classifier = globalThis.SlopFilterClassifier;
const extensionApi = globalThis.browser || globalThis.chrome;
const enabled = document.querySelector("#enabled");
const threshold = document.querySelector("#threshold");
const thresholdValue = document.querySelector("#thresholdValue");
let settings = classifier.mergeSettings();

function render() {
  enabled.checked = settings.enabled;
  threshold.value = String(Math.round(settings.threshold * 100));
  thresholdValue.textContent = `${threshold.value}%`;
}

function save() { extensionApi.storage.local.set({ settings }); }
extensionApi.storage.local.get(["settings", "stats"]).then(stored => {
  settings = classifier.mergeSettings(stored.settings);
  render();
  for (const key of ["scanned", "collapsed", "corrected"]) document.querySelector(`#${key}`).textContent = stored.stats?.[key] || 0;
});
enabled.addEventListener("change", () => { settings.enabled = enabled.checked; save(); });
threshold.addEventListener("input", () => { thresholdValue.textContent = `${threshold.value}%`; });
threshold.addEventListener("change", () => { settings.threshold = Number(threshold.value) / 100; save(); });
document.querySelector("#options").addEventListener("click", () => extensionApi.runtime.openOptionsPage());
