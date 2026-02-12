import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rpyfgxbsjoqdfxmikjmz.supabase.co'
const supabaseAnonKey = 'sb_publishable_RqCCbe4eUzLN9ZkXuDFPOw_FB8ghorV'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)