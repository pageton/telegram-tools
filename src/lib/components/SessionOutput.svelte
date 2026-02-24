<script lang="ts">
  import { addToast } from './toast.svelte.js';
  import type { SessionFormat } from '../engine/types';
  import FormatBadge from './FormatBadge.svelte';

  let { format, sessionString, label = 'Session String' } = $props<{
    format: SessionFormat;
    sessionString: string;
    label?: string;
  }>();

  let copied = $state(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(sessionString);
      copied = true;
      addToast('Copied to clipboard', 'success');
      setTimeout(() => (copied = false), 2000);
    } catch (err) {
      addToast('Failed to copy', 'error');
    }
  }
</script>

<div class="flex flex-col gap-2">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <span class="text-sm font-medium text-surface-300">{label}</span>
      <FormatBadge {format} />
    </div>
    <button
      class="text-xs flex items-center gap-1.5 px-2 py-1 rounded transition-colors"
      class:text-success-400={copied}
      class:bg-success-500={copied}
      class:bg-opacity-10={copied}
      class:text-surface-400={!copied}
      class:hover:text-surface-100={!copied}
      class:hover:bg-surface-800={!copied}
      onclick={handleCopy}
    >
      {#if copied}
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        Copied
      {:else}
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
        Copy
      {/if}
    </button>
  </div>
  <div class="relative group">
    <textarea
      readonly
      class="w-full h-24 p-3 bg-surface-950/50 border border-surface-800 rounded-lg text-surface-200 font-mono text-sm leading-relaxed resize-none focus:outline-none focus:border-primary-500/50 transition-colors"
      value={sessionString}
    ></textarea>
    <div class="absolute inset-0 pointer-events-none rounded-lg ring-1 ring-inset ring-surface-800 group-hover:ring-surface-700 transition-all"></div>
  </div>
</div>

