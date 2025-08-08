import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Expose NEXT_PUBLIC_API_URL for compatibility with requested env name
const nextPublicApiUrl = process.env.NEXT_PUBLIC_API_URL || ''

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  define: {
    'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(nextPublicApiUrl),
    'import.meta.env.NEXT_PUBLIC_API_URL': JSON.stringify(nextPublicApiUrl),
  }
})
