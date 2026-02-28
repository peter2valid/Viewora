# DATABASE ANALYSIS — Viewora

**Generated:** 2026-02-28
**Database:** Supabase (PostgreSQL)
**Schema Source:** `types/database.types.ts`

---

## 1. Current Schema Overview

The database schema is defined via TypeScript types only — no SQL migration files, no Supabase migration history, no schema versioning. The schema was either created manually in the Supabase dashboard or via a tool like `supabase gen types`.

### Inferred Entity Relationship Diagram

```
auth.users (Supabase managed)
    │
    ├── profiles (1:1)
    │   id → auth.users.id
    │   full_name
    │   phone
    │   plan          ← ⚠️ Duplicates subscriptions.plan
    │   created_at
    │
    ├── properties (1:N)
    │   id
    │   user_id → auth.users.id
    │   name
    │   address
    │   property_type  ← ⚠️ No enum defined
    │   created_at
    │   │
    │   └── virtual_tours (1:N)
    │       id
    │       property_id → properties.id
    │       title
    │       tour_url    ← ⚠️ Meaning unclear: embed URL? Public URL?
    │       status      ← ⚠️ No enum: 'draft'? 'published'? 'archived'?
    │       created_at
    │
    └── subscriptions (1:N? or 1:1?)
        id
        user_id → auth.users.id
        plan           ← ⚠️ Duplicates profiles.plan
        billing_freq   ← ⚠️ No enum: 'monthly'? 'yearly'?
        status         ← ⚠️ No enum: 'active'? 'cancelled'? 'expired'? 'trial'?
        created_at
```

---

## 2. Table Analysis

### 2.1 `profiles` Table

**Purpose:** Extends `auth.users` with application-specific user data.

**Fields:**
| Field | Type | Issues |
|-------|------|--------|
| `id` | UUID | FK to auth.users.id — correct |
| `full_name` | text, nullable | OK, populated from auth signUp metadata |
| `phone` | text, nullable | No validation format (E.164? local KE format?) |
| `plan` | text | ⚠️ See below |
| `created_at` | timestamp | Should be set via `DEFAULT now()` |

**`plan` field problem:**
- No default value visible (empty string? null? 'free'?)
- Duplicates `subscriptions.plan` — which is the source of truth?
- No enum constraint — any string can be inserted
- Not clear if 'free' is a valid plan (pricing page shows no free tier)

**Missing fields:**
- `avatar_url` — for user profile pictures (important for dashboard UX)
- `stripe_customer_id` / `paystack_customer_id` — essential for subscription management
- `company_name` — relevant for agency/Pro tier users
- `onboarding_completed` (boolean) — to track user setup flow
- `updated_at` — no update timestamp

**Trigger recommendation:**
```sql
-- Auto-create profile on user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, plan)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'free');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```
Without this trigger, profiles must be manually created after registration — currently NOT done in `register.vue`.

### 2.2 `properties` Table

**Purpose:** Represents physical locations/properties that users manage.

**Fields:**
| Field | Type | Issues |
|-------|------|--------|
| `id` | UUID | OK |
| `user_id` | UUID | FK to auth.users.id |
| `name` | text | Required, no length limit |
| `address` | text, nullable | Freeform — no geocoding, no structured address |
| `property_type` | text | ⚠️ No enum. Valid values: 'residential'? 'commercial'? 'vehicle'? 'event-space'? |
| `created_at` | timestamp | — |

**Missing fields:**
- `status` — active/archived
- `cover_image_url` — thumbnail for the property
- `latitude`, `longitude` — for map features (mentioned in pricing)
- `total_area_sqft` — useful for property info panels
- `updated_at` — no update tracking

**Missing index:**
```sql
CREATE INDEX idx_properties_user_id ON properties(user_id);
```

### 2.3 `virtual_tours` Table

**Purpose:** Individual 360° tours associated with a property.

**Fields:**
| Field | Type | Issues |
|-------|------|--------|
| `id` | UUID | OK |
| `property_id` | UUID | FK to properties.id (should cascade on delete?) |
| `title` | text | Required |
| `tour_url` | text, nullable | ⚠️ Completely ambiguous field — see below |
| `status` | text | ⚠️ No enum, no default |
| `created_at` | timestamp | — |

**`tour_url` field problem:** This single field is supposed to represent the public URL of a tour. But in reality a tour is made of:
- Multiple panorama images (storage paths)
- Scene connections/hotspot data (JSON structure)
- Viewer configuration (initial view, branding settings)

A single `tour_url` field cannot capture this. The schema is fundamentally incomplete for the product vision.

**Missing entire sub-table — `scenes`:**
```sql
CREATE TABLE scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tour_id UUID REFERENCES virtual_tours(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    panorama_url TEXT NOT NULL,       -- Supabase Storage URL
    thumbnail_url TEXT,
    initial_yaw FLOAT DEFAULT 0,
    initial_pitch FLOAT DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT now()
);
```

**Missing entire sub-table — `hotspots`:**
```sql
CREATE TABLE hotspots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE,
    target_scene_id UUID REFERENCES scenes(id),  -- null for info hotspots
    hotspot_type TEXT NOT NULL,  -- 'navigation' | 'info' | 'lead'
    yaw FLOAT NOT NULL,
    pitch FLOAT NOT NULL,
    label TEXT,
    info_content TEXT,           -- for info hotspots
    created_at TIMESTAMP DEFAULT now()
);
```

**Missing fields on `virtual_tours`:**
- `description` — for SEO and tour info panel
- `cover_image_url` — thumbnail for dashboard listing
- `slug` — for human-readable URL (`/tours/luxury-nairobi-apartment` vs `/tours/uuid`)
- `view_count` — analytics counter
- `lead_count` — analytics counter
- `is_public` (boolean) — separate from status for access control
- `branding_config` (JSONB) — white-label settings per tour
- `updated_at`

**Missing indexes:**
```sql
CREATE INDEX idx_virtual_tours_property_id ON virtual_tours(property_id);
CREATE INDEX idx_virtual_tours_status ON virtual_tours(status);
```

### 2.4 `subscriptions` Table

**Purpose:** Tracks user subscription records from Paystack.

**Fields:**
| Field | Type | Issues |
|-------|------|--------|
| `id` | UUID | OK |
| `user_id` | UUID | FK to auth.users.id |
| `plan` | text | ⚠️ No enum. 'basic'? 'plus'? 'pro'? 'elite'? |
| `billing_freq` | text | ⚠️ No enum. 'monthly'? 'yearly'? |
| `status` | text | ⚠️ No enum. 'active'? 'cancelled'? 'past_due'? 'trialing'? |
| `created_at` | timestamp | — |

**Critical missing fields:**
- `paystack_subscription_id` — for webhook correlation
- `paystack_customer_code` — for Paystack customer reference
- `current_period_start` — when current billing period started
- `current_period_end` — when current billing period ends (critical for enforcement)
- `cancelled_at` — cancellation timestamp
- `trial_ends_at` — if offering free trials
- `updated_at`

**Without `current_period_end`, subscription enforcement is impossible.** You cannot know if a subscription is genuinely active or just an old record.

---

## 3. Missing Tables for Full Product

### `leads` Table (Lead Capture Feature)
```sql
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tour_id UUID REFERENCES virtual_tours(id),
    property_owner_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT,
    source_scene_id UUID REFERENCES scenes(id),
    created_at TIMESTAMP DEFAULT now()
);
```

### `tour_analytics` Table (View Tracking)
```sql
CREATE TABLE tour_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tour_id UUID REFERENCES virtual_tours(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT now(),
    session_id TEXT,
    country_code TEXT,
    device_type TEXT,  -- 'mobile' | 'desktop' | 'vr'
    referrer TEXT,
    duration_seconds INTEGER
);
```

### `user_files` Table (Storage Tracking)
```sql
CREATE TABLE user_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    storage_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_type TEXT,  -- 'panorama' | 'logo' | 'thumbnail'
    tour_id UUID REFERENCES virtual_tours(id),
    created_at TIMESTAMP DEFAULT now()
);
-- Used to track storage quota usage per user
```

---

## 4. Schema Design Flaws

### 4.1 Dual Plan Tracking (Critical Design Flaw)
Both `profiles.plan` and `subscriptions.plan` store the user's plan. This creates:
- A synchronization problem: which one is authoritative?
- Risk of them diverging (cancellation updates subscriptions but not profiles)
- Code complexity: every feature check must decide which field to use

**Recommendation:** Remove `plan` from `profiles`. The authoritative plan is always derived from the latest `active` subscription record. `profiles.plan` is at most a cached denormalized value with a clear update trigger.

### 4.2 No Enum Constraints
All status and type fields are `text` with no CHECK constraints or PostgreSQL enum types. This means invalid values can be inserted silently:
```sql
INSERT INTO subscriptions (user_id, plan) VALUES (uid, 'enterprise_hacker_plan');
-- No error — will be inserted
```

**Recommendation:**
```sql
CREATE TYPE subscription_plan AS ENUM ('free', 'basic', 'plus', 'pro', 'elite');
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'cancelled', 'expired');
CREATE TYPE billing_frequency AS ENUM ('monthly', 'yearly');
CREATE TYPE tour_status AS ENUM ('draft', 'published', 'archived');
```

### 4.3 No Soft Deletes
No `deleted_at` field on any table. Deletions are permanent. For a SaaS product:
- Deleted tours cannot be recovered
- Audit trails are impossible
- Paystack webhook correlation may fail if referenced records are deleted

---

## 5. RLS Policy Requirements

```sql
-- profiles: users manage only their own
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- properties: users manage only their own
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "properties_all_own" ON properties FOR ALL USING (auth.uid() = user_id);

-- virtual_tours: user owns via property
ALTER TABLE virtual_tours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tours_all_own" ON virtual_tours FOR ALL USING (
  property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
);
-- Plus: allow public read of published tours (for viewer)
CREATE POLICY "tours_public_read" ON virtual_tours FOR SELECT USING (status = 'published');

-- subscriptions: users read only their own
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_select_own" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
-- Inserts only via service role (webhook handler)
```

---

## 6. Immediate Database Actions Required

1. **Verify RLS is enabled** on all tables in Supabase dashboard
2. **Add `created_by_trigger`** for auto-creating profiles on user registration
3. **Add `paystack_*` fields** to subscriptions table before payment integration
4. **Add `current_period_end`** to subscriptions for enforcement
5. **Create `scenes` and `hotspots` tables** before editor work begins
6. **Add PostgreSQL enums** for all status/type fields
7. **Add missing indexes** on all FK columns
8. **Create `leads` and `tour_analytics` tables** for product features
9. **Add `slug` to virtual_tours** for clean public URLs
10. **Set up migration tooling** (Supabase CLI migrations) — currently zero migration tracking
