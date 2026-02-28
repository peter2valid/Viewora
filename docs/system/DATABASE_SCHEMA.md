# Database Schema

The system relies on PostgreSQL via Supabase, with Row Level Security (RLS) enforcing access.

## Tables

### 1. `spaces`
Represents a distinct virtual tour project.
- `id` (uuid, PK)
- `owner_id` (uuid, FK auth.users)
- `title` (text)
- `description` (text)
- `is_published` (boolean)
- `slug` (text, UNIQUE)
- `created_at` (timestamptz)

### 2. `scenes`
Represents a single 360° panorama within a space.
- `id` (uuid, PK)
- `space_id` (uuid, FK spaces.id)
- `image_path` (text) - Path in Supabase Storage
- `name` (text)
- `order_index` (int)
- `created_at` (timestamptz)

### 3. `hotspots`
Represents an interactive point inside a scene (navigation or info).
- `id` (uuid, PK)
- `scene_id` (uuid, FK scenes.id)
- `type` (text) - e.g., 'nav', 'info'
- `yaw` (float8) - Horizontal coordinate
- `pitch` (float8) - Vertical coordinate
- `payload` (jsonb) - e.g., `{ target_scene_id: 'uuid' }` or `{ label: 'Text' }`
- `created_at` (timestamptz)

## Row Level Security (RLS)

- **Owner access:** All tables have RLS policies ensuring that an authenticated user can only `SELECT`, `INSERT`, `UPDATE`, or `DELETE` rows if they own the parent `space`.
- **Public access:** A separate `SELECT` policy exists on all tables allowing public, unauthenticated access *only* if `spaces.is_published = true`. This enables the public `/tours/:slug` route to load data safely.
