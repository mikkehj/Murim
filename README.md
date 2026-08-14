# Sword x Staff - Guild Planner (v4)

A simple, beautiful, completely static client-side web application layout designed to plan and organize ranked composition tiers for the **Sword x Staff** mobile application.

## 🚀 Live Preview Setup on GitHub Pages
Because this application contains **zero backend frameworks, databases, or third-party engines (like Firebase or Supabase)**, you can host it totally free in seconds:
1. Extract the contents of this ZIP configuration file.
2. Create a new repository on your GitHub account.
3. Push these 4 core files directly to your main branch.
4. Go to **Settings -> Pages**, choose the root of your main branch, and click **Save**.

## 🛠️ Design Architecture Decisions
- **Data Persistence:** Automatically tracks state updates inside the local browser application memory layer (`localStorage`).
- **Master Authorization:** Features a client-side hard-coded bypass gateway layout for rapid edits across alternative screens.
  - **Username:** `Mika`
  - **Password:** `EvilEnvy`

## 📊 Algorithmic Team Generation Flow
The team arrangement engine uses a strict sequential hierarchy requested for game competitive brackets:
1. Groups every single member by their primary core assigned class (`Berserker`, `Paladin`, `Archmage`, `Arcanist`).
2. Sorts everyone dynamically from highest individual power index down to lowest.
3. Packages `Team 1` sequentially with the absolute top tier metric performance from each of the 4 buckets.
4. Seamlessly skips missing class brackets if alignment limits display unbalanced compositions. Maxes out cleanly at **15 teams**.
