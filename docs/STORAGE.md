# Viewora — Storage

## Bucket: `tours`

**Type:** Public  
**Used for:** 360° panorama images uploaded by users

### Setup (one-time in Supabase Dashboard)

1. Dashboard → Storage → New bucket
2. Name: `tours`
3. Public: **ON** (required so panoramas can be loaded by Marzipano in the viewer)

### Path Convention

All files use the pattern:
```
{spaceId}/{timestamp}_{random}.{ext}
```

Example:
```
550e8400-e29b-41d4-a716-446655440000/1709123456789_a4f7k.jpg
```

This ensures:
- Files are logically grouped by space
- No filename collisions
- Easy to scope Storage RLS policies by space owner

### Storage RLS Policies

Apply these policies to the `tours` bucket in **Dashboard → Storage → Policies**:

#### Policy 1: Users upload to own folder
```sql
-- Operation: INSERT
-- Target roles: authenticated
(storage.foldername(name))[1] = auth.uid()::text
```

#### Policy 2: Users manage their own files
```sql
-- Operation: ALL
-- Target roles: authenticated
(storage.foldername(name))[1] = auth.uid()::text
```

> Note: The folder is keyed by `spaceId` (which is owned by the user), not directly by `user_id`.
> For stricter enforcement, query the spaces table to verify ownership:
> ```sql
> EXISTS (
>   SELECT 1 FROM spaces
>   WHERE id = (storage.foldername(name))[1]::uuid
>   AND owner_id = auth.uid()
> )
> ```

### Public URL Generation

In code, public URLs are generated with:
```typescript
const url = supabase.storage.from('tours').getPublicUrl(imagePath).data.publicUrl
```

This produces:
```
https://{project}.supabase.co/storage/v1/object/public/tours/{spaceId}/{filename}
```

### File Validation (client-side)

Before uploading in `pages/app/spaces/[spaceId]/index.vue`:
- Accepted MIME types: `image/jpeg`, `image/jpg`, `image/png`
- Maximum file size: 20MB
- Recommended: equirectangular 2:1 aspect ratio (e.g. 8192×4096)

### Future: Thumbnail Generation

When Supabase Edge Functions are implemented, upload should:
1. Upload full-size panorama to `tours/{spaceId}/{filename}`
2. Trigger Edge Function to generate thumbnail at `tours/{spaceId}/thumbs/{filename}`
3. Store thumbnail path in `scenes.thumbnail_path` (column TBD)
