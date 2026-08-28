// Type-aware schema.org JSON-LD for a listing detail page. Google doesn't
// have a dedicated rich-result gallery entry for real estate/vehicle
// listings, but the structured vocabulary still helps crawlers understand
// price/facts instead of guessing from rendered text — and it's the
// difference between zero structured data (view.viewora/p/[slug] had none
// at all) and something a crawler can actually parse.

export interface JsonLdSpace {
  title: string | null
  description: string | null
  space_type: string | null
  location_text: string | null
  price_kes: number | null
  listing_status: string | null
  // Both optional — see migration-add-transaction-type.sql. When present,
  // businessFunction tells a crawler this is a rental vs a sale, which a
  // bare price alone can't (the same ambiguity the buyer-facing UI fix
  // addressed — see components/seller/Card.vue's era of work this session).
  transaction_type?: string | null
  price_period?: string | null
  bedrooms: number | null
  bathrooms: number | null
  area_sqm: number | null
  vehicle_year: number | null
  vehicle_mileage_km: number | null
  vehicle_transmission: string | null
  vehicle_fuel_type: string | null
  created_at?: string | null
}

export function buildListingJsonLd(
  space: JsonLdSpace | null | undefined,
  opts: { url: string; image?: string | null; description?: string | null },
): Record<string, any> | null {
  if (!space?.title) return null

  const availability = space.listing_status === 'sold' || space.listing_status === 'rented'
    ? 'https://schema.org/SoldOut'
    : 'https://schema.org/InStock'

  const offers = space.price_kes
    ? {
        '@type': 'Offer',
        price: space.price_kes,
        priceCurrency: 'KES',
        availability,
        url: opts.url,
        ...(space.transaction_type
          ? { businessFunction: space.transaction_type === 'rent' ? 'https://schema.org/LeaseOut' : 'https://schema.org/Sell' }
          : {}),
      }
    : undefined

  const base = {
    '@context': 'https://schema.org',
    name: space.title,
    description: space.description || opts.description || undefined,
    url: opts.url,
    image: opts.image ? [opts.image] : undefined,
    datePosted: space.created_at || undefined,
  }

  if (space.space_type === 'automotive') {
    return {
      ...base,
      '@type': 'Car',
      vehicleModelDate: space.vehicle_year || undefined,
      mileageFromOdometer: space.vehicle_mileage_km != null
        ? { '@type': 'QuantitativeValue', value: space.vehicle_mileage_km, unitCode: 'KMT' }
        : undefined,
      vehicleTransmission: space.vehicle_transmission || undefined,
      fuelType: space.vehicle_fuel_type || undefined,
      offers,
    }
  }

  return {
    ...base,
    '@type': 'RealEstateListing',
    address: space.location_text
      ? { '@type': 'PostalAddress', addressLocality: space.location_text, addressCountry: 'KE' }
      : undefined,
    numberOfRooms: space.bedrooms ?? undefined,
    floorSize: space.area_sqm != null
      ? { '@type': 'QuantitativeValue', value: space.area_sqm, unitCode: 'MTK' }
      : undefined,
    offers,
  }
}
