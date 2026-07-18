(function redditSlopFilter() {
  "use strict";

  const classifier = globalThis.SlopFilterClassifier;
  const seedCorpus = globalThis.SlopFilterCorpus || [];
  const extensionApi = globalThis.browser || globalThis.chrome;
  const POST_SELECTOR = "shreddit-post, article, div[data-testid='post-container'], .Post, .thing";
  const STORAGE_KEYS = ["settings", "allowedPosts", "trainingCorpus", "stats"];
  let settings = classifier.mergeSettings();
  let allowedPosts = {};
  let trainingCorpus = [];
  let stats = { scanned: 0, collapsed: 0, corrected: 0, trained: 0 };
  let scanQueued = false;
  let semanticQueued = false;
  let requestSequence = 0;
  const semanticQueue = [];

  function textFrom(root, selectors) {
    for (const selector of selectors) {
      const node = root?.querySelector?.(selector);
      const value = node?.textContent?.trim();
      if (value) return value;
    }
    return "";
  }

  function extractPost(root) {
    const title = root?.getAttribute?.("post-title") || root?.getAttribute?.("data-title") || textFrom(root, [
      "[slot='title']", "[data-testid='post-title']", "h1", "h2", "h3", "a.title"
    ]);
    if (!title || title.length < 3) return null;
    const subreddit = root.getAttribute?.("subreddit-prefixed-name") || root.getAttribute?.("data-subreddit-prefixed") || root.getAttribute?.("data-subreddit") || textFrom(root, ["[data-testid='subreddit-name']", "a[data-click-id='subreddit']", ".subreddit"]);
    const flair = root.getAttribute?.("post-flair-text") || textFrom(root, ["[data-testid='post-flair']", "[class*='flair']", ".linkflairlabel"]);
    const preview = textFrom(root, ["[slot='text-body']", "[data-testid='post-content']", "[data-click-id='text']", ".usertext-body", "[property='schema:articleBody']"]);
    const link = root.getAttribute?.("content-href") || root.getAttribute?.("data-url") || root.querySelector?.("a[href]")?.href || location.href;
    let domain = root.getAttribute?.("data-domain") || "";
    try { if (!domain && link) domain = new URL(link, location.href).hostname; } catch {}
    return { title, subreddit, flair, preview: preview.slice(0, 700), domain, url: location.href };
  }

  function extractCurrentPost() {
    const candidates = [...document.querySelectorAll("shreddit-post[post-title], article")];
    for (const root of candidates) {
      const post = extractPost(root);
      if (post && (root.querySelector("h1") || root.matches("shreddit-post[post-title]"))) return post;
    }
    const heading = document.querySelector("h1");
    if (!heading) return null;
    const root = heading.closest(POST_SELECTOR) || document.querySelector("main") || document.body;
    return extractPost(root) || {
      title: heading.textContent.trim(),
      subreddit: location.pathname.match(/\/r\/([^/]+)/)?.[1] || "",
      flair: "",
      preview: textFrom(root, ["[slot='text-body']", "[data-testid='post-content']"]).slice(0, 700),
      domain: location.hostname,
      url: location.href
    };
  }

  function combinedCorpus() {
    const baseline = settings.seedCorpusEnabled ? seedCorpus : [];
    return [...baseline, ...trainingCorpus].map(item => ({
      id: item.id,
      label: item.label,
      text: item.text || classifier.normalizedText(item)
    })).filter(item => item.text);
  }

  function corpusSignature(corpus) {
    return corpus.map(item => `${item.id}:${item.label}:${item.text.length}`).join("|");
  }

  function subredditAllowed(value) {
    const normalized = String(value || "").replace(/^r\//i, "").toLowerCase();
    return settings.allowSubreddits.some(item => item.replace(/^r\//i, "").toLowerCase() === normalized);
  }

  function saveStats() {
    extensionApi.storage.local.set({ stats });
  }

  function reveal(root, placeholder) {
    root.classList.remove("rsf-hidden", "rsf-dimmed", "rsf-peeking");
    delete root.dataset.rsfPeeking;
    root.removeAttribute("aria-hidden");
    placeholder?.remove();
  }

  function setPeek(root, bar, button, open) {
    root.classList.remove("rsf-hidden", "rsf-dimmed");
    root.removeAttribute("aria-hidden");
    bar.classList.toggle("rsf-placeholder-open", open);
    button.setAttribute("aria-expanded", String(open));
    if (open) {
      root.dataset.rsfPeeking = "1";
      root.classList.add("rsf-peeking");
      button.textContent = "Close";
      root.scrollIntoView?.({ block: "nearest" });
      return;
    }
    delete root.dataset.rsfPeeking;
    root.classList.remove("rsf-peeking");
    button.textContent = "Peek";
    if (settings.mode === "dim") root.classList.add("rsf-dimmed");
    else {
      root.classList.add("rsf-hidden");
      root.setAttribute("aria-hidden", "true");
    }
  }

  function buildPlaceholder(root, post, result, key) {
    const bar = document.createElement("div");
    bar.className = "rsf-placeholder";
    const score = Math.round(result.overall * 100);
    const why = result.explanation.join(" · ") || "similar to your training corpus";
    bar.innerHTML = `<span class="rsf-mark" aria-hidden="true">×</span><span><strong>Filtered${settings.showScore ? ` · ${score}%` : ""}</strong><small>${why}</small></span>`;

    const controls = document.createElement("span");
    controls.className = "rsf-controls";
    const show = document.createElement("button");
    show.type = "button";
    show.className = "rsf-peek";
    show.textContent = "Peek";
    show.setAttribute("aria-expanded", "false");
    show.addEventListener("click", () => setPeek(root, bar, show, root.dataset.rsfPeeking !== "1"));
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

  function hidePost(root, post, result, key) {
    if (root.dataset.rsfFiltered === "1") return;
    root.dataset.rsfFiltered = "1";
    stats.collapsed += 1;
    const placeholder = buildPlaceholder(root, post, result, key);
    root.before(placeholder);
    if (settings.mode === "dim") root.classList.add("rsf-dimmed");
    else {
      root.classList.add("rsf-hidden");
      root.setAttribute("aria-hidden", "true");
    }
    saveStats();
  }

  function personalLabelFor(post) {
    const key = classifier.stableKey(post);
    return trainingCorpus.find(item => classifier.stableKey(item) === key)?.label || "";
  }

  async function addPersonalExample(post, label) {
    const entry = classifier.corpusEntry(post, label);
    trainingCorpus = trainingCorpus.filter(item => item.id !== entry.id);
    trainingCorpus.push(entry);
    if (trainingCorpus.length > 500) trainingCorpus = trainingCorpus.slice(-500);
    stats.trained = trainingCorpus.length;
    await extensionApi.storage.local.set({ trainingCorpus, stats });
    return entry;
  }

  function actionLabel(node) {
    return [node.getAttribute?.("aria-label"), node.getAttribute?.("title"), node.textContent]
      .filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }

  function ensureReportButton(root, post) {
    if (/\/comments\/[^/]+/i.test(location.pathname)) return;
    const existing = root.querySelector?.("[data-rsf-report-button='1']");
    if (existing) {
      existing.disabled = false;
      existing.textContent = personalLabelFor(post) === "slop" ? "Added" : "Slop";
      return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rsf-report-button";
    button.dataset.rsfReportButton = "1";
    button.textContent = personalLabelFor(post) === "slop" ? "Added" : "Slop";
    button.title = "Add this post to your local slop corpus";
    button.setAttribute("aria-label", "Add this post to your local slop corpus");
    button.addEventListener("click", async event => {
      event.preventDefault();
      event.stopPropagation();
      button.disabled = true;
      button.textContent = "Adding…";
      try {
        await addPersonalExample(post, "slop");
        button.textContent = "Added";
        button.title = "Saved in your local slop corpus";
      } catch {
        button.disabled = false;
        button.textContent = "Retry";
      }
    });
    if (root.localName === "shreddit-post") {
      button.setAttribute("slot", "action-row");
      root.append(button);
      return;
    }
    const candidates = [...root.querySelectorAll("button, a, faceplate-tracker")];
    const share = candidates.find(node => /(^|\s)share(\s|$)/i.test(actionLabel(node)));
    const anchor = share?.closest?.("button, a") || share;
    if (anchor) anchor.after(button);
  }

  function applySemanticResults(batch, message) {
    if (!message || message.type === "error") {
      extensionApi.storage.local.set({ mlStatus: { status: "error", error: message?.error || "background inference unavailable" } });
      return;
    }
    message.results.forEach((semantic, index) => {
      const item = batch[index];
      if (!item?.root?.isConnected || item.root.dataset.rsfFiltered === "1") return;
      const overall = Math.max(item.lexical.overall, semantic.score);
      item.root.dataset.rsfSemanticScore = String(semantic.score);
      if (overall >= settings.threshold) {
        hidePost(item.root, item.post, {
          overall,
          explanation: semantic.score > item.lexical.overall ? ["similar to a slop example you labelled"] : item.lexical.explanation
        }, item.key);
      }
    });
  }

  async function flushSemanticQueue() {
    semanticQueued = false;
    if (!semanticQueue.length || !settings.modelEnabled) return;
    const batch = semanticQueue.splice(0, 24);
    const corpus = combinedCorpus();
    const requestId = `semantic-${Date.now()}-${requestSequence += 1}`;
    try {
      const message = await extensionApi.runtime.sendMessage({
        type: "ML_SCORE",
        requestId,
        texts: batch.map(item => classifier.normalizedText(item.post)),
        corpus,
        corpusSignature: corpusSignature(corpus)
      });
      applySemanticResults(batch, message);
    } catch (error) {
      extensionApi.storage.local.set({ mlStatus: { status: "error", error: error?.message || String(error) } });
    } finally {
      if (semanticQueue.length) queueSemanticFlush();
    }
  }

  function queueSemanticFlush() {
    if (semanticQueued) return;
    semanticQueued = true;
    window.setTimeout(flushSemanticQueue, 120);
  }

  function queueSemantic(root, post, lexical, key) {
    semanticQueue.push({ root, post, lexical, key });
    queueSemanticFlush();
  }

  function processPost(root) {
    if (root.parentElement?.closest(POST_SELECTOR)) return;
    if (root.dataset.rsfScanned === "1") {
      const knownPost = extractPost(root);
      if (knownPost) ensureReportButton(root, knownPost);
      return;
    }
    root.dataset.rsfScanned = "1";
    const post = extractPost(root);
    if (!post) {
      delete root.dataset.rsfScanned;
      return;
    }
    ensureReportButton(root, post);
    stats.scanned += 1;
    if (!settings.enabled || subredditAllowed(post.subreddit)) return;
    const key = classifier.stableKey(post);
    if (allowedPosts[key] || personalLabelFor(post) === "keep") return;
    if (personalLabelFor(post) === "slop") {
      hidePost(root, post, { overall: 1, explanation: ["you added this post to the corpus"] }, key);
      return;
    }
    const lexical = classifier.score(post, settings);
    root.dataset.rsfScore = String(lexical.overall);
    if (lexical.hide) hidePost(root, post, lexical, key);
    else if (settings.modelEnabled) queueSemantic(root, post, lexical, key);
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

  function resetAndScan() {
    semanticQueue.length = 0;
    document.querySelectorAll("[data-rsf-scanned='1']").forEach(node => {
      node.dataset.rsfScanned = "0";
      node.dataset.rsfFiltered = "0";
      node.classList.remove("rsf-hidden", "rsf-dimmed", "rsf-peeking");
      delete node.dataset.rsfPeeking;
      node.removeAttribute("aria-hidden");
    });
    document.querySelectorAll(".rsf-placeholder").forEach(node => node.remove());
    queueScan();
  }

  extensionApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "GET_CURRENT_POST") return false;
    const post = extractCurrentPost();
    sendResponse({ post, lexical: post ? classifier.score(post, settings) : null });
    return true;
  });

  extensionApi.storage.local.get(STORAGE_KEYS).then(stored => {
    settings = classifier.mergeSettings(stored.settings);
    allowedPosts = stored.allowedPosts || {};
    trainingCorpus = stored.trainingCorpus || [];
    stats = { ...stats, ...(stored.stats || {}) };
    extensionApi.storage.local.set({ settings });
    queueScan();
    new MutationObserver(queueScan).observe(document.documentElement, { childList: true, subtree: true });
  });

  extensionApi.storage.onChanged.addListener(changes => {
    if (!changes.settings && !changes.allowedPosts && !changes.trainingCorpus) return;
    if (changes.settings) settings = classifier.mergeSettings(changes.settings.newValue);
    if (changes.allowedPosts) allowedPosts = changes.allowedPosts.newValue || {};
    if (changes.trainingCorpus) trainingCorpus = changes.trainingCorpus.newValue || [];
    resetAndScan();
  });
})();
