# Privacy

Reddit Slop Filter operates entirely inside your browser.

It reads visible Reddit feed content—titles, visible previews, subreddit names, flair, and linked domains—to score posts. It does not fetch full posts, use the Reddit API, send analytics, include advertising, or transmit browsing data.

Settings, aggregate counts, and explicit **Not slop** corrections are stored with the browser's local WebExtension storage. Removing the extension removes this extension-managed local data according to the browser's extension-data behavior.

The extension requests only:

- access to pages on `*.reddit.com`, to inspect and alter the visible feed;
- local extension storage, to retain preferences, counts, and corrections.

If a future release introduces any networked model, telemetry, synchronization, or external service, that change must be documented here before release.
