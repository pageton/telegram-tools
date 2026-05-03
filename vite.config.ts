import { defineConfig, type Plugin } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

function patchGramJS(): Plugin {
  return {
    name: 'patch-gramjs-serialize-bytes',
    config() {
      return {
        optimizeDeps: {
          esbuildOptions: {
            plugins: [{
              name: 'patch-serialize-bytes',
              setup(build) {
                build.onLoad({ filter: /generationHelpers/ }, async (args) => {
                  const fs = await import('fs')
                  let code = fs.readFileSync(args.path, 'utf8')
                  if (code.includes('Bytes or str expected')) {
                    code = code.replace(
                      'if (!(data instanceof Buffer)) {',
                      'if (!(data instanceof Buffer) && !(data instanceof Uint8Array)) {'
                    )
                  }
                  return { contents: code, loader: 'js' }
                })
              },
            }],
          },
        },
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/telegram-tools/',
  plugins: [
    patchGramJS(),
    svelte(),
    tailwindcss(),
    nodePolyfills({
      include: ['process', 'crypto', 'stream', 'util'],
      globals: { process: true },
    }),
  ],
})
