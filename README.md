# Free Domain Name — project home

The root site for the Free Domain Name experiment:
<https://free-domain-name.github.io/>.

It is a static page with no build step and no analytics. It reads the public
[`reviews/index.json`](https://raw.githubusercontent.com/free-domain-name/registry/main/reviews/index.json)
from the registry to show a rolling seven-day leaderboard, recent conversation,
and names that still need a first review — with an onboarding flow that turns
that last list into an actual first review.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page markup and metadata |
| `styles.css` | Responsive layout and theme tokens |
| `app.js` | Index fetch, leaderboard rendering, and theme toggle |
| `assets/favicon.svg` | Favicon |
| `assets/og.png` | Social preview image |
| `scripts/weekly-digest.py` | Builds the weekly digest from the public review index |
| `.github/workflows/weekly-digest.yml` | Weekly job that builds the digest and posts it |

## What the page does

- **One line at the top.** A single sentence says what Free Domain Name is and
  links to the browser, for visitors who arrive without context.
- **Top this week.** The rolling seven-day leaderboard, ranked by public GitHub
  reactions, with a note that the scores are opinions.
- **Most discussed.** The threads with the most conversation this week.
- **Needs a first look.** The names that nobody has voted on yet.
- **Reviewing a name takes two minutes.** The onboarding section that explains
  how to make that first review, and links to the registry discussions and the
  browser.

## The onboarding flow

The list of names waiting for a first review used to be a passive list. It is
now the entry point to a first review:

- Each name in **Needs a first look** links to its public discussion in the
  registry (`app.js` prefers the discussion URL from the index and falls back
  to the Stumble page).
- The panel note points at the **Reviewing a name takes two minutes** section.
- That section spells out the whole job in three steps: open the name's
  discussion, react to the reviews that are already there with 👍 or 👎, and add
  a review of your own if you know the domain. It links to the registry
  discussions and to the browser page.

The wording stays factual: reviews are opinions, not security audits, and the
project does not run the names it maps.

## Weekly leaderboard digest

`.github/workflows/weekly-digest.yml` builds a short markdown digest of the
rolling seven days and posts it once a week. The digest body comes from
`scripts/weekly-digest.py`, which only reads the public `reviews/index.json` and
prints names, vote counts, percentages and links — it writes no prose about a
name, no review, and no comment.

**Enable it**

1. The workflow lives on the default branch, so it runs from there. If the
   repository has Actions disabled, turn them on under
   *Settings → Actions*; scheduled workflows then start on the next Monday.
2. Nothing else is required. The job uses the automatic `GITHUB_TOKEN` and the
   workflow's `permissions:` block (`contents: read`, `issues: write`).
3. To try it by hand, open *Actions → Weekly digest → Run workflow*. The
   optional `week` input labels the digest with an ISO week, e.g. `2026-W47`.

**Optional secret**

| Secret | Needed for | Where it comes from |
| --- | --- | --- |
| `REGISTRY_TOKEN` | Posting the digest as a Discussion in `free-domain-name/registry` instead of an issue here | A fine-grained personal access token with *Discussions: write* on `free-domain-name/registry` |

**What it posts**

A digest with the top names of the rolling seven days (votes, 👍, 👎, score,
thread link) and the names still waiting for a first review, followed by the
same framing the page uses: votes are reactions on public discussions, the
ranking is a rolling seven-day view and not a permanent ranking, scores are
opinions and not security audits, the project does not run the names it maps,
and no review or comment in the registry was AI-generated.

**Where it posts, and why it is an issue**

The preferred target is a Discussion in `free-domain-name/registry`
(`POST /repos/free-domain-name/registry/discussions`). That endpoint needs a
token with *Discussions: write* on the registry, and the automatic
`GITHUB_TOKEN` cannot have it: the token is scoped to the repository that runs
the workflow, and Discussions are disabled on this repository, so the endpoint
answers 404 for that token either way. The automatic token does carry
*Issues: write* for its own repository, so **the digest is posted as an issue in
this repository** — the route that works with the automatic token and no extra
setup. With `REGISTRY_TOKEN` configured, the same digest is posted as a
Discussion in the registry's *General* category instead, and the issue is used
as the fallback.

**One digest per week**

The schedule fires weekly (Mondays, 09:17 UTC) and every body carries a
`<!-- fdn-weekly-digest:YYYY-Www -->` marker. Before posting, the workflow
looks for that marker in this repository's issues and, when `REGISTRY_TOKEN` is
present, in the registry's discussions. A digest for a week that already went
out is skipped.

**It never fails the repository**

A missing secret, a refused API call or an unreadable index is logged with a
clear message and exits 0. The job only ever adds a digest.

**Preview it locally**

```sh
python3 scripts/weekly-digest.py --week 2026-W47
```

## Rules the page follows

- No AI-generated domains, reviews, or comments.
- No analytics, tracking pixels, third-party fonts, or ad scripts.
- Votes are GitHub reactions on public discussions; the page only reads the
  generated aggregate index.
- The leaderboard is a rolling seven-day view, not a permanent ranking.
- Scores are opinions, not security audits.
- The weekly digest is assembled mechanically from the public index. It reports
  names, counts, percentages and links, and never writes a review or a comment.

## Local preview

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000>. The page fetches the live public index; no token is
needed.

## License

GPL-3.0-only. See the registry's
[license](https://github.com/free-domain-name/registry/blob/main/LICENSE).
