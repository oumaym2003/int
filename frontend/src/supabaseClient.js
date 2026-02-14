import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxdtgyxvbzomatuzorxn.supabase.co'
const supabaseAnonKey = 'sb_publishable_QjSLY4r2qbF5EmW_txA4rw_Fuc8O7iH'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)