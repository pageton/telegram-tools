<script lang="ts">
  import { fade, slide } from 'svelte/transition';
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

  // State
  let step = $state<number>(1);
  let accountType = $state<'user' | 'bot'>('user');
  
  // Credentials
  let apiIdStr = $state<string>('');
  let apiHash = $state<string>('');
  
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
      isConnecting = true; // Could be continuing from verification
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
        results[fmt] = encodeSession(sessionData, fmt, { apiId });
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
    
    // Reset all state except credentials
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

<div class="flex flex-col gap-6 w-full max-w-2xl mx-auto p-4 md:p-8">
  <div class="bg-surface-900/50 backdrop-blur-md border border-surface-800 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
    <!-- Gradient glow -->
    <div class="absolute -top-24 -left-24 w-48 h-48 bg-primary-500/20 rounded-full blur-3xl pointer-events-none"></div>

    <div class="flex flex-col gap-8 relative z-10">
      
      <!-- Wizard Progress Header -->
      <div class="flex items-center justify-between relative mb-2">
        <div class="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-surface-800 z-0"></div>
        <div class="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary-500 z-0 transition-all duration-500" style="width: {(step - 1) * 33.33}%"></div>
        
        {#each [1, 2, 3, 4] as s}
          <div class="relative z-10 flex flex-col items-center gap-2">
            <div 
              class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors duration-300"
              class:bg-primary-600={step >= s}
              class:border-primary-600={step >= s}
              class:text-white={step >= s}
              class:bg-surface-900={step < s}
              class:border-surface-700={step < s}
              class:text-surface-500={step < s}
            >
              {#if step > s}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              {:else}
                {s}
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <!-- Error Message -->
      {#if errorMessage}
        <div class="bg-error-500/10 border border-error-500/20 text-error-400 p-4 rounded-xl flex items-start gap-3" transition:slide>
          <svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <p class="text-sm font-medium">{errorMessage}</p>
        </div>
      {/if}

      <!-- Step 1: Credentials -->
      {#if step === 1}
        <div class="flex flex-col gap-6" in:fade={{ delay: 100 }} out:fade={{ duration: 100 }}>
          <div class="text-center">
            <h2 class="text-2xl font-bold text-surface-50 mb-2">Telegram Credentials</h2>
            <p class="text-surface-400 text-sm">Enter your Telegram API details to begin.</p>
          </div>

          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <span class="text-sm font-medium text-surface-300">Account Type</span>
              <div class="flex p-1 bg-surface-950 rounded-xl border border-surface-800">
                <button
                  class="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                  class:bg-primary-600={accountType === 'user'}
                  class:text-white={accountType === 'user'}
                  class:shadow-md={accountType === 'user'}
                  class:text-surface-400={accountType !== 'user'}
                  class:hover:text-surface-200={accountType !== 'user'}
                  onclick={() => accountType = 'user'}
                >
                  User
                </button>
                <button
                  class="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                  class:bg-accent-600={accountType === 'bot'}
                  class:text-white={accountType === 'bot'}
                  class:shadow-md={accountType === 'bot'}
                  class:text-surface-400={accountType !== 'bot'}
                  class:hover:text-surface-200={accountType !== 'bot'}
                  onclick={() => accountType = 'bot'}
                >
                  Bot
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label for="gen-api-id" class="text-sm font-medium text-surface-300">API ID</label>
              <input
                id="gen-api-id"
                type="text"
                bind:value={apiIdStr}
                placeholder="e.g. 1234567"
                class="w-full bg-surface-950 border border-surface-800 text-surface-200 text-sm p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors"
                onkeydown={(e) => e.key === 'Enter' && validateStep1()}
              />
            </div>

            <div class="flex flex-col gap-2">
              <label for="gen-api-hash" class="text-sm font-medium text-surface-300">API Hash</label>
              <input
                id="gen-api-hash"
                type="text"
                bind:value={apiHash}
                placeholder="e.g. 0123456789abcdef0123456789abcdef"
                class="w-full bg-surface-950 border border-surface-800 text-surface-200 text-sm p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors"
                onkeydown={(e) => e.key === 'Enter' && validateStep1()}
              />
            </div>

            <a href="https://my.telegram.org/auth" target="_blank" rel="noopener noreferrer" class="text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center justify-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
              Get credentials from my.telegram.org
            </a>
          </div>

          <button
            class="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98] mt-2"
            onclick={validateStep1}
          >
            Next Step
          </button>
        </div>
      {/if}

      <!-- Step 2: Login -->
      {#if step === 2}
        <div class="flex flex-col gap-6" in:fade={{ delay: 100 }} out:fade={{ duration: 100 }}>
          {#if accountType === 'user'}
            <div class="flex flex-col items-center gap-1">
              <div class="w-14 h-14 rounded-2xl bg-primary-600/15 border border-primary-500/20 flex items-center justify-center mb-2">
                <svg class="w-7 h-7 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
              </div>
              <h2 class="text-xl font-bold text-surface-50">Phone Number</h2>
              <p class="text-surface-500 text-xs">Include country code</p>
            </div>

            <div class="relative flex items-center bg-surface-950 border border-surface-800 rounded-xl focus-within:ring-2 focus-within:ring-primary-500/50 transition-all">
              <span class="pl-4 pr-1 text-surface-500 text-lg font-mono select-none">+</span>
              <input
                id="gen-phone"
                type="tel"
                inputmode="tel"
                bind:value={phoneNumber}
                placeholder="1234567890"
                class="flex-1 bg-transparent text-surface-100 text-lg font-mono tracking-wider py-4 pr-4 pl-1 rounded-xl focus:outline-none"
                onkeydown={(e) => e.key === 'Enter' && !isConnecting && startAuth()}
              />
            </div>
          {:else}
            <div class="flex flex-col items-center gap-1">
              <div class="w-14 h-14 rounded-2xl bg-accent-600/15 border border-accent-500/20 flex items-center justify-center mb-2">
                <svg class="w-7 h-7 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <h2 class="text-xl font-bold text-surface-50">Bot Token</h2>
              <p class="text-surface-500 text-xs">From @BotFather</p>
            </div>

            <input
              id="gen-bot-token"
              type="text"
              bind:value={botToken}
              placeholder="1234567890:ABCDEFghijklMNOPqrstuv"
              class="w-full bg-surface-950 border border-surface-800 text-surface-100 text-sm font-mono tracking-wide p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors text-center"
              onkeydown={(e) => e.key === 'Enter' && !isConnecting && startAuth()}
            />
          {/if}

          <div class="flex gap-3">
            <button
              class="px-4 py-3 bg-surface-800 hover:bg-surface-700 text-surface-300 font-medium rounded-xl border border-surface-700 transition-all active:scale-[0.98]"
              onclick={() => { step = 1; errorMessage = null; }}
              disabled={isConnecting}
            >
              Back
            </button>
            <button
              class="flex-1 bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onclick={startAuth}
              disabled={isConnecting}
            >
              {#if isConnecting}
                <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              {:else}
                Connect
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              {/if}
            </button>
          </div>
        </div>
      {/if}

      <!-- Step 3: Verification (User Only) -->
      {#if step === 3}
        <div class="flex flex-col gap-6" in:fade={{ delay: 100 }} out:fade={{ duration: 100 }}>
          <div class="text-center">
            <h2 class="text-2xl font-bold text-surface-50 mb-2">Verification</h2>
            <p class="text-surface-400 text-sm">
              {#if showPasswordInput}
                Your account is protected with 2FA.
              {:else}
                Code sent to your Telegram app.
              {/if}
            </p>
          </div>

          <div class="flex flex-col gap-4">
            {#if !showPasswordInput}
              <div class="flex flex-col gap-2">
                <input
                  type="text"
                  bind:value={codeInput}
                  placeholder="Enter 5-digit code"
                  class="w-full bg-surface-950 border border-surface-800 text-surface-200 text-2xl tracking-[0.2em] font-mono p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors text-center uppercase"
                  maxlength="5"
                  onkeydown={(e) => e.key === 'Enter' && submitCode()}
                />
              </div>
              <button
                class="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onclick={submitCode}
                disabled={isVerifying}
              >
                {#if isVerifying}
                  <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                {:else}
                  Verify Code
                {/if}
              </button>
            {:else}
              <div class="flex flex-col gap-2" in:slide>
                <label for="gen-2fa-pass" class="text-sm font-medium text-surface-300">2FA Password</label>
                <input
                  id="gen-2fa-pass"
                  type="password"
                  bind:value={passwordInput}
                  placeholder="Enter your cloud password"
                  class="w-full bg-surface-950 border border-surface-800 text-surface-200 text-lg p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors text-center"
                  onkeydown={(e) => e.key === 'Enter' && submitPassword()}
                />
              </div>
              <button
                class="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onclick={submitPassword}
                disabled={isVerifying}
              >
                {#if isVerifying}
                  <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                {:else}
                  Submit Password
                {/if}
              </button>
            {/if}
          </div>
          
          <button
            class="text-sm text-surface-500 hover:text-surface-300 transition-colors"
            onclick={disconnectAndReset}
            disabled={isVerifying}
          >
            Cancel Authentication
          </button>
        </div>
      {/if}

      <!-- Step 4: Results -->
      {#if step === 4 && allGenerated && userInfo}
        <div class="flex flex-col gap-6" in:fade={{ delay: 100 }} out:fade={{ duration: 100 }}>
          
          <!-- User Info Card -->
          <div class="bg-surface-950/80 border border-surface-800 rounded-xl p-4 flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400 font-bold text-lg">
              {userInfo.firstName.charAt(0)}
            </div>
            <div class="flex flex-col">
              <span class="text-surface-50 font-semibold">{userInfo.firstName}</span>
              <span class="text-surface-400 text-sm">
                {#if userInfo.username}@{userInfo.username} &bull; {/if}
                ID: {userInfo.id}
                {#if userInfo.isBot} &bull; Bot{/if}
              </span>
            </div>
          </div>

          <!-- Sessions Grid -->
          <div class="flex flex-col gap-4">
            {#each formats as fmt}
              <div class="p-4 bg-surface-950 rounded-xl border border-surface-800 shadow-sm">
                <SessionOutput format={fmt} sessionString={allGenerated[fmt]} />
              </div>
            {/each}
          </div>

          <div class="flex gap-3 mt-2">
            <button
              class="flex-1 bg-surface-800 hover:bg-surface-700 text-white font-semibold py-3 px-4 rounded-xl border border-surface-700 shadow-lg shadow-surface-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              onclick={disconnectAndReset}
            >
              <svg class="w-4 h-4 text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              Disconnect
            </button>
            <button
              class="flex-1 bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              onclick={disconnectAndReset}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              Generate New
            </button>
          </div>
        </div>
      {/if}
      
    </div>
  </div>
</div>
