# Free Domain Name — project home

The root site for the Free Domain Name experiment:
<https://free-domain-name.github.io/>.

It is a static page with no build step and no analytics. It reads the public
[`reviews/index.json`](https://raw.githubusercontent.com/free-domain-name/registry/main/reviews/index.json)
from the registry to show a rolling seven-day leaderboard, recent conversation,
and names that still need a first review.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page markup and metadata |
| `styles.css` | Responsive layout and theme tokens |
| `app.js` | Index fetch, leaderboard rendering, and theme toggle |
| `assets/favicon.svg` | Favicon |

## Rules the page follows

- No AI-generated domains, reviews, or comments.
- No analytics, tracking pixels, third-party fonts, or ad scripts.
- Votes are GitHub reactions on public discussions; the page only reads the
  generated aggregate index.
- The leaderboard is a rolling seven-day view, not a permanent ranking.
- Scores are opinions, not security audits.

## Local preview

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000>. The page fetches the live public index; no token is
needed.

## License

GPL-3.0-only. See the registry's
[license](https://github.com/free-domain-name/registry/blob/main/LICENSE).
