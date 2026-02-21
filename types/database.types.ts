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
            properties: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    address: string | null
                    property_type: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    address?: string | null
                    property_type?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    address?: string | null
                    property_type?: string
                    created_at?: string
                }
            }
            virtual_tours: {
                Row: {
                    id: string
                    property_id: string
                    title: string
                    tour_url: string | null
                    status: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    property_id: string
                    title: string
                    tour_url?: string | null
                    status?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    property_id?: string
                    title?: string
                    tour_url?: string | null
                    status?: string
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
