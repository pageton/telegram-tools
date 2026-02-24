<script lang="ts">
  import { fade } from 'svelte/transition';
  import { pingDc, pingAllDcs, type DcPingResult } from './dcping';
  import { DC_PROD, DC_TEST } from './engine/types';

  let results = $state<DcPingResult[]>([
    ...Object.entries(DC_PROD).map(([id, dc]) => ({ dcId: Number(id), ip: dc.ip, port: dc.port, status: 'pending' as const, latency: null, test: false })),
    ...Object.entries(DC_TEST).map(([id, dc]) => ({ dcId: Number(id), ip: dc.ip, port: dc.port, status: 'pending' as const, latency: null, test: true })),
  ]);
  let isTestingAll = $state(false);
  let testingIds = $state<Set<string>>(new Set());
  let testedOnce = $state(false);

  let prodResults = $derived(results.filter((r) => !r.test));
  let testResults = $derived(results.filter((r) => r.test));

  function dcKey(dc: DcPingResult): string {
    return `${dc.test ? 'test' : 'prod'}-${dc.dcId}`;
  }

  async function runAll() {
    isTestingAll = true;
    const allKeys = results.map(dcKey);
    testingIds = new Set(allKeys);
    results = results.map((r) => ({ ...r, status: 'connecting' as const, latency: null, error: undefined }));

    const res = await pingAllDcs(5000);
    results = res;
    isTestingAll = false;
    testingIds = new Set();
    testedOnce = true;
  }

  async function runOne(dc: DcPingResult) {
    const key = dcKey(dc);
    testingIds = new Set([...testingIds, key]);
    results = results.map((r) =>
      dcKey(r) === key ? { ...r, status: 'connecting' as const, latency: null, error: undefined } : r
    );

    const res = await pingDc(dc.dcId, 5000, !!dc.test);
    results = results.map((r) => dcKey(r) === key ? res : r);
    testingIds = new Set([...testingIds].filter((k) => k !== key));
    testedOnce = true;
  }

  function isOneTesting(dc: DcPingResult): boolean {
    return testingIds.has(dcKey(dc));
  }

  function latencyColor(ms: number | null): string {
    if (ms === null) return 'text-surface-500';
    if (ms < 100) return 'text-success-500';
    if (ms < 300) return 'text-warning-500';
    return 'text-error-500';
  }

  function latencyBg(ms: number | null): string {
    if (ms === null) return 'bg-surface-800';
    if (ms < 100) return 'bg-success-500/10';
    if (ms < 300) return 'bg-warning-500/10';
    return 'bg-error-500/10';
  }

  function statusIcon(status: DcPingResult['status']): string {
    switch (status) {
      case 'ok': return '●';
      case 'timeout': return '○';
      case 'error': return '✕';
      default: return '◌';
    }
  }

  function statusColor(status: DcPingResult['status']): string {
    switch (status) {
      case 'ok': return 'text-success-500';
      case 'timeout': return 'text-warning-500';
      case 'error': return 'text-error-500';
      default: return 'text-surface-500';
    }
  }

  const DC_LOCATIONS: Record<number, string> = {
    1: 'Miami, US',
    2: 'Amsterdam, NL',
    3: 'Miami, US',
    4: 'Amsterdam, NL',
    5: 'Singapore, SG',
  };
</script>

{#snippet dcRow(dc: DcPingResult)}
  <div
    class="flex items-center justify-between p-3 rounded-xl border transition-all {dc.status === 'connecting' ? 'border-surface-700 bg-surface-900/50' : dc.status === 'ok' ? 'border-success-500/20 bg-success-500/5' : dc.status === 'pending' ? 'border-surface-800 bg-surface-950' : 'border-error-500/20 bg-error-500/5'}"
    transition:fade
  >
    <div class="flex items-center gap-3">
      <span class="text-lg {statusColor(dc.status)}">
        {#if dc.status === 'connecting'}
          <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        {:else}
          {statusIcon(dc.status)}
        {/if}
      </span>

      <div class="flex flex-col">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-surface-100">DC {dc.dcId}</span>
          {#if DC_LOCATIONS[dc.dcId]}
            <span class="text-xs text-surface-500">{DC_LOCATIONS[dc.dcId]}</span>
          {/if}
        </div>
        <span class="text-xs text-surface-600 font-mono">{dc.ip}:{dc.port}</span>
      </div>
    </div>

    <div class="flex items-center gap-3">
      {#if dc.status === 'connecting'}
        <span class="text-xs text-surface-500">...</span>
      {:else if dc.status === 'ok' && dc.latency !== null}
        <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-md {latencyColor(dc.latency)} {latencyBg(dc.latency)}">
          {dc.latency}ms
        </span>
      {:else if dc.status === 'timeout'}
        <span class="text-xs font-medium text-warning-500">Timeout</span>
      {:else if dc.status === 'error'}
        <span class="text-xs font-medium text-error-400">{dc.error || 'Failed'}</span>
      {/if}

      <!-- Per-DC test button -->
      <button
        class="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        onclick={() => runOne(dc)}
        disabled={isOneTesting(dc) || isTestingAll}
        aria-label="Test DC {dc.dcId}"
        title="Test DC {dc.dcId}"
      >
        {#if isOneTesting(dc)}
          <svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        {:else}
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
        {/if}
      </button>
    </div>
  </div>
{/snippet}

<div class="flex flex-col gap-6 relative z-10">
  <!-- Test All button -->
  <div class="flex justify-end">
    <button
      class="px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      class:bg-success-600={!isTestingAll}
      class:hover:bg-success-500={!isTestingAll}
      class:text-white={!isTestingAll}
      class:bg-surface-800={isTestingAll}
      class:text-surface-400={isTestingAll}
      onclick={runAll}
      disabled={isTestingAll}
    >
      {#if isTestingAll}
        <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Testing All...
      {:else}
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        {testedOnce ? 'Re-test All' : 'Test All'}
      {/if}
    </button>
  </div>

  <!-- Production DCs -->
  <div class="flex flex-col gap-2">
    <span class="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1">Production</span>
    {#each prodResults as dc (dc.dcId)}
      {@render dcRow(dc)}
    {/each}
  </div>

  <!-- Test DCs -->
  <div class="flex flex-col gap-2">
    <span class="text-xs font-semibold uppercase tracking-wider text-warning-500/70 mb-1">Test Servers</span>
    {#each testResults as dc (`test-${dc.dcId}`)}
      {@render dcRow(dc)}
    {/each}
  </div>

  <!-- Legend -->
  {#if testedOnce}
    <div class="flex items-center justify-center gap-4 text-xs text-surface-500 pt-2 border-t border-surface-800" transition:fade>
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-success-500"></span> &lt;100ms</span>
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-warning-500"></span> 100-300ms</span>
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-error-500"></span> &gt;300ms</span>
    </div>
  {/if}
</div>
