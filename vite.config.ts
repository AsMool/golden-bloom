import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Link previews need an absolute address for the picture: the site's main address.
function siteOrigin(): Plugin {
  const origin = process.env.SITE_ORIGIN ?? 'https://goldenbloom.vercel.app'
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
