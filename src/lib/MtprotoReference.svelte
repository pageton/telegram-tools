<script lang="ts">
  const clients = [
    {
      name: 'gotg',
      language: 'Go',
      color: '#00add8',
      repo: 'https://github.com/pageton/gotg',
      author: 'pageton',
      authorUrl: 'https://github.com/pageton',
      desc: 'Go Telegram client library, fork of gotgproto',
      sessionFormat: true,
      formatNote: 'Uses GramJS-compatible session strings',
    },
    {
      name: 'gotd',
      language: 'Go',
      color: '#00add8',
      repo: 'https://github.com/gotd/td',
      author: 'ernado',
      authorUrl: 'https://github.com/ernado',
      desc: 'Low-level Go MTProto API implementation, auto-generated from TL schema',
      sessionFormat: false,
      formatNote: 'Raw API — no session string format',
    },
    {
      name: 'gotgproto',
      language: 'Go',
      color: '#00add8',
      repo: 'https://github.com/celestix/gotgproto',
      author: 'celestix',
      authorUrl: 'https://github.com/celestix',
      desc: 'High-level Go Telegram client built on gotd',
      sessionFormat: false,
      formatNote: 'Upstream of gotg',
    },
    {
      name: 'GramJS',
      language: 'JavaScript',
      color: '#f7df1e',
      repo: 'https://github.com/gram-js/gramjs',
      author: 'painor',
      authorUrl: 'https://github.com/painor',
      desc: 'JavaScript/TypeScript MTProto library for Node.js & browser',
      sessionFormat: true,
      formatNote: 'Prefix "1" + base64(dcId + addrLen + addr + port + authKey)',
    },
    {
      name: 'Kurigram',
      language: 'Python',
      color: '#ff6f61',
      repo: 'https://github.com/KurimuzonAkuma/kurigram',
      author: 'KurimuzonAkuma',
      authorUrl: 'https://github.com/KurimuzonAkuma',
      desc: 'Python MTProto framework, fork of Pyrogram with active development',
      sessionFormat: true,
      formatNote: 'URL-safe base64(dcId + apiId + testMode + authKey + userId + isBot) — 271 bytes',
    },
    {
      name: 'mtcute',
      language: 'TypeScript',
      color: '#38bdf8',
      repo: 'https://github.com/mtcute/mtcute',
      author: 'teidesu',
      authorUrl: 'https://github.com/teidesu',
      desc: 'TypeScript MTProto library with modern API',
      sessionFormat: true,
      formatNote: 'v3: URL-safe base64(0x03 + flags + TL-serialized DCs + auth)',
    },
    {
      name: 'Telethon',
      language: 'Python',
      color: '#0088cc',
      repo: 'https://github.com/LonamiWebs/Telethon',
      author: 'Lonami',
      authorUrl: 'https://github.com/Lonami',
      desc: 'Python MTProto library, now on Codeberg',
      sessionFormat: true,
      formatNote: 'Prefix "1" + URL-safe base64(dcId + packed_ip + port + authKey)',
    },
    {
      name: 'pytdbot',
      language: 'Python',
      color: '#9b59b6',
      repo: 'https://github.com/pytdbot/client',
      author: 'AYMENJD',
      authorUrl: 'https://github.com/AYMENJD',
      desc: 'Python Telegram client powered by TDLib',
      sessionFormat: false,
      formatNote: 'Uses TDLib — no MTProto session string',
    },
  ];

  const formatSpecs = [
    { format: 'Telethon', prefix: '"1"', encoding: 'URL-safe base64 (padded)', structure: 'dcId(1) + packed_ip(4/16) + port(2BE) + authKey(256)', bytes: '263–275' },
    { format: 'GramJS', prefix: '"1"', encoding: 'Standard base64', structure: 'dcId(1) + addrLen(2BE) + addr(N) + port(2BE) + authKey(256)', bytes: '~275' },
    { format: 'Kurigram', prefix: 'None', encoding: 'URL-safe base64 (no pad)', structure: 'dcId(1) + apiId(4BE) + testMode(1) + authKey(256) + userId(8BE) + isBot(1)', bytes: '271' },
    { format: 'mtcute v3', prefix: '0x03 byte', encoding: 'URL-safe base64 (no pad)', structure: 'version(1) + flags(4LE) + TL_primaryDc + [TL_mediaDc] + [userId+isBot] + TL_authKey', bytes: 'Variable' },
    { format: 'gotg', prefix: 'None', encoding: 'Wraps GramJS format', structure: 'Accepts GramJS/Kurigram/Telethon strings directly', bytes: 'Same as source' },
  ];
</script>

<div class="flex flex-col gap-8 relative z-10">
  <!-- Client Libraries -->
  <div class="flex flex-col gap-3">
    <h3 class="text-sm font-semibold uppercase tracking-wider text-surface-500">Client Libraries</h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {#each clients as client}
        <div class="flex flex-col gap-3 p-4 bg-surface-950 rounded-xl border border-surface-800 hover:border-surface-700 transition-colors">
          <!-- Header -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-2.5 h-2.5 rounded-full" style="background-color: {client.color}; box-shadow: 0 0 8px {client.color}80;"></div>
              <a
                href={client.repo}
                target="_blank"
                rel="noopener noreferrer"
                class="text-base font-bold text-surface-50 hover:underline"
              >
                {client.name}
              </a>
              <span class="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-800 text-surface-400">{client.language}</span>
            </div>
            {#if client.sessionFormat}
              <span class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-success-500/10 text-success-500">Session</span>
            {/if}
          </div>

          <!-- Description -->
          <p class="text-xs text-surface-400 leading-relaxed">{client.desc}</p>

          <!-- Author -->
          <div class="flex items-center gap-2 pt-1 border-t border-surface-800/50">
            <svg class="w-3.5 h-3.5 text-surface-600" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
            <a
              href={client.authorUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs text-surface-500 hover:text-surface-200 transition-colors font-mono"
            >
              @{client.author}
            </a>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Session Format Specs -->
  <div class="flex flex-col gap-3">
    <h3 class="text-sm font-semibold uppercase tracking-wider text-surface-500">Session Format Specifications</h3>
    <div class="rounded-xl border border-surface-800">
      <table class="w-full text-xs">
        <thead>
          <tr class="bg-surface-900 text-surface-400 uppercase tracking-wider">
            <th class="text-left px-4 py-3 font-semibold">Format</th>
            <th class="text-left px-4 py-3 font-semibold">Prefix</th>
            <th class="text-left px-4 py-3 font-semibold">Encoding</th>
            <th class="text-left px-4 py-3 font-semibold">Binary Structure</th>
            <th class="text-right px-4 py-3 font-semibold">Bytes</th>
          </tr>
        </thead>
        <tbody>
          {#each formatSpecs as spec, i}
            <tr class="border-t border-surface-800 {i % 2 === 0 ? 'bg-surface-950' : 'bg-surface-950/50'} hover:bg-surface-900/50 transition-colors">
              <td class="px-4 py-2.5 font-semibold text-surface-200">{spec.format}</td>
              <td class="px-4 py-2.5 font-mono text-surface-400">{spec.prefix}</td>
              <td class="px-4 py-2.5 text-surface-400">{spec.encoding}</td>
              <td class="px-4 py-2.5 font-mono text-surface-500 text-[11px]">{spec.structure}</td>
              <td class="px-4 py-2.5 text-right text-surface-400 font-mono">{spec.bytes}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>
