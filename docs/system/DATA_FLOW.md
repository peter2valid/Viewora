# Data Flow

The Viewora Dashboard follows a linear, step-by-step data flow from authentication to publication:

1. **Authentication:**
   - User signs in via `/login` (Email or Google OAuth).
   - `@nuxtjs/supabase` module intercepts the session and redirects to `/app/spaces`.

2. **Space Creation:**
   - On `/app/spaces`, the user sees a list of their spaces (fetched via `useSpaces` composable).
   - User creates a new Space. A row is inserted into the `spaces` table, and the user is redirected to `/app/spaces/:id`.

3. **Scene Upload (Storage Engine):**
   - In the Space details view, the user uploads an image.
   - The file is pushed directly to the Supabase `tours` storage bucket via `supabase.storage.from('tours').upload()`.
   - On success, the returned storage path is inserted into the `scenes` table, linked to the `space_id`.

4. **Editor Engine:**
   - User opens the Editor (`/app/spaces/:id/editor`).
   - The app fetches all scenes and hotspots for the space.
   - Marzipano viewer is initialized. User clicks to add hotspots (which log yaw/pitch).
   - Hotspots are saved to the `hotspots` table via `useHotspots` composable.

5. **Publishing:**
   - User clicks "Publish Changes".
   - The `spaces.is_published` flag is set to `true`, and a unique `slug` is assigned.
   - The public can now access `/tours/:slug`. This route queries the database read-only (enforced by RLS) and renders the scenes and hotspots without editing controls.
