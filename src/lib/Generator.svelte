<script lang="ts">
  import { fade, slide } from 'svelte/transition';
  import { onMount } from 'svelte';
  import { addToast } from './components/toast.svelte.js';
  import {
    decodeSession,
    encodeSession,
    FORMAT_META,
    type SessionFormat,
  } from './engine';
  import SessionOutput from './components/SessionOutput.svelte';
  import type { TelegramClient } from 'telegram';
  import { createUserSession, createBotSession, getMe } from './telegram';

  // LocalStorage keys
  const LS_API_ID = 'tg_api_id';
  const LS_API_HASH = 'tg_api_hash';
  // State
  let step = $state<number>(1);
  let accountType = $state<'user' | 'bot'>('user');

  // Credentials (restored from localStorage)
  let apiIdStr = $state<string>('');
  let apiHash = $state<string>('');

  onMount(() => {
    try {
      apiIdStr = localStorage.getItem(LS_API_ID) ?? '';
      apiHash = localStorage.getItem(LS_API_HASH) ?? '';
    } catch {
      // localStorage unavailable (SSR, privacy mode)
    }
  });

  // Save credentials to localStorage when they change
  $effect(() => {
    localStorage.setItem(LS_API_ID, apiIdStr);
  });
  $effect(() => {
    localStorage.setItem(LS_API_HASH, apiHash);
  });

  // Login
  let phoneNumber = $state<string>('');
  let botToken = $state<string>('');

  // Verification
  let codeInput = $state<string>('');
  let passwordInput = $state<string>('');
  let showPasswordInput = $state<boolean>(false);

  // Status
  let isConnecting = $state<boolean>(false);
  let isVerifying = $state<boolean>(false);
  let errorMessage = $state<string | null>(null);

  // Results
  let userInfo = $state<{ id: number; isBot: boolean; firstName: string; username?: string } | null>(null);
  let allGenerated = $state<Record<SessionFormat, string> | null>(null);

  // Promises & Client
  let resolveCode: ((code: string) => void) | null = null;
  let resolvePassword: ((password: string) => void) | null = null;
  let tgClient: TelegramClient | null = null;

  const formats: SessionFormat[] = ['gotg', 'gramjs', 'pyrogram', 'mtcute', 'telethon'];

  function validateStep1() {
    errorMessage = null;
    const apiId = parseInt(apiIdStr, 10);
    if (isNaN(apiId) || apiId <= 0) {
      errorMessage = 'Please enter a valid numeric API ID.';
      return;
    }
    if (!apiHash || apiHash.trim().length === 0) {
      errorMessage = 'Please enter your API Hash.';
      return;
    }
    step = 2;
  }

  async function startAuth() {
    errorMessage = null;
    isConnecting = true;
    
    const apiId = parseInt(apiIdStr, 10);

    try {
      if (accountType === 'user') {
        if (!phoneNumber || phoneNumber.trim().length < 5) {
          throw new Error('Please enter a valid phone number (e.g. +1234567890).');
        }

        const { client, sessionString } = await createUserSession(apiId, apiHash.trim(), phoneNumber.trim(), {
          onCodeRequired: async () => {
            isConnecting = false;
            step = 3;
            return new Promise<string>((resolve) => {
              resolveCode = resolve;
            });
          },
          onPasswordRequired: async () => {
            isVerifying = false;
            showPasswordInput = true;
            return new Promise<string>((resolve) => {
              resolvePassword = resolve;
            });
          },
          onError: (err) => {
            errorMessage = err.message || 'An error occurred during authentication.';
            isConnecting = false;
            isVerifying = false;
          }
        });
        
        tgClient = client;
        await finishAuth(client, sessionString, apiId);
      } else {
        if (!botToken || botToken.trim().length < 10) {
          throw new Error('Please enter a valid bot token.');
        }

        const { client, sessionString } = await createBotSession(apiId, apiHash.trim(), botToken.trim(), (err) => {
          errorMessage = err.message || 'An error occurred during bot authentication.';
          isConnecting = false;
        });

        tgClient = client;
        await finishAuth(client, sessionString, apiId);
      }
    } catch (err: any) {
      errorMessage = err.message || 'Failed to authenticate.';
      isConnecting = false;
      isVerifying = false;
    }
  }

  async function finishAuth(client: TelegramClient, gramjsSessionStr: string, apiId: number) {
    try {
      isConnecting = true;
      isVerifying = true;
      errorMessage = null;

      const me = await getMe(client);
      userInfo = me;

      const sessionData = decodeSession(gramjsSessionStr, 'gramjs');
      sessionData.userId = me.id;
      sessionData.isBot = me.isBot;
      sessionData.apiId = apiId;

      const results = {} as Record<SessionFormat, string>;
      for (const fmt of formats) {
        results[fmt] = await encodeSession(sessionData, fmt, { apiId });
      }
      
      allGenerated = results;
      step = 4;
      addToast('Authentication successful!', 'success');
    } catch (err: any) {
      errorMessage = err.message || 'Failed to generate session formats.';
    } finally {
      isConnecting = false;
      isVerifying = false;
    }
  }

  function submitCode() {
    if (!codeInput || codeInput.trim().length === 0) {
      errorMessage = 'Please enter the verification code.';
      return;
    }
    errorMessage = null;
    isVerifying = true;
    if (resolveCode) {
      resolveCode(codeInput.trim());
      resolveCode = null;
    }
  }

  function submitPassword() {
    if (!passwordInput || passwordInput.trim().length === 0) {
      errorMessage = 'Please enter your 2FA password.';
      return;
    }
    errorMessage = null;
    isVerifying = true;
    if (resolvePassword) {
      resolvePassword(passwordInput);
      resolvePassword = null;
    }
  }

  async function disconnectAndReset() {
    if (tgClient) {
      try {
        await tgClient.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      tgClient = null;
    }
    
    step = 1;
    codeInput = '';
    passwordInput = '';
    showPasswordInput = false;
    isConnecting = false;
    isVerifying = false;
    errorMessage = null;
    userInfo = null;
    allGenerated = null;
    resolveCode = null;
    resolvePassword = null;
  }
</script>

<div class="flex flex-col gap-8 w-full max-w-2xl mx-auto">

  <!-- Step Progress -->
  <div class="flex items-center gap-2">
    {#each [1, 2, 3, 4] as s, i}
      <div class="flex items-center gap-2 flex-1">
        <div
          class="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors duration-200"
          class:bg-primary-600={step >= s}
          class:border-primary-600={step >= s}
          class:text-white={step >= s}
          class:bg-transparent={step < s}
          class:border-surface-700={step < s}
          class:text-surface-600={step < s}
        >
          {#if step > s}
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          {:else}
            {s}
          {/if}
        </div>
        {#if i < 3}
          <div class="flex-1 h-px transition-colors duration-300"
            class:bg-primary-600={step > s}
            class:bg-surface-800={step <= s}
          ></div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Error Message -->
  {#if errorMessage}
    <div class="bg-error-500/10 border border-error-500/20 text-error-400 p-3 rounded-lg flex items-start gap-2.5 text-sm" transition:slide>
      <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      <span class="font-medium">{errorMessage}</span>
    </div>
  {/if}

  <!-- Step 1: Credentials -->
  {#if step === 1}
    <div class="flex flex-col gap-5" in:fade={{ delay: 100 }} out:fade={{ duration: 100 }}>
      <div>
        <h3 class="text-lg font-semibold text-surface-100">Telegram Credentials</h3>
        <p class="text-sm text-surface-500 mt-1">Enter your API details to begin authentication.</p>
      </div>

      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <span class="text-xs font-medium text-surface-400 uppercase tracking-wider">Account Type</span>
          <div class="flex p-0.5 bg-surface-900 border border-surface-800 rounded-lg">
            <button
              class="flex-1 py-1.5 rounded-md text-sm font-medium transition-colors"
              class:bg-primary-600={accountType === 'user'}
              class:text-white={accountType === 'user'}
              class:text-surface-500={accountType !== 'user'}
              class:hover:text-surface-300={accountType !== 'user'}
              onclick={() => accountType = 'user'}
            >
              User
            </button>
            <button
              class="flex-1 py-1.5 rounded-md text-sm font-medium transition-colors"
              class:bg-primary-600={accountType === 'bot'}
              class:text-white={accountType === 'bot'}
              class:text-surface-500={accountType !== 'bot'}
              class:hover:text-surface-300={accountType !== 'bot'}
              onclick={() => accountType = 'bot'}
            >
              Bot
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="gen-api-id" class="text-xs font-medium text-surface-400 uppercase tracking-wider">API ID</label>
          <input
            id="gen-api-id"
            type="text"
            bind:value={apiIdStr}
            placeholder="e.g. 1234567"
            class="w-full bg-surface-900 border border-surface-800 text-surface-200 text-sm p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-colors"
            onkeydown={(e) => e.key === 'Enter' && validateStep1()}
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="gen-api-hash" class="text-xs font-medium text-surface-400 uppercase tracking-wider">API Hash</label>
          <input
            id="gen-api-hash"
            type="text"
            bind:value={apiHash}
            placeholder="e.g. 0123456789abcdef0123456789abcdef"
            class="w-full bg-surface-900 border border-surface-800 text-surface-200 text-sm p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-colors"
            onkeydown={(e) => e.key === 'Enter' && validateStep1()}
          />
        </div>

        <a href="https://my.telegram.org/auth" target="_blank" rel="noopener noreferrer" class="text-xs text-primary-400/80 hover:text-primary-300 transition-colors flex items-center gap-1 self-center">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          Get credentials from my.telegram.org
        </a>
      </div>

      <button
        class="w-full bg-primary-600 hover:bg-primary-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors active:scale-[0.98]"
        onclick={validateStep1}
      >
        Continue
      </button>
    </div>
  {/if}

  <!-- Step 2: Login -->
  {#if step === 2}
    <div class="flex flex-col gap-5" in:fade={{ delay: 100 }} out:fade={{ duration: 100 }}>
      {#if accountType === 'user'}
        <div>
          <h3 class="text-lg font-semibold text-surface-100">Phone Number</h3>
          <p class="text-sm text-surface-500 mt-1">Include country code (e.g. +1 for US).</p>
        </div>

        <div class="flex items-center bg-surface-900 border border-surface-800 rounded-lg focus-within:ring-2 focus-within:ring-primary-500/40 focus-within:border-primary-500/40 transition-all">
          <span class="pl-3 pr-0.5 text-surface-500 text-base font-mono select-none">+</span>
          <input
            id="gen-phone"
            type="tel"
            inputmode="tel"
            bind:value={phoneNumber}
            placeholder="1234567890"
            class="flex-1 bg-transparent text-surface-100 text-base font-mono tracking-wider py-2.5 pr-3 pl-1 rounded-lg focus:outline-none"
            onkeydown={(e) => e.key === 'Enter' && !isConnecting && startAuth()}
          />
        </div>
      {:else}
        <div>
          <h3 class="text-lg font-semibold text-surface-100">Bot Token</h3>
          <p class="text-sm text-surface-500 mt-1">From @BotFather.</p>
        </div>

        <input
          id="gen-bot-token"
          type="text"
          bind:value={botToken}
          placeholder="1234567890:ABCDEFghijklMNOPqrstuv"
          class="w-full bg-surface-900 border border-surface-800 text-surface-100 text-sm font-mono tracking-wide p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-colors text-center"
          onkeydown={(e) => e.key === 'Enter' && !isConnecting && startAuth()}
        />
      {/if}

      <div class="flex gap-2">
        <button
          class="px-3 py-2.5 bg-surface-800/60 hover:bg-surface-800 text-surface-400 text-sm font-medium rounded-lg border border-surface-700/50 transition-colors active:scale-[0.98]"
          onclick={() => { step = 1; errorMessage = null; }}
          disabled={isConnecting}
        >
          Back
        </button>
        <button
          class="flex-1 bg-primary-600 hover:bg-primary-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onclick={startAuth}
          disabled={isConnecting}
        >
          {#if isConnecting}
            <svg class="spinner h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Connecting...
          {:else}
            Connect
          {/if}
        </button>
      </div>
    </div>
  {/if}

  <!-- Step 3: Verification (User Only) -->
  {#if step === 3}
    <div class="flex flex-col gap-5" in:fade={{ delay: 100 }} out:fade={{ duration: 100 }}>
      <div>
        <h3 class="text-lg font-semibold text-surface-100">
          {#if showPasswordInput}2FA Password{:else}Verification Code{/if}
        </h3>
        <p class="text-sm text-surface-500 mt-1">
          {#if showPasswordInput}
            Your account is protected with two-factor authentication.
          {:else}
            Enter the code sent to your Telegram app.
          {/if}
        </p>
      </div>

      {#if !showPasswordInput}
        <input
          type="text"
          bind:value={codeInput}
          placeholder="12345"
          class="w-full bg-surface-900 border border-surface-800 text-surface-200 text-xl tracking-[0.3em] font-mono p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-colors text-center"
          maxlength="5"
          onkeydown={(e) => e.key === 'Enter' && submitCode()}
        />
        <button
          class="w-full bg-primary-600 hover:bg-primary-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onclick={submitCode}
          disabled={isVerifying}
        >
          {#if isVerifying}
            <svg class="spinner h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Verifying...
          {:else}
            Verify
          {/if}
        </button>
      {:else}
        <div class="flex flex-col gap-3" in:slide>
          <label for="gen-2fa-pass" class="text-xs font-medium text-surface-400 uppercase tracking-wider">2FA Password</label>
          <input
            id="gen-2fa-pass"
            type="password"
            bind:value={passwordInput}
            placeholder="Enter your 2FA password"
            class="w-full bg-surface-900 border border-surface-800 text-surface-200 text-base p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-colors"
            onkeydown={(e) => e.key === 'Enter' && submitPassword()}
          />
        </div>
        <button
          class="w-full bg-primary-600 hover:bg-primary-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onclick={submitPassword}
          disabled={isVerifying}
        >
          {#if isVerifying}
            <svg class="spinner h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Verifying...
          {:else}
            Submit Password
          {/if}
        </button>
      {/if}

      <button
        class="text-xs text-surface-600 hover:text-surface-400 transition-colors self-center"
        onclick={disconnectAndReset}
        disabled={isVerifying}
      >
        Cancel authentication
      </button>
    </div>
  {/if}

  <!-- Step 4: Results -->
  {#if step === 4 && allGenerated && userInfo}
    <div class="flex flex-col gap-5" in:fade={{ delay: 100 }} out:fade={{ duration: 100 }}>
      
      <!-- User Info -->
      <div class="flex items-center gap-3 py-2">
        <div class="w-9 h-9 rounded-full bg-primary-600/15 flex items-center justify-center text-primary-400 font-semibold text-sm">
          {userInfo.firstName.charAt(0)}
        </div>
        <div>
          <span class="text-surface-100 text-sm font-medium">{userInfo.firstName}</span>
          <span class="text-surface-500 text-xs ml-2">
            {#if userInfo.username}@{userInfo.username}{/if}
            {userInfo.id}
            {#if userInfo.isBot} · Bot{/if}
          </span>
        </div>
      </div>

      <!-- Sessions -->
      <div class="flex flex-col gap-2.5">
        {#each formats as fmt}
          <SessionOutput format={fmt} sessionString={allGenerated[fmt]} />
        {/each}
      </div>

      <div class="flex gap-2 pt-1">
        <button
          class="flex-1 bg-surface-800/50 hover:bg-surface-800 text-surface-300 text-sm font-medium py-2 px-3 rounded-lg border border-surface-700/40 transition-colors active:scale-[0.98] flex items-center justify-center gap-1.5"
          onclick={disconnectAndReset}
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          Disconnect
        </button>
        <button
          class="flex-1 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors active:scale-[0.98] flex items-center justify-center gap-1.5"
          onclick={disconnectAndReset}
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          New Session
        </button>
      </div>
    </div>
  {/if}

</div>
