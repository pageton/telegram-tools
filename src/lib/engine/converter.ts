import type { SessionData, SessionFormat, DetectionResult } from './types';
import { DC_PROD, DC_TEST } from './types';
import * as telethon from './formats/telethon';
import * as gramjs from './formats/gramjs';
import * as pyrogram from './formats/pyrogram';
import * as mtcute from './formats/mtcute';
import * as gotg from './formats/gotg';
import { b64UrlDecode, b64Decode } from './base64';

/** Decode a session string of a known format */
export function decodeSession(session: string, format: SessionFormat): SessionData {
  const trimmed = session.trim();
  switch (format) {
    case 'telethon':
      return telethon.decode(trimmed);
    case 'gramjs':
      return gramjs.decode(trimmed);
    case 'pyrogram':
      return pyrogram.decode(trimmed);
    case 'mtcute':
      return mtcute.decode(trimmed);
    case 'gotg':
      return gotg.decode(trimmed);
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

/** Encode session data to a target format */
export async function encodeSession(
  session: SessionData,
  format: SessionFormat,
  options?: { apiId?: number }
): Promise<string> {
  // Ensure IP address is filled from DC table
  const filled = fillIpFromDc(session);

  switch (format) {
    case 'telethon':
      return telethon.encode(filled);
    case 'gramjs':
      return gramjs.encode(filled);
    case 'pyrogram':
      return pyrogram.encode(filled, options?.apiId);
    case 'mtcute':
      return mtcute.encode(filled);
    case 'gotg':
      return gotg.encode(filled);
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

/** Convert a session string from one format to another */
export async function convertSession(
  session: string,
  sourceFormat: SessionFormat,
  targetFormat: SessionFormat,
  options?: { apiId?: number }
): Promise<string> {
  const data = decodeSession(session, sourceFormat);
  return encodeSession(data, targetFormat, options);
}

/** Auto-detect the format of a session string */
export function detectFormat(session: string): DetectionResult | null {
  const trimmed = session.trim();

  // 1. Check for gotg native (base64 JSON with Version field)
  if (gotg.isGotgNative(trimmed)) {
    try {
      const data = gotg.decode(trimmed);
      return { format: 'gotg', confidence: 'high', session: data };
    } catch {
      // gotg native is detected but can't be decoded
      return null;
    }
  }

  // 2. Check for "1" prefix (Telethon or GramJS)
  if (trimmed.startsWith('1')) {
    const b64Part = trimmed.slice(1);

    // Telethon: URL-safe base64, decoded length 263 (IPv4) or 275 (IPv6)
    try {
      const decoded = b64UrlDecode(b64Part);
      if (decoded.length === 263 || decoded.length === 275) {
        const data = telethon.decode(trimmed);
        return { format: 'telethon', confidence: 'high', session: data };
      }
    } catch { /* not telethon */ }

    // GramJS: standard base64
    try {
      const decoded = b64Decode(b64Part);
      if (decoded.length > 260) {
        const data = gramjs.decode(trimmed);
        return { format: 'gramjs', confidence: 'high', session: data };
      }
    } catch { /* not gramjs */ }
  }

  // 3. Check Pyrogram (no prefix, URL-safe base64, decoded length 271/263/267)
  if (!trimmed.startsWith('1')) {
    try {
      const decoded = b64UrlDecode(trimmed);
      if (decoded.length === 271 || decoded.length === 263 || decoded.length === 267) {
        const data = pyrogram.decode(trimmed);
        return { format: 'pyrogram', confidence: 'high', session: data };
      }
    } catch { /* not pyrogram */ }

    // 4. Check mtcute v3 (no prefix, first byte is version 2 or 3)
    try {
      const decoded = b64UrlDecode(trimmed);
      if (decoded.length > 10 && (decoded[0] === 3 || decoded[0] === 2)) {
        const data = mtcute.decode(trimmed);
        return { format: 'mtcute', confidence: 'medium', session: data };
      }
    } catch { /* not mtcute */ }
  }

  // 5. Brute-force: try all formats
  const formats: SessionFormat[] = ['telethon', 'gramjs', 'pyrogram', 'mtcute'];
  for (const format of formats) {
    try {
      const data = decodeSession(trimmed, format);
      if (data.authKey.length === 256 && data.dcId >= 1 && data.dcId <= 5) {
        return { format, confidence: 'low', session: data };
      }
    } catch { /* skip */ }
  }

  return null;
}

/** Check if a string looks like a valid IP address (v4 or v6) */
function isValidIP(addr: string): boolean {
  // IPv4: digits and dots only, 4 octets
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(addr)) return true;
  // IPv6: hex and colons
  if (/^[0-9a-fA-F:]+$/.test(addr) && addr.includes(':')) return true;
  return false;
}

/** Fill in IP address from DC table if missing or if it's a hostname (not an IP) */
function fillIpFromDc(session: SessionData): SessionData {
  if (session.ipAddress && session.ipAddress !== '' && isValidIP(session.ipAddress)) {
    return session;
  }
  const dcTable = session.testMode ? DC_TEST : DC_PROD;
  const dc = dcTable[session.dcId] ?? DC_PROD[session.dcId];
  if (dc) {
    return { ...session, ipAddress: dc.ip, port: dc.port };
  }
  return session;
}

/** Validate a session data object */
export function validateSession(session: SessionData): string[] {
  const errors: string[] = [];

  if (session.dcId < 1 || session.dcId > 5) {
    errors.push(`Invalid DC ID: ${session.dcId} (must be 1-5)`);
  }
  if (session.authKey.length !== 256) {
    errors.push(`Invalid auth key length: ${session.authKey.length} bytes (must be 256)`);
  }
  if (session.authKey.every((b) => b === 0)) {
    errors.push('Auth key is all zeros');
  }

  return errors;
}

/** Get a human-readable summary of session data */
export function sessionSummary(session: SessionData): Record<string, string> {
  const summary: Record<string, string> = {
    'DC ID': String(session.dcId),
    'IP Address': session.ipAddress || '(derived from DC)',
    Port: String(session.port || 443),
    'Auth Key': `${session.authKey.length} bytes (${Array.from(session.authKey.slice(0, 4))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')}...)`,
  };

  if (session.testMode) summary['Test Mode'] = 'Yes';
  if (session.userId) summary['User ID'] = String(session.userId);
  if (session.isBot !== undefined) summary['Account Type'] = session.isBot ? 'Bot' : 'User';
  if (session.apiId) summary['API ID'] = String(session.apiId);
  if (session.ipv6) summary['IPv6'] = 'Yes';

  return summary;
}
