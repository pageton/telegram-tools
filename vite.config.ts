import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  base: '/telegram-tools/',
  plugins: [
    svelte(),
    tailwindcss(),
    nodePolyfills({
      include: ['buffer', 'process', 'events', 'util', 'stream', 'path', 'os', 'crypto', 'net', 'string_decoder'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
})
