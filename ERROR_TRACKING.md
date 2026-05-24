# Error Tracking Setup - Complete Guide

## Overview

Your app now has **comprehensive error tracking** integrated across the entire stack:
- **Sentry** — Application errors, crashes, replay
- **PostHog** — User-level error events
- **Custom Error Logger** — Centralized, contextual error reporting

---

## 🚀 Quick Start

### 1. Install Sentry (if not done)
```bash
cd viewora-app
npm install @sentry/vue
```

### 2. Set Environment Variables
```env
# .env.local or deployment config
NUXT_PUBLIC_SENTRY_DSN=https://your-key@your-org.sentry.io/project-id
NUXT_PUBLIC_POSTHOG_KEY=your-posthog-key
```

### 3. Verify Setup
The error logger is **automatically initialized** in:
- `plugins/sentry.client.ts` — Vue error handler + unhandled promise rejections
- `plugins/posthog.client.ts` — Event capture
- `composables/useApiFetch.ts` — API error tracking
- `features/viewer/panorama/PsvViewer.vue` — Viewer & hotspot errors

---

## 📊 What Gets Tracked

### ✅ Automatically Tracked
- **Vue component errors** (any thrown error in a component)
- **Unhandled promise rejections**
- **API errors** (all failed requests)
- **Viewer errors** (panorama load, scene switching)
- **Hotspot errors** (drag, sync, rendering)
- **Network errors** (timeouts, connection failures)

### Manual Tracking
Use the `useErrorTracking()` composable to log errors anywhere:

```vue
<script setup lang="ts">
import { useErrorTracking } from '~/composables/useErrorTracking'

const { logEditorError, logHotspotError } = useErrorTracking()

const handleEditorSave = async () => {
  try {
    await saveEditorState()
  } catch (error) {
    logEditorError(error, {
      action: 'save_state',
      metadata: { stateSize: 1024 },
      severity: 'high'
    })
  }
}

const handleHotspotClick = async (hotspotId) => {
  try {
    await loadHotspotData(hotspotId)
  } catch (error) {
    logHotspotError(error, {
      hotspotId,
      action: 'load_data',
      severity: 'medium'
    })
  }
}
</script>
```

---

## 🔧 API Reference

### useErrorTracking()
Available in any component/composable:

```typescript
import { useErrorTracking } from '~/composables/useErrorTracking'

const {
  // Generic error logging
  logError,
  
  // Feature-specific loggers
  logApiError,
  logViewerError,
  logHotspotError,
  logEditorError,
  
  // Debugging
  getErrorHistory,
  clearErrorHistory
} = useErrorTracking()
```

### logError(error, context)
**Generic error logging**
```typescript
logError(new Error('Something went wrong'), {
  component: 'MyComponent',
  action: 'user_action',
  metadata: { userId: '123', data: {...} },
  severity: 'high' // 'low' | 'medium' | 'high' | 'critical'
})
```

### logApiError(error, endpoint, method?, statusCode?, context?)
**API-specific errors**
```typescript
logApiError(
  error,
  '/api/spaces',
  'POST',
  500,
  {
    component: 'SpacesList',
    metadata: { retryCount: 3 }
  }
)
```

### logViewerError(error, context?)
**Panorama viewer errors**
```typescript
logViewerError(error, {
  component: 'PsvViewer',
  action: 'scene_load',
  sceneId: 'scene-123',
  severity: 'high'
})
```

### logHotspotError(error, context?)
**Hotspot-related errors**
```typescript
logHotspotError(error, {
  hotspotId: 'hs-456',
  action: 'drag',
  severity: 'medium'
})
```

### logEditorError(error, context?)
**Editor/dashboard errors**
```typescript
logEditorError(error, {
  action: 'save_tour',
  metadata: { tourId: 'tour-789' },
  severity: 'high'
})
```

---

## 🎯 Common Scenarios

### Scenario 1: Track API Failures
```typescript
// Already done in useApiFetch!
// But you can also manually log:

const { apiFetch } = useApiFetch()
const { logApiError } = useErrorTracking()

try {
  const data = await apiFetch('/api/spaces')
} catch (error) {
  logApiError(error, '/api/spaces', 'GET', 500, {
    component: 'SpacesList'
  })
}
```

### Scenario 2: Track Form Submissions
```vue
<script setup lang="ts">
import { useErrorTracking } from '~/composables/useErrorTracking'

const { logEditorError } = useErrorTracking()

const handleSubmit = async (formData) => {
  try {
    await submitForm(formData)
  } catch (error) {
    logEditorError(error, {
      action: 'form_submit',
      metadata: { formName: 'SpaceSettings', fields: Object.keys(formData) }
    })
  }
}
</script>
```

### Scenario 3: Track Image Load Failures
```typescript
const handleImageError = (error) => {
  const { logViewerError } = useErrorTracking()
  
  logViewerError(error, {
    component: 'ImageLoader',
    action: 'image_load',
    sceneId: currentSceneId.value,
    metadata: { imageUrl: imageUrl.value },
    severity: 'high'
  })
}
```

### Scenario 4: Track Hotspot Interactions
```typescript
const handleHotspotInteraction = async (hotspotId) => {
  const { logHotspotError } = useErrorTracking()
  
  try {
    await executeHotspotAction(hotspotId)
  } catch (error) {
    logHotspotError(error, {
      hotspotId,
      action: 'execute_action',
      metadata: { hotspotType: 'scene_link' }
    })
  }
}
```

---

## 📈 Error Context Fields

When logging errors, provide context:

```typescript
interface ErrorContext {
  component?: string        // Vue component name
  feature?: string          // Feature area (auto-set for logViewerError, etc)
  action?: string           // What was being done (e.g., 'load', 'save', 'delete')
  metadata?: Record<...>    // Custom data (IDs, counts, URLs, etc)
  userId?: string           // User ID (auto-captured by Sentry)
  severity?: string         // 'low' | 'medium' | 'high' | 'critical'
}
```

---

## 🔍 Debugging

### View Error History
```typescript
const { getErrorHistory } = useErrorTracking()

const errors = getErrorHistory()
errors.forEach(log => {
  console.log(log.timestamp, log.context.action, log.error)
})
```

### Clear History (if needed)
```typescript
const { clearErrorHistory } = useErrorTracking()
clearErrorHistory()
```

---

## 🌍 Where Errors Go

| Error Type | Sentry | PostHog | Console |
|---|---|---|---|
| Vue component errors | ✅ | ✅ | ✅ (dev) |
| Unhandled rejections | ✅ | ✅ | ✅ (dev) |
| API errors | ✅ | ✅ | ✅ (dev) |
| Viewer errors | ✅ | ✅ | ✅ (dev) |
| Hotspot errors | ✅ | ✅ | ✅ (dev) |

---

## 🚨 Severity Levels

Use appropriate severity for better filtering:

- **`'low'`** — User input validation, non-critical failures
- **`'medium'`** — API timeouts, recoverable errors
- **`'high'`** — Critical features broken (viewer, hotspots)
- **`'critical'`** — Auth failures, data corruption

---

## 📋 Files Added/Modified

### New Files
- `/utils/errorLogger.ts` — Core error logger class
- `/composables/useErrorTracking.ts` — Vue composable

### Modified Files
- `/plugins/sentry.client.ts` — Enhanced with errorLogger integration
- `/plugins/posthog.client.ts` — PostHog instance connection
- `/composables/useApiFetch.ts` — API error tracking
- `/features/viewer/panorama/PsvViewer.vue` — Viewer & hotspot error tracking

---

## ✅ Setup Checklist

- [ ] Install @sentry/vue: `npm install @sentry/vue`
- [ ] Set `NUXT_PUBLIC_SENTRY_DSN` in `.env`
- [ ] Set `NUXT_PUBLIC_POSTHOG_KEY` in `.env`
- [ ] Test in development (errors go to console)
- [ ] Deploy to production (errors go to Sentry + PostHog)
- [ ] Add error tracking to new features using `useErrorTracking()`

---

## 🎓 Best Practices

1. **Always log with context** — Include component, action, and metadata
2. **Set severity appropriately** — Helps with triage and alerts
3. **Include relevant IDs** — sceneId, hotspotId, userId, etc
4. **Log at feature boundaries** — API calls, user actions, critical paths
5. **Don't over-log** — Avoid logging every single operation
6. **Use feature-specific loggers** — `logViewerError()`, `logHotspotError()`, etc

---

## 🆘 Troubleshooting

### Errors not appearing in Sentry?
1. Check `NUXT_PUBLIC_SENTRY_DSN` is set correctly
2. Errors in dev mode are silenced by default (see `beforeSend` in sentry.client.ts)
3. Check browser console for Sentry initialization errors

### PostHog not capturing events?
1. Check `NUXT_PUBLIC_POSTHOG_KEY` is set
2. In dev mode, PostHog is disabled by default (`opt_out_capturing()`)
3. Check Network tab for `/ingest` requests

### Missing error details?
1. Always pass a context object with relevant metadata
2. Use specific error loggers (logViewerError vs logError)
3. Check that severity is set appropriately

---

That's it! Your error tracking is now fully operational. 🎉
