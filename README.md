# 🗡️ Sword x Staff - Guild Planner (v4)

A clean, light, responsive **completely static client-side web application** structured specifically for managing competitive player setups inside the mobile game *"Sword x Staff"*. Optimized for direct deployment hosting configurations on **GitHub Pages** without any backend service hooks, Firebase setups, or Supabase configurations.

## 🔐 Operator Control Access Profile
*   **Master Login Username:** `Mika`
*   **Master Login Password:** `EvilEnvy`

*Note: Authorization sessions are mapped locally via browser cache `sessionStorage` buffers. Once authorized, you keep admin modifier attributes functional throughout browser reboots until you select the "Logout" modifier tool manually.*

## 🚀 Instant Deployment Process to GitHub Pages
1. Create a fresh **public or private code storage container repository** inside your personal GitHub web portal dashboard profile.
2. Drag, drop, and submit all four source bundle core tracking layout items from this ZIP package directly into the repository root index branch directory:
   * `index.html`
   * `styles.css`
   * `app.js`
   * `README.md`
3. Enter your repository's management panel, navigate over into the **Settings** sub-tab menu link option on the upper right context tray sidebar, and click on **Pages**.
4. Inside the primary deployment pipeline source property configuration picker form menu, ensure **"Deploy from a branch"** is highlighted, select your target primary base tracking head pointer target node branch (commonly named `main` or `master`), flag the target output folder element parameter marker selection as `/root`, and tap **Save**.
5. Give the automated build scripts between 30 and 60 seconds to execute, then refresh your page to uncover your public web platform URL address. Share this link directly with your teammates so they can access live squad configurations.

## 🧠 Dynamic Composition Roster Balancing Framework Flow
The app includes a specialized tier matching loop sequence that assigns players to teams automatically based on their combat power and class selection:
1. Filters and separates your total guild members inventory by their respective specialized combat profiles (`Berserker`, `Paladin`, `Archmage`, `Arcanist`).
2. Forces sorting properties criteria ranking inside individual class collections sorting from high Combat Power (CP) records down to lowest values.
3. Forms **Team 1** directly by fetching the highest ranked top player record available across all four class buckets simultaneously.
4. Drops down to construct **Team 2** using the second-highest records, moving down continuously until all records are mapped up to a cap of **15 maximum teams**.
5. Teams missing composition segments display a dashed warning badge labeled **"Missing [Class]"**, showing you where adjustments are needed.
