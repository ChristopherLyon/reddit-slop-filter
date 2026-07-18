const classifier = globalThis.SlopFilterClassifier;
const extensionApi = globalThis.browser || globalThis.chrome;
const enabled = document.querySelector("#enabled");
const sensitivity = document.querySelector("#sensitivity");
const sensitivityValue = document.querySelector("#sensitivityValue");
let settings = classifier.mergeSettings();
let currentPost = null;
let trainingCorpus = [];
let stats = {};

function render() {
  enabled.checked = settings.enabled;
  sensitivity.value = String(Math.round(settings.sensitivity * 100));
  sensitivityValue.textContent = `${sensitivity.value}%`;
}

function saveSettings() { return extensionApi.storage.local.set({ settings }); }

function renderModelStatus(mlStatus) {
  const node = document.querySelector("#modelStatus");
  if (!settings.modelEnabled) node.textContent = "Semantic model disabled";
  else if (mlStatus?.status === "ready") node.textContent = "Semantic model ready · MiniLM q8";
  else if (mlStatus?.status === "error") node.textContent = `Semantic fallback active · ${mlStatus.error || "model error"}`;
  else if (mlStatus?.status) node.textContent = `Loading semantic model${mlStatus.progress ? ` · ${mlStatus.progress}%` : "…"}`;
  else node.textContent = "Semantic model will load on Reddit";
}

async function loadCurrentPost() {
  try {
    const [tab] = await extensionApi.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url?.includes("reddit.com/")) return;
    const response = await extensionApi.tabs.sendMessage(tab.id, { type: "GET_CURRENT_POST" });
    if (!response?.post) return;
    currentPost = response.post;
    document.querySelector("#currentPost").hidden = false;
    document.querySelector("#currentTitle").textContent = currentPost.title;
  } catch {
    document.querySelector("#currentPost").hidden = true;
  }
}

async function addToCorpus(label) {
  if (!currentPost) return;
  const key = classifier.stableKey(currentPost);
  const entry = {
    ...currentPost,
    id: key,
    label,
    text: classifier.normalizedText(currentPost),
    addedAt: new Date().toISOString()
  };
  trainingCorpus = trainingCorpus.filter(item => item.id !== key);
  trainingCorpus.push(entry);
  if (trainingCorpus.length > 500) trainingCorpus = trainingCorpus.slice(-500);
  stats.trained = trainingCorpus.length;
  await extensionApi.storage.local.set({ trainingCorpus, stats });
  const status = document.querySelector("#corpusStatus");
  status.textContent = label === "slop" ? "Saved as slop. Similar posts now inherit this signal." : "Saved as worthwhile. This protects similar posts.";
}

extensionApi.storage.local.get(["settings", "stats", "trainingCorpus", "mlStatus"]).then(stored => {
  settings = classifier.mergeSettings(stored.settings);
  stats = stored.stats || {};
  trainingCorpus = stored.trainingCorpus || [];
  render();
  for (const key of ["scanned", "collapsed", "corrected"]) document.querySelector(`#${key}`).textContent = stats[key] || 0;
  renderModelStatus(stored.mlStatus);
  loadCurrentPost();
});
enabled.addEventListener("change", () => { settings.enabled = enabled.checked; saveSettings(); });
sensitivity.addEventListener("input", () => { sensitivityValue.textContent = `${sensitivity.value}%`; });
sensitivity.addEventListener("change", () => {
  settings.settingsVersion = 2;
  settings.sensitivity = Number(sensitivity.value) / 100;
  settings = classifier.mergeSettings(settings);
  saveSettings();
});
document.querySelector("#addSlop").addEventListener("click", () => addToCorpus("slop"));
document.querySelector("#addKeep").addEventListener("click", () => addToCorpus("keep"));
document.querySelector("#options").addEventListener("click", () => extensionApi.runtime.openOptionsPage());
