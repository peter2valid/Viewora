// How the quote form looks, kept apart from pricing: icons for each
// industry, client type and add-on, and the order of the steps. Icons are
// chosen to be recognised without reading (Airbnb mark, car, envelope...).
import type { IconName } from '~/types/icon'

// Industry first, then contact (from step 2 the lead is saved, so a visitor
// who leaves still gets a resume reminder). The A/B test can move contact last.
export const STEPS = ['industry', 'contact', 'details', 'extras', 'where'] as const
export type StepKey = typeof STEPS[number]

export const STEP_ICONS: Record<StepKey, IconName> = {
  industry: 'camera', contact: 'brand-whatsapp', details: 'clipboard-list', extras: 'plus', where: 'map-pin',
}

export const INDUSTRY_ICONS: Record<string, IconName> = {
  homes: 'home',
  airbnb: 'brand-airbnb',
  hotels: 'bed',
  restaurants: 'tools-kitchen-2',
  developers: 'crane',
  malls: 'shopping-bag',
  institutions: 'building',
  vehicles: 'car',
  farms: 'building-factory-2',
  other: 'dots-circle-horizontal',
}

export const CLIENT_TYPE_ICONS: Record<string, IconName> = {
  owner: 'key', agent: 'briefcase', developer: 'crane', manager: 'clipboard-list', marketer: 'chart', other: 'dots-circle-horizontal',
}

// Step 1 groups, most-asked first. "other" sits on its own after the groups.
export const INDUSTRY_GROUPS: Array<{ key: string; industries: string[] }> = [
  { key: 'property', industries: ['homes', 'airbnb', 'developers'] },
  { key: 'hospitality', industries: ['hotels', 'restaurants'] },
  { key: 'business', industries: ['vehicles', 'malls', 'institutions', 'farms'] },
]

// "Who are you?" fits the industry: no estate agents for a car dealer.
// Marketing agencies book for clients in every industry.
export const CLIENT_TYPES_BY_INDUSTRY: Record<string, string[]> = {
  homes: ['owner', 'agent', 'developer', 'manager', 'marketer', 'other'],
  developers: ['developer', 'agent', 'marketer', 'other'],
  airbnb: ['owner', 'manager', 'marketer', 'other'],
}
export const DEFAULT_CLIENT_TYPES = ['owner', 'manager', 'marketer', 'other']

// Shown on the form before they have their own pricing; staff price them by hand
export const PLANNED_INDUSTRIES = ['restaurants', 'developers', 'malls', 'institutions', 'farms']

export const ADDON_ICONS: Record<string, IconName> = {
  video: 'video',
  reel: 'device-mobile',
  photos_20: 'photo',
  airbnb_pro_pack: 'photo',
  hotspot_pack: 'info-circle',
  google_maps: 'brand-google-maps',
  floorplan_home_redraw: 'ruler', floorplan_home_draw: 'ruler', floorplan_home_measured: 'ruler',
  floorplan_biz_redraw: 'ruler', floorplan_biz_draw: 'ruler', floorplan_biz_measured: 'ruler',
  branding: 'palette',
  website_embed: 'code',
  rush: 'bolt',
  extra_revision: 'refresh',
  extra_scene_home: 'plus', extra_scene_business: 'plus',
}

// Icons beside each answer when it is echoed back on the result
export const QUESTION_ICONS: Record<string, IconName> = {
  size: 'bed', purpose: 'key', listings: 'list', same_building: 'building', units: 'building-community',
  kind: 'clipboard-list', rooms_hotel: 'bed', rooms_safari: 'bed', showroom_size: 'car', vehicles: 'car',
  description: 'edit', setting: 'sun', areas: 'grid', floors: 'elevator', link: 'world-www',
}

export const TIMING_ICONS: Record<string, IconName> = { this_week: 'clock', this_month: 'calendar', planning: 'clipboard-list' }
