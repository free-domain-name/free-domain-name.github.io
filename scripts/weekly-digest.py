#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2026 Free Domain Name contributors
"""Build the weekly leaderboard digest from the public registry review index.

The digest is assembled mechanically from the public ``reviews/index.json``:
names, vote counts, percentages and links only. No prose is written for a
name, no review is composed, and nothing here is AI-generated content.

Usage:
    python3 scripts/weekly-digest.py --index index.json --week 2026-W48
    python3 scripts/weekly-digest.py --out digest.md --title-out title.txt

Standard library only, so the workflow needs no extra dependencies.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

INDEX_URL = (
    "https://raw.githubusercontent.com/free-domain-name/registry/main/reviews/index.json"
)
REGISTRY_REPO = "free-domain-name/registry"
REGISTRY_URL = f"https://github.com/{REGISTRY_REPO}"
DISCUSSIONS_URL = f"{REGISTRY_URL}/discussions"
DISCLAIMER_URL = f"{REGISTRY_URL}/blob/main/DISCLAIMER.md"
TITLE_TEMPLATE = "Weekly digest — {week} (rolling 7 days)"
MARKER_TEMPLATE = "<!-- fdn-weekly-digest:{week} -->"


# --------------------------------------------------------------------- data


def load_index(source: str) -> dict:
    """Read the review index from a local file or an https URL."""
    if source.startswith("http://") or source.startswith("https://"):
        request = urllib.request.Request(
            source, headers={"Accept": "application/json"}
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    return json.loads(Path(source).read_text(encoding="utf-8"))


def number(value) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def recent(entry: dict) -> dict:
    """Metrics for the rolling seven-day window, mirroring the site logic."""
    has_recent = isinstance(entry.get("recent_votes"), (int, float))
    up = number(entry.get("recent_up") if has_recent else entry.get("up"))
    down = number(entry.get("recent_down") if has_recent else entry.get("down"))
    votes = number(entry.get("recent_votes")) if has_recent else up + down
    comments = (
        number(entry.get("recent_comments"))
        if has_recent
        else number(entry.get("comments"))
    )
    score = entry.get("recent_score") if has_recent else entry.get("score")
    if score is None and votes > 0:
        score = round(up / votes * 100)
    return {"up": up, "down": down, "votes": votes, "comments": comments, "score": score}


def total(entry: dict) -> dict:
    """All-time metrics for a name."""
    up = number(entry.get("up"))
    down = number(entry.get("down"))
    votes = up + down
    score = entry.get("score")
    if score is None and votes > 0:
        score = round(up / votes * 100)
    return {
        "up": up,
        "down": down,
        "votes": votes,
        "comments": number(entry.get("comments")),
        "score": score,
    }


def discussion_url(entry: dict) -> str:
    """Public discussion thread for a name, if the index knows one."""
    url = entry.get("url")
    if isinstance(url, str) and url.startswith("https://github.com/") and "/discussions/" in url:
        return url
    number_ = entry.get("discussion")
    if isinstance(number_, int) or (isinstance(number_, str) and number_.isdigit()):
        return f"{DISCUSSIONS_URL}/{number_}"
    return DISCUSSIONS_URL


def ranked(domains: list, limit: int) -> list:
    """Top names of the rolling window, same order as the site leaderboard."""
    items = []
    for entry in domains:
        metrics = recent(entry)
        if metrics["votes"] <= 0:
            continue
        items.append((entry, metrics))
    items.sort(
        key=lambda item: (
            -item[1]["votes"],
            -item[1]["up"],
            str(item[0].get("domain", "")),
        )
    )
    return items[:limit]


def waiting(domains: list, limit: int) -> list:
    """Names that still have no vote at all."""
    items = [(entry, total(entry)) for entry in domains]
    items = [item for item in items if item[1]["votes"] == 0]
    if not items:
        items = [(entry, total(entry)) for entry in domains]
    items.sort(
        key=lambda item: (
            item[1]["votes"],
            item[1]["comments"],
            str(item[0].get("domain", "")),
        )
    )
    return items[:limit]


# ------------------------------------------------------------------ render


def cell(value) -> str:
    """Escape a value so it cannot break out of a markdown table cell."""
    return str(value).replace("|", "\\|").replace("\n", " ").strip()


def score_cell(score) -> str:
    return "—" if score is None else f"{score}%"


def render(index: dict, week: str, top: int, waiting_count: int) -> str:
    domains = index.get("domains") or []
    generated_at = index.get("generated_at")
    lines: list[str] = []

    lines.append(MARKER_TEMPLATE.format(week=week))
    lines.append("")
    lines.append(f"## {TITLE_TEMPLATE.format(week=week)}")
    lines.append("")
    lines.append(
        f"Rolling seven-day view of the [Free Domain Name registry]({REGISTRY_URL}), "
        "read from its public review index."
    )
    lines.append("")

    lines.append("**Top of the board (rolling 7 days)**")
    lines.append("")
    entries = ranked(domains, top)
    if entries:
        lines.append("| # | Name | Votes | 👍 | 👎 | Score | Thread |")
        lines.append("| -- | ---- | ----- | -- | -- | ----- | ------ |")
        for index_number, (entry, metrics) in enumerate(entries, start=1):
            name = cell(entry.get("domain", ""))
            thread = discussion_url(entry)
            lines.append(
                "| {rank} | `{name}` | {votes} | {up} | {down} | {score} | [discussion]({thread}) |".format(
                    rank=f"{index_number:02d}",
                    name=name,
                    votes=metrics["votes"],
                    up=metrics["up"],
                    down=metrics["down"],
                    score=score_cell(metrics["score"]),
                    thread=thread,
                )
            )
    else:
        lines.append("No votes landed in this window yet.")
    lines.append("")

    lines.append("**Still waiting for a first review**")
    lines.append("")
    waiting_entries = waiting(domains, waiting_count)
    unreviewed = [item for item in waiting_entries if item[1]["votes"] == 0]
    if unreviewed:
        for entry, _ in unreviewed:
            name = cell(entry.get("domain", ""))
            lines.append(f"- `{name}` — no votes yet")
    elif waiting_entries:
        lines.append(
            "Every name in the index has been voted on at least once. Least reviewed so far:"
        )
        lines.append("")
        for entry, metrics in waiting_entries:
            name = cell(entry.get("domain", ""))
            votes = metrics["votes"]
            note = "1 vote" if votes == 1 else f"{votes} votes"
            lines.append(f"- `{name}` — {note}")
    else:
        lines.append("The index is empty for now.")
    lines.append("")

    lines.append("**How to read this**")
    lines.append("")
    lines.append(
        "- Votes are GitHub reactions on public discussions, counted only while they were "
        "created in the last seven days. This is a rolling view, not a permanent ranking."
    )
    lines.append(
        "- Scores are opinions, not security audits. A 100% score from two people does not "
        "make a site safe."
    )
    lines.append(
        "- The project does not run the names it maps. Names and destinations are third-party "
        f"submissions — read the [disclaimer]({DISCLAIMER_URL})."
    )
    lines.append(
        "- This digest is assembled mechanically from the public index: names, counts, "
        "percentages and links only. No prose was written for it, and no review or comment "
        "here was AI-generated."
    )
    if generated_at:
        lines.append(f"- The index this digest was built from was generated at `{generated_at}`.")
    lines.append("")

    lines.append(
        f"Reviews are written by people. [Open the discussions]({DISCUSSIONS_URL}) to add one."
    )

    return "\n".join(lines) + "\n"


# -------------------------------------------------------------------- main


def current_week() -> str:
    now = dt.datetime.now(dt.timezone.utc)
    iso = now.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def parse_args(argv: list) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--index",
        default=INDEX_URL,
        help="Review index: local file path or https URL (default: the public index).",
    )
    parser.add_argument(
        "--week",
        default=None,
        help="ISO week label for the digest, e.g. 2026-W48 (default: the current week).",
    )
    parser.add_argument("--top", type=int, default=5, help="How many names to list.")
    parser.add_argument(
        "--waiting", type=int, default=3, help="How many unreviewed names to list."
    )
    parser.add_argument("--out", default=None, help="Write the digest here instead of stdout.")
    parser.add_argument(
        "--title-out", default=None, help="Write the digest title here."
    )
    return parser.parse_args(argv)


def main(argv: list) -> int:
    args = parse_args(argv)
    week = args.week or current_week()

    try:
        index = load_index(args.index)
    except (OSError, ValueError, urllib.error.URLError) as error:
        print(f"Could not read the review index: {error}", file=sys.stderr)
        return 1

    digest = render(index, week, max(args.top, 0), max(args.waiting, 0))
    title = TITLE_TEMPLATE.format(week=week)

    if args.out:
        Path(args.out).write_text(digest, encoding="utf-8")
    else:
        sys.stdout.write(digest)
    if args.title_out:
        Path(args.title_out).write_text(title + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
