# ◈ IAL Past Paper Tracker

A free, dark-mode web app for tracking Edexcel IAL past paper progress - with cloud sync across all your devices.

**Live site → [wadhwanimedia.me/PastPaperTracker](http://wadhwanimedia.me/PastPaperTracker/)**

---

## Features

- **4 subjects** - Mathematics, Physics, Chemistry, Biology
- **Custom paper selection** - pick exactly which papers you're sitting (P3, P4, M1, etc.)
- **Year range picker** - choose any range e.g. 2019 → 2024
- **3 exam series per year** - January, May/June, October/November
- **4 status levels** - Not Done, In Progress, Done, Done + Reviewed
- **Per-card and overall progress bars** - visualise how far through you are at a glance
- **Cloud sync** - create a free account and your progress syncs across every device
- **Dark mode only** - easy on the eyes during long revision sessions

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Auth & Database | [Supabase](https://supabase.com) (free tier) |
| Hosting | GitHub Pages + custom domain (Namecheap) |
| Fonts | Syne, IBM Plex Mono, Outfit (Google Fonts) |

---

## Database Schema

Two tables in Supabase, both protected by Row Level Security (users can only access their own data).

**`paper_status`**
```
user_id    uuid  (FK → auth.users)
subject    text
year       integer
series     text
paper      text
status     text
updated_at timestamptz
```

**`user_settings`**
```
user_id          uuid  (FK → auth.users)
subject          text
years            integer
paper_selections jsonb
updated_at       timestamptz
```

---

## Run Locally

No build step needed - it's plain HTML.

```bash
git clone https://github.com/Tech-Hero7985/PastPaperTracker.git
cd PastPaperTracker
# Open index.html in your browser
open index.html
```

> Auth and cloud sync require a Supabase project. See setup below if you want to self-host.

---

## Self-Hosting Setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Run the SQL in `setup.sql` inside the Supabase SQL Editor
3. In Supabase → **Authentication → Settings → Email**, disable email confirmations
4. Replace the Supabase URL and publishable key at the top of `script.js` with your own
5. Deploy to GitHub Pages or any static host

---

## Contributing

This is a personal project but feedback and suggestions are welcome - open an issue or reach out.

---

## Beta Testers

Thanks to the people who tested RC1 and helped catch bugs early:

- [@aaron0_0parker](https://www.instagram.com/aaron0_0parker/)
- [@shevvyboy](https://www.instagram.com/shevvyboy/)
- [@_krish_061208](https://www.instagram.com/_krish_061208/)

---

## License

MIT - free to use, modify, and share.
