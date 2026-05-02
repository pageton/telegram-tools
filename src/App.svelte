<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { Component } from 'svelte';
  import Toast from './lib/components/Toast.svelte';

  type Tool = 'generator' | 'converter' | 'analyzer' | 'connectivity' | 'reference';

  const toolComponents: Record<Tool, () => Promise<Component>> = {
    generator: () => import('./lib/Generator.svelte').then(m => m.default),
    converter: () => import('./lib/Converter.svelte').then(m => m.default),
    analyzer: () => import('./lib/Analyzer.svelte').then(m => m.default),
    connectivity: () => import('./lib/ConnectivityTest.svelte').then(m => m.default),
    reference: () => import('./lib/MtprotoReference.svelte').then(m => m.default),
  };

  let activeTool = $state<Tool | null>(null);

  const tools: {
    id: Tool;
    label: string;
    desc: string;
    icon: string;
    iconBg: string;
    iconText: string;
    accent: string;
  }[] = [
    {
      id: 'generator',
      label: 'Generator',
      desc: 'Create session strings via Telegram auth',
      icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
      iconBg: 'bg-primary-500/10',
      iconText: 'text-primary-400',
      accent: 'border-primary-500/25 hover:border-primary-500/50',
    },
    {
      id: 'converter',
      label: 'Converter',
      desc: 'Convert between session formats',
      icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
      iconBg: 'bg-accent-500/10',
      iconText: 'text-accent-400',
      accent: 'border-accent-500/25 hover:border-accent-500/50',
    },
    {
      id: 'analyzer',
      label: 'Analyzer',
      desc: 'Decode & inspect session fields',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
      iconBg: 'bg-primary-500/10',
      iconText: 'text-primary-400',
      accent: 'border-primary-500/25 hover:border-primary-500/50',
    },
    {
      id: 'connectivity',
      label: 'DC Connectivity',
      desc: 'Test latency to Telegram data centers',
      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      iconBg: 'bg-success-500/10',
      iconText: 'text-success-400',
      accent: 'border-success-500/25 hover:border-success-500/50',
    },
    {
      id: 'reference',
      label: 'MTProto Reference',
      desc: 'Client libraries & session format specs',
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
      iconBg: 'bg-surface-500/10',
      iconText: 'text-surface-300',
      accent: 'border-surface-600/25 hover:border-surface-500/50',
    },
  ];

  function toolHeader(tool: typeof tools[number]) {
    return { bg: tool.iconBg, text: tool.iconText, icon: tool.icon, label: tool.label, desc: tool.desc };
  }
</script>

<main class="min-h-screen bg-surface-950 text-surface-200 font-sans overflow-x-hidden">
  <Toast />

  <div class="relative flex flex-col items-center min-h-screen px-4 py-6 md:px-8 md:py-10 gap-8">
    <!-- Header -->
    <header class="w-full max-w-5xl flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center">
          <svg class="w-[18px] h-[18px] text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>
        </div>
        <span class="text-lg font-semibold text-surface-100 tracking-tight">Telegram Tools</span>
      </div>
      <a
        href="https://github.com/pageton/gotg"
        target="_blank"
        rel="noopener noreferrer"
        class="p-2 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800/50 transition-colors"
        aria-label="GitHub"
      >
        <svg class="w-5 h-5" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
      </a>
    </header>

    {#if activeTool === null}
      <!-- Dashboard -->
      <div class="w-full max-w-4xl" in:fade={{ duration: 200 }}>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {#each tools as tool (tool.id)}
            <button
              class="group bg-surface-900/60 border {tool.accent} rounded-xl p-4 text-left transition-all duration-200 hover:bg-surface-900/80 active:scale-[0.98] cursor-pointer"
              onclick={() => activeTool = tool.id}
            >
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 shrink-0 rounded-lg {tool.iconBg} flex items-center justify-center">
                  <svg class="w-5 h-5 {tool.iconText}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={tool.icon}></path></svg>
                </div>
                <div class="flex flex-col gap-0.5 min-w-0 pt-0.5">
                  <h3 class="text-sm font-semibold text-surface-100">{tool.label}</h3>
                  <p class="text-xs text-surface-500 leading-relaxed">{tool.desc}</p>
                </div>
              </div>
            </button>
          {/each}
        </div>
      </div>
    {:else}
      <!-- Tool View -->
      <div class="w-full max-w-5xl flex flex-col gap-6" in:fade={{ duration: 200 }}>
        <!-- Back -->
        <button
          class="self-start flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-200 transition-colors group"
          onclick={() => activeTool = null}
        >
          <svg class="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
          Back
        </button>

        <div class="bg-surface-900/60 border border-surface-800 rounded-xl p-6 md:p-8">
          {#each [tools.find(t => t.id === activeTool)!] as ct}
            <div class="flex items-center gap-3 mb-6">
              <div class="w-9 h-9 rounded-lg {ct.iconBg} flex items-center justify-center">
                <svg class="w-[18px] h-[18px] {ct.iconText}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={ct.icon}></path>
                </svg>
              </div>
              <div>
                <h2 class="text-base font-semibold text-surface-100">{ct.label}</h2>
                <p class="text-xs text-surface-500">{ct.desc}</p>
              </div>
            </div>
          {/each}
          {#await toolComponents[activeTool!]()}
            <div class="flex items-center justify-center py-12">
              <div class="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
            </div>
          {:then Component}
            <Component />
          {:catch error}
            <div class="rounded-lg bg-red-500/10 border border-red-500/25 p-4">
              <p class="text-sm text-red-400 font-medium">Failed to load tool</p>
              <p class="text-xs text-red-400/70 mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
              <button
                class="mt-3 text-xs text-red-400 hover:text-red-300 underline"
                onclick={() => activeTool = null}
              >
                Go back
              </button>
            </div>
          {/await}
        </div>
      </div>
    {/if}

    <!-- Footer -->
    <footer class="mt-auto pt-8 pb-4 text-center">
      <p class="text-xs text-surface-600">All processing happens in your browser. No data is sent to any server.</p>
    </footer>
  </div>
</main>
