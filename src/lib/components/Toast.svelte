<script lang="ts">
  import { toastState, removeToast } from './toast.svelte.js';
  import { fade, fly } from 'svelte/transition';
</script>

<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none px-4">
  {#each toastState.toasts as toast (toast.id)}
    <div
      in:fly={{ y: -20, duration: 300 }}
      out:fade={{ duration: 200 }}
      class="pointer-events-auto flex items-center justify-between p-4 rounded-xl shadow-lg border backdrop-blur-md"
      class:bg-surface-900={toast.type === 'info'}
      class:bg-opacity-80={toast.type === 'info'}
      class:border-surface-700={toast.type === 'info'}
      class:bg-error-500={toast.type === 'error'}
      class:border-error-500={toast.type === 'error'}
      class:bg-success-500={toast.type === 'success'}
      class:border-success-500={toast.type === 'success'}
      class:bg-opacity-20={toast.type === 'error' || toast.type === 'success'}
      class:border-opacity-50={toast.type === 'error' || toast.type === 'success'}
    >
      <div class="flex items-center gap-3">
        {#if toast.type === 'success'}
          <svg class="w-5 h-5 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        {:else if toast.type === 'error'}
          <svg class="w-5 h-5 text-error-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        {:else}
          <svg class="w-5 h-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        {/if}
        <p class="text-sm font-medium text-surface-50">{toast.message}</p>
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        class="text-surface-400 hover:text-surface-100 transition-colors"
        onclick={() => removeToast(toast.id)}
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </div>
  {/each}
</div>
