/* SPDX-License-Identifier: GPL-3.0-only */
/* Copyright (C) 2026 Free Domain Name contributors */

const INDEX_URL =
  "https://raw.githubusercontent.com/free-domain-name/registry/main/reviews/index.json";
const STUMBLE_URL =
  "https://free-domain-name.github.io/tauri-browser/stumble.html";
const THEME_KEY = "fdn.theme";

const els = {
  leaderboard: document.querySelector("#leaderboard"),
  discussed: document.querySelector("#discussed"),
  unreviewed: document.querySelector("#unreviewed"),
  dataStamp: document.querySelector("#dataStamp"),
  statNames: document.querySelector("#statNames"),
  statVotes: document.querySelector("#statVotes"),
  statComments: document.querySelector("#statComments"),
  themeToggle: document.querySelector("#themeToggle"),
};

function formatNumber(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    Number(value) || 0,
  );
}

function stumbleUrl(domain) {
  return `${STUMBLE_URL}?domain=${encodeURIComponent(domain)}`;
}

function recent(entry) {
  const hasRecent = Number.isFinite(entry.recent_votes);
  const up = hasRecent ? Number(entry.recent_up) || 0 : Number(entry.up) || 0;
  const down = hasRecent ? Number(entry.recent_down) || 0 : Number(entry.down) || 0;
  const votes = hasRecent ? Number(entry.recent_votes) || 0 : up + down;
  const comments = hasRecent
    ? Number(entry.recent_comments) || 0
    : Number(entry.comments) || 0;
  const score =
    votes === 0
      ? null
      : Number.isFinite(entry.recent_score)
        ? Number(entry.recent_score)
        : Math.round((up / votes) * 100);
  return { up, down, votes, comments, score, hasRecent };
}

function total(entry) {
  const up = Number(entry.up) || 0;
  const down = Number(entry.down) || 0;
  return {
    up,
    down,
    votes: up + down,
    comments: Number(entry.comments) || 0,
    score:
      up + down === 0
        ? null
        : Number.isFinite(entry.score)
          ? Number(entry.score)
          : Math.round((up / (up + down)) * 100),
  };
}

function rankedDomains(domains) {
  return domains
    .map((entry) => ({ entry, recent: recent(entry) }))
    .filter(({ recent: metrics }) => metrics.votes > 0)
    .sort(
      (a, b) =>
        b.recent.votes - a.recent.votes ||
        b.recent.up - a.recent.up ||
        a.entry.domain.localeCompare(b.entry.domain),
    );
}

function makeRow(item, index) {
  const { entry, recent: metrics } = item;
  const row = document.createElement("a");
  row.className = "rank-row";
  row.href = stumbleUrl(entry.domain);
  row.setAttribute(
    "aria-label",
    `${entry.domain}: ${metrics.votes} votes this week, ${metrics.score ?? "no"}% upvotes. Open its review thread.`,
  );

  const rank = document.createElement("span");
  rank.className = "rank";
  rank.textContent = String(index + 1).padStart(2, "0");

  const domain = document.createElement("span");
  domain.className = "domain";
  const name = document.createElement("strong");
  name.textContent = entry.domain;
  const owner = document.createElement("small");
  const ownerName = entry.owner_github ? `@${entry.owner_github}` : "registry name";
  const discussion = entry.discussion ? ` · discussion #${entry.discussion}` : "";
  owner.textContent = `${ownerName}${discussion}`;
  domain.append(name, owner);

  const bar = document.createElement("span");
  bar.className = "score-bar";
  bar.setAttribute("aria-hidden", "true");
  const fill = document.createElement("span");
  fill.style.setProperty("--score", `${metrics.score ?? 0}%`);
  bar.append(fill);

  const votes = document.createElement("span");
  votes.className = "votes";
  const voteCount = document.createElement("strong");
  voteCount.textContent = formatNumber(metrics.votes);
  const voteLabel = document.createElement("small");
  voteLabel.textContent = "votes";
  votes.append(voteCount, voteLabel);

  const score = document.createElement("span");
  score.className = "score";
  score.textContent = metrics.score === null ? "—" : `${metrics.score}%`;

  const arrow = document.createElement("span");
  arrow.className = "arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "↗";

  row.append(rank, domain, bar, votes, score, arrow);
  return row;
}

function emptyBoard() {
  const box = document.createElement("div");
  box.className = "empty-board";
  const copy = document.createElement("div");
  const heading = document.createElement("h3");
  heading.textContent = "No votes in this window. Yet.";
  const text = document.createElement("p");
  text.textContent =
    "The board only counts real GitHub reactions from the last seven days. Pick a name and leave the first honest signal.";
  copy.append(heading, text);

  const link = document.createElement("a");
  link.className = "button primary";
  link.href = STUMBLE_URL;
  link.textContent = "Stumble a name";
  box.append(copy, link);
  return box;
}

function renderLeaderboard(domains) {
  const ranked = rankedDomains(domains).slice(0, 5);
  els.leaderboard.replaceChildren();
  els.leaderboard.setAttribute("aria-busy", "false");

  if (ranked.length === 0) {
    els.leaderboard.append(emptyBoard());
    return;
  }

  for (const [index, item] of ranked.entries()) {
    els.leaderboard.append(makeRow(item, index));
  }
}

function renderDiscussed(domains) {
  const candidates = domains
    .map((entry) => ({ entry, allTime: total(entry), week: recent(entry) }))
    .filter(({ allTime }) => allTime.comments > 0)
    .sort(
      (a, b) =>
        b.week.comments - a.week.comments ||
        b.allTime.comments - a.allTime.comments ||
        a.entry.domain.localeCompare(b.entry.domain),
    )
    .slice(0, 3);

  els.discussed.replaceChildren();
  if (candidates.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-line";
    empty.textContent = "No comments yet. The first review is still open.";
    els.discussed.append(empty);
    return;
  }

  for (const [index, { entry, allTime, week }] of candidates.entries()) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = stumbleUrl(entry.domain);
    const position = document.createElement("span");
    position.className = "index";
    position.textContent = String(index + 1).padStart(2, "0");
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = entry.domain;
    link.append(position, name);

    const count = document.createElement("span");
    count.className = "count";
    count.textContent =
      week.comments > 0
        ? `${formatNumber(week.comments)} this week`
        : `${formatNumber(allTime.comments)} total`;
    item.append(link, count);
    els.discussed.append(item);
  }
}

function renderUnreviewed(domains) {
  const withoutVotes = domains.filter((entry) => total(entry).votes === 0);
  const candidates = (withoutVotes.length > 0 ? withoutVotes : domains)
    .map((entry) => ({ entry, metrics: total(entry) }))
    .sort(
      (a, b) =>
        a.metrics.votes - b.metrics.votes ||
        a.metrics.comments - b.metrics.comments ||
        a.entry.domain.localeCompare(b.entry.domain),
    )
    .slice(0, 3);

  els.unreviewed.replaceChildren();
  if (candidates.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-line";
    empty.textContent = "No names are waiting right now.";
    els.unreviewed.append(empty);
    return;
  }

  for (const { entry, metrics } of candidates) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = stumbleUrl(entry.domain);
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = entry.domain;
    link.append(name);

    const count = document.createElement("span");
    count.className = "count";
    count.textContent =
      metrics.votes === 0 ? "no votes yet" : `${formatNumber(metrics.votes)} votes`;
    item.append(link, count);
    els.unreviewed.append(item);
  }
}

function renderStats(domains) {
  const votes = domains.reduce((sum, entry) => sum + recent(entry).votes, 0);
  const comments = domains.reduce((sum, entry) => sum + recent(entry).comments, 0);
  els.statNames.textContent = formatNumber(domains.length);
  els.statVotes.textContent = formatNumber(votes);
  els.statComments.textContent = formatNumber(comments);
}

function renderTimestamp(generatedAt) {
  const date = generatedAt ? new Date(generatedAt) : null;
  if (!date || Number.isNaN(date.getTime())) {
    els.dataStamp.textContent = "Updated from the public registry.";
    return;
  }
  els.dataStamp.textContent = `Index updated ${new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)}`;
}

function showError() {
  els.leaderboard.replaceChildren();
  els.leaderboard.setAttribute("aria-busy", "false");
  const box = document.createElement("div");
  box.className = "empty-board";
  const copy = document.createElement("div");
  const heading = document.createElement("h3");
  heading.textContent = "The public index is taking a moment.";
  const text = document.createElement("p");
  text.textContent =
    "The board reads the registry directly. You can still open Stumble and take part.";
  copy.append(heading, text);
  const link = document.createElement("a");
  link.className = "button ghost";
  link.href = STUMBLE_URL;
  link.textContent = "Open Stumble";
  box.append(copy, link);
  els.leaderboard.append(box);

  els.dataStamp.textContent = "Index unavailable right now.";
  for (const node of [els.statNames, els.statVotes, els.statComments]) {
    node.textContent = "—";
  }

  const empty = document.createElement("li");
  empty.className = "empty-line";
  empty.textContent = "The conversation list is unavailable right now.";
  els.discussed.replaceChildren(empty.cloneNode(true));
  els.unreviewed.replaceChildren(empty);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const next = theme === "dark" ? "light" : "dark";
  els.themeToggle.setAttribute("aria-label", `Switch to ${next} theme`);
  els.themeToggle.title = `Switch to ${next} theme`;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === "dark" ? "#080b12" : "#f4f6fa";
}

function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch {
    // Storage can be disabled; the default theme still works.
  }
  const preferred =
    saved === "light" || saved === "dark"
      ? saved
      : window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
  applyTheme(preferred);
  els.themeToggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Ignore storage failures.
    }
  });
}

async function load() {
  initTheme();

  try {
    const response = await fetch(INDEX_URL, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) {
      throw new Error(`review index returned HTTP ${response.status}`);
    }
    const data = await response.json();
    const domains = Array.isArray(data?.domains) ? data.domains : [];
    if (domains.length === 0) throw new Error("review index has no domains");

    renderStats(domains);
    renderLeaderboard(domains);
    renderDiscussed(domains);
    renderUnreviewed(domains);
    renderTimestamp(data.generated_at);
  } catch (error) {
    console.warn("Could not load the review index:", error);
    showError();
  }
}

load();
