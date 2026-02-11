import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pcbemrcbrwzsivujxiaj.supabase.co'
const supabaseAnonKey = 'sb_publishable_lko9spTJs_Z3hZVdmrlRqw_OP4IGtWe'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)