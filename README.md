# Sword x Staff – Guild Planner v4

A **completely static** web app for managing a *Sword x Staff* guild roster and generating ranked teams.

Designed for **GitHub Pages**. No backend, no Firebase, no Supabase, no database, no external authentication service.

## Features

- **Viewer mode** (default): anyone can open the page and view the roster + generated teams.
- **Master mode**: hard-coded login lets the guild leader add / edit / delete members, generate teams, import & export data.
- **Team generation algorithm** (exact ranking):
  1. Split members by the 4 classes (Berserker, Paladin, Archmage, Arcanist).
  2. Sort each class highest → lowest power.
  3. Team 1 gets the #1 player of each class, Team 2 the #2, and so on.
  4. Teams never exceed 4 players. Missing classes are clearly shown.
  5. Maximum 15 teams.
- Local storage persistence (per browser).
- JSON Export / Import so the master can share the same roster across devices or with co-leaders.
- Search, class filter, and multiple sort options.
- Responsive / mobile-friendly dark UI.
- Zero external dependencies (vanilla HTML + CSS + JS).

## Master credentials

```
Username: Mika
Password: EvilEnvy
```

These are intentionally hard-coded in `app.js`. Anyone who inspects the source can see them. This is acceptable for this project because there is no sensitive data.

## How to use (GitHub Pages)

1. Create a new repository (or use an existing one).
2. Upload / push these four files to the root (or to the `docs/` folder / `gh-pages` branch – whatever you configure for Pages):
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md` (optional)
3. Enable **GitHub Pages** in the repository settings (Source: Deploy from a branch → main / root or docs).
4. Open the Pages URL. The site is ready.

### Sharing the same roster across devices

Because data lives in each browser’s `localStorage`, different devices start empty.

**Recommended workflow:**

1. Master logs in on one device and builds the roster.
2. Click **Export** → downloads a `.json` file.
3. On another device (or after clearing browser data): Master logs in → **Import** the JSON file.
4. Optionally commit the exported JSON into the repo if you want a public snapshot (viewers still only see what is in their own localStorage unless you add a static `roster.json` loader later).

## File structure

```
.
├── index.html   # Markup & modals
├── styles.css   # Dark theme, responsive layout
├── app.js       # All logic (auth, CRUD, team algorithm, storage)
└── README.md
```

## Team generation example

| Class     | Players (power)          |
|-----------|--------------------------|
| Berserker | A 2.0M, B 1.8M, C 1.5M   |
| Paladin   | D 1.9M, E 1.7M, F 1.3M   |
| Archmage  | G 2.1M, H 1.6M, I 1.4M   |
| Arcanist  | J 1.8M, K 1.5M, L 1.2M   |

**Result**

- **Team 1**: A + D + G + J  (strongest of each class)
- **Team 2**: B + E + H + K
- **Team 3**: C + F + I + L

If a class has fewer members, later teams simply have fewer than 4 players and list the missing classes.

## Version

**v4** – pure static / localStorage implementation. No Firebase or any backend.

## License

Free to use and modify for your guild.
