<template>
  <div class="app-page">
    <!-- Header -->
    <div class="app-page-header">
      <div class="flex items-center gap-4">
        <NuxtLink to="/app/properties" class="back-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </NuxtLink>
        <div>
          <h1 class="app-page-title">{{ property?.title || 'Edit Property' }}</h1>
          <p class="app-page-subtitle">Manage media and publishing settings.</p>
        </div>
      </div>
      
      <div class="flex gap-2">
        <a v-if="property?.is_published" :href="`/p/${property.slug}`" target="_blank" class="btn btn-outline">
          View Live
        </a>
        <button class="btn btn-dark" @click="handleTogglePublish" :disabled="publishing">
          {{ property?.is_published ? 'Unpublish' : 'Publish Property' }}
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="editor-tabs">
      <button 
        v-for="tab in ['details', 'gallery', '360', 'share']" 
        :key="tab" 
        :class="['tab-btn', activeTab === tab ? 'tab-btn--active' : '']"
        @click="activeTab = tab"
      >
        {{ tab.toUpperCase() }}
      </button>
    </div>

    <!-- Content Sections -->
    <div class="editor-content card">

      <!-- Details Tab -->
      <div v-if="activeTab === 'details'" class="tab-pane">
        <form @submit.prevent="handleUpdateDetails">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Title</label>
              <input v-model="detailsForm.title" type="text" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">URL Slug</label>
              <input v-model="detailsForm.slug" type="text" class="form-input" placeholder="my-property-name" />
            </div>
            <div class="form-group full-width">
              <label class="form-label">Description</label>
              <textarea v-model="detailsForm.description" class="form-input" rows="4"></textarea>
            </div>
          </div>

          <div class="form-section-divider"></div>

          <div class="toggle-group">
            <div class="toggle-item">
              <div class="toggle-info">
                <span class="toggle-label">Enable Lead Form</span>
                <span class="toggle-desc">Show a contact form on the public page.</span>
              </div>
              <div v-if="!planStore.entitlements?.lead_capture_enabled" class="plan-gate-tag">Plus Plan</div>
              <button 
                v-else
                type="button" 
                :class="['toggle-switch', property?.lead_form_enabled ? 'toggle-switch--on' : '']"
                @click="handleToggleFeature('lead_form_enabled')"
              ></button>
            </div>

            <div class="toggle-item">
              <div class="toggle-info">
                <span class="toggle-label">Custom Branding</span>
                <span class="toggle-desc">Remove Viewora watermark and use your logo.</span>
              </div>
              <div v-if="!planStore.entitlements?.branding_customization_enabled" class="plan-gate-tag">Pro Plan</div>
              <button 
                v-else
                type="button" 
                :class="['toggle-switch', property?.branding_enabled ? 'toggle-switch--on' : '']"
                @click="handleToggleFeature('branding_enabled')"
              ></button>
            </div>
          </div>

          <div class="mt-8 flex justify-end">
            <button type="submit" class="btn btn-dark" :disabled="saving">
              {{ saving ? 'Saving...' : 'Save Details' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Gallery Tab -->
      <div v-if="activeTab === 'gallery'" class="tab-pane">
        <div class="media-grid">
          <div v-for="img in galleryMedia" :key="img.id" class="media-item">
            <img :src="img.public_url" class="media-img" />
            <button class="media-delete" @click="handleDeleteMedia(img.id)">&times;</button>
          </div>
          <label class="upload-label">
            <input type="file" multiple accept="image/*" class="hidden" @change="handleGalleryUpload" />
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Add Photos</span>
          </label>
        </div>
      </div>

      <!-- 360 Tab -->
      <div v-if="activeTab === '360'" class="tab-pane">
        <div v-if="panorama" class="panorama-preview-container">
          <div class="panorama-preview-badge">Active Panorama</div>
          <img :src="panorama.public_url" class="panorama-img-preview" />
          <div class="mt-4 flex gap-4">
            <button class="btn btn-outline btn-sm" @click="handleDeleteMedia(panorama.id)">Remove</button>
            <label class="btn btn-dark btn-sm cursor-pointer">
              Change
              <input type="file" accept="image/*" class="hidden" @change="handlePanoramaUpload" />
            </label>
          </div>
        </div>
        <div v-else>
          <label class="upload-label upload-label--large">
            <input type="file" accept="image/*" class="hidden" @change="handlePanoramaUpload" />
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            <span class="mt-4 font-bold">Upload 360° Panorama</span>
            <span class="text-sm opacity-60">Equirectangular JPEG or PNG</span>
          </label>
        </div>
      </div>

      <!-- Share Tab -->
      <div v-if="activeTab === 'share'" class="tab-pane">
        <div class="share-grid">
          <!-- QR Code Section -->
          <div class="share-section">
            <h3 class="share-title">QR Code</h3>
            <p class="share-desc">Scan this to open the property page instantly.</p>

            <div class="qr-preview-container">
              <img :src="`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicUrl + '?src=qr')}`" class="qr-img" />
            </div>

            <div class="flex flex-col gap-2 mt-4">
              <button v-if="planStore.entitlements?.qr_download_enabled" class="btn btn-outline btn-sm" @click="downloadQR('png')">Download PNG</button>
              <button v-if="planStore.entitlements?.qr_svg_enabled" class="btn btn-outline btn-sm" @click="downloadQR('svg')">Download SVG</button>
              <p v-if="!planStore.entitlements?.qr_download_enabled" class="text-xs text-muted text-center">QR downloads available on Plus plan</p>
              <p v-else-if="!planStore.entitlements?.qr_svg_enabled" class="text-xs text-muted text-center">SVG export available on Pro plan</p>
            </div>
          </div>

          <!-- Links Section -->
          <div class="share-section">
            <h3 class="share-title">Trackable Links</h3>
            <p class="share-desc">Use these links to track where your views come from.</p>

            <div class="link-item">
              <label class="link-label">Direct Link</label>
              <div class="link-input-group">
                <input readonly :value="publicUrl" class="link-input" />
                <button class="copy-btn" @click="copyLink(publicUrl)">Copy</button>
              </div>
            </div>

            <div class="link-item">
              <label class="link-label">WhatsApp Tracked</label>
              <div class="link-input-group">
                <input readonly :value="publicUrl + '?src=whatsapp'" class="link-input" />
                <button class="copy-btn" @click="copyLink(publicUrl + '?src=whatsapp')">Copy</button>
              </div>
            </div>

            <div class="link-item mt-6">
              <label class="link-label">Embed Code</label>
              <div class="link-input-group">
                <textarea readonly :value="embedCode" class="link-input text-xs" rows="2"></textarea>
                <button class="copy-btn" @click="copyLink(embedCode)">Copy</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
import { ref, onMounted } from 'vue'
import { usePlanStore } from '~/stores/plan'

const route = useRoute()
const propertyId = route.params.id as string
const { apiFetch } = useApiFetch()
const supabase = useSupabaseClient()
const planStore = usePlanStore()

const property = ref<any>(null)
const media = ref<any[]>([])
const activeTab = ref('details')
const saving = ref(false)
const publishing = ref(false)

const detailsForm = ref({
  title: '',
  description: '',
  slug: ''
})

const publicUrl = computed(() => {
  const base = window.location.origin
  return `${base}/p/${property.value?.slug || property.value?.id}`
})

const embedCode = computed(() => {
  const base = window.location.origin
  return `<iframe src="${base}/embed/${property.value?.slug || property.value?.id}" width="100%" height="600px" frameborder="0" allowfullscreen></iframe>`
})

const galleryMedia = computed(() => media.value.filter(m => m.media_type === 'gallery'))
const panorama = computed(() => media.value.find(m => m.media_type === 'panorama'))

onMounted(async () => {
  await fetchProperty()
})

async function copyLink(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  } catch (err) {
    alert('Failed to copy')
  }
}

function downloadQR(format: 'png' | 'svg' = 'png') {
  if (format === 'svg' && !planStore.entitlements?.qr_svg_enabled) {
    alert('SVG download is available on the Plus plan and above.')
    return
  }
  const size = format === 'svg' ? '1000x1000' : '500x500'
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}&format=${format}&data=${encodeURIComponent(publicUrl.value + '?src=qr')}`
  window.open(qrUrl, '_blank')
}

async function fetchProperty() {
  const { data: prop } = await supabase.from('properties').select('*').eq('id', propertyId).single()
  const { data: med } = await supabase.from('property_media').select('*').eq('property_id', propertyId)
  
  if (prop) {
    property.value = prop
    detailsForm.value = {
      title: prop.title,
      description: prop.description || '',
      slug: prop.slug || ''
    }
  }
  if (med) media.value = med
}

async function handleUpdateDetails() {
  saving.value = true
  try {
    const updated = await apiFetch<any>(`/properties/${propertyId}`, {
      method: 'PATCH',
      body: detailsForm.value
    })
    property.value = updated
    alert('Details saved!')
  } catch (e) {
    alert('Failed to save details')
  } finally {
    saving.value = false
  }
}

async function handleToggleFeature(feature: string) {
  try {
    const newVal = !property.value[feature]
    const updated = await apiFetch<any>(`/properties/${propertyId}`, {
      method: 'PATCH',
      body: { [feature]: newVal }
    })
    property.value = updated
  } catch (e: any) {
    alert(e.data?.statusMessage || 'Failed to update setting')
  }
}

async function handleTogglePublish() {
  publishing.value = true
  try {
    const isLive = property.value.is_published
    const updated = await apiFetch<any>(`/properties/${propertyId}/publish`, {
      method: 'POST',
      body: { 
        publish: !isLive, 
        slug: detailsForm.value.slug,
        lead_form_enabled: property.value.lead_form_enabled,
        branding_enabled: property.value.branding_enabled
      }
    })
    property.value = updated
  } catch (e: any) {
    alert(e.data?.statusMessage || 'Publishing failed')
  } finally {
    publishing.value = false
  }
}

async function handleGalleryUpload(e: any) {
  const files = e.target.files as FileList
  if (!files.length) return

  for (const file of Array.from(files)) {
    await uploadFile(file, 'gallery')
  }
}

async function handlePanoramaUpload(e: any) {
  const file = e.target.files[0] as File
  if (!file) return
  await uploadFile(file, 'panorama')
}

async function uploadFile(file: File, type: string) {
  try {
    // 1. Get signed URL
    const { signedUrl, objectKey, publicUrl } = await apiFetch<any>('/uploads/create-signed-url', {
      method: 'POST',
      body: {
        propertyId,
        mediaType: type,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size
      }
    })

    // 2. Upload to R2
    await $fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type }
    })

    // 3. Complete
    const record = await apiFetch<any>('/uploads/complete', {
      method: 'POST',
      body: {
        propertyId,
        mediaType: type,
        objectKey,
        publicUrl,
        fileSize: file.size
      }
    })
    
    media.value.push(record)
  } catch (err: any) {
    alert(`Failed to upload ${file.name}: ${err.data?.statusMessage || err.message}`)
  }
}

async function handleDeleteMedia(id: string) {
  if (!confirm('Delete this media?')) return
  const { error } = await supabase.from('property_media').delete().eq('id', id)
  if (!error) media.value = media.value.filter(m => m.id !== id)
}
</script>

<style scoped>
.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f1f5f9;
  color: #0f172a;
  transition: all 0.2s;
}
.back-btn:hover { background: #e2e8f0; }

.editor-tabs {
  display: flex;
  gap: 1.5rem;
  margin-top: 2rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.5rem;
}

.tab-btn {
  background: none;
  border: none;
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
  padding: 0.5rem 0;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-btn--active {
  color: #0f172a;
  border-bottom-color: #0f172a;
}

.editor-content {
  margin-top: 1.5rem;
  padding: 2rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}
.full-width { grid-column: span 2; }

.form-section-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 2rem 0;
}

.toggle-group {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
}

.toggle-info {
  display: flex;
  flex-direction: column;
}

.toggle-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: #0f172a;
}

.toggle-desc {
  font-size: 0.8rem;
  color: #64748b;
}

.toggle-switch {
  width: 40px;
  height: 20px;
  background: #e2e8f0;
  border-radius: 99px;
  border: none;
  position: relative;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  transition: all 0.2s;
}

.toggle-switch--on { background: #00dc82; }
.toggle-switch--on::after { left: 22px; }

.plan-gate-tag {
  font-size: 0.7rem;
  font-weight: 700;
  color: #0f172a;
  background: #f1f5f9;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.panorama-preview-container {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  padding: 1rem;
  position: relative;
}

.panorama-preview-badge {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  background: #0f172a;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.panorama-img-preview {
  width: 100%;
  aspect-ratio: 2/1;
  object-fit: cover;
  border-radius: 0.5rem;
}

.upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  border: 2px dashed #e2e8f0;
  border-radius: 1rem;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.upload-label:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.upload-label--large { padding: 5rem; }

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.media-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 0.5rem;
  overflow: hidden;
  background: #f1f5f9;
}

.media-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-delete {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  width: 20px;
  height: 20px;
  background: rgba(0,0,0,0.5);
  color: #fff;
  border: none;
  border-radius: 50%;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.panorama-preview {
  padding: 2rem;
  background: #f1f5f9;
  border-radius: 1rem;
  text-align: center;
}

/* ── Share Tab Styles ── */
.share-grid {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 3rem;
}

@media (max-width: 768px) {
  .share-grid { grid-template-columns: 1fr; gap: 2rem; }
}

.share-section {
  display: flex;
  flex-direction: column;
}

.share-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.share-desc {
  font-size: 0.8rem;
  color: #64748b;
  margin-bottom: 1.5rem;
}

.qr-preview-container {
  padding: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  aspect-ratio: 1;
}

.qr-img {
  max-width: 100%;
  height: auto;
}

.link-item {
  margin-bottom: 1.25rem;
}

.link-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 0.4rem;
}

.link-input-group {
  display: flex;
  gap: 0.5rem;
}

.link-input {
  flex: 1;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 0.5rem 0.75rem;
  border-radius: 0.4rem;
  font-size: 0.85rem;
  color: #475569;
  font-family: monospace;
}

.copy-btn {
  background: #0f172a;
  color: #fff;
  border: none;
  padding: 0 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 0.4rem;
  cursor: pointer;
}
</style>
