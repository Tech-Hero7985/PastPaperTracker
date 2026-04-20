# ◈ IAL Past Paper Tracker - V1

> Track your Edexcel IAL past paper progress. Free, cloud-synced, and built for students.

**🌐 Live → [wadhwanimedia.me](https://wadhwanimedia.me/)**

---

## What is this?

A free web app for IAL (International A-Level) students to track which past papers they've completed across all subjects, series, and years. Create a free account and your progress syncs across every device. Compete with friends on the leaderboard.

---

## Features

- **4 subjects** - Mathematics, Physics, Chemistry, Biology
- **Custom paper selection** - pick exactly which papers you're sitting (P3, P4, M1, S1, etc.)
- **Custom year picker** - select any combination of years from 2010 to now
- **3 exam series per year** - January, May/June, October/November
- **4 status levels** - Not Done → In Progress → Done → Done + Reviewed
- **Progress bars** - per year card and overall completion percentage
- **Paper counter** - total papers done across all subjects shown in the header
- **🏆 Leaderboard** - gamified ranking of all users by papers completed
- **Cloud sync** - free account system, progress syncs across all devices
- **Dark mode** - clean, minimal UI built for long revision sessions
- **SEO optimised** - indexed on Google

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Auth & Database | [Supabase](https://supabase.com) (free tier) |
| Hosting | GitHub Pages |
| Domain | Namecheap (wadhwanimedia.me) |
| Fonts | Syne, IBM Plex Mono, Outfit (Google Fonts) |
| SEO | Google Search Console + sitemap |

---

## Database Schema

All tables protected by Row Level Security - users can only access their own data.

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

**`leaderboard`**
```
user_id      uuid  (FK → auth.users)
display_name text
papers_done  integer
updated_at   timestamptz
```

---

## Run Locally

No build step needed - plain HTML/CSS/JS.

```bash
git clone https://github.com/Tech-Hero7985/PastPaperTracker.git
cd PastPaperTracker
open index.html
```

> Auth and cloud sync require a Supabase project. See self-hosting setup below.

---

## Self-Hosting Setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Run `setup.sql` and `setup_leaderboard.sql` in the Supabase SQL Editor
3. In Supabase → **Authentication → Settings → Email** → disable email confirmations
4. Replace the Supabase URL and publishable key at the top of `script.js` with your own
5. Deploy to GitHub Pages or any static host

---

## Roadmap

### V1 ✅
- Subject + paper picker
- Custom year range
- Cloud sync with accounts
- Leaderboard
- HTTPS + custom domain
- Google indexed

### V2 (planned)
- Password reset
- PWA support (installable from browser)
- Notes per paper
- Export progress as PDF/CSV
- Mobile app feel

---

## Beta Testers

Thanks to the people who tested V1 and helped shape it:

- [@aaron0_0parker](https://www.instagram.com/aaron0_0parker/)
- [@shevvyboy](https://www.instagram.com/shevvyboy/)
- [@_krish_061208](https://www.instagram.com/_krish_061208/)

---

## License

MIT - free to use, modify, and share.
