// Aus dem Supabase-Schema generiert. NICHT von Hand pflegen –
// nach jeder Migration neu erzeugen (Supabase-MCP oder `supabase gen types`).
// Einzige Abweichung vom Generat: die Helper-Typen unten sind auf das eine
// public-Schema eingedampft, weil die mehrschematischen Generics hier nur
// Rauschen wären.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      bookings: {
        Row: {
          created_at: string
          date_text: string
          ends_on: string | null
          id: string
          message: string
          owner_id: string
          pet_id: string | null
          service: string
          sitter_id: string
          starts_on: string | null
          status: string
        }
        Insert: {
          created_at?: string
          date_text: string
          ends_on?: string | null
          id?: string
          message?: string
          owner_id: string
          pet_id?: string | null
          service: string
          sitter_id: string
          starts_on?: string | null
          status?: string
        }
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>
      }
      med_log: {
        Row: {
          booking_id: string | null
          dose: string
          due_label: string
          given_at: string
          given_by: string
          id: string
          med_name: string
          pet_id: string
        }
        Insert: {
          booking_id?: string | null
          dose?: string
          due_label?: string
          given_at?: string
          given_by: string
          id?: string
          med_name: string
          pet_id: string
        }
        Update: Partial<Database['public']['Tables']['med_log']['Insert']>
      }
      messages: {
        Row: {
          body: string
          booking_id: string | null
          created_at: string
          id: string
          is_system: boolean
          photo_url: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body?: string
          booking_id?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          photo_url?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          read: boolean
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          user_id: string
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      pet_docs: {
        Row: { created_at: string; id: string; name: string; path: string; pet_id: string }
        Insert: { created_at?: string; id?: string; name: string; path: string; pet_id: string }
        Update: Partial<Database['public']['Tables']['pet_docs']['Insert']>
      }
      pet_log: {
        Row: {
          author_id: string
          body: string
          booking_id: string | null
          created_at: string
          id: string
          pet_id: string
          photo_url: string | null
          type: string
        }
        Insert: {
          author_id: string
          body?: string
          booking_id?: string | null
          created_at?: string
          id?: string
          pet_id: string
          photo_url?: string | null
          type?: string
        }
        Update: Partial<Database['public']['Tables']['pet_log']['Insert']>
      }
      pet_shares: {
        Row: {
          code: string
          created_at: string
          id: string
          member_id: string | null
          pet_id: string
          role: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          member_id?: string | null
          pet_id: string
          role?: string
        }
        Update: Partial<Database['public']['Tables']['pet_shares']['Insert']>
      }
      pets: {
        Row: {
          breed: string
          created_at: string
          emergency_contact: string
          extra: Json
          food: string
          id: string
          info: string
          medication: string
          meds: Json
          name: string
          needs: string[]
          owner_id: string
          quirks: string
          species: string
          vaccinations: string
          vet_contact: string
        }
        Insert: {
          breed?: string
          created_at?: string
          emergency_contact?: string
          extra?: Json
          food?: string
          id?: string
          info?: string
          medication?: string
          meds?: Json
          name: string
          needs?: string[]
          owner_id: string
          quirks?: string
          species: string
          vaccinations?: string
          vet_contact?: string
        }
        Update: Partial<Database['public']['Tables']['pets']['Insert']>
      }
      profiles: {
        Row: {
          city: string
          client_rating: number | null
          client_rating_count: number
          created_at: string
          display_name: string
          id: string
          is_sitter: boolean
          lat: number | null
          lng: number | null
          phone: string
          plz: string
        }
        Insert: {
          city?: string
          client_rating?: number | null
          client_rating_count?: number
          created_at?: string
          display_name?: string
          id: string
          is_sitter?: boolean
          lat?: number | null
          lng?: number | null
          phone?: string
          plz?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      reviews: {
        Row: {
          author_id: string
          body: string
          booking_id: string
          created_at: string
          direction: string
          id: string
          stars: number
          target_id: string
        }
        Insert: {
          author_id: string
          body?: string
          booking_id: string
          created_at?: string
          direction: string
          id?: string
          stars: number
          target_id: string
        }
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>
      }
      site_assets: {
        Row: { content: string; content_type: string; path: string }
        Insert: { content: string; content_type?: string; path: string }
        Update: Partial<Database['public']['Tables']['site_assets']['Insert']>
      }
      sitters: {
        Row: {
          accepts_cats: boolean
          accepts_dogs: boolean
          active: boolean
          bio: string
          caps: string[]
          created_at: string
          id: string
          level: number
          offers_meet: boolean
          rating: number | null
          rating_count: number
          services: Json
        }
        Insert: {
          accepts_cats?: boolean
          accepts_dogs?: boolean
          active?: boolean
          bio?: string
          caps?: string[]
          created_at?: string
          id: string
          level?: number
          offers_meet?: boolean
          rating?: number | null
          rating_count?: number
          services?: Json
        }
        Update: Partial<Database['public']['Tables']['sitters']['Insert']>
      }
    }
    Views: Record<never, never>
    Functions: {
      is_pet_owner: { Args: { p_pet: string }; Returns: boolean }
      redeem_share: { Args: { share_code: string }; Returns: Json }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

type PublicSchema = Database['public']
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']
