# Upload State Contract (Frontend <-> Backend)

This document defines the upload lifecycle contract for the app frontend and backend.

## Scope

- Frontend: viewora-app
- Backend routes:
  - POST /uploads/create-signed-url
  - POST /uploads/complete
  - POST /uploads/:id/retry-processing
  - DELETE /uploads/:id
  - GET /spaces/:id (used for polling processing state)

## Canonical Media States

Backend media processing statuses:

- pending: upload metadata registered, processing queued
- processing: worker is processing media
- complete: processing finished successfully
- failed: processing failed, user can retry

Frontend must treat these as the only canonical lifecycle states.

## State Machine

1. local_select
2. signing
3. uploading
4. registering
5. pending
6. processing
7. complete | failed
8. retrying (from failed) -> pending

UI-level transient states (signing/uploading/registering/retrying) are local-only.
Backend statuses (pending/processing/complete/failed) are persisted and source of truth.

## Endpoint Contracts

### 1) POST /uploads/create-signed-url

Purpose: request a one-time presigned PUT URL.

Request body:

```json
{
  "spaceId": "uuid",
  "mediaType": "panorama|gallery|gallery_image|thumb|thumbnail|logo|floor_plan|branding_logo|audio",
  "fileName": "string",
  "contentType": "string",
  "fileSize": 12345
}
```

Success response (200):

```json
{
  "signedUrl": "https://...",
  "objectKey": "users/<uid>/spaces/<spaceId>/...",
  "publicUrl": "https://media.../..."
}
```

Common failures:

- 400 VALIDATION_ERROR (invalid payload)
- 400 Invalid file type
- 403 Unauthorized to upload to this space
- 403 Storage limit reached / plan cannot write
- 413 File too large
- 429 RATE_LIMITED

Frontend behavior:

- move local item to signing
- on success -> uploading
- on failure -> error toast + local item failed (not persisted)

### 2) PUT signedUrl (direct to R2)

Purpose: binary upload.

Request:

- method: PUT
- body: file bytes
- header: Content-Type = file.type

Success:

- HTTP 200/204 from storage provider

Failure:

- network/provider errors

Frontend behavior:

- uploading progress bar (if available via XHR/fetch strategy)
- on success -> registering
- on failure -> show retry action for local upload step

### 3) POST /uploads/complete

Purpose: register uploaded object and enqueue processing.

Request body:

```json
{
  "spaceId": "uuid",
  "mediaType": "panorama|gallery|gallery_image|thumb|thumbnail|logo|floor_plan|branding_logo|audio",
  "objectKey": "users/<uid>/...",
  "publicUrl": "https://...",
  "width": 4096,
  "height": 2048,
  "fileSize": 12345
}
```

Success response (200): property_media row.
Important fields used by frontend:

```json
{
  "id": "uuid",
  "property_id": "uuid",
  "media_type": "gallery_image",
  "public_url": "https://...",
  "storage_key": "users/<uid>/...",
  "processing_status": "pending"
}
```

Idempotency behavior:

- if same objectKey already exists for same space, backend returns existing row
- if existing row is failed, backend moves it to pending and requeues processing

Common failures:

- 403 Invalid object key ownership
- 403 Unauthorized
- 400 VALIDATION_ERROR
- 429 RATE_LIMITED
- 500 Failed to save media record

Frontend behavior:

- append returned media row into media list
- if status is pending or processing, start polling GET /spaces/:id every 3s

### 4) POST /uploads/:id/retry-processing

Purpose: retry backend processing for failed media.

Success response (200):

```json
{
  "mediaId": "uuid",
  "status": "pending"
}
```

Common failures:

- 404 Media not found or unauthorized
- 409 Media is already processing

Frontend behavior:

- disable retry button while request in flight
- on success, set row status to pending and restart polling

### 5) DELETE /uploads/:id

Purpose: remove media from storage + database.

Success response: 204

Frontend behavior:

- optimistic remove or remove after success
- show destructive confirmation modal

## Polling Contract

Frontend should poll GET /spaces/:id while any media has:

- pending
- processing

Polling interval: 3 seconds
Stop polling when all media statuses are either:

- complete
- failed

## UI Mapping

Map backend status to UX:

- pending -> "Queued"
- processing -> "Processing"
- complete -> "Ready"
- failed -> "Failed" + "Retry" action

Recommended badge colors:

- pending: amber
- processing: blue
- complete: green
- failed: red

## Error Contract

Backend may return either envelope format with:

- code
- message
- fields (for validation)

Frontend must display:

- field-level validation errors when fields[] exists
- fallback toast using message
- final fallback: generic upload error

## Required Frontend Guarantees

- Never call /uploads/complete before signed PUT succeeds
- Always use returned objectKey/publicUrl from create-signed-url
- Never modify objectKey client-side
- Respect retry-processing for failed media instead of re-uploading bytes
- Keep UI state resilient to refresh by reading processing_status from server

## Minimal Integration Checklist

- Use local transient states: signing/uploading/registering
- Persist server states from processing_status
- Add polling loop on pending/processing
- Add retry button for failed state
- Add delete confirmation + DELETE call
- Surface validation and quota errors clearly
