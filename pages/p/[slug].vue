<template>
  <div class="pv">
    <!-- Loading -->
    <div v-if="pending" class="pv-center">
      <div class="pv-loader"></div>
      <span class="pv-loader-text">Loading property…</span>
    </div>

    <!-- Error -->
    <div v-else-if="fetchError" class="pv-center">
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <p class="pv-err-msg">{{ fetchError }}</p>
    </div>

    <!-- ── Property View ───────────────────────────────────────────────────── -->
    <template v-else-if="property">
      
      <!-- Content Canvas -->
      <div class="pv-main">
        
        <!-- Viewer Section (360 if available, else Cover) -->
        <div class="pv-viewer-area">
          <ClientOnly v-if="property.has_360 && panorama">
            <AppPannellumViewer 
              :panorama-url="panorama.public_url" 
              :auto-rotate="settings?.auto_rotate_enabled"
              :hfov="settings?.hfov_default"
              :pitch="settings?.pitch_default"
              :yaw="settings?.yaw_default"
            />
          </ClientOnly>
          <div v-else class="pv-cover" :style="`background-image: url(${property.cover_image_url || '/images/home/plain land.png'})`" />
          
          <!-- Property Quick Info Overlay -->
          <div class="pv-overlay-info">
            <h1 class="pv-title">{{ property.title }}</h1>
            <p v-if="property.location_text" class="pv-loc">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {{ property.location_text }}
            </p>
          </div>
        </div>

        <!-- Details & Gallery Section -->
        <div class="pv-content">
          <div class="pv-container">
            
            <div class="pv-grid">
              <!-- Left: Description & Gallery -->
              <div class="pv-details">
                <section class="pv-section">
                  <h2 class="pv-section-title">About this property</h2>
                  <p class="pv-description">{{ property.description || 'No description provided.' }}</p>
                </section>

                <section v-if="gallery.length" class="pv-section">
                  <h2 class="pv-section-title">Photo Gallery</h2>
                  <div class="pv-gallery">
                    <div v-for="img in gallery" :key="img.id" class="pv-gallery-item" @click="lightboxImg = img.public_url">
                      <img :src="img.public_url" loading="lazy" />
                    </div>
                  </div>
                </section>
              </div>

              <!-- Right: Lead Form -->
              <div v-if="property.lead_form_enabled" class="pv-sidebar">
                <div class="pv-card lead-card">
                  <h3 class="pv-card-title">Interested?</h3>
                  <p class="text-sm text-muted mb-4">Send an inquiry to the owner.</p>
                  
                  <div v-if="leadSuccess" class="pv-lead-success">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00dc82" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <p>Message sent successfully!</p>
                  </div>

                  <form v-else @submit.prevent="submitLead" class="pv-form">
                    <input v-model="leadForm.name" type="text" placeholder="Your Name" required class="pv-input" />
                    <input v-model="leadForm.email" type="email" placeholder="Email Address" required class="pv-input" />
                    <input v-model="leadForm.phone" type="tel" placeholder="Phone Number" class="pv-input" />
                    <textarea v-model="leadForm.message" placeholder="Message" rows="3" class="pv-input"></textarea>
                    
                    <button type="submit" class="btn btn-dark w-full" :disabled="leadPending">
                      {{ leadPending ? 'Sending...' : 'Send Inquiry' }}
                    </button>
                    <p v-if="leadError" class="pv-err-text mt-2">{{ leadError }}</p>
                  </form>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Watermark -->
      <a v-if="!property.branding_enabled" href="https://viewora.software" target="_blank" class="pv-watermark">
        Powered by Viewora
      </a>

      <!-- Lightbox (Simple) -->
      <div v-if="lightboxImg" class="pv-lightbox" @click="lightboxImg = null">
        <img :src="lightboxImg" />
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })
import { ref, computed, onMounted } from 'vue'

const route = useRoute()
const slug = route.params.slug as string

const pending = ref(true)
const fetchError = ref('')
const property = ref<any>(null)
const lightboxImg = ref<string | null>(null)

// Lead form
const leadPending = ref(false)
const leadError = ref('')
const leadSuccess = ref(false)
const leadForm = ref({ name: '', email: '', phone: '', message: '' })

const media = computed(() => property.value?.property_media || [])
const gallery = computed(() => media.value.filter((m: any) => m.media_type === 'gallery'))
const panorama = computed(() => media.value.find((m: any) => m.media_type === 'panorama'))
const settings = computed(() => property.value?.property_360_settings?.[0])

onMounted(async () => {
  await fetchProperty()
})

async function fetchProperty() {
  pending.value = true
  try {
    const data = await $fetch<any>(`/api/p/${encodeURIComponent(slug)}`)
    property.value = data
    fireViewEvent(data.id)
  } catch (err: any) {
    fetchError.value = err.data?.statusMessage || 'Property not found'
  } finally {
    pending.value = false
  }
}

async function submitLead() {
  leadError.value = ''
  leadPending.value = true
  try {
    await $fetch('/api/leads', {
      method: 'POST',
      body: {
        propertyId: property.value.id,
        ...leadForm.value,
        source: route.query.src || 'direct'
      }
    })
    leadSuccess.value = true
  } catch (err: any) {
    leadError.value = err.data?.statusMessage || 'Failed to send enquiry'
  } finally {
    leadPending.value = false
  }
}

function fireViewEvent(propertyId: string) {
  $fetch('/api/analytics/view', {
    method: 'POST',
    body: { propertyId, source: route.query.src || 'direct' }
  }).catch(() => {})
}

useSeoMeta({
  title: computed(() => property.value ? `${property.value.title} | Viewora` : 'Property Experience'),
  description: computed(() => property.value?.description || 'View this property on Viewora.')
})
</script>

<style scoped>
.pv {
  min-height: 100vh;
  background: #fff;
  color: #0f172a;
  font-family: var(--font-sans);
}

.pv-main {
  display: flex;
  flex-direction: column;
}

.pv-viewer-area {
  height: 70vh;
  position: relative;
  background: #000;
  overflow: hidden;
}

.pv-cover {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
}

.pv-overlay-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4rem 2rem 2rem;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
  color: #fff;
  pointer-events: none;
}

.pv-title { font-size: 2.5rem; font-weight: 800; margin: 0; line-height: 1.1; }
.pv-loc { font-size: 1rem; opacity: 0.9; margin-top: 0.5rem; display: flex; align-items: center; gap: 0.4rem; }

.pv-content { padding: 4rem 0; }
.pv-container { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; }

.pv-grid { display: grid; grid-template-columns: 1fr 350px; gap: 4rem; }

@media (max-width: 900px) {
  .pv-grid { grid-template-columns: 1fr; gap: 2rem; }
  .pv-viewer-area { height: 50vh; }
  .pv-title { font-size: 1.75rem; }
}

.pv-section { margin-bottom: 3rem; }
.pv-section-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.5rem; }
.pv-description { font-size: 1.125rem; line-height: 1.7; color: #475569; white-space: pre-line; }

.pv-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
.pv-gallery-item { aspect-ratio: 3/2; border-radius: 0.75rem; overflow: hidden; cursor: zoom-in; background: #f1f5f9; }
.pv-gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.pv-gallery-item:hover img { transform: scale(1.05); }

.pv-sidebar { position: sticky; top: 2rem; align-self: start; }
.lead-card { padding: 2rem; border: 1px solid #e2e8f0; }
.pv-card-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }

.pv-form { display: flex; flex-direction: column; gap: 0.75rem; }
.pv-input { padding: 0.75rem 1rem; border: 1.5px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.9rem; transition: border-color 0.2s; outline: none; width: 100%; }
.pv-input:focus { border-color: #0f172a; }

.pv-watermark { position: fixed; bottom: 1.5rem; right: 1.5rem; background: rgba(255,255,255,0.9); padding: 0.4rem 0.8rem; border-radius: 99px; font-size: 0.75rem; font-weight: 700; color: #64748b; text-decoration: none; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 50; }

.pv-lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 2rem; cursor: zoom-out; }
.pv-lightbox img { max-width: 100%; max-height: 100%; border-radius: 0.5rem; }

.pv-loader { width: 40px; height: 40px; border: 3px solid #f1f5f9; border-top-color: #0f172a; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.pv-center { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 50vh; gap: 1rem; color: #64748b; }
</style>
