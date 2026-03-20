# Composables (Logic Hooks)

This folder contains reusable logic shared across the dashboard.

## 🧪 Key Composables
- **`useApiFetch.ts`**: The most important utility. It wraps Nuxt's `useFetch` to add:
    - Automatic Authorization headers (JWT from Supabase).
    - Base URL configuration.
    - Standard error handling.
- **`useSpaces.ts`**: Manages the state and CRUD lifecycle for virtual tour properties.

## 💡 Code Guidelines
1.  **Authorization**: Always use `useApiFetch` when communicating with the custom backend (Railway).
2.  **State**: Favor Pinia stores for long-lived global data, and composables for feature-specific logic.
3.  **Supabase**: Access the Supabase client directly via `useSupabaseClient` for low-level DB tasks, but prefer the backend API for business logic (quotas, sharing, etc.).
