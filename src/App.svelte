<script lang="ts">
  import { fade, slide } from 'svelte/transition';
  import Generator from './lib/Generator.svelte';
  import Converter from './lib/Converter.svelte';
  import ConnectivityTest from './lib/ConnectivityTest.svelte';
  import Analyzer from './lib/Analyzer.svelte';
  import MtprotoReference from './lib/MtprotoReference.svelte';
  import Toast from './lib/components/Toast.svelte';

  type Tool = 'generator' | 'converter' | 'analyzer' | 'connectivity' | 'reference';

  let activeTool = $state<Tool | null>(null);

  const tools: { id: Tool; label: string; desc: string; icon: string; glow: string; iconBg: string; iconText: string; hoverBorder: string }[] = [
    {
      id: 'generator',
      label: 'Generator',
      desc: 'Create session strings via Telegram auth',
      icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
      glow: 'bg-primary-500/20',
      iconBg: 'bg-primary-600/15 border-primary-500/20',
      iconText: 'text-primary-400',
      hoverBorder: 'hover:border-primary-500/40',
    },
    {
      id: 'converter',
      label: 'Converter',
      desc: 'Convert between session formats',
      icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
      glow: 'bg-accent-500/20',
      iconBg: 'bg-accent-600/15 border-accent-500/20',
      iconText: 'text-accent-400',
      hoverBorder: 'hover:border-accent-500/40',
    },
    {
      id: 'analyzer',
      label: 'Analyzer',
      desc: 'Decode & inspect session fields',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
      glow: 'bg-primary-500/10',
      iconBg: 'bg-primary-600/15 border-primary-500/20',
      iconText: 'text-primary-400',
      hoverBorder: 'hover:border-primary-500/40',
    },
    {
      id: 'connectivity',
      label: 'DC Connectivity',
      desc: 'Test latency to Telegram data centers',
      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      glow: 'bg-success-500/10',
      iconBg: 'bg-success-500/15 border-success-500/20',
      iconText: 'text-success-400',
      hoverBorder: 'hover:border-success-500/40',
    },
    {
      id: 'reference',
      label: 'MTProto Reference',
      desc: 'Client libraries & session format specs',
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
      glow: 'bg-surface-500/10',
      iconBg: 'bg-surface-700/30 border-surface-600/30',
      iconText: 'text-surface-300',
      hoverBorder: 'hover:border-surface-500/40',
    },
  ];
</script>

<main class="min-h-screen bg-surface-950 text-surface-200 selection:bg-primary-500/30 font-sans overflow-x-hidden relative">
  <!-- Background -->
  <div class="fixed inset-0 pointer-events-none z-0">
    <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGwyNCAyNE0yNCA2MEwwIDI0bDI0LTI0TDM2IDBsMjQgMjRNMCAzNmw2MCAyNCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utb3BhY2l0eT0iMC4wMyIvPjwvZz48L3N2Zz4=')] bg-center opacity-30"></div>
    <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-900/40 rounded-full blur-[120px]"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-900/30 rounded-full blur-[120px]"></div>
  </div>

  <Toast />

  <div class="relative z-10 flex flex-col items-center min-h-screen p-4 md:p-8 gap-8">
    <!-- Header -->
    <header class="w-full max-w-5xl flex items-center justify-between bg-surface-900/30 p-5 rounded-2xl border border-surface-800 backdrop-blur-md shadow-2xl">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
          <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>
        </div>
        <h1 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-surface-400">Telegram Tools</h1>
      </div>
      <a
        href="https://github.com/pageton/gotg"
        target="_blank"
        rel="noopener noreferrer"
        class="p-2 rounded-xl bg-surface-800/50 border border-surface-700 text-surface-400 hover:text-white hover:bg-surface-700 transition-all"
        aria-label="GitHub"
      >
        <svg class="w-5 h-5" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
      </a>
    </header>

    {#if activeTool === null}
      <!-- Dashboard Grid -->
      <div class="w-full max-w-3xl grid grid-cols-2 gap-4 md:gap-6" in:fade={{ duration: 200 }}>
        {#each tools as tool (tool.id)}
          <button
            class="group relative bg-surface-900/50 backdrop-blur-md border border-surface-800 rounded-2xl p-5 shadow-xl overflow-hidden text-left transition-all duration-200 {tool.hoverBorder} hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            onclick={() => activeTool = tool.id}
          >
            <!-- Glow -->
            <div class="absolute -top-16 -right-16 w-32 h-32 {tool.glow} rounded-full blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div class="relative z-10 flex items-start gap-4">
              <div class="w-11 h-11 shrink-0 rounded-xl {tool.iconBg} border flex items-center justify-center">
                <svg class="w-5 h-5 {tool.iconText}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={tool.icon}></path></svg>
              </div>
              <div class="flex flex-col gap-0.5 min-w-0">
                <h3 class="text-base font-bold text-surface-50">{tool.label}</h3>
                <p class="text-xs text-surface-400 leading-relaxed">{tool.desc}</p>
              </div>
            </div>
          </button>
        {/each}
      </div>
    {:else}
      <!-- Active Tool View -->
      <div class="w-full max-w-5xl flex flex-col gap-6" in:fade={{ duration: 200 }}>
        <!-- Back button -->
        <button
          class="self-start flex items-center gap-2 text-sm text-surface-400 hover:text-surface-100 transition-colors group"
          onclick={() => activeTool = null}
        >
          <svg class="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
          Back to tools
        </button>

        {#if activeTool === 'generator'}
          <Generator />
        {:else if activeTool === 'converter'}
          <Converter />
        {:else if activeTool === 'analyzer'}
          <div class="bg-surface-900/50 backdrop-blur-md border border-surface-800 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            <div class="absolute -top-24 -left-24 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="flex items-center gap-3 mb-6 relative z-10">
              <div class="w-10 h-10 rounded-xl bg-primary-600/15 border border-primary-500/20 flex items-center justify-center">
                <svg class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
              </div>
              <div>
                <h2 class="text-lg font-bold text-surface-50">Session Analyzer</h2>
                <p class="text-xs text-surface-500">Decode & inspect session fields</p>
              </div>
            </div>
            <Analyzer />
          </div>
        {:else if activeTool === 'connectivity'}
          <div class="bg-surface-900/50 backdrop-blur-md border border-surface-800 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            <div class="absolute -top-24 -right-24 w-48 h-48 bg-success-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="flex items-center gap-3 mb-6 relative z-10">
              <div class="w-10 h-10 rounded-xl bg-success-500/15 border border-success-500/20 flex items-center justify-center">
                <svg class="w-5 h-5 text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              </div>
              <div>
                <h2 class="text-lg font-bold text-surface-50">DC Connectivity</h2>
                <p class="text-xs text-surface-500">Test latency to Telegram data centers</p>
              </div>
            </div>
            <ConnectivityTest />
          </div>
        {:else if activeTool === 'reference'}
          <div class="bg-surface-900/50 backdrop-blur-md border border-surface-800 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            <div class="absolute -top-24 -left-24 w-48 h-48 bg-surface-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div class="flex items-center gap-3 mb-6 relative z-10">
              <div class="w-10 h-10 rounded-xl bg-surface-700/30 border border-surface-600/30 flex items-center justify-center">
                <svg class="w-5 h-5 text-surface-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
              </div>
              <div>
                <h2 class="text-lg font-bold text-surface-50">MTProto Client Reference</h2>
                <p class="text-xs text-surface-500">Libraries & session format specifications</p>
              </div>
            </div>
            <MtprotoReference />
          </div>
        {/if}
      </div>
    {/if}

    <div class="h-8"></div>
  </div>
</main>
