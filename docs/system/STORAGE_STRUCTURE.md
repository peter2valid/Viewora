# STORAGE STRUCTURE — Viewora

**Generated:** 2026-02-28

---

## 1. Current Storage State

### Reality: No Storage Integration Exists

Despite pricing tiers advertising storage quotas (2GB, 8GB, 20GB, 50GB), there is **zero Supabase Storage implementation** in the codebase. No bucket creation, no upload logic, no storage policy, no signed URL generation.

The `@nuxtjs/supabase` module is installed and the client is available, meaning Supabase Storage can be accessed via:
```js
const supabase = useSupabaseClient()
await supabase.storage.from('panoramas').upload(path, file)
```
But this code does not exist anywhere in the project.

---

## 2. Static Public Asset Storage (Current)

All current assets are served as static files from the `/public/` directory, deployed to GitHub Pages CDN.

```
public/
└── images/
    └── home/
        ├── car dealership.png          (marketing image — filename has space, bad practice)
        ├── cross-platform-hero.png     (homepage hero right column)
        ├── cross-platform-hero2.png    (product page step 4)
        ├── dollhouse-commercial.png    (features section, about page)
        ├── floorplan-hotspots.png      (architecture/development feature card)
        ├── hardware-setup.png          (step 1: upload panoramas)
        ├── mobile-tours.png            (marketing image)
        ├── plain land.png              (real estate feature card — filename has space)
        ├── tiny-planet-vr.png          (step 3: publish)
        └── white-label-editor.png     (step 2: create room connections)
```

**Issues:**
- Two filenames contain spaces (`car dealership.png`, `plain land.png`) — URL encoding issues possible
- No image optimization via `<NuxtImg>` — all images use plain `<img>` tags with no responsive breakpoints or WebP conversion
- No favicon file at `/public/favicon.ico` (referenced in `app.vue:36` but missing)
- No OG image at `/public/og-image.jpg` (referenced in meta tags but missing)
- No Viewora logo at `/public/images/viewora-logo.png` (referenced in Schema.org but missing)

---

## 3. Planned Storage Architecture (Product Vision)

The following is the recommended Supabase Storage structure for when panorama uploads are implemented:

### Bucket Structure

```
supabase-storage/
├── panoramas/                      # Raw uploaded equirectangular images
│   └── {user_id}/
│       └── {tour_id}/
│           └── {scene_id}.jpg      # e.g., 8a7f9c.jpg (2-8K resolution)
│
├── thumbnails/                     # Auto-generated preview thumbnails
│   └── {user_id}/
│       └── {tour_id}/
│           └── {scene_id}_thumb.webp
│
├── tour-assets/                    # Custom branding assets per user
│   └── {user_id}/
│       ├── logo.png
│       └── watermark.png
│
└── generated-tiles/                # Pre-processed tile pyramids (future)
    └── {tour_id}/
        └── {scene_id}/
            ├── 0/                  # Zoom level 0
            ├── 1/                  # Zoom level 1
            └── 2/                  # Zoom level 2
```

### Access Control Policy (Recommended RLS for Storage)

```sql
-- Users can only upload to their own folder
CREATE POLICY "Users upload to own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'panoramas'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can only read their own files
CREATE POLICY "Users read own files" ON storage.objects
  FOR SELECT USING (
    bucket_id IN ('panoramas', 'thumbnails', 'tour-assets')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Public read access for published tours (panoramas only)
CREATE POLICY "Public read published tour panoramas" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'panoramas'
    AND EXISTS (
      SELECT 1 FROM virtual_tours vt
      WHERE vt.status = 'published'
      -- derive tour_id from path
    )
  );
```

---

## 4. Storage Quotas by Plan (As Advertised)

| Plan | Price (monthly) | Storage Limit | Tours |
|------|----------------|---------------|-------|
| Basic | KES 1,500 | 2 GB | 2 |
| Plus | KES 4,000 | 8 GB | 15 |
| Pro | KES 8,500 | 20 GB | 40 |
| Elite | KES 18,000 | 50 GB | 120 |

**Enforcement gap:** No code exists to track storage usage against quotas. At 10,000 users, the Elite tier alone allows 50GB per user = 500TB potential storage at the top tier. Supabase's free tier provides 1GB storage; Pro plan provides 100GB total.

**Architecture risk:** Storage quota enforcement must be implemented at the server level (Supabase Storage policies or Edge Functions) before users can upload anything.

---

## 5. Image Processing Considerations

### Panorama Images — Technical Reality
- Full equirectangular panoramas from Insta360 ONE X2: ~15-25MB per image (JPEG)
- 8K panorama from Ricoh Theta Z1: up to 45MB per image
- A 15-room property tour at 8K = potentially 675MB for ONE tour
- The Pro plan (40 tours) at 8K could easily exceed the 20GB storage limit

### Required Image Processing Pipeline (Not Built)
1. Upload raw panorama → Supabase Storage `panoramas/` bucket
2. Trigger Edge Function on upload
3. Edge Function: validate file type, validate file size, verify plan quota
4. Generate thumbnail (1024x512 WebP)
5. Optionally: Generate tile pyramid for progressive loading (Marzipano format)
6. Update database record with processed URLs

### Signed URLs vs Public URLs
For **private/draft tours**: Supabase signed URLs (time-limited) must be used
For **published tours**: Public bucket URLs with CDN caching can be used

Currently, no URL generation strategy is implemented.

---

## 6. Immediate Gaps to Address

1. **Create Supabase Storage buckets**: `panoramas`, `thumbnails`, `tour-assets`
2. **Write Storage RLS policies** for all buckets
3. **Build upload component** in the dashboard (file input, progress bar, validation)
4. **Implement quota checking** before uploads are accepted
5. **Fix filenames with spaces** in `/public/images/home/`
6. **Use `<NuxtImg>`** for all static images to enable WebP optimization and responsive images
7. **Add missing files**: `favicon.ico`, `og-image.jpg`, `viewora-logo.png`
