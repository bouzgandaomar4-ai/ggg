import { defineConfig } from 'vite'

export default defineConfig({
  base: '/ggg/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser'
  }
})
