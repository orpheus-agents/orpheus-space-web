import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

const target = process.env.ORPHEUS_SPACE_UPSTREAM ?? 'http://127.0.0.1:8010'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: Object.fromEntries(['/api/', '/auth/', '/saml/'].map((path) => [path, { target }])),
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    clearMocks: true,
  },
})
