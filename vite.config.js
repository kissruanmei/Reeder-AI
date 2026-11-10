import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensure relative paths for Electron file:// protocol
  build: {
    emptyOutDir: false
  },
  server: {
    port: 3000,
    open: false,
    watch: {
      // Generated artifacts can be large or locked while the portable app runs.
      ignored: ['**/dist/**', '**/release/**', '**/scratch/**', '**/*.exe', '**/*.pptx']
    }
  }
})
