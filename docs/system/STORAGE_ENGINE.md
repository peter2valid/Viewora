# Storage Engine

The storage engine uses Supabase Storage to manage heavy panorama assets.

## Bucket
- **Name:** `tours`
- **Visibility:** Public (Read-only access to all files). Write access restricted via RLS or authenticated uploads depending on bucket configuration.

## Path Structure
Files are uploaded following this path structure to avoid naming collisions and keep assets organized by space:
`{space_id}/{timestamp}_{random_string}.{extension}`

Example: `550e8400-e29b-41d4-a716-446655440000/1698243810000_abc123.jpg`

## Retrieval
Images are served directly to the Marzipano viewer using Supabase public URLs.
We use the client method:
```js
supabase.storage.from('tours').getPublicUrl(image_path).data.publicUrl
```

## Validation (Client Side)
Currently, basic validation restricts file types to `image/jpeg` and `image/png`. Expected aspect ratio is roughly 2:1 (Equirectangular).
