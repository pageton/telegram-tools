import { defineConfig, type Plugin } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// Patch GramJS serializeBytes to accept Uint8Array in browser environments.
// The crypto polyfill returns Uint8Array which fails GramJS's `instanceof Buffer` check.
function patchGramJS(): Plugin {
  return {
    name: 'patch-gramjs-serialize-bytes',
    transform(code, id) {
      if (id.includes('generationHelpers') && code.includes('Bytes or str expected')) {
        return code.replace(
          'if (!(data instanceof Buffer)) {',
          'if (!(data instanceof Buffer)) { if (data instanceof Uint8Array) { data = Buffer.from(data); } else'
        );
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: '/telegram-tools/',
  plugins: [
    patchGramJS(),
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
