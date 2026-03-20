# Pages & Routing

This folder contains the Nuxt-based route structure for the Viewora platform.

## 📁 Key Route Groups
- **`/app/spaces/`**: Virtual tour management (List, Creation, Detail).
- **`/app/leads/`**: The Lead Hub (CRM for tour visitors).
- **`/app/analytics/`**: Visual performance tracking.
- **`/app/billing/`**: Subscription and quota management.

## 🛠️ Performance & Prefetching
Nuxt 3 automatically prefetches linked pages. Ensure that `onMounted` hooks in these pages are optimized to avoid "jank" when navigating between tabs.

## 💡 Guidelines for Agents
1.  **Authorization**: Use `definePageMeta({ middleware: 'auth' })` to protect private dashboard routes.
2.  **State Re-sync**: When navigating to a specific space (`/app/spaces/[:id]`), always verify the space exists and belongs to the user before rendering.
3.  **SEO**: Always use `useSeoMeta()` at the top of the script setup for each page.
