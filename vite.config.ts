import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // Sans ça, Chrome bloque l'acces window.closed entre origines pendant
      // signInWithPopup (Firebase Auth) et log un warning COOP en console.
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
})
