# Changelog

## 0.3.1 — 2026-07-18

- Mounted the inline **Slop** control in Reddit's feed-card action slot so it appears consistently beside Share.
- Removed the inline control from individual post pages; the toolbar popup remains available there.
- Matched Reddit's 32px small action-pill height and typography.

## 0.3.0 — 2026-07-18

- Added an inline **Slop** action beside Reddit's Share control.
- Added reversible **Peek / Close** disclosure to filtered-post banners.
- Added a searchable developer corpus inspector, per-entry removal, model state, and JSON export.
- Added shipped-baseline and blank-corpus starting modes.
- Added a repository command for promoting a reviewed browser export into the baseline corpus.

## 0.2.1 — 2026-07-18

- Moved neural inference into the Manifest V3 background service worker for Safari compatibility.
- Preserved the bundled local model, corpus controls, and lexical fallback from v0.2.0.

## 0.2.0 — 2026-07-18

- Added a fully local, quantized MiniLM sentence-embedding model with pinned weights.
- Added **Add to training corpus** and **Worthwhile** controls for the current Reddit post.
- Added semantic nearest-example scoring from seeded and personal positive/negative examples.
- Fixed the sensitivity slider: higher sensitivity now filters more, and v0.1 values migrate as intended.
- Seeded the reported planning-poker/Product Hunt false negative and expanded generic utility signals.
- Added visible model loading/readiness state and personal corpus management.

## 0.1.0 — 2026-07-18

- First Safari-first open-source release.
- Local weighted classifier for cloneware, thin AI wrappers, launch theatre, adoption complaints, and validation farming.
- Infinite-feed observation across current Reddit, older React Reddit, and old.reddit.com.
- Recoverable collapsed posts with local corrections.
- Popup statistics and options for threshold, category pressure, display mode, and subreddit allowlists.
- Chrome-family zip packaging and Safari project generation workflow.
