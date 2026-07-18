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
let trainingCorpus = [];
let mlStatus = {};

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
  document.querySelector("#sensitivity").value = String(Math.round(settings.sensitivity * 100));
  document.querySelector("#sensitivityValue").textContent = `${Math.round(settings.sensitivity * 100)}%`;
  document.querySelector("#mode").value = settings.mode;
  document.querySelector("#showScore").checked = settings.showScore;
  document.querySelector("#modelEnabled").checked = settings.modelEnabled;
  document.querySelector("#seedCorpusEnabled").value = settings.seedCorpusEnabled ? "baseline" : "blank";
  document.querySelector("#allowSubreddits").value = settings.allowSubreddits.join("\n");
  document.querySelectorAll("[data-category]").forEach(input => {
    input.value = String(Math.round((settings.categoryWeights[input.dataset.category] || 0) * 100));
    input.nextElementSibling.textContent = `${input.value}%`;
  });
  document.querySelector("#correctionCount").textContent = `${Object.keys(allowedPosts).length} post correction${Object.keys(allowedPosts).length === 1 ? "" : "s"} saved.`;
  document.querySelector("#trainingCount").textContent = `${trainingCorpus.length} labelled training example${trainingCorpus.length === 1 ? "" : "s"} saved.`;
  document.querySelector("#slopCount").textContent = trainingCorpus.filter(item => item.label === "slop").length;
  document.querySelector("#keepCount").textContent = trainingCorpus.filter(item => item.label === "keep").length;
  document.querySelector("#seedCount").textContent = globalThis.SlopFilterCorpus.length;
  document.querySelector("#thresholdValue").textContent = `${Math.round(settings.threshold * 100)}%`;
  const status = document.querySelector("#modelStatus");
  status.className = `model-chip ${mlStatus?.status || "idle"}`;
  status.textContent = !settings.modelEnabled ? "Model disabled" : mlStatus?.status === "ready" ? "MiniLM q8 ready" : mlStatus?.status === "error" ? "Semantic fallback" : mlStatus?.status === "loading" ? "Model loading" : "Loads on Reddit";
  renderCorpus();
}

function corpusMatches(item) {
  const label = document.querySelector("#corpusFilter").value;
  const query = document.querySelector("#corpusSearch").value.trim().toLowerCase();
  if (label !== "all" && item.label !== label) return false;
  if (!query) return true;
  return [item.title, item.subreddit, item.text, item.domain].filter(Boolean).join(" ").toLowerCase().includes(query);
}

function renderCorpus() {
  const root = document.querySelector("#corpusList");
  const visible = [...trainingCorpus].filter(corpusMatches).reverse();
  root.replaceChildren();
  document.querySelector("#corpusEmpty").hidden = visible.length > 0;
  for (const item of visible) {
    const row = document.createElement("article");
    row.className = "corpus-entry";
    const head = document.createElement("div");
    head.className = "corpus-entry-head";
    const badge = document.createElement("span");
    badge.className = `corpus-badge ${item.label}`;
    badge.textContent = item.label === "keep" ? "Worthwhile" : "Slop";
    const title = document.createElement("strong");
    title.textContent = item.title || item.text || "Untitled example";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "entry-remove";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${item.title || "corpus example"}`);
    remove.addEventListener("click", async () => {
      trainingCorpus = trainingCorpus.filter(entry => entry.id !== item.id);
      await extensionApi.storage.local.set({ trainingCorpus });
      render();
    });
    head.append(badge, title, remove);
    const meta = document.createElement("small");
    meta.textContent = [item.subreddit, item.domain, item.addedAt ? new Date(item.addedAt).toLocaleString() : ""].filter(Boolean).join(" · ");
    const detail = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Inspect training text";
    const text = document.createElement("pre");
    text.textContent = item.text || classifier.normalizedText(item);
    detail.append(summary, text);
    row.append(head, meta, detail);
    root.append(row);
  }
}

function exportCorpus() {
  const payload = {
    schema: "reddit-slop-filter-corpus/v1",
    exportedAt: new Date().toISOString(),
    extensionVersion: extensionApi.runtime.getManifest().version,
    examples: trainingCorpus.map(item => ({
      id: item.id || classifier.stableKey(item),
      label: item.label,
      text: item.text || classifier.normalizedText(item),
      title: item.title || "",
      subreddit: item.subreddit || "",
      domain: item.domain || "",
      url: item.url || "",
      addedAt: item.addedAt || ""
    }))
  };
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `reddit-slop-corpus-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

extensionApi.storage.local.get(["settings", "allowedPosts", "trainingCorpus", "mlStatus"]).then(stored => {
  settings = classifier.mergeSettings(stored.settings);
  allowedPosts = stored.allowedPosts || {};
  trainingCorpus = stored.trainingCorpus || [];
  mlStatus = stored.mlStatus || {};
  render();
});
document.querySelector("#sensitivity").addEventListener("input", event => { document.querySelector("#sensitivityValue").textContent = `${event.target.value}%`; });
document.querySelector("#save").addEventListener("click", () => {
  settings.settingsVersion = 2;
  settings.sensitivity = Number(document.querySelector("#sensitivity").value) / 100;
  settings.mode = document.querySelector("#mode").value;
  settings.showScore = document.querySelector("#showScore").checked;
  settings.modelEnabled = document.querySelector("#modelEnabled").checked;
  settings.seedCorpusEnabled = document.querySelector("#seedCorpusEnabled").value === "baseline";
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
document.querySelector("#clearCorpus").addEventListener("click", () => {
  trainingCorpus = [];
  extensionApi.storage.local.set({ trainingCorpus }).then(render);
});
document.querySelector("#corpusSearch").addEventListener("input", renderCorpus);
document.querySelector("#corpusFilter").addEventListener("change", renderCorpus);
document.querySelector("#exportCorpus").addEventListener("click", exportCorpus);
extensionApi.storage.onChanged.addListener(changes => {
  if (changes.trainingCorpus) trainingCorpus = changes.trainingCorpus.newValue || [];
  if (changes.mlStatus) mlStatus = changes.mlStatus.newValue || {};
  if (changes.trainingCorpus || changes.mlStatus) render();
});
