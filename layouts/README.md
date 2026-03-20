# Layouts

This folder contains the global structural shells for the Viewora application.

## 🏗️ Core Layouts
- **`app.vue`**: The primary "Premium Dashboard" layout. It includes:
    - Cinematic Sidebar (fixed left).
    - Floating Header (glassmorphism blurred background).
    - Scrollable Content Area (main viewport).
- **`default.vue`**: Used for public views or simple landing pages.

## 🛠️ Transitions
All layout-level page transitions should be defined here or in `nuxt.config.ts`. We prefer a subtle `fade-up` effect for all page entries to maintain the premium aesthetic.

## 💡 Guidelines
- **Modals**: Most global modals (e.g., Lead Detail) are teleported to the `body`, so they are managed independently of the layout's scroll container.
- **Sidebar**: The sidebar is responsive. Ensure the navigation still works smoothly on mobile via the hamburger menu.
