import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Link previews need an absolute address for the picture. On Vercel it is the project's main domain.
function siteOrigin(): Plugin {
  const domain = process.env.VERCEL_PROJECT_PRODUCTION_URL
  const origin = process.env.SITE_ORIGIN ?? (domain ? `https://${domain}` : '')
  return {
    name: 'site-origin',
    transformIndexHtml: (html) => html.replaceAll('__SITE_ORIGIN__', origin),
  }
}

export default defineConfig({
  plugins: [react(), siteOrigin()],
  build: {
    target: 'es2022',
  },
})
