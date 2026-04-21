export interface Space {
  id: string
  title: string
  slug: string | null
  description: string | null
  space_type: 'residential' | 'commercial' | 'hospitality' | 'education' | 'automotive' | 'other'
  location_text: string | null
  cover_image_url: string | null
  has_360: boolean
  has_gallery: boolean
  is_published: boolean
  published_at: string | null
  visibility: string
  lead_form_enabled: boolean
  branding_enabled: boolean
  created_at: string
  updated_at: string
}

export interface SpaceWithMedia extends Space {
  property_media: import('../scene').SceneMedia[]
  property_360_settings: import('../scene').Settings360 | null
}
