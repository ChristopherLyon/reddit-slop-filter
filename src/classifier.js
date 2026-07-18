(function initClassifier(root, factory) {
  const classifier = factory();
  root.SlopFilterClassifier = classifier;
  if (typeof module !== "undefined" && module.exports) module.exports = classifier;
})(typeof globalThis !== "undefined" ? globalThis : this, function classifierFactory() {
  "use strict";

  const CATEGORY_LABELS = {
    cloneware: "generic clone",
    thinWrapper: "thin AI wrapper",
    launchTemplate: "templated launch",
    adoptionWhining: "adoption whining",
    validationFarming: "validation farming",
    technicalDepth: "technical depth"
  };

  const FEATURE_RULES = [
    { category: "cloneware", weight: 0.36, pattern: /\b(todo|to-do|task manager|note[- ]taking|notes app|habit tracker|pomodoro|calculator|net worth|expense tracker|budget app|link in bio|planning poker|qr code|invoice generator|resume builder)\b/i, reason: "common cloneware category" },
    { category: "cloneware", weight: 0.18, pattern: /\b(ad[- ]free|no[- ]signup|no (account|accounts)|nothing to install|completely free|free tool)\b/i, reason: "generic free-utility pitch" },
    { category: "thinWrapper", weight: 0.34, pattern: /\b(ai[- ]powered|powered by (chatgpt|gpt|claude)|chatgpt wrapper|ai wrapper|with (gpt|claude)|using the openai api)\b/i, reason: "generic AI-wrapper language" },
    { category: "launchTemplate", weight: 0.2, pattern: /\b(i (built|made|created|launched)|just launched|introducing|meet my|my new app|side project)\b/i, reason: "templated launch framing" },
    { category: "launchTemplate", weight: 0.16, pattern: /\b(game[- ]changer|revolutioni[sz]e|supercharge|10x|change your life|all[- ]in[- ]one|ultimate)\b/i, reason: "inflated marketing claim" },
    { category: "adoptionWhining", weight: 0.42, pattern: /\b(no (users|traction|customers)|zero (users|traction|customers)|nobody (uses|is using|cares)|can't get (users|customers)|struggling to get users|why isn't anyone)\b/i, reason: "adoption complaint" },
    { category: "validationFarming", weight: 0.3, pattern: /\b(would you use|roast my|rate my|thoughts\?|feedback (wanted|needed|please)|is this a good idea|validate my idea)\b/i, reason: "validation request" },
    { category: "launchTemplate", weight: 0.12, pattern: /\b(mrr|arr|waitlist|lifetime deal|early access|product hunt)\b/i, reason: "launch metric or promotion" },
    { category: "technicalDepth", weight: -0.22, pattern: /\b(benchmark|latency|throughput|architecture|implementation|profil(e|ing)|memory safety|formal verification|paper|dataset|source code|technical deep dive)\b/i, reason: "technical detail signal" },
    { category: "technicalDepth", weight: -0.18, pattern: /\b(rust|ocaml|haskell|webassembly|compiler|database engine|cad kernel|distributed system|protocol|parser|algorithm)\b/i, reason: "substantive engineering topic" },
    { category: "technicalDepth", weight: -0.14, pattern: /\b(github\.com|gitlab\.com|codeberg\.org)\b/i, reason: "source repository linked" }
  ];

  const DEFAULT_SETTINGS = Object.freeze({
    settingsVersion: 2,
    enabled: true,
    sensitivity: 0.72,
    threshold: 0.482,
    mode: "collapse",
    showScore: true,
    modelEnabled: true,
    seedCorpusEnabled: true,
    categoryWeights: {
      cloneware: 1,
      thinWrapper: 1,
      launchTemplate: 0.8,
      adoptionWhining: 1,
      validationFarming: 0.8
    },
    allowSubreddits: []
  });

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizedText(post) {
    return [post.subreddit, post.flair, post.title, post.preview, post.domain]
      .filter(Boolean)
      .join(" \n ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1800);
  }

  function mergeSettings(settings = {}) {
    const sensitivity = settings.settingsVersion === 2
      ? Number(settings.sensitivity ?? DEFAULT_SETTINGS.sensitivity)
      : Number(settings.threshold ?? DEFAULT_SETTINGS.sensitivity);
    const safeSensitivity = clamp(Number.isFinite(sensitivity) ? sensitivity : DEFAULT_SETTINGS.sensitivity, 0.2, 1);
    return {
      ...DEFAULT_SETTINGS,
      ...settings,
      settingsVersion: 2,
      sensitivity: safeSensitivity,
      threshold: clamp(0.95 - safeSensitivity * 0.65, 0.3, 0.82),
      categoryWeights: {
        ...DEFAULT_SETTINGS.categoryWeights,
        ...(settings.categoryWeights || {})
      },
      allowSubreddits: Array.isArray(settings.allowSubreddits) ? settings.allowSubreddits : []
    };
  }

  function score(post, userSettings) {
    const settings = mergeSettings(userSettings);
    const text = normalizedText(post);
    const categories = {
      cloneware: 0,
      thinWrapper: 0,
      launchTemplate: 0,
      adoptionWhining: 0,
      validationFarming: 0,
      technicalDepth: 0
    };
    const reasons = [];

    for (const rule of FEATURE_RULES) {
      if (!rule.pattern.test(text)) continue;
      if (rule.weight < 0) {
        categories.technicalDepth = clamp(categories.technicalDepth + Math.abs(rule.weight));
      } else {
        categories[rule.category] = clamp(categories[rule.category] + rule.weight);
      }
      reasons.push({ category: rule.category, label: rule.reason, weight: rule.weight });
    }

    const launchCombination = categories.launchTemplate > 0 && (categories.cloneware > 0 || categories.thinWrapper > 0);
    const base = Object.entries(settings.categoryWeights).reduce(
      (sum, [category, weight]) => sum + (categories[category] || 0) * Number(weight || 0),
      0
    );
    const positiveCategories = Object.entries(categories).filter(([category, value]) => category !== "technicalDepth" && value > 0).length;
    const combinationBonus = launchCombination ? 0.2 : positiveCategories >= 3 ? 0.12 : 0;
    const raw = base + combinationBonus - categories.technicalDepth;
    const overall = clamp(raw);

    reasons.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
    return {
      overall: Number(overall.toFixed(3)),
      hide: overall >= settings.threshold,
      categories,
      reasons: reasons.slice(0, 3),
      explanation: reasons.filter(reason => reason.weight > 0).slice(0, 2).map(reason => reason.label),
      textLength: text.length
    };
  }

  function stableKey(post) {
    const input = `${post.subreddit || ""}\n${post.title || ""}`.toLowerCase();
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `post-${(hash >>> 0).toString(36)}`;
  }

  function corpusEntry(post, label, addedAt = new Date().toISOString()) {
    if (label !== "slop" && label !== "keep") throw new TypeError("Corpus label must be slop or keep");
    return {
      ...post,
      id: stableKey(post),
      label,
      text: normalizedText(post),
      addedAt
    };
  }

  return { CATEGORY_LABELS, DEFAULT_SETTINGS, FEATURE_RULES, corpusEntry, mergeSettings, normalizedText, score, stableKey };
});
