# Sword x Staff Guild Planner v4

A completely static GitHub Pages guild roster and team planner.

## Architecture

- Static HTML/CSS/JavaScript only.
- No Firebase.
- No Supabase.
- No database.
- No backend.
- No external authentication.
- Roster/team state is stored in the browser's `localStorage`.
- Master login state is stored in `sessionStorage`.

## Important limitation

Because this is a static GitHub Pages app with no backend, `localStorage` is **per browser/device**. A save made by the master on one device does **not** automatically become visible to other devices.

To share the same roster across devices, use **Export** to create a JSON file, then use **Import** on another device/browser. GitHub Pages can host the application itself, but it cannot accept writes to a JSON file in the repository from browser JavaScript without a backend or GitHub API/authentication workflow.

This is intentional and follows the no-database/no-backend requirement.

## Master login

Username: `Mika`  
Password: `EvilEnvy`

This is only a convenience lock. Anyone who can inspect the JavaScript can discover the credentials.

## Team generation

The generator:

1. Separates members into the four classes.
2. Sorts each class by power, highest first.
3. Team 1 receives the highest-power member of every class.
4. Team 2 receives the second-highest member of every class.
5. It continues by rank until every member is assigned.
6. A team contains at most one member of each class and never more than four players.
7. Up to 15 teams are generated.
8. Teams can contain fewer than four players when a class has fewer members.
9. The UI shows total power, player count, present classes, and missing classes.

## GitHub Pages deployment

1. Create a GitHub repository.
2. Upload `index.html`, `styles.css`, `app.js`, and `README.md` to the repository root.
3. In GitHub, open **Settings → Pages**.
4. Select deployment from the branch containing these files (usually `main`, root folder).
5. Open the generated GitHub Pages URL.

No build step is required.

## Data

The browser stores the current application state under:

`localStorage` key: `sxs_guild_planner_v4`

Exports are standard JSON and can be kept as backups.
