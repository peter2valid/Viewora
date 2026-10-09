import { toIntlPhoneDigits } from '~/utils/phone'
// Shared display formatting for the buyer-facing browse surface
// (pages/view/index.vue and pages/view/p/[slug].vue) — kept in one place so
// the Home feed cards and the detail screen never drift out of sync on how
// a price or a set of facts reads.

export interface ListingLike {
  space_type: string
  land_acres?: number | null
  land_type?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  area_sqm?: number | null
  vehicle_year?: number | null
  vehicle_mileage_km?: number | null
  vehicle_transmission?: string | null
  vehicle_fuel_type?: string | null
}

// The card shape GET /listings, GET /saved, and the ids= collection view
// all return (see viewora-backend/src/utils/listingMapper.ts) — shared here
// so ListingCard.vue and every page that renders a grid of these use one
// definition instead of three drifting copies.
export interface Listing extends ListingLike {
  id: string
  slug: string | null
  title: string
  location_text: string | null
  price_kes: number
  listing_status: string
  // Orthogonal to listing_status — sale vs rent, plus the billing period a
  // rental price is quoted in. Both optional: existing rows predate these
  // columns (migration-add-transaction-type.sql).
  transaction_type?: string | null
  price_period?: string | null
  amenities: string[]
  phone: string | null
  has_360: boolean
  hero_image: string | null
  created_at: string
}

export function formatPrice(kes: number | null | undefined, period?: string | null): string {
  if (kes == null) return 'Contact for price'
  const base = `KES ${kes.toLocaleString('en-KE')}`
  return period ? `${base}/${period}` : base
}

export function transactionLabel(type: string | null | undefined): string {
  return type === 'rent' ? 'For Rent' : type === 'sale' ? 'For Sale' : ''
}

// Type-aware, matching VIEWORA_2_PRODUCT_SPEC.md §6.2/§10 — bed/bath/area
// for residential, year/mileage/transmission for automotive, area alone
// for anything else that has one. Returns '' (not a placeholder string)
// when there's nothing real to show, so callers can hide the row entirely
// rather than render an empty line.
export function factsLine(l: ListingLike): string {
  if (l.space_type === 'residential') {
    const parts: string[] = []
    if (l.bedrooms) parts.push(`${l.bedrooms} Bed`)
    if (l.bathrooms) parts.push(`${l.bathrooms} Bath`)
    if (l.area_sqm) parts.push(`${l.area_sqm} m²`)
    return parts.join(' · ')
  }
  if (l.space_type === 'automotive') {
    const parts: string[] = []
    if (l.vehicle_year) parts.push(String(l.vehicle_year))
    if (l.vehicle_mileage_km != null) parts.push(`${l.vehicle_mileage_km.toLocaleString('en-KE')} km`)
    if (l.vehicle_transmission) parts.push(l.vehicle_transmission[0].toUpperCase() + l.vehicle_transmission.slice(1))
    return parts.join(' · ')
  }
  if (l.space_type === 'land') {
    const parts: string[] = []
    if (l.land_acres) parts.push(formatAcres(l.land_acres))
    if (l.land_type) parts.push(capitalize(l.land_type))
    return parts.join(' · ')
  }
  if (l.area_sqm) return `${l.area_sqm} m²`
  return ''
}

export function formatAcres(acres: number): string {
  const n = Number(acres)
  if (!Number.isFinite(n) || n <= 0) return ''
  // 1/8 acre (≈50×100 ft) is the common plot size here — show it the way sellers say it.
  if (n < 1) {
    const eighths = Math.round(n * 8)
    if (Math.abs(n * 8 - eighths) < 0.01 && eighths > 0) {
      const fractions: Record<number, string> = { 1: '1/8', 2: '1/4', 4: '1/2', 6: '3/4' }
      if (fractions[eighths]) return `${fractions[eighths]} acre`
    }
  }
  const rounded = n % 1 === 0 ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
  return `${rounded} ${n === 1 ? 'acre' : 'acres'}`
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

export function whatsappUrl(phone: string | null | undefined, title: string): string {
  const digits = toIntlPhoneDigits(phone)
  const msg = `Hi! I saw ${title} on Viewora and would like more details.`
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`
}
