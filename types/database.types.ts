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
            profiles: {
                Row: {
                    id: string
                    full_name: string | null
                    phone: string | null
                    plan: string
                    created_at: string
                }
                Insert: {
                    id: string
                    full_name?: string | null
                    phone?: string | null
                    plan?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    full_name?: string | null
                    phone?: string | null
                    plan?: string
                    created_at?: string
                }
            }
            spaces: {
                Row: {
                    id: string
                    owner_id: string
                    title: string
                    description: string | null
                    is_published: boolean
                    slug: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    owner_id: string
                    title?: string
                    description?: string | null
                    is_published?: boolean
                    slug?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    owner_id?: string
                    title?: string
                    description?: string | null
                    is_published?: boolean
                    slug?: string | null
                    created_at?: string
                }
            }
            scenes: {
                Row: {
                    id: string
                    space_id: string
                    name: string
                    image_path: string | null
                    order_index: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    space_id: string
                    name?: string
                    image_path?: string | null
                    order_index?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    space_id?: string
                    name?: string
                    image_path?: string | null
                    order_index?: number
                    created_at?: string
                }
            }
            hotspots: {
                Row: {
                    id: string
                    scene_id: string
                    type: string
                    yaw: number
                    pitch: number
                    payload: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    scene_id: string
                    type?: string
                    yaw: number
                    pitch: number
                    payload?: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    scene_id?: string
                    type?: string
                    yaw?: number
                    pitch?: number
                    payload?: Json
                    created_at?: string
                }
            }
            subscriptions: {
                Row: {
                    id: string
                    user_id: string
                    plan: string
                    billing_freq: string
                    status: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    plan?: string
                    billing_freq?: string
                    status?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    plan?: string
                    billing_freq?: string
                    status?: string
                    created_at?: string
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
