/** Supported session string formats */
export type SessionFormat =
  | 'telethon'
  | 'gramjs'
  | 'pyrogram'
  | 'mtcute'
  | 'gotg';

/** Account type */
export type AccountType = 'user' | 'bot';

/** Canonical session data — the hub format for all conversions */
export interface SessionData {
  dcId: number;
  authKey: Uint8Array; // 256 bytes
  ipAddress: string;
  port: number;
  ipv6: boolean;
  testMode: boolean;

  // Optional metadata (not all formats carry these)
  userId?: number;
  isBot?: boolean;
  apiId?: number;
}

/** Detection result when auto-detecting format */
export interface DetectionResult {
  format: SessionFormat;
  confidence: 'high' | 'medium' | 'low';
  session: SessionData;
}

/** Telegram DC addresses */
export const DC_PROD: Record<number, { ip: string; port: number }> = {
  1: { ip: '149.154.175.53', port: 443 },
  2: { ip: '149.154.167.51', port: 443 },
  3: { ip: '149.154.175.100', port: 443 },
  4: { ip: '149.154.167.91', port: 443 },
  5: { ip: '91.108.56.130', port: 443 },
};

export const DC_TEST: Record<number, { ip: string; port: number }> = {
  1: { ip: '149.154.175.10', port: 443 },
  2: { ip: '149.154.167.40', port: 443 },
  3: { ip: '149.154.175.117', port: 443 },
};

/** Format display metadata */
export const FORMAT_META: Record<
  SessionFormat,
  { label: string; color: string; description: string; language: string }
> = {
  telethon: {
    label: 'Telethon',
    color: '#0088cc',
    description: 'Python MTProto library',
    language: 'Python',
  },
  gramjs: {
    label: 'GramJS',
    color: '#f7df1e',
    description: 'JavaScript/TypeScript MTProto library',
    language: 'JavaScript',
  },
  pyrogram: {
    label: 'Pyrogram',
    color: '#ff6f61',
    description: 'Python MTProto framework',
    language: 'Python',
  },
  mtcute: {
    label: 'mtcute',
    color: '#38bdf8',
    description: 'TypeScript MTProto library',
    language: 'TypeScript',
  },
  gotg: {
    label: 'gotg',
    color: '#00add8',
    description: 'Go Telegram client library',
    language: 'Go',
  },
};
