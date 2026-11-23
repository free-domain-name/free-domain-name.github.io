# Free Domain Name — project home

The root site for the Free Domain Name experiment:
<https://free-domain-name.github.io/>.

It is a static page with no build step, and it counts nothing unless a
provider is configured. It reads the public
[`reviews/index.json`](https://raw.githubusercontent.com/free-domain-name/registry/main/reviews/index.json)
from the registry to show a rolling seven-day leaderboard, recent conversation,
and names that still need a first review — with an onboarding flow that turns
that last list into an actual first review.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page markup and metadata |
| `styles.css` | Responsive layout and theme tokens |
| `app.js` | Index fetch, leaderboard rendering, theme toggle, install commands and copy buttons |
| `analytics.js` | Opt-in, provider-agnostic page counting; sends nothing until a provider is configured |
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
- **Install in one command.** The one-line installers for the portable CEF
  build, one command per platform, each with a copy button.
- **Claim your .fdn name.** The four steps, the shard rule and the JSON
  template for adding a name to the registry.

## The two browser builds

The project ships the Free Domain Browser in two builds, and the home page
now says which is which instead of linking only one of them:

| Build | Engine | Page | Packages |
| --- | --- | --- | --- |
| Free Domain Browser (stable) | The system web view (WebView2, WKWebView, WebKitGTK) | `/tauri-browser/` | Installers: DMG, MSI, NSIS, AppImage, deb |
| Free Domain Browser — CEF (preview) | Chromium 156 through the Chromium Embedded Framework | `/free-domain-browser-cef/` | Portable archives for macOS, Linux and Windows |

The **The browser, in two engines** section sits between the hero and the
leaderboard and gives each build its own card: the engine it uses, what it
gives you and where to get it. The styles for those cards live in
`styles.css` and are shared with the CEF page, which loads the same
stylesheet from this site.

The CEF page itself lives in the `docs/` folder of the
[free-domain-browser-cef](https://github.com/free-domain-name/free-domain-browser-cef)
repository, which publishes it with GitHub Pages.

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

## Installing in one command

`install.sh` (macOS and Linux) and `install.ps1` (Windows) live in the root of
this repository and are served from
<https://free-domain-name.github.io/install.sh> and
<https://free-domain-name.github.io/install.ps1>.

The **Install in one command** section shows all three commands — macOS,
Linux and Windows — as separate rows, so a visitor on any platform can copy
the right one. `app.js` detects the platform from `navigator.userAgent` and
`navigator.platform`, writes the command text from one table, and marks the
matching row with a *Your platform* tag. Without JavaScript the three commands
are still on the page, and only the marker is missing.

Every code block on the page has a copy button. It uses
`navigator.clipboard.writeText` and falls back to `document.execCommand("copy")`
on pages that are not in a secure context, then says *Copied*.

The section states what the script does: it downloads the latest portable CEF
build, checks the SHA-256 against the published `checksums.txt` and unpacks it
into the home directory. It needs no root and installs nothing system wide.
The signed installers are linked as the alternative.

## Claiming a name

The **Claim your .fdn name** section explains the four steps for adding a name
to the registry: open a pull request against
[free-domain-name/registry](https://github.com/free-domain-name/registry),
follow the shard rule from `scripts/shard.mjs`, point the name at a domain you
own, and let the community review it in the discussion the pull request opens.

It carries the exact JSON template, the `ozkanpakdil.fdn` →
`o/z/k/a/ozkanpakdil.fdn.json` example, and links to the registry and to its
`CONTRIBUTING.md`. Submissions are reviewed by people; bulk submissions are
rejected.

## Analytics

`analytics.js` counts page views against a backend that the project runs. The
provider, the endpoint and the site are configuration, read from the script
tag's own data attributes, so switching backend is a one-line change in
`index.html`:

| Provider | `data-provider` | `data-endpoint` | `data-domain` |
| --- | --- | --- | --- |
| GoatCounter | `goatcounter` | the count URL, e.g. `https://analytics.example.com/count` | unused |
| Plausible | `plausible` | the script URL, default `https://plausible.io/js/script.js` | the site to count |
| GA4 | `ga4` | the measurement id, e.g. `G-ABC123` | unused |
| Off | `none` | — | — |

GoatCounter is the intended backend: it is open source, self-hosted, needs no
cookies and stores no personal data. Its count endpoint takes a POST with the
query parameters `p` (path), `r` (referrer) and `t` (title).

**Right now the page counts nothing.** The tag in `index.html` ships with
`data-provider="none"`, so the file makes no request at all, and no third-party
script is loaded. To switch it on, set `data-provider` and `data-endpoint` to
the values above and add the backend origin to the Content-Security-Policy in
`index.html` (`connect-src` for the POST, and `script-src` if the backend loads
a script of its own).

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
- No tracking pixels, third-party fonts, or ad scripts. Analytics is opt-in and
  off: `analytics.js` sends nothing until a provider is configured, and then
  only to a self-hosted, open source backend.
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
