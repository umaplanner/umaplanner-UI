import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  devServer: {
    proxy: {
      '/umas': {
        target: 'http://localhost:5063',
        changeOrigin: true,
      },
    },
  },
})
