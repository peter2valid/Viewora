<template>
  <div class="details-panel">
    <input ref="logoFileInput" type="file" accept="image/*" class="hidden-input" @change="handleLogoFileChange" />

    <header class="details-header">
      <NuxtLink to="/app/spaces" class="details-back" title="Back to spaces">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </NuxtLink>
      <div class="details-header__title">
        <SpacePill :name="space?.title || 'MY TOUR'" mode="Details" />
        <p>Name, price, facts, and contact info for this listing.</p>
        <div class="details-legend">
          <span class="details-legend__item"><span class="df-field__req">required</span> — every listing needs one</span>
          <span class="details-legend__item"><span class="df-field__rec">recommended</span> — buyers can't contact you without it</span>
          <span class="details-legend__item"><span class="df-field__opt">optional</span> — fine to leave blank</span>
        </div>
      </div>
    </header>

    <div v-if="pending" class="details-empty"><span class="df-spin" /></div>

    <form v-else class="details-body" @submit.prevent="save">

      <!-- SECTION 1: Listing Basics — everything a buyer sees the moment
           the tour opens (view/p/[slug].vue: title, price/status row,
           location, facts row, amenities). Ordered top-to-bottom to match
           that page, and ordered BEFORE Description so the AI draft below
           has real facts to work from on the first pass. -->
      <section class="df-card">
        <div class="df-card__head">
          <span class="df-card__num">1</span>
          <div>
            <h2 class="df-card__title">Listing Basics</h2>
            <p class="df-card__sub">What buyers see first — title, price, location, and facts.</p>
          </div>
        </div>

        <div class="df-field">
          <label class="df-field__label">Name <span class="df-field__req">required</span></label>
          <input class="df-input" v-model="draft.title" placeholder="Enter listing name" maxlength="120" />
        </div>

        <div class="df-field">
          <label class="df-field__label">Location <span class="df-field__opt">optional</span></label>
          <div class="df-location-wrap">
            <div class="df-location-input-row">
              <input
                class="df-input"
                :value="draft.locationText"
                placeholder="Search a location…"
                @input="onLocationInput(($event.target as HTMLInputElement).value)"
              />
              <div v-if="locationSearching" class="df-location-spin" />
            </div>
            <div v-if="locationDropOpen && locationResults.length" class="df-location-drop">
              <button v-for="r in locationResults" :key="r.lat + r.lon" class="df-location-result" type="button" @click="selectLocation(r)">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="df-location-pin" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <span class="df-location-text">{{ r.display_name }}</span>
              </button>
            </div>
            <iframe v-if="mapEmbedUrl" :src="mapEmbedUrl" class="df-map" frameborder="0" scrolling="no" title="Location map" />
          </div>
          <div class="df-hint">Buyers only see this as text under the title — search just helps you find accurate wording, the map itself isn't shown on the tour.</div>
        </div>

        <div class="df-field-grid">
          <div class="df-field">
            <label class="df-field__label">Price (KES) <span class="df-field__opt">optional</span></label>
            <input class="df-input" v-model.number="draft.priceKes" type="number" min="0" placeholder="e.g. 18500000" />
          </div>
          <div class="df-field">
            <label class="df-field__label">Status</label>
            <div class="df-seg">
              <button
                v-for="opt in listingStatusOptions"
                :key="opt.value"
                class="df-seg__btn"
                :class="{ 'df-seg__btn--active': draft.listingStatus === opt.value }"
                type="button"
                @click="draft.listingStatus = opt.value"
              >{{ opt.label }}</button>
            </div>
          </div>
        </div>

        <template v-if="space?.space_type === 'residential'">
          <div class="df-field-grid">
            <div class="df-field">
              <label class="df-field__label">Bedrooms <span class="df-field__opt">optional</span></label>
              <input class="df-input" v-model.number="draft.bedrooms" type="number" min="0" placeholder="0" />
            </div>
            <div class="df-field">
              <label class="df-field__label">Bathrooms <span class="df-field__opt">optional</span></label>
              <input class="df-input" v-model.number="draft.bathrooms" type="number" min="0" placeholder="0" />
            </div>
          </div>
          <div class="df-field">
            <label class="df-field__label">Floor Area (m²) <span class="df-field__opt">optional</span></label>
            <input class="df-input" v-model.number="draft.areaSqm" type="number" min="0" placeholder="e.g. 220" />
          </div>
        </template>

        <template v-else-if="space?.space_type === 'automotive'">
          <div class="df-field-grid">
            <div class="df-field">
              <label class="df-field__label">Year <span class="df-field__opt">optional</span></label>
              <input class="df-input" v-model.number="draft.vehicleYear" type="number" min="1900" max="2100" placeholder="e.g. 2021" />
            </div>
            <div class="df-field">
              <label class="df-field__label">Mileage (km) <span class="df-field__opt">optional</span></label>
              <input class="df-input" v-model.number="draft.vehicleMileageKm" type="number" min="0" placeholder="e.g. 45000" />
            </div>
          </div>
          <div class="df-field">
            <label class="df-field__label">Transmission <span class="df-field__opt">optional</span></label>
            <div class="df-seg">
              <button
                v-for="opt in vehicleTransmissionOptions"
                :key="opt.value"
                class="df-seg__btn"
                :class="{ 'df-seg__btn--active': draft.vehicleTransmission === opt.value }"
                type="button"
                @click="draft.vehicleTransmission = opt.value"
              >{{ opt.label }}</button>
            </div>
          </div>
          <div class="df-field">
            <label class="df-field__label">Fuel Type <span class="df-field__opt">optional</span></label>
            <div class="df-seg">
              <button
                v-for="opt in vehicleFuelTypeOptions"
                :key="opt.value"
                class="df-seg__btn"
                :class="{ 'df-seg__btn--active': draft.vehicleFuelType === opt.value }"
                type="button"
                @click="draft.vehicleFuelType = opt.value"
              >{{ opt.label }}</button>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="df-field">
            <label class="df-field__label">Floor Area (m²) <span class="df-field__opt">optional</span></label>
            <input class="df-input" v-model.number="draft.areaSqm" type="number" min="0" placeholder="e.g. 500" />
          </div>
        </template>

        <div class="df-field">
          <label class="df-field__label">Amenities <span class="df-field__opt">optional</span></label>
          <div v-if="draft.amenities.length" class="df-tags">
            <span v-for="(a, i) in draft.amenities" :key="a" class="df-tag">
              {{ a }}
              <button type="button" class="df-tag__remove" :aria-label="`Remove ${a}`" @click="removeAmenity(i)">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </span>
          </div>
          <input
            class="df-input"
            v-model="amenityDraft"
            placeholder="Type an amenity and press Enter — e.g. Parking"
            maxlength="60"
            @keydown.enter.prevent="addAmenity"
            @keydown="onAmenityKeydown"
          />
        </div>
      </section>

      <!-- SECTION 2: Description — comes after Basics on purpose, so the AI
           draft (grounded in price/facts/amenities above) has something
           real to work from on the very first click. -->
      <section class="df-card">
        <div class="df-card__head">
          <span class="df-card__num">2</span>
          <div>
            <h2 class="df-card__title">Description</h2>
            <p class="df-card__sub">The story buyers read under "About" on your listing.</p>
          </div>
        </div>

        <div class="df-field">
          <div class="df-field__label-row">
            <label class="df-field__label">Description <span class="df-field__opt">optional</span></label>
            <button type="button" class="df-ai-btn" :disabled="generatingDescription" @click="generateDescription">
              <span v-if="generatingDescription" class="df-spin df-spin--invert" />
              <span v-else>✨ Generate with AI</span>
            </button>
          </div>
          <textarea class="df-textarea" v-model="draft.description" placeholder="Describe this listing…" rows="4" />
          <div class="df-hint">Drafts from the price, facts, and amenities above — review and edit before saving.</div>
        </div>
      </section>

      <!-- SECTION 3: Contact — the one field that actually adds a working
           button to the live tour (the green Chat button + the seller
           contact card). Kept as its own section since it's the single
           highest-impact field on this whole page. -->
      <section class="df-card">
        <div class="df-card__head">
          <span class="df-card__num">3</span>
          <div>
            <h2 class="df-card__title">Contact</h2>
            <p class="df-card__sub">Powers the Chat button buyers tap to reach you.</p>
          </div>
        </div>

        <div class="df-field">
          <label class="df-field__label">WhatsApp Number <span class="df-field__rec">recommended</span></label>
          <input class="df-input" v-model="draft.phone" placeholder="+27117537025 or +254712345678" type="tel" />
          <div class="df-hint">Include the country code (e.g. +27 for SA, +254 for Kenya). Without this, buyers have no way to contact you from the tour.</div>
        </div>
      </section>

      <!-- SECTION 4: Classic Tour Page & Embed — everything below only
           renders on the standalone /p/[id] tour link and embedded tours
           (components/viewer/PsvViewer.vue's post-tour card, gated on
           hideOwnChrome — which the main listing page always sets, so none
           of this shows there). Kept last and clearly scoped so filling it
           out isn't mistaken for changing the main listing page. -->
      <section class="df-card">
        <div class="df-card__head">
          <span class="df-card__num">4</span>
          <div>
            <h2 class="df-card__title">Classic Tour Page &amp; Embed</h2>
            <p class="df-card__sub">Only shown on the standalone tour link (viewora.software/p/…) and when embedded elsewhere — not on your main listing page.</p>
          </div>
        </div>

        <div class="df-field">
          <label class="df-field__label">Email <span class="df-field__opt">optional</span></label>
          <input class="df-input" v-model="draft.email" placeholder="contact@example.com" type="email" />
        </div>

        <div class="df-field">
          <label class="df-field__label">Brand Logo <span class="df-field__opt">optional</span></label>
          <div class="df-logo-area" @click="logoFileInput?.click()">
            <template v-if="draft.logoUrl">
              <img :src="draft.logoUrl" class="df-logo-preview" alt="Logo" />
              <button class="df-logo-remove" type="button" @click.stop="clearLogo()" aria-label="Remove logo">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </template>
            <template v-else>
              <div class="df-logo-placeholder">
                <svg v-if="!logoUploading" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <span v-if="logoUploading" class="df-spin" />
                <span class="df-logo-hint">{{ logoUploading ? 'Uploading…' : 'Click to upload logo' }}</span>
              </div>
            </template>
          </div>
          <button
            v-if="draft.logoUrl"
            class="df-bg-remove-btn"
            type="button"
            :class="{ 'df-bg-remove-btn--done': bgRemoved }"
            :disabled="bgRemoving"
            @click.prevent="handleRemoveBg"
          >
            <span v-if="bgRemoving" class="df-spin df-spin--invert" />
            <template v-else-if="bgRemoved">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
              Background removed
            </template>
            <template v-else>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              Remove background
            </template>
          </button>
        </div>

        <div class="df-toggle-row">
          <div>
            <div class="df-field__label">CTA Button</div>
            <div class="df-hint">Adds a call-to-action button to the standalone tour and its post-tour card</div>
          </div>
          <button
            class="df-toggle"
            type="button"
            :class="{ 'df-toggle--on': draft.ctaEnabled }"
            role="switch"
            :aria-checked="draft.ctaEnabled"
            @click="draft.ctaEnabled = !draft.ctaEnabled"
          >
            <span class="df-toggle-thumb" />
          </button>
        </div>

        <template v-if="draft.ctaEnabled">
          <div class="df-field">
            <label class="df-field__label">Button Text</label>
            <input class="df-input" v-model="draft.ctaButtonText" placeholder="Book a Viewing" maxlength="40" />
          </div>

          <div class="df-field">
            <label class="df-field__label">Action</label>
            <div class="df-seg">
              <button
                v-for="opt in ctaActionOptions"
                :key="opt.value"
                class="df-seg__btn"
                :class="{ 'df-seg__btn--active': draft.ctaAction === opt.value }"
                type="button"
                @click="draft.ctaAction = opt.value"
              >{{ opt.label }}</button>
            </div>
          </div>

          <div class="df-field">
            <label class="df-field__label">
              {{ draft.ctaAction === 'link' ? 'URL' : draft.ctaAction === 'email' ? 'Email Address' : 'Phone Number' }}
            </label>
            <input
              class="df-input"
              v-model="draft.ctaDestination"
              :placeholder="draft.ctaAction === 'link' ? 'https://...' : draft.ctaAction === 'email' ? 'agent@example.com' : '+1 (555) 000-0000'"
              :type="draft.ctaAction === 'link' ? 'url' : draft.ctaAction === 'email' ? 'email' : 'tel'"
            />
          </div>
        </template>
      </section>

      <div class="details-spacer" />
    </form>

    <div v-if="!pending" class="details-savebar">
      <span class="details-savebar__hint">{{ isDirty ? 'Unsaved changes' : 'All changes saved' }}</span>
      <button class="details-savebar__btn" :disabled="saving" @click="save">
        <span v-if="saving" class="df-spin" />
        <template v-else>Save Changes</template>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useApiFetch } from '~/composables/useApiFetch'
import { useSpaces } from '~/composables/useSpaces'
import SpacePill from '~/features/editor/components/SpacePill.vue'
import { toast } from 'vue-sonner'

const props = defineProps<{ spaceId: string }>()

const { apiFetch } = useApiFetch()
const { fetchSpace: fetchSpaceRaw } = useSpaces()

const space = ref<any>(null)
const pending = ref(true)
const saving = ref(false)
const isDirty = ref(false)

function showToast(message: string, type: 'success' | 'error' = 'success') {
  if (type === 'error') toast.error(message)
  else toast.success(message)
}

// v-model.number leaves the ref as '' (not null) when a number input is
// cleared — Vue's own looseToNumber() only coerces strings that parse as a
// valid float and passes anything else through unchanged. A bare `!== null`
// guard would let '' slip into a PATCH/POST body and fail the backend's
// z.number() validation. Treats null/''/NaN alike as "not set".
function positiveNumberOrUndefined(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined
}

const draft = ref({
  title: '',
  description: '',
  locationText: '',
  locationLat: null as number | null,
  locationLng: null as number | null,
  logoUrl: '',
  phone: '',
  email: '',
  ctaEnabled: false,
  ctaButtonText: 'Book a Viewing',
  ctaAction: 'link' as 'link' | 'email' | 'phone',
  ctaDestination: '',
  priceKes: null as number | null,
  listingStatus: 'available' as 'available' | 'sold' | 'rented',
  bedrooms: null as number | null,
  bathrooms: null as number | null,
  areaSqm: null as number | null,
  vehicleYear: null as number | null,
  vehicleMileageKm: null as number | null,
  vehicleTransmission: '' as '' | 'manual' | 'automatic',
  vehicleFuelType: '' as '' | 'petrol' | 'diesel' | 'electric' | 'hybrid',
  amenities: [] as string[],
})

function draftFromSpace(s: any) {
  return {
    title: s?.title ?? '',
    description: s?.description ?? '',
    locationText: s?.location_text ?? '',
    locationLat: s?.location_lat ?? null,
    locationLng: s?.location_lng ?? null,
    logoUrl: s?.logo_url ?? '',
    phone: s?.phone ?? '',
    email: s?.email ?? '',
    ctaEnabled: s?.cta_enabled ?? false,
    ctaButtonText: s?.cta_button_text ?? 'Book a Viewing',
    ctaAction: (s?.cta_action as 'link' | 'email' | 'phone') ?? 'link',
    ctaDestination: s?.cta_destination ?? '',
    priceKes: s?.price_kes ?? null,
    listingStatus: (s?.listing_status as 'available' | 'sold' | 'rented') ?? 'available',
    bedrooms: s?.bedrooms ?? null,
    bathrooms: s?.bathrooms ?? null,
    areaSqm: s?.area_sqm ?? null,
    vehicleYear: s?.vehicle_year ?? null,
    vehicleMileageKm: s?.vehicle_mileage_km ?? null,
    vehicleTransmission: (s?.vehicle_transmission as '' | 'manual' | 'automatic') ?? '',
    vehicleFuelType: (s?.vehicle_fuel_type as '' | 'petrol' | 'diesel' | 'electric' | 'hybrid') ?? '',
    amenities: [...(s?.amenities ?? [])],
  }
}

async function loadSpace() {
  pending.value = true
  try {
    space.value = await fetchSpaceRaw(props.spaceId)
    if (!space.value) { showToast('Failed to load listing details', 'error'); return }
    draft.value = draftFromSpace(space.value)
  } finally {
    pending.value = false
  }
}
onMounted(loadSpace)

watch(draft, () => { isDirty.value = true }, { deep: true })

// ── Save ──────────────────────────────────────────────────────────────────
async function save() {
  if (saving.value) return
  saving.value = true

  const spacePatch: Record<string, any> = {
    title: draft.value.title.trim() || space.value?.title,
    description: draft.value.description || null,
    location_text: draft.value.locationText || null,
    logo_url: draft.value.logoUrl || null,
    phone: draft.value.phone || null,
    email: draft.value.email || null,
    cta_enabled: draft.value.ctaEnabled,
    cta_button_text: draft.value.ctaButtonText || 'Book a Viewing',
    cta_action: draft.value.ctaAction,
    cta_destination: draft.value.ctaDestination || null,
    listing_status: draft.value.listingStatus,
    amenities: draft.value.amenities,
  }
  if (draft.value.locationLat !== null) spacePatch.location_lat = draft.value.locationLat
  if (draft.value.locationLng !== null) spacePatch.location_lng = draft.value.locationLng
  const price = positiveNumberOrUndefined(draft.value.priceKes)
  if (price !== undefined && price > 0) spacePatch.price_kes = price
  const bedrooms = positiveNumberOrUndefined(draft.value.bedrooms)
  if (bedrooms !== undefined) spacePatch.bedrooms = bedrooms
  const bathrooms = positiveNumberOrUndefined(draft.value.bathrooms)
  if (bathrooms !== undefined) spacePatch.bathrooms = bathrooms
  const areaSqm = positiveNumberOrUndefined(draft.value.areaSqm)
  if (areaSqm !== undefined) spacePatch.area_sqm = areaSqm
  const vehicleYear = positiveNumberOrUndefined(draft.value.vehicleYear)
  if (vehicleYear !== undefined) spacePatch.vehicle_year = vehicleYear
  const vehicleMileageKm = positiveNumberOrUndefined(draft.value.vehicleMileageKm)
  if (vehicleMileageKm !== undefined) spacePatch.vehicle_mileage_km = vehicleMileageKm
  if (draft.value.vehicleTransmission) spacePatch.vehicle_transmission = draft.value.vehicleTransmission
  if (draft.value.vehicleFuelType) spacePatch.vehicle_fuel_type = draft.value.vehicleFuelType

  try {
    const updated = await apiFetch(`/spaces/${props.spaceId}`, { method: 'PATCH', body: spacePatch })
    space.value = updated
    isDirty.value = false
    showToast('Details saved')
  } catch (e: any) {
    showToast(e?.data?.statusMessage || 'Failed to save details', 'error')
  } finally {
    saving.value = false
  }
}

// ── AI-drafted description ──────────────────────────────────────────────
// Grounded strictly in whatever facts are already filled into the draft
// (price, bed/bath/m² or vehicle specs, amenities) — never sent until the
// owner has actually typed/selected those, since an empty draft would only
// give the AI a title to work from. Fills the textarea for review; doesn't
// save on its own — the owner still hits Save Changes after.
const generatingDescription = ref(false)
async function generateDescription() {
  if (generatingDescription.value) return
  generatingDescription.value = true
  const d = draft.value
  try {
    const result = await apiFetch<{ description: string }>(`/spaces/${props.spaceId}/generate-description`, {
      method: 'POST',
      body: {
        title: d.title || undefined,
        space_type: space.value?.space_type || undefined,
        location_text: d.locationText || undefined,
        price_kes: positiveNumberOrUndefined(d.priceKes),
        listing_status: d.listingStatus || undefined,
        bedrooms: positiveNumberOrUndefined(d.bedrooms),
        bathrooms: positiveNumberOrUndefined(d.bathrooms),
        area_sqm: positiveNumberOrUndefined(d.areaSqm),
        vehicle_year: positiveNumberOrUndefined(d.vehicleYear),
        vehicle_mileage_km: positiveNumberOrUndefined(d.vehicleMileageKm),
        vehicle_transmission: d.vehicleTransmission || undefined,
        vehicle_fuel_type: d.vehicleFuelType || undefined,
        amenities: d.amenities.length ? d.amenities : undefined,
      },
    })
    draft.value.description = result.description
  } catch (e: any) {
    showToast(e?.data?.statusMessage || 'Could not generate a description — try again.', 'error')
  } finally {
    generatingDescription.value = false
  }
}

// ── Listing details: options ────────────────────────────────────────────
const ctaActionOptions = [
  { value: 'link', label: 'Link' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
] as const

const listingStatusOptions = [
  { value: 'available', label: 'Available' },
  { value: 'sold', label: 'Sold' },
  { value: 'rented', label: 'Rented' },
] as const

const vehicleTransmissionOptions = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatic', label: 'Automatic' },
] as const

const vehicleFuelTypeOptions = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
] as const

const amenityDraft = ref('')
function addAmenity() {
  const value = amenityDraft.value.trim()
  if (!value) return
  if (!draft.value.amenities.includes(value)) draft.value.amenities.push(value)
  amenityDraft.value = ''
}
// Comma also commits the current amenity — matches the bot's own
// "parking, security, wifi" comma-separated input convention.
function onAmenityKeydown(e: KeyboardEvent) {
  if (e.key === ',') { e.preventDefault(); addAmenity() }
}
function removeAmenity(index: number) {
  draft.value.amenities.splice(index, 1)
}

// ── Location geocoding ──────────────────────────────────────────────────
type NominatimResult = { display_name: string; lat: string; lon: string }
const locationResults = ref<NominatimResult[]>([])
const locationDropOpen = ref(false)
const locationSearching = ref(false)
let locationTimer: ReturnType<typeof setTimeout> | null = null

function onLocationInput(val: string) {
  draft.value.locationText = val
  locationDropOpen.value = false
  locationResults.value = []
  if (locationTimer) clearTimeout(locationTimer)
  if (!val.trim()) return
  locationTimer = setTimeout(() => fetchLocationResults(val), 600)
}

async function fetchLocationResults(query: string) {
  locationSearching.value = true
  try {
    const data: NominatimResult[] = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
      { headers: { 'Accept-Language': 'en-US,en' } }
    ).then(r => r.json())
    locationResults.value = data
    if (data.length) locationDropOpen.value = true
  } catch { /* ignore */ } finally {
    locationSearching.value = false
  }
}

function selectLocation(result: NominatimResult) {
  draft.value.locationText = result.display_name
  draft.value.locationLat = parseFloat(result.lat)
  draft.value.locationLng = parseFloat(result.lon)
  locationDropOpen.value = false
  locationResults.value = []
}

const mapEmbedUrl = computed(() => {
  const lat = draft.value.locationLat
  const lng = draft.value.locationLng
  if (!lat || !lng) return null
  const d = 0.015
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`
})

// ── Logo upload ──────────────────────────────────────────────────────────
const logoFileInput = ref<HTMLInputElement | null>(null)
const logoUploading = ref(false)
const localLogoDataUrl = ref('')
const bgRemoving = ref(false)
const bgRemoved = ref(false)

function clearLogo() {
  draft.value.logoUrl = ''
  localLogoDataUrl.value = ''
  bgRemoved.value = false
}

async function handleLogoFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { showToast('Select an image file', 'error'); return }
  bgRemoved.value = false
  // Read as DataURL for background removal (no CORS restriction)
  const reader = new FileReader()
  reader.onload = (e) => { localLogoDataUrl.value = (e.target?.result as string) || '' }
  reader.readAsDataURL(file)
  logoUploading.value = true
  try {
    const { uploadUrl, publicUrl } = (await apiFetch(`/spaces/${props.spaceId}/logo-url`, {
      method: 'POST',
      body: { contentType: file.type, fileName: file.name },
    })) as { uploadUrl: string; publicUrl: string }
    await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
    draft.value.logoUrl = publicUrl
    showToast('Logo uploaded')
  } catch (e: any) {
    if (e?.status === 404 || e?.statusCode === 404) {
      showToast('Logo upload requires backend update — coming soon', 'error')
    } else {
      showToast('Logo upload failed', 'error')
    }
  } finally {
    logoUploading.value = false
    if (logoFileInput.value) logoFileInput.value.value = ''
  }
}

function removeImageBackground(dataUrl: string, tolerance = 40): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('no 2d ctx')); return }
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const pixels = imageData.data
      const w = canvas.width
      const h = canvas.height

      const getPixelRgb = (x: number, y: number): [number, number, number] => {
        const i = (y * w + x) * 4
        return [pixels[i], pixels[i + 1], pixels[i + 2]]
      }

      const colorDist = (a: [number, number, number], b: [number, number, number]) =>
        Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2)

      // Sample the four corners to estimate the background colour
      const samples = [getPixelRgb(0,0), getPixelRgb(w-1,0), getPixelRgb(0,h-1), getPixelRgb(w-1,h-1)]
      const bg: [number, number, number] = [
        Math.round(samples.reduce((s,c)=>s+c[0],0)/4),
        Math.round(samples.reduce((s,c)=>s+c[1],0)/4),
        Math.round(samples.reduce((s,c)=>s+c[2],0)/4),
      ]

      // BFS flood-fill from every edge pixel
      const visited = new Uint8Array(w * h)
      const qx: number[] = []
      const qy: number[] = []

      const tryEnqueue = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return
        const idx = y * w + x
        if (visited[idx]) return
        visited[idx] = 1
        if (colorDist(getPixelRgb(x, y), bg) <= tolerance) { qx.push(x); qy.push(y) }
      }

      for (let x = 0; x < w; x++) { tryEnqueue(x, 0); tryEnqueue(x, h-1) }
      for (let y = 0; y < h; y++) { tryEnqueue(0, y); tryEnqueue(w-1, y) }

      for (let i = 0; i < qx.length; i++) {
        const x = qx[i], y = qy[i]
        pixels[(y * w + x) * 4 + 3] = 0
        tryEnqueue(x-1, y); tryEnqueue(x+1, y); tryEnqueue(x, y-1); tryEnqueue(x, y+1)
      }

      ctx.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('image load failed'))
    if (dataUrl.startsWith('http')) img.crossOrigin = 'anonymous'
    img.src = dataUrl
  })
}

async function handleRemoveBg() {
  if (bgRemoving.value) return
  const source = localLogoDataUrl.value || draft.value.logoUrl
  if (!source) return
  bgRemoving.value = true
  try {
    const resultDataUrl = await removeImageBackground(source)
    const res = await fetch(resultDataUrl)
    const blob = await res.blob()
    const file = new File([blob], 'logo.png', { type: 'image/png' })
    const { uploadUrl, publicUrl } = (await apiFetch(`/spaces/${props.spaceId}/logo-url`, {
      method: 'POST',
      body: { contentType: 'image/png', fileName: 'logo.png' },
    })) as { uploadUrl: string; publicUrl: string }
    await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': 'image/png' } })
    draft.value.logoUrl = publicUrl
    localLogoDataUrl.value = resultDataUrl
    bgRemoved.value = true
    showToast('Background removed')
  } catch {
    showToast('Background removal failed', 'error')
  } finally {
    bgRemoving.value = false
  }
}
</script>

<style scoped>
.details-panel {
  /* height, not min-height — the editor layout (layouts/editor.vue) is a
     fixed 100vh flex column with overflow:hidden, so a min-height box just
     grows past 100vh and gets clipped by the parent with no way to reach
     the rest. A fixed height means THIS element overflows internally,
     which is what makes its own overflow-y:auto actually scroll — the bug
     that made the whole page unscrollable. Matches PhotosPanel.vue, which
     already had this right. */
  width: 100vw; height: 100vh; overflow-y: auto;
  background: #0a0a0b; color: rgba(255,255,255,0.9);
  /* mode-switch (pages/app/spaces/[id]/index.vue) sits at top:84px + ~36px
     tall on desktop — clear its bottom edge (~120px) with a real gap. */
  padding-top: 136px; padding-bottom: 110px;
}
@media (max-width: 640px) { .details-panel { padding-top: 104px; } }

.hidden-input { display: none; }

.details-header {
  display: flex; align-items: flex-start; gap: 14px;
  max-width: 720px; margin: 0 auto; padding: 0 20px 28px;
}
.details-back {
  flex: 0 0 auto; width: 34px; height: 34px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.6); text-decoration: none;
}
.details-back:hover { color: #fff; background: rgba(255,255,255,0.1); }
.details-header__title { flex: 1 1 auto; min-width: 0; }
.details-header__title p { font-size: 0.78rem; color: rgba(255,255,255,0.4); margin: 8px 0 0; }
.details-legend { display: flex; flex-wrap: wrap; gap: 4px 16px; margin-top: 12px; }
.details-legend__item { font-size: 11px; color: rgba(255,255,255,0.38); font-weight: 500; }

@media (max-width: 640px) {
  .details-header { flex-wrap: wrap; row-gap: 12px; }
}

.details-empty { display: flex; align-items: center; justify-content: center; padding: 80px 20px; }

.details-body { max-width: 720px; margin: 0 auto; padding: 0 20px; display: flex; flex-direction: column; gap: 20px; }
.details-spacer { height: 4px; }

/* ── Section cards — the whole point of this rebuild: real breathing room
   and a proper page instead of one cramped scrollable modal. ── */
.df-card {
  background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015));
  border: 1px solid rgba(255,255,255,0.08); border-radius: 18px;
  padding: 24px;
}
.df-card__head { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 22px; }
.df-card__num {
  flex: 0 0 auto; width: 26px; height: 26px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);
  font-size: 12px; font-weight: 800; color: rgba(255,255,255,0.6);
}
.df-card__title { font-size: 15px; font-weight: 800; margin: 0; letter-spacing: -0.01em; }
.df-card__sub { font-size: 12px; color: rgba(255,255,255,0.4); margin: 3px 0 0; }

.df-field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
@media (max-width: 480px) { .df-field-grid { grid-template-columns: 1fr; } }

.df-field { margin-bottom: 18px; }
.df-field:last-child { margin-bottom: 0; }
.df-field-grid .df-field { margin-bottom: 0; }
.df-field__label {
  display: block; font-size: 12px; font-weight: 600;
  color: rgba(255,255,255,0.6); margin-bottom: 8px; letter-spacing: 0.01em;
}
/* One consistent required/recommended/optional system so no field's
   status is ever left to guesswork — every field below carries one. */
.df-field__opt, .df-field__req, .df-field__rec {
  font-weight: 700; margin-left: 6px; font-size: 9.5px;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.df-field__opt { color: rgba(255,255,255,0.28); }
.df-field__req { color: #fbbf24; }
.df-field__rec { color: #60a5fa; }
.df-field__label-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.df-field__label-row .df-field__label { margin-bottom: 0; }
.df-hint { font-size: 11px; color: rgba(255,255,255,0.32); font-weight: 500; margin-top: 6px; line-height: 1.5; }

.df-ai-btn {
  flex: 0 0 auto; height: 26px; padding: 0 10px; border-radius: 999px;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.13);
  color: rgba(255,255,255,0.75); font-size: 11px; font-weight: 600;
  cursor: pointer; transition: background 130ms, border-color 130ms; font-family: inherit;
  display: flex; align-items: center; justify-content: center;
}
.df-ai-btn:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.22); }
.df-ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.df-input {
  width: 100%; height: 42px; padding: 0 14px; border-radius: 9px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.92); font-size: 13.5px; font-weight: 500;
  outline: none; transition: border-color 140ms, background 140ms;
  box-sizing: border-box; font-family: inherit;
}
.df-input:focus { border-color: rgba(255,255,255,0.28); background: rgba(255,255,255,0.08); }
.df-input::placeholder { color: rgba(255,255,255,0.22); }
.df-textarea {
  width: 100%; padding: 12px 14px; border-radius: 9px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.92); font-size: 13.5px; font-weight: 500;
  outline: none; resize: vertical; font-family: inherit; line-height: 1.55;
  box-sizing: border-box; transition: border-color 140ms;
}
.df-textarea:focus { border-color: rgba(255,255,255,0.28); }
.df-textarea::placeholder { color: rgba(255,255,255,0.22); }

.df-location-wrap { display: flex; flex-direction: column; gap: 10px; }
.df-location-input-row { position: relative; display: flex; align-items: center; }
.df-location-input-row .df-input { padding-right: 38px; }
.df-location-spin {
  position: absolute; right: 14px;
  width: 13px; height: 13px;
  border: 1.5px solid rgba(255,255,255,0.15); border-top-color: rgba(255,255,255,0.65);
  border-radius: 50%; animation: df-spin-anim 0.6s linear infinite; pointer-events: none;
}
.df-location-drop { border-radius: 9px; background: #17171d; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; }
.df-location-result {
  width: 100%; display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 14px; background: transparent; border: none;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  cursor: pointer; text-align: left; transition: background 120ms;
}
.df-location-result:last-child { border-bottom: none; }
.df-location-result:hover { background: rgba(255,255,255,0.05); }
.df-location-pin { color: rgba(255,255,255,0.35); flex-shrink: 0; margin-top: 1px; }
.df-location-text { font-size: 12px; color: rgba(255,255,255,0.8); font-weight: 500; line-height: 1.4; }
.df-map { width: 100%; height: 180px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.1); display: block; }

.df-logo-area {
  position: relative; min-height: 92px; border-radius: 9px;
  border: 1px dashed rgba(255,255,255,0.17); cursor: pointer;
  transition: border-color 140ms, background 140ms; overflow: hidden;
}
.df-logo-area:hover { border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.03); }
.df-logo-placeholder {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 9px; padding: 22px;
  color: rgba(255,255,255,0.32); min-height: 92px;
}
.df-logo-hint { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.32); }
.df-logo-preview {
  width: 100%; height: 92px; object-fit: contain; object-position: center; display: block;
  background-color: rgba(255,255,255,0.03);
  background-image:
    linear-gradient(45deg, rgba(255,255,255,0.06) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255,255,255,0.06) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.06) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.06) 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
}
.df-bg-remove-btn {
  margin-top: 8px;
  width: 100%; height: 32px; border-radius: 7px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.55); font-size: 11.5px; font-weight: 600;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
  transition: background 140ms, border-color 140ms, color 140ms; font-family: inherit;
}
.df-bg-remove-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.85); }
.df-bg-remove-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.df-bg-remove-btn--done { border-color: rgba(34,197,94,0.35); color: rgba(134,239,172,0.9); }
.df-logo-remove {
  position: absolute; top: 7px; right: 7px; width: 24px; height: 24px;
  border-radius: 6px; background: rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.65); display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background 120ms, color 120ms;
}
.df-logo-remove:hover { background: rgba(220,38,38,0.75); color: #fff; border-color: transparent; }

.df-seg { display: flex; border: 1px solid rgba(255,255,255,0.13); border-radius: 10px; overflow: hidden; height: 42px; }
.df-seg__btn {
  flex: 1; background: transparent; border: none; border-right: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.5); font-size: 12.5px; font-weight: 600; cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.df-seg__btn:last-child { border-right: none; }
.df-seg__btn--active { background: rgba(255,255,255,0.13); color: rgba(255,255,255,0.96); }
.df-seg__btn:hover:not(.df-seg__btn--active) { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.75); }

.df-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 10px; }
.df-tag {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 6px 7px 6px 12px; border-radius: 999px;
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.85); font-size: 12.5px; font-weight: 600;
}
.df-tag__remove {
  display: flex; align-items: center; justify-content: center;
  width: 17px; height: 17px; border-radius: 50%; padding: 0;
  background: rgba(255,255,255,0.1); border: none; color: rgba(255,255,255,0.65);
  cursor: pointer; transition: background 120ms, color 120ms;
}
.df-tag__remove:hover { background: rgba(255,255,255,0.22); color: #fff; }

.df-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.df-toggle {
  width: 40px; height: 23px; border-radius: 12px;
  background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.1);
  padding: 2px; cursor: pointer; display: flex; align-items: center;
  justify-content: flex-start; flex-shrink: 0;
  transition: background 200ms, border-color 200ms;
}
.df-toggle--on { background: rgba(255,255,255,0.92); border-color: transparent; justify-content: flex-end; }
.df-toggle-thumb { width: 17px; height: 17px; border-radius: 50%; background: rgba(255,255,255,0.65); box-shadow: 0 1px 4px rgba(0,0,0,0.4); transition: background 200ms; }
.df-toggle--on .df-toggle-thumb { background: #111; }

.df-spin {
  display: inline-block; width: 14px; height: 14px;
  border: 1.6px solid rgba(255,255,255,0.18); border-top-color: rgba(255,255,255,0.75);
  border-radius: 50%; animation: df-spin-anim 0.65s linear infinite;
}
.df-spin--invert { border-color: rgba(0,0,0,0.25); border-top-color: #000; }
@keyframes df-spin-anim { to { transform: rotate(360deg); } }

.details-savebar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 20;
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
  padding: 14px max(20px, calc(env(safe-area-inset-left) + 20px)) max(14px, env(safe-area-inset-bottom));
  background: rgba(10,10,11,0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid rgba(255,255,255,0.08);
}
.details-savebar__hint { font-size: 11.5px; font-weight: 600; color: rgba(255,255,255,0.35); }
.details-savebar__btn {
  height: 42px; padding: 0 28px; border-radius: 10px;
  background: #fff; color: #0e0e12; border: none;
  font-size: 13px; font-weight: 800; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  letter-spacing: 0.01em; transition: background 130ms; font-family: inherit;
}
.details-savebar__btn:hover { background: rgba(255,255,255,0.88); }
.details-savebar__btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
