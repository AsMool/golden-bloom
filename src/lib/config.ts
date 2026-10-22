// The publishable key is meant to be public: the website can only call the garden's
// database functions, and those check the member key themselves.
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || 'https://vxzrmkwvhnfvjilgouse.supabase.co'
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_G-zs5uY7cazZ-5h4eZxUBQ_4hsHzXX-'

// The site's main address. Share links use it even when the site was opened through
// another Vercel address; anywhere else (a computer, the tests) links stay local.
const MAIN_SITE = 'https://goldenbloom.vercel.app/'
export const SITE_URL: string =
  import.meta.env.VITE_SITE_URL ||
  (window.location.hostname.endsWith('.vercel.app') ? MAIN_SITE : new URL(import.meta.env.BASE_URL, window.location.origin).href)
