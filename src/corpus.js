(function initCorpus(root) {
  "use strict";

  const corpus = Object.freeze([
    { id: "seed-planning-poker", label: "slop", text: "Launched my ad-free no-signup planning poker tool on Product Hunt. A free agile estimation utility built on Next.js. Feedback welcome." },
    { id: "seed-ai-todo", label: "slop", text: "I built an AI-powered todo list and productivity task manager. Just launched my side project and would love feedback." },
    { id: "seed-budget", label: "slop", text: "I built a completely free budgeting and expense tracker app with no ads or subscription. Please try my app." },
    { id: "seed-calculator", label: "slop", text: "Introducing my net worth calculator and personal finance projection tool. No signup required." },
    { id: "seed-notes", label: "slop", text: "Meet my all-in-one note taking and habit tracking productivity app, now live on Product Hunt." },
    { id: "seed-wrapper", label: "slop", text: "I made an AI wrapper powered by ChatGPT that summarizes your documents and changes your life." },
    { id: "seed-adoption", label: "slop", text: "I spent months building my SaaS but nobody is using it. How do I get my first users?" },
    { id: "seed-validation", label: "slop", text: "Roast my landing page and validate my app idea. Would you use this? Feedback wanted." },
    { id: "seed-rust-db", label: "keep", text: "Technical deep dive with reproducible benchmark results for a Rust database engine, including latency and memory profiles." },
    { id: "seed-cad", label: "keep", text: "Open-source CAD kernel binding with deterministic geometry validation, topology checks, and STEP round-trip results." },
    { id: "seed-paper", label: "keep", text: "Research paper and public dataset evaluating compiler optimization algorithms with methodology and limitations." },
    { id: "seed-protocol", label: "keep", text: "Implementation notes for a distributed systems protocol with source code, failure analysis, and throughput benchmarks." }
  ]);
  root.SlopFilterCorpus = corpus;
  if (typeof module !== "undefined" && module.exports) module.exports = corpus;
})(typeof globalThis !== "undefined" ? globalThis : this);
