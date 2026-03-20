# Viewora Dashboard (Nuxt/Frontend)

This is the high-performance, premium dashboard for the Viewora virtual tour platform. It is built using **Nuxt 3** and **Tailwind CSS**.

## 🚀 Architectural Vision
The dashboard follows a **Stripe-grade** aesthetic, prioritizing cinematic transitions, deep zinc color palettes, and responsive data visualizations.

## 📁 Key Directories
- **`/assets`**: Global styles and design system tokens (Tailwind).
- **`/components`**: Reusable UI elements, emphasizing a premium feel.
- **`/composables`**: Business logic hooks, including the core API wrapper.
- **`/layouts`**: Global shell structure with sidebar navigation.
- **`/pages`**: Nuxt-based routing for Spaces, Leads, Analytics, and Billing.
- **`/stores`**: Pinia state management for plan entitlements and user sessions.

## 🛠️ Design System
We use **Tailwind CSS v3+** exclusively.
- **DO NOT** add legacy BEM classes.
- **DO NOT** use inline styles where a Tailwind utility exists.
- **Primary Color**: `zinc-950`
- **Secondary Color**: `slate-500`
- **Success/Live**: `emerald-500`

## 🔒 Authentication
Auth is handled via **Supabase**. User context is synchronized across the `useSupabaseUser` composable and the `auth` store.

## 💡 Guidelines for Agents
1.  **Safety First**: Always check `usePlanStore.can()` before enabling premium UI features.
2.  **Visuals**: Use `animate-in fade-in slide-in-from-bottom-4` for cinematic page entries.
3.  **Data**: Use the `useApiFetch` composable for all property/lead data to ensure proper SSR and error handling.
