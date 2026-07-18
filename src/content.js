(function redditSlopFilter() {
  "use strict";

  const classifier = globalThis.SlopFilterClassifier;
  const extensionApi = globalThis.browser || globalThis.chrome;
  const POST_SELECTOR = "shreddit-post, article, div[data-testid='post-container'], .Post, .thing";
  const STORAGE_KEYS = ["settings", "allowedPosts", "stats"];
  let settings = classifier.mergeSettings();
  let allowedPosts = {};
  let stats = { scanned: 0, collapsed: 0, corrected: 0 };
  let scanQueued = false;

  function textFrom(root, selectors) {
    for (const selector of selectors) {
      const node = root.querySelector(selector);
      const value = node?.textContent?.trim();
      if (value) return value;
    }
    return "";
  }

  function extractPost(root) {
    const title = root.getAttribute("post-title") || root.getAttribute("data-title") || textFrom(root, [
      "[slot='title']", "[data-testid='post-title']", "h1", "h2", "h3", "a.title"
    ]);
    if (!title || title.length < 3) return null;
    const subreddit = root.getAttribute("subreddit-prefixed-name") || root.getAttribute("data-subreddit-prefixed") || root.getAttribute("data-subreddit") || textFrom(root, ["[data-testid='subreddit-name']", "a[data-click-id='subreddit']", ".subreddit"]);
    const flair = root.getAttribute("post-flair-text") || textFrom(root, ["[data-testid='post-flair']", "[class*='flair']", ".linkflairlabel"]);
    const preview = textFrom(root, ["[slot='text-body']", "[data-testid='post-content']", "[data-click-id='text']", ".usertext-body"]);
    const link = root.getAttribute("content-href") || root.getAttribute("data-url") || root.querySelector("a[href]")?.href || "";
    let domain = root.getAttribute("data-domain") || "";
    try { if (!domain && link) domain = new URL(link, location.href).hostname; } catch {}
    return { title, subreddit, flair, preview: preview.slice(0, 500), domain };
  }

  function subredditAllowed(value) {
    const normalized = String(value || "").replace(/^r\//i, "").toLowerCase();
    return settings.allowSubreddits.some(item => item.replace(/^r\//i, "").toLowerCase() === normalized);
  }

  function saveStats() {
    extensionApi.storage.local.set({ stats });
  }

  function reveal(root, placeholder) {
    root.classList.remove("rsf-hidden", "rsf-dimmed");
    root.removeAttribute("aria-hidden");
    placeholder?.remove();
  }

  function buildPlaceholder(root, post, result, key) {
    const bar = document.createElement("div");
    bar.className = "rsf-placeholder";
    const score = Math.round(result.overall * 100);
    const why = result.explanation.join(" · ") || "matched your filter";
    bar.innerHTML = `<span class="rsf-mark" aria-hidden="true">×</span><span><strong>Filtered${settings.showScore ? ` · ${score}%` : ""}</strong><small>${why}</small></span>`;

    const controls = document.createElement("span");
    controls.className = "rsf-controls";
    const show = document.createElement("button");
    show.type = "button";
    show.textContent = "Show";
    show.addEventListener("click", () => reveal(root, bar));
    const correction = document.createElement("button");
    correction.type = "button";
    correction.textContent = "Not slop";
    correction.addEventListener("click", () => {
      allowedPosts[key] = { title: post.title, subreddit: post.subreddit, savedAt: new Date().toISOString() };
      stats.corrected += 1;
      extensionApi.storage.local.set({ allowedPosts, stats });
      reveal(root, bar);
    });
    controls.append(show, correction);
    bar.append(controls);
    return bar;
  }

  function processPost(root) {
    if (root.dataset.rsfScanned === "1") return;
    if (root.parentElement?.closest(POST_SELECTOR)) return;
    root.dataset.rsfScanned = "1";
    const post = extractPost(root);
    if (!post) return;
    stats.scanned += 1;
    if (!settings.enabled || subredditAllowed(post.subreddit)) return;
    const key = classifier.stableKey(post);
    if (allowedPosts[key]) return;
    const result = classifier.score(post, settings);
    root.dataset.rsfScore = String(result.overall);
    if (!result.hide) return;

    stats.collapsed += 1;
    const placeholder = buildPlaceholder(root, post, result, key);
    root.before(placeholder);
    if (settings.mode === "dim") root.classList.add("rsf-dimmed");
    else {
      root.classList.add("rsf-hidden");
      root.setAttribute("aria-hidden", "true");
    }
  }

  function scan() {
    scanQueued = false;
    document.querySelectorAll(POST_SELECTOR).forEach(processPost);
    saveStats();
  }

  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    window.setTimeout(scan, 80);
  }

  extensionApi.storage.local.get(STORAGE_KEYS).then(stored => {
    settings = classifier.mergeSettings(stored.settings);
    allowedPosts = stored.allowedPosts || {};
    stats = { ...stats, ...(stored.stats || {}) };
    queueScan();
    new MutationObserver(queueScan).observe(document.documentElement, { childList: true, subtree: true });
  });

  extensionApi.storage.onChanged.addListener(changes => {
    if (!changes.settings && !changes.allowedPosts) return;
    if (changes.settings) settings = classifier.mergeSettings(changes.settings.newValue);
    if (changes.allowedPosts) allowedPosts = changes.allowedPosts.newValue || {};
    document.querySelectorAll("[data-rsf-scanned='1']").forEach(node => {
      node.dataset.rsfScanned = "0";
      node.classList.remove("rsf-hidden", "rsf-dimmed");
      node.removeAttribute("aria-hidden");
    });
    document.querySelectorAll(".rsf-placeholder").forEach(node => node.remove());
    queueScan();
  });
})();
