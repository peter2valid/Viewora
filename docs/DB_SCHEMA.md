# Viewora — Database Schema

## Tables

### `profiles`
Auto-created on user signup via trigger.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | References `auth.users(id)` |
| `full_name` | text | From signup metadata |
| `phone` | text | Optional |
| `plan` | text | Default: `'free'` |
| `created_at` | timestamptz | |

**RLS:** Users can read/write their own row only.

---

### `spaces`
The top-level container for a virtual tour.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `owner_id` | uuid FK | → `auth.users(id)` |
| `title` | text | Space name |
| `description` | text | Optional |
| `is_published` | boolean | Default: `false` |
| `slug` | text UNIQUE | Used in public URL `/tours/:slug` |
| `created_at` | timestamptz | |

**RLS:**
- Owner: full access
- Public: SELECT if `is_published = true`

---

### `scenes`
A single 360° panorama image within a space.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `space_id` | uuid FK | → `spaces(id)` |
| `name` | text | Scene label |
| `image_path` | text | Supabase Storage path (bucket: `tours`) |
| `order_index` | int | Display order |
| `created_at` | timestamptz | |

**RLS:**
- Owner: full access (via spaces join)
- Public: SELECT if parent space is published

---

### `hotspots`
Interactive clickable points placed within a scene.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `scene_id` | uuid FK | → `scenes(id)` |
| `type` | text | `'nav'` or `'info'` |
| `yaw` | float8 | Horizontal angle (radians) |
| `pitch` | float8 | Vertical angle (radians) |
| `payload` | jsonb | Type-specific data (see below) |
| `created_at` | timestamptz | |

**Payload shape by type:**
```json
// type = "nav" (navigation to another scene)
{ "target_scene_id": "uuid" }

// type = "info" (label/tooltip)
{ "label": "Living Room" }
```

**RLS:**
- Owner: full access (via scenes + spaces join)
- Public: SELECT if parent space is published

---

### `subscriptions`
Billing records (Paystack integration pending).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK | → `auth.users(id)` |
| `plan` | text | `'basic'`, `'plus'`, `'pro'`, `'elite'` |
| `billing_freq` | text | `'monthly'`, `'annual'` |
| `status` | text | `'active'`, `'cancelled'`, `'past_due'` |
| `created_at` | timestamptz | |

---

## Migration Files

| File | Description |
|------|-------------|
| `002_scenes_hotspots.sql` | Legacy: old `scenes`/`hotspots` tied to `virtual_tours` |
| `003_product_dashboard.sql` | Partial migration: adds `spaces` + `space_id` columns |
| `004_consolidated_product_schema.sql` | **Use this.** Full idempotent schema for current product. |

> Run `004_consolidated_product_schema.sql` in Supabase Dashboard → SQL Editor.
> It is safe to run on a fresh project and uses `IF NOT EXISTS` throughout.
