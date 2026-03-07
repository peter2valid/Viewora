<template>
  <NuxtLayout name="app">
    <div class="services-page">

      <!-- Hero -->
      <div class="svc-hero">
        <div class="svc-hero-text">
          <div class="svc-eyebrow">Professional 360° Photography</div>
          <h1 class="svc-hero-title">We come to you.<br>You get a stunning virtual tour.</h1>
          <p class="svc-hero-body">Book one of our vetted 360° photographers anywhere in Kenya. They capture your space, we upload the scenes directly to your Viewora account — ready to publish.</p>
        </div>
        <div class="svc-hero-badges">
          <div class="svc-badge">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Available across Kenya
          </div>
          <div class="svc-badge">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Delivered within 48 hrs
          </div>
          <div class="svc-badge">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Auto-uploaded to your account
          </div>
        </div>
      </div>

      <!-- Packages -->
      <h2 class="svc-section-title">Choose a package</h2>
      <div class="svc-packages">

        <div class="pkg-card" v-for="pkg in packages" :key="pkg.name" :class="{ 'pkg-card--featured': pkg.featured }">
          <div v-if="pkg.featured" class="pkg-popular-badge">Most Popular</div>
          <div class="pkg-name">{{ pkg.name }}</div>
          <div class="pkg-price">
            <span class="pkg-currency">KES</span>
            <span class="pkg-amount">{{ pkg.price }}</span>
          </div>
          <div class="pkg-tagline">{{ pkg.tagline }}</div>
          <div class="pkg-divider"></div>
          <ul class="pkg-features">
            <li v-for="feat in pkg.features" :key="feat" class="pkg-feature">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :style="{ color: pkg.featured ? 'var(--accent)' : '#16a34a' }"><polyline points="20 6 9 17 4 12"/></svg>
              {{ feat }}
            </li>
          </ul>
          <button
            class="btn pkg-cta"
            :class="pkg.featured ? 'btn-primary' : 'btn-secondary'"
            @click="openBooking(pkg.name)"
          >
            {{ pkg.ctaLabel }}
          </button>
        </div>

      </div>

      <!-- How it works -->
      <div class="how-section">
        <h2 class="svc-section-title">How it works</h2>
        <div class="how-steps">
          <div class="how-step" v-for="(step, i) in steps" :key="i">
            <div class="how-num">{{ i + 1 }}</div>
            <div class="how-icon">
              <component :is="'span'" v-html="step.icon"></component>
            </div>
            <h3 class="how-title">{{ step.title }}</h3>
            <p class="how-body">{{ step.body }}</p>
          </div>
        </div>
      </div>

      <!-- FAQ -->
      <div class="faq-section">
        <h2 class="svc-section-title">Frequently Asked Questions</h2>
        <div class="faq-list">
          <div class="faq-item" v-for="(q, i) in faqs" :key="i">
            <button class="faq-q" @click="toggleFaq(i)">
              {{ q.question }}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :style="{ transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div v-if="openFaq === i" class="faq-a">{{ q.answer }}</div>
          </div>
        </div>
      </div>

      <!-- Book modal -->
      <Teleport to="body">
        <Transition name="modal">
          <div v-if="showBooking" class="modal-backdrop" @click.self="showBooking = false">
            <div class="modal-card" style="max-width:480px;">
              <div class="modal-header">
                <h3 class="modal-title">Book {{ selectedPackage }} Capture</h3>
                <button class="modal-close" @click="showBooking = false" aria-label="Close">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div class="modal-body">
                <div v-if="!bookingSubmitted">
                  <div class="form-group mb-4">
                    <label class="form-label">Property Name / Tour Title</label>
                    <input v-model="bookingForm.tourName" type="text" class="form-input" placeholder="e.g. Lavington 3-Bedroom Apartment" />
                  </div>
                  <div class="form-group mb-4">
                    <label class="form-label">Location / Address</label>
                    <input v-model="bookingForm.location" type="text" class="form-input" placeholder="e.g. Lavington, Nairobi" />
                  </div>
                  <div class="form-group mb-4">
                    <label class="form-label">Number of Rooms / Areas</label>
                    <input v-model="bookingForm.rooms" type="number" min="1" class="form-input" placeholder="e.g. 6" />
                  </div>
                  <div class="form-group mb-4">
                    <label class="form-label">Preferred Date</label>
                    <input v-model="bookingForm.date" type="date" class="form-input" />
                  </div>
                  <div class="form-group mb-4">
                    <label class="form-label">Phone Number</label>
                    <input v-model="bookingForm.phone" type="tel" class="form-input" placeholder="e.g. +254 700 000 000" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Additional Notes <span style="color:var(--text-muted);font-weight:400;">(optional)</span></label>
                    <textarea v-model="bookingForm.notes" class="form-input" rows="2" placeholder="Access instructions, special requirements…" style="resize:vertical;"></textarea>
                  </div>
                </div>
                <div v-else class="booking-success">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent);margin-bottom:1rem;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <h4>Booking Request Sent!</h4>
                  <p>Our team will contact you within 24 hours to confirm your booking and payment details.</p>
                </div>
              </div>
              <div class="modal-footer" v-if="!bookingSubmitted">
                <button class="btn btn-secondary" @click="showBooking = false">Cancel</button>
                <button class="btn btn-primary" @click="submitBooking" :disabled="!bookingValid">Submit Request</button>
              </div>
              <div class="modal-footer" v-else>
                <button class="btn btn-dark" style="width:100%;" @click="showBooking = false; bookingSubmitted = false">Done</button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Capture Services | Viewora' })

const showBooking = ref(false)
const selectedPackage = ref('')
const bookingSubmitted = ref(false)
const openFaq = ref<number | null>(null)

const bookingForm = ref({ tourName: '', location: '', rooms: '', date: '', phone: '', notes: '' })
const bookingValid = computed(() =>
  bookingForm.value.tourName.trim() &&
  bookingForm.value.location.trim() &&
  bookingForm.value.phone.trim()
)

const openBooking = (name: string) => {
  selectedPackage.value = name
  bookingForm.value = { tourName: '', location: '', rooms: '', date: '', phone: '', notes: '' }
  bookingSubmitted.value = false
  showBooking.value = true
}

const submitBooking = () => {
  // TODO: send to backend / email
  bookingSubmitted.value = true
}

const toggleFaq = (i: number) => {
  openFaq.value = openFaq.value === i ? null : i
}

const packages = [
  {
    name: 'Standard',
    price: '12,000',
    tagline: 'Ideal for apartments and small properties',
    featured: false,
    ctaLabel: 'Book Standard',
    features: [
      'Up to 5 rooms / scenes',
      'Nairobi & surroundings',
      'Delivered within 48 hours',
      'Scenes uploaded to your account',
      'Basic scene ordering',
    ],
  },
  {
    name: 'Premium',
    price: '28,000',
    tagline: 'Perfect for large homes and commercial spaces',
    featured: true,
    ctaLabel: 'Book Premium',
    features: [
      'Up to 15 rooms / scenes',
      'Countrywide coverage',
      'Delivered within 24 hours',
      'Scenes uploaded + named for you',
      'Hotspot placement included',
      'Priority support',
    ],
  },
  {
    name: 'Portfolio',
    price: 'Custom',
    tagline: 'For agencies, hotels & multi-property clients',
    featured: false,
    ctaLabel: 'Contact Us',
    features: [
      'Unlimited properties',
      'Dedicated account photographer',
      'White-label delivery',
      'Monthly retainer options',
      'SLA guaranteed turnaround',
      'Custom integrations',
    ],
  },
]

const steps = [
  {
    title: 'Book online',
    body: 'Choose your package, fill in your property details and preferred date. We confirm within 24 hours.',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  },
  {
    title: 'We capture your space',
    body: 'A vetted Viewora photographer arrives at your property on the agreed date with professional 360° equipment.',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>`,
  },
  {
    title: 'Tour goes live',
    body: 'Processed scenes are uploaded directly to your Viewora account. Review, arrange, and publish in minutes.',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  },
]

const faqs = [
  {
    question: 'What areas do you cover?',
    answer: 'Standard packages cover Nairobi and surroundings (within 30km). Premium packages include nationwide coverage across major Kenyan cities including Mombasa, Kisumu, Nakuru, and Eldoret. For rural areas, a travel surcharge may apply.',
  },
  {
    question: 'What equipment do you use?',
    answer: 'Our photographers use Ricoh Theta and Insta360 professional cameras which deliver high-resolution 360° equirectangular images — the exact format Viewora uses for its panoramic viewer.',
  },
  {
    question: 'How do I pay?',
    answer: 'We accept M-Pesa, bank transfer, and card payments. Payment is due on booking confirmation. A 50% deposit is required to lock in your date.',
  },
  {
    question: 'Can I reschedule?',
    answer: 'Yes. Rescheduling is free if done more than 48 hours before your appointment. Cancellations within 24 hours forfeit the deposit.',
  },
  {
    question: 'Do I need to be present during the shoot?',
    answer: 'Not necessarily, but we recommend it for the first time so you can confirm all rooms and areas are covered. Otherwise, you can grant access to a caretaker or property manager.',
  },
]
</script>

<style scoped>
.services-page { padding: 2rem; max-width: 1100px; margin: 0 auto; }

/* Hero */
.svc-hero {
  background: var(--ink);
  border-radius: 1rem;
  padding: 2.5rem;
  margin-bottom: 2.5rem;
  display: flex;
  gap: 2rem;
  align-items: center;
  flex-wrap: wrap;
}
.svc-hero-text { flex: 1; min-width: 260px; }
.svc-eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 0.75rem;
}
.svc-hero-title {
  font-family: var(--font-display);
  font-size: 1.9rem;
  font-weight: 800;
  color: var(--paper);
  letter-spacing: -0.03em;
  line-height: 1.15;
  margin: 0 0 1rem;
}
.svc-hero-body { font-size: 0.9rem; color: rgba(255,255,255,0.6); line-height: 1.65; margin: 0; max-width: 440px; }
.svc-hero-badges { display: flex; flex-direction: column; gap: 0.5rem; }
.svc-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.825rem;
  color: rgba(255,255,255,0.75);
  font-weight: 500;
}
.svc-badge svg { color: var(--accent); flex-shrink: 0; }

.svc-section-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -0.02em;
  margin: 0 0 1.25rem;
}

/* Packages */
.svc-packages {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 3rem;
  align-items: start;
}
.pkg-card {
  background: var(--paper);
  border: 1px solid var(--border);
  border-radius: 0.875rem;
  padding: 1.5rem;
  position: relative;
}
.pkg-card--featured {
  border-color: var(--ink);
  box-shadow: 0 4px 24px rgba(0,0,0,0.1);
}
.pkg-popular-badge {
  position: absolute;
  top: -11px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--ink);
  color: var(--paper);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.2rem 0.75rem;
  border-radius: 99px;
  white-space: nowrap;
}
.pkg-name {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--slate);
  margin-bottom: 0.75rem;
}
.pkg-price { display: flex; align-items: baseline; gap: 0.3rem; margin-bottom: 0.3rem; }
.pkg-currency { font-size: 0.9rem; font-weight: 700; color: var(--slate); }
.pkg-amount { font-size: 2rem; font-weight: 800; letter-spacing: -0.04em; color: var(--ink); line-height: 1; }
.pkg-tagline { font-size: 0.825rem; color: var(--slate); margin-bottom: 1.25rem; line-height: 1.4; }
.pkg-divider { height: 1px; background: var(--border); margin-bottom: 1.25rem; }
.pkg-features { list-style: none; padding: 0; margin: 0 0 1.5rem; display: flex; flex-direction: column; gap: 0.6rem; }
.pkg-feature { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.825rem; color: var(--slate); line-height: 1.4; }
.pkg-cta { width: 100%; justify-content: center; }

/* How it works */
.how-section { margin-bottom: 3rem; }
.how-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
.how-step {
  background: var(--paper);
  border: 1px solid var(--border);
  border-radius: 0.875rem;
  padding: 1.5rem;
  position: relative;
}
.how-num {
  position: absolute;
  top: -14px;
  left: 1.5rem;
  width: 28px;
  height: 28px;
  background: var(--ink);
  color: var(--paper);
  font-size: 0.8rem;
  font-weight: 800;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.how-icon { color: var(--slate); margin-bottom: 1rem; margin-top: 0.25rem; }
.how-title { font-size: 1rem; font-weight: 700; color: var(--ink); margin: 0 0 0.5rem; }
.how-body { font-size: 0.85rem; color: var(--slate); line-height: 1.6; margin: 0; }

/* FAQ */
.faq-section { margin-bottom: 2rem; }
.faq-list {
  background: var(--paper);
  border: 1px solid var(--border);
  border-radius: 0.875rem;
  overflow: hidden;
}
.faq-item { border-bottom: 1px solid var(--border); }
.faq-item:last-child { border-bottom: none; }
.faq-q {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 1rem 1.25rem;
  background: none;
  border: none;
  text-align: left;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
  gap: 1rem;
}
.faq-q:hover { background: var(--paper-dim); }
.faq-a {
  padding: 0 1.25rem 1rem;
  font-size: 0.85rem;
  color: var(--slate);
  line-height: 1.65;
}

/* Booking success */
.booking-success { text-align: center; padding: 1.5rem 0.5rem; }
.booking-success h4 { font-size: 1.1rem; font-weight: 700; color: var(--ink); margin: 0 0 0.5rem; }
.booking-success p { font-size: 0.875rem; color: var(--slate); line-height: 1.5; max-width: 300px; margin: 0 auto; }

@media (max-width: 900px) {
  .svc-packages { grid-template-columns: 1fr; }
  .how-steps { grid-template-columns: 1fr; }
  .services-page { padding: 1rem; }
}
@media (max-width: 640px) {
  .svc-hero { padding: 1.5rem; }
  .svc-hero-title { font-size: 1.4rem; }
}
</style>
