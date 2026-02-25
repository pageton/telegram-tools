<script lang="ts">
  import { addToast } from './components/toast.svelte.js';
  import {
    detectFormat,
    decodeSession,
    encodeSession,
    sessionSummary,
    FORMAT_META,
    type SessionFormat,
    type DetectionResult
  } from './engine';
  import FormatBadge from './components/FormatBadge.svelte';
  import SessionOutput from './components/SessionOutput.svelte';
  import { fade, slide } from 'svelte/transition';

  const labelOf = (fmt: SessionFormat) => fmt === 'pyrogram' ? 'Kurigram' : FORMAT_META[fmt].label;

  let inputSession = $state<string>('');
  let targetFormat = $state<SessionFormat>('telethon');
  let manualFormat = $state<SessionFormat | 'auto'>('auto');
  let apiIdStr = $state<string>('');

  let generatedSession = $state<string | null>(null);
  let allGenerated = $state<Record<SessionFormat, string> | null>(null);

  const formats: SessionFormat[] = ['gotg', 'gramjs', 'pyrogram', 'mtcute', 'telethon'];

  // Auto-detection logic
  let detection = $derived(inputSession.trim() ? detectFormat(inputSession) : null);
  
  let sourceFormat = $derived.by(() => {
    if (manualFormat !== 'auto') return manualFormat;
    return detection?.format || null;
  });

  let decodedData = $derived.by(() => {
    if (!inputSession.trim() || !sourceFormat) return null;
    try {
      return decodeSession(inputSession, sourceFormat);
    } catch {
      return null;
    }
  });

  async function handleConvert() {
    allGenerated = null;
    if (!sourceFormat || !decodedData) {
      addToast('Cannot convert: invalid or unknown source session.', 'error');
      return;
    }

    try {
      const apiId = apiIdStr ? parseInt(apiIdStr, 10) : decodedData.apiId;
      generatedSession = await encodeSession(decodedData, targetFormat, { apiId: isNaN(apiId!) ? undefined : apiId });
      addToast(`Converted to ${labelOf(targetFormat)} successfully.`, 'success');
    } catch (err: any) {
      addToast(`Conversion failed: ${err.message}`, 'error');
    }
  }

  async function handleConvertAll() {
    generatedSession = null;
    if (!sourceFormat || !decodedData) {
      addToast('Cannot convert: invalid or unknown source session.', 'error');
      return;
    }

    try {
      const apiId = apiIdStr ? parseInt(apiIdStr, 10) : decodedData.apiId;
      const opts = { apiId: isNaN(apiId!) ? undefined : apiId };
      const results = {} as Record<SessionFormat, string>;
      for (const fmt of formats) {
        results[fmt] = await encodeSession(decodedData, fmt, opts);
      }
      allGenerated = results;
      addToast('Converted to all formats.', 'success');
    } catch (err: any) {
      addToast(`Conversion failed: ${err.message}`, 'error');
    }
  }

  let showApiIdInput = $derived(
    decodedData && !decodedData.apiId && 
    (targetFormat === 'pyrogram' || allGenerated !== null)
  );

  async function handlePaste() {
    try {
      inputSession = await navigator.clipboard.readText();
      addToast('Pasted from clipboard', 'info');
    } catch {
      addToast('Failed to read clipboard', 'error');
    }
  }
</script>

<div class="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 md:p-8">
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
    
    <!-- Input Section -->
    <div class="bg-surface-900/50 backdrop-blur-md border border-surface-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <!-- Glow -->
      <div class="absolute -top-24 -right-24 w-48 h-48 bg-accent-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div class="flex flex-col gap-6 relative z-10">
        <h2 class="text-xl font-bold text-surface-50 flex items-center gap-2">
          <svg class="w-5 h-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
          Session Converter
        </h2>

        <!-- Input Area -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <label for="conv-input" class="text-sm font-medium text-surface-300">Input Session String</label>
            <button class="text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors flex items-center gap-1 bg-primary-400/10 px-2 py-1 rounded-md" onclick={handlePaste}>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              Paste
            </button>
          </div>
          <div class="relative group">
            <textarea
              id="conv-input"
              bind:value={inputSession}
              placeholder="Paste Telethon, GramJS, Kurigram, mtcute, or gotg session here..."
              class="w-full h-40 bg-surface-950 border border-surface-800 text-surface-200 text-sm font-mono p-4 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-colors"
              spellcheck="false"
            ></textarea>
            
            {#if inputSession.trim()}
              <div class="absolute bottom-3 right-3 flex items-center gap-2" transition:fade>
                {#if manualFormat === 'auto'}
                  {#if detection}
                    <div class="bg-surface-900 border border-surface-700 rounded-lg px-2 py-1.5 shadow-lg flex items-center gap-2">
                      <span class="text-xs text-surface-400 font-medium">Auto-detected:</span>
                      <FormatBadge format={detection.format} />
                      {#if detection.confidence === 'high'}
                        <svg class="w-3.5 h-3.5 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      {:else if detection.confidence === 'medium'}
                        <svg class="w-3.5 h-3.5 text-warning-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                      {/if}
                    </div>
                  {:else}
                    <div class="bg-error-500/10 border border-error-500/20 text-error-400 text-xs px-2.5 py-1.5 rounded-lg font-medium shadow-lg flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      Unknown Format
                    </div>
                  {/if}
                {/if}
              </div>
            {/if}
          </div>
        </div>

        <!-- Manual Override -->
        <div class="flex flex-col gap-2">
          <label for="conv-format-override" class="text-sm font-medium text-surface-300">Format Override <span class="text-xs text-surface-500">(Optional)</span></label>
          <div class="relative">
            <select
              id="conv-format-override"
              bind:value={manualFormat}
              class="w-full appearance-none bg-surface-950 border border-surface-800 text-surface-200 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-colors"
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
        </div>

        {#if showApiIdInput}
          <div class="flex flex-col gap-2 bg-surface-950 p-3 rounded-lg border border-surface-800" transition:slide>
            <label for="conv-api-id" class="text-sm font-medium text-surface-300 flex items-center gap-2">
              API ID Required
              <span class="text-xs bg-warning-500/20 text-warning-400 px-1.5 py-0.5 rounded">Kurigram Target</span>
            </label>
            <input
              id="conv-api-id"
              type="text"
              bind:value={apiIdStr}
              placeholder="e.g. 123456"
              class="w-full bg-surface-900 border border-surface-700 text-surface-200 text-sm p-2.5 rounded-md focus:outline-none focus:border-accent-500 transition-colors"
            />
          </div>
        {/if}

        <!-- Target Format Selector -->
        <div class="flex flex-col gap-3 pt-2 border-t border-surface-800">
          <span class="text-sm font-medium text-surface-300">Convert To</span>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            {#each formats as fmt}
              <button
                class="relative p-2 rounded-xl border text-left transition-all overflow-hidden group"
                class:border-surface-700={targetFormat !== fmt}
                class:bg-surface-950={targetFormat !== fmt}
                class:hover:border-surface-600={targetFormat !== fmt}
                class:opacity-50={sourceFormat === fmt}
                class:cursor-not-allowed={sourceFormat === fmt}
                style={targetFormat === fmt ? `border-color: ${FORMAT_META[fmt].color}; background-color: ${FORMAT_META[fmt].color}15;` : ''}
                onclick={() => {
                  if (sourceFormat !== fmt) targetFormat = fmt;
                }}
                disabled={sourceFormat === fmt}
              >
                <div class="flex items-center gap-2 relative z-10">
                  <div class="w-2.5 h-2.5 rounded-full" style="background-color: {FORMAT_META[fmt].color}; box-shadow: 0 0 8px {FORMAT_META[fmt].color}80;"></div>
                  <span class="text-sm font-semibold text-surface-100">{labelOf(fmt)}</span>
                </div>
                {#if targetFormat === fmt}
                  <div class="absolute inset-0 opacity-20 bg-gradient-to-r from-transparent to-white pointer-events-none"></div>
                {/if}
              </button>
            {/each}
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 pt-2">
          <button
            class="flex-1 bg-accent-600 hover:bg-accent-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-accent-500/20 transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onclick={handleConvert}
            disabled={!inputSession.trim() || !decodedData || sourceFormat === targetFormat}
          >
            Convert Session
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </button>
          <button
            class="px-4 py-3 bg-surface-800 hover:bg-surface-700 text-surface-200 font-medium rounded-xl border border-surface-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            onclick={handleConvertAll}
            title="Convert to all formats"
            disabled={!inputSession.trim() || !decodedData}
          >
            All
          </button>
        </div>
      </div>
    </div>

    <!-- Output Section -->
    <div class="flex flex-col gap-6">
      {#if decodedData && inputSession.trim()}
        <!-- Source Info Panel -->
        <div class="bg-surface-900/50 backdrop-blur-md border border-surface-800 rounded-2xl p-6 shadow-xl" transition:fade>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-surface-300 uppercase tracking-wider">Decoded Session Data</h3>
            {#if sourceFormat}
              <FormatBadge format={sourceFormat} />
            {/if}
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-3">
            {#each Object.entries(sessionSummary(decodedData)) as [key, val]}
              <div class="flex flex-col">
                <span class="text-xs text-surface-500 font-medium">{key}</span>
                <span class="text-sm text-surface-100 truncate" title={val}>{val}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if generatedSession || allGenerated}
        <div class="bg-surface-900/50 backdrop-blur-md border border-surface-800 rounded-2xl p-6 shadow-xl" transition:fade>
          <h3 class="text-lg font-bold text-surface-50 mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Conversion Result
          </h3>
          
          {#if allGenerated}
            <div class="flex flex-col gap-4">
              {#each formats as fmt}
                {#if fmt !== sourceFormat}
                  <div class="p-4 bg-surface-950 rounded-xl border border-surface-800">
                    <SessionOutput format={fmt} sessionString={allGenerated[fmt]} />
                  </div>
                {/if}
              {/each}
            </div>
          {:else if generatedSession}
            <div class="p-4 bg-surface-950 rounded-xl border border-surface-800">
              <SessionOutput format={targetFormat} sessionString={generatedSession} />
            </div>
          {/if}
        </div>
      {:else if !decodedData && !inputSession.trim()}
        <div class="h-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-surface-900/20 rounded-2xl border border-surface-800 border-dashed">
          <div class="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mb-4 text-surface-500">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
          </div>
          <p class="text-surface-400 font-medium mb-2">Ready to Convert</p>
          <p class="text-sm text-surface-500 max-w-xs">Paste your session string to decode and convert it to other formats.</p>
        </div>
      {/if}
    </div>
  </div>
</div>
