<script lang="ts">
  import { fade, slide } from 'svelte/transition';
  import { addToast } from './components/toast.svelte.js';
  import {
    detectFormat,
    decodeSession,
    sessionSummary,
    FORMAT_META,
    type SessionFormat,
    type SessionData,
  } from './engine';
  import { bytesToHex } from './engine';
  import FormatBadge from './components/FormatBadge.svelte';

  const labelOf = (fmt: SessionFormat) => fmt === 'pyrogram' ? 'Kurigram' : FORMAT_META[fmt].label;

  let inputSession = $state('');
  let manualFormat = $state<SessionFormat | 'auto'>('auto');

  const formats = Object.keys(FORMAT_META) as SessionFormat[];

  let detection = $derived(inputSession.trim() ? detectFormat(inputSession) : null);

  let sourceFormat = $derived.by(() => {
    if (manualFormat !== 'auto') return manualFormat;
    return detection?.format || null;
  });

  let decoded = $derived.by((): SessionData | null => {
    if (!inputSession.trim() || !sourceFormat) return null;
    try {
      return decodeSession(inputSession, sourceFormat);
    } catch {
      return null;
    }
  });

  let summary = $derived(decoded ? sessionSummary(decoded) : null);

  let authKeyHex = $derived(decoded ? bytesToHex(decoded.authKey) : null);

  let authKeyTruncated = $derived(
    authKeyHex ? authKeyHex.slice(0, 32) + '...' + authKeyHex.slice(-32) : null
  );

  let showFullKey = $state(false);

  async function handlePaste() {
    try {
      inputSession = await navigator.clipboard.readText();
      addToast('Pasted from clipboard', 'info');
    } catch {
      addToast('Failed to read clipboard', 'error');
    }
  }

  function handleCopyKey() {
    if (!authKeyHex) return;
    navigator.clipboard.writeText(authKeyHex).then(
      () => addToast('Auth key copied', 'success'),
      () => addToast('Failed to copy', 'error')
    );
  }
</script>

<div class="flex flex-col gap-6 relative z-10">
  <!-- Input -->
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <label for="analyzer-input" class="text-sm font-medium text-surface-300">Session String</label>
      <button class="text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors flex items-center gap-1 bg-primary-400/10 px-2 py-1 rounded-md" onclick={handlePaste}>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
        Paste
      </button>
    </div>
    <textarea
      id="analyzer-input"
      bind:value={inputSession}
      placeholder="Paste any session string to analyze..."
      class="w-full h-28 bg-surface-950 border border-surface-800 text-surface-200 text-sm font-mono p-4 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors"
      spellcheck="false"
    ></textarea>
  </div>

  <!-- Format override -->
  <div class="flex flex-col gap-2">
    <label for="analyzer-format" class="text-sm font-medium text-surface-300">Format Override <span class="text-xs text-surface-500">(Optional)</span></label>
    <div class="relative">
      <select
        id="analyzer-format"
        bind:value={manualFormat}
        class="w-full appearance-none bg-surface-950 border border-surface-800 text-surface-200 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors"
      >
        <option value="auto">Auto-detect (Recommended)</option>
        {#each formats as fmt}
          <option value={fmt}>{labelOf(fmt)}</option>
        {/each}
      </select>
      <div class="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-surface-400">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
      </div>
    </div>
    {#if detection && manualFormat === 'auto'}
      <div class="flex items-center gap-2 mt-1" transition:fade>
        <FormatBadge format={detection.format} />
        <span class="text-xs text-surface-500">({detection.confidence} confidence)</span>
      </div>
    {/if}
  </div>

  <!-- Results -->
  {#if decoded && summary}
    <div class="flex flex-col gap-4" transition:slide>
      <!-- Fields grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {#each Object.entries(summary) as [key, val]}
          {#if key !== 'Auth Key'}
            <div class="flex flex-col gap-0.5 bg-surface-950 rounded-lg p-3 border border-surface-800">
              <span class="text-[10px] uppercase tracking-wider text-surface-500 font-semibold">{key}</span>
              <span class="text-sm text-surface-100 font-medium truncate" title={val}>{val}</span>
            </div>
          {/if}
        {/each}
      </div>

      <!-- Auth Key (special display) -->
      {#if authKeyHex}
        <div class="flex flex-col gap-2 bg-surface-950 rounded-xl p-4 border border-surface-800">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase tracking-wider text-surface-500 font-semibold">Auth Key ({decoded.authKey.length} bytes)</span>
            <div class="flex items-center gap-2">
              <button
                class="text-xs text-surface-400 hover:text-surface-200 transition-colors"
                onclick={() => showFullKey = !showFullKey}
              >
                {showFullKey ? 'Collapse' : 'Expand'}
              </button>
              <button
                class="text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
                onclick={handleCopyKey}
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                Copy
              </button>
            </div>
          </div>
          <code class="text-xs font-mono text-surface-300 leading-relaxed break-all select-all">
            {showFullKey ? authKeyHex : authKeyTruncated}
          </code>
        </div>
      {/if}
    </div>
  {:else if inputSession.trim() && !decoded}
    <div class="bg-error-500/10 border border-error-500/20 text-error-400 p-4 rounded-xl flex items-center gap-3" transition:fade>
      <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      <p class="text-sm font-medium">Unable to decode this session string. Try selecting the format manually.</p>
    </div>
  {/if}
</div>
