# Pinia Stores (Global State)

This folder contains the application's global data stores.

## 🧪 Key Stores
- **`auth.ts`**: Manages the user's session and identity.
- **`plan.ts`**: The most critical store for business logic. It syncs with the database's `plans`, `subscriptions`, and `usage_counters` tables to determine what the user can see or do.

## 🔒 Plan Guard Pattern
Use the `planStore.can(feat_id)` helper throughout the application to conditionally enable/disable UI features.
- Example: `<div v-if="planStore.can('lead_capture_enabled')">...</div>`

## 💡 Guidelines
- **DO NOT** store large blobs of data (like multi-MB images) in the store. Store only the URL or reference.
- **Hydration**: Ensure stores are properly hydrated after the Supabase user is confirmed. Use watchers if necessary to trigger re-fetches when the user ID changes.
