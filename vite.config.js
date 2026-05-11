import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The visualization lives at andy-miller.com/hum.
// `base` makes all asset URLs absolute under /hum/.
export default defineConfig({
  base: '/hum/',
  plugins: [react(), tailwindcss()],
})
