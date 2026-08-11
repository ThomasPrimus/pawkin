import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * Der typisierte Supabase-Client. Durch <Database> kennt jede Abfrage ihre
 * Spalten – ein Tippfehler in einem Feldnamen ist ab hier ein Compilerfehler
 * statt eines stillen `undefined` zur Laufzeit.
 *
 * Der anon key ist öffentlich; abgesichert wird über RLS in Postgres.
 */
const url = import.meta.env['VITE_SUPABASE_URL']
const anonKey = import.meta.env['VITE_SUPABASE_ANON_KEY']

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY müssen gesetzt sein (app/.env).')
}

export const supabase = createClient<Database>(url, anonKey)
