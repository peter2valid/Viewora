export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            // ── profiles ──────────────────────────────────────────
            // Auto-created on signup by handle_new_user trigger.
            profiles: {
                Row: {
                    id: string          // = auth.users.id
                    full_name: string | null
                    avatar_url: string | null
                    phone: string | null
                    plan: string        // 'free' | 'basic' | 'plus' | 'pro' | 'elite'
                    created_at: string
                }
                Insert: {
                    id: string
                    full_name?: string | null
                    avatar_url?: string | null
                    phone?: string | null
                    plan?: string
                    created_at?: string
                }
                Update: {
                    full_name?: string | null
                    avatar_url?: string | null
                    phone?: string | null
                    plan?: string
                }
            }

            // ── spaces ────────────────────────────────────────────
            // A virtual tour project. Container for scenes + hotspots.
            spaces: {
                Row: {
                    id: string
                    owner_id: string
                    title: string
                    description: string | null
                    is_published: boolean
                    slug: string | null   // unique; used in public URL /tours/[slug]
                    created_at: string
                }
                Insert: {
                    id?: string
                    owner_id: string
                    title: string
                    description?: string | null
                    is_published?: boolean
                    slug?: string | null
                    created_at?: string
                }
                Update: {
                    title?: string
                    description?: string | null
                    is_published?: boolean
                    slug?: string | null
                }
            }

            // ── scenes ────────────────────────────────────────────
            // A 360° panorama image inside a space.
            // image_path is a path inside the 'tours' storage bucket.
            scenes: {
                Row: {
                    id: string
                    space_id: string
                    name: string
                    image_path: string | null   // storage path: {spaceId}/{filename}
                    order_index: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    space_id: string
                    name: string
                    image_path?: string | null
                    order_index?: number
                    created_at?: string
                }
                Update: {
                    name?: string
                    image_path?: string | null
                    order_index?: number
                }
            }

            // ── hotspots ──────────────────────────────────────────
            // Interactive marker placed on a scene at a yaw/pitch coordinate.
            // type = 'nav'  → payload: { target_scene_id: string }
            // type = 'info' → payload: { label: string }
            hotspots: {
                Row: {
                    id: string
                    scene_id: string
                    type: 'nav' | 'info'
                    yaw: number
                    pitch: number
                    payload: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    scene_id: string
                    type?: 'nav' | 'info'
                    yaw: number
                    pitch: number
                    payload?: Json
                    created_at?: string
                }
                Update: {
                    type?: 'nav' | 'info'
                    yaw?: number
                    pitch?: number
                    payload?: Json
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}
