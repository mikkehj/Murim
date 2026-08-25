# Sword x Staff Guild Planner v4

Static GitHub Pages guild roster/team planner. No Firebase, Supabase, database, backend, or external authentication.

## Shared roster loading

The **Load from GitHub** button fetches `roster.json` from the same published GitHub Pages site. This means every visitor can see the same published roster once `roster.json` is committed to the repository and deployed by GitHub Pages.

The browser still uses `localStorage` for its current working copy. Loading from GitHub replaces that local copy.

Because the site is completely static, browser JavaScript cannot write changes back into the GitHub repository. To publish a changed shared roster, update/commit `roster.json` in the repository. The **Export** button creates a JSON backup that can be used to update that file.

## Team generation

Members are separated into Berserker, Paladin, Archmage, and Arcanist; each class is sorted highest-power first; Team 1 gets rank 1 from each class, Team 2 gets rank 2, and so on. Teams never exceed four players and a team may have fewer than four players when a class has fewer members. A maximum of 15 teams is generated.
