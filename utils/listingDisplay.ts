// Shared display formatting for the buyer-facing browse surface
// (pages/view/index.vue and pages/view/p/[slug].vue) — kept in one place so
// the Home feed cards and the detail screen never drift out of sync on how
// a price or a set of facts reads.

export interface ListingLike {
  space_type: string
  bedrooms?: number | null
  bathrooms?: number | null
  area_sqm?: number | null
  vehicle_year?: number | null
  vehicle_mileage_km?: number | null
  vehicle_transmission?: string | null
  vehicle_fuel_type?: string | null
}

export function formatPrice(kes: number | null | undefined): string {
  if (kes == null) return 'Contact for price'
  return `KES ${kes.toLocaleString('en-KE')}`
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
  if (l.area_sqm) return `${l.area_sqm} m²`
  return ''
}

export function whatsappUrl(phone: string | null | undefined, title: string): string {
  const digits = (phone || '').replace(/[^0-9]/g, '')
  const msg = `Hi! I saw ${title} on Viewora and would like more details.`
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`
}
