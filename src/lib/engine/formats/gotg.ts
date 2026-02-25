import { b64Decode, b64Encode } from '../base64';
import type { SessionData } from '../types';
import { DC_PROD } from '../types';

/**
 * gotg native session format (triple-layered):
 *
 *   Layer 1 (outer): base64(JSON(storage.Session))
 *     storage.Session = { "Version": 1, "Data": "<base64 of Layer 2>" }
 *     (Data is Go []byte → JSON serializes as base64)
 *
 *   Layer 2 (middle): JSON(jsonData) — what gotd's session.Loader expects
 *     jsonData = { "Version": 1, "Data": { ...session.Data fields } }
 *
 *   Layer 3 (inner): session.Data fields
 *     { "Config":{...}, "DC":int, "Addr":"host:port",
 *       "AuthKey":"<base64 of 256 bytes>",
 *       "AuthKeyID":"<base64 of 8 bytes>",
 *       "Salt":0 }
 *
 * AuthKeyID = sha1(authKey)[12:20]
 */

/** Go's gotd session.Config zero-value (all fields must be present) */
const EMPTY_CONFIG = {
  BlockedMode: false,
  ForceTryIpv6: false,
  Date: 0,
  Expires: 0,
  TestMode: false,
  ThisDC: 0,
  DCOptions: null,
  DCTxtDomainName: '',
  TmpSessions: 0,
  WebfileDCID: 0,
};

/** gotd session.Data structure (Layer 3) */
interface GotdSessionData {
  Config: typeof EMPTY_CONFIG;
  DC: number;
  Addr: string;
  AuthKey: string;   // base64 of 256 bytes
  AuthKeyID: string; // base64 of 8 bytes
  Salt: number;
}

/** gotd jsonData wrapper (Layer 2) — what gotd's Loader expects from LoadSession() */
interface GotdJsonData {
  Version: number;
  Data: GotdSessionData;
}

/** gotg storage.Session structure (Layer 1 — outermost) */
interface GotgSessionJSON {
  Version: number;
  Data: string; // base64 of JSON(GotdJsonData)
}

/** Compute auth_key_id = sha1(authKey)[12:20] */
async function computeAuthKeyID(authKey: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest('SHA-1', new Uint8Array(authKey));
  return new Uint8Array(hash).slice(12, 20);
}

/** Check if a string looks like a gotg native session (base64-encoded JSON with Version field) */
export function isGotgNative(session: string): boolean {
  try {
    const decoded = new TextDecoder().decode(b64Decode(session));
    const json = JSON.parse(decoded);
    return typeof json.Version === 'number' && typeof json.Data === 'string';
  } catch {
    return false;
  }
}

/** Decode a gotg native session string to SessionData */
export function decode(session: string): SessionData {
  // Layer 1: base64 → JSON(storage.Session)
  const outerStr = new TextDecoder().decode(b64Decode(session));
  const outer: GotgSessionJSON = JSON.parse(outerStr);

  if (typeof outer.Version !== 'number' || typeof outer.Data !== 'string') {
    throw new Error('Not a valid gotg session string');
  }

  // Layer 2: base64(Data) → JSON(jsonData) with { Version, Data: session.Data }
  const middleStr = new TextDecoder().decode(b64Decode(outer.Data));
  const middle = JSON.parse(middleStr);

  // Handle both old format (session.Data directly) and correct format (jsonData wrapper)
  const inner: GotdSessionData = middle.Data ?? middle;

  // AuthKey is base64-encoded in JSON (Go's []byte serialization)
  const authKey = b64Decode(inner.AuthKey);
  if (authKey.length !== 256) {
    throw new Error(`Invalid gotg auth key length: ${authKey.length} (expected 256)`);
  }

  // Parse Addr "ip:port"
  let ip = '';
  let port = 443;
  if (inner.Addr) {
    const lastColon = inner.Addr.lastIndexOf(':');
    if (lastColon > 0) {
      ip = inner.Addr.slice(0, lastColon);
      port = parseInt(inner.Addr.slice(lastColon + 1), 10) || 443;
    } else {
      ip = inner.Addr;
    }
  }

  // Fallback IP from DC table
  if (!ip && inner.DC >= 1 && inner.DC <= 5) {
    const dc = DC_PROD[inner.DC];
    if (dc) {
      ip = dc.ip;
      port = dc.port;
    }
  }

  const testMode = inner.Config?.TestMode === true;

  return {
    dcId: inner.DC,
    authKey,
    ipAddress: ip,
    port,
    ipv6: ip.includes(':'),
    testMode,
  };
}

/** Encode SessionData to gotg native format */
export async function encode(session: SessionData): Promise<string> {
  // Always use DC table IP (not hostname from GramJS) — matches gotg's Pyrogram decoder behavior
  const dc = DC_PROD[session.dcId];
  const addr = dc ? `${dc.ip}:${dc.port}` : `${session.ipAddress || '149.154.167.51'}:${session.port || 443}`;

  // Compute AuthKeyID = sha1(authKey)[12:20]
  const authKeyID = await computeAuthKeyID(session.authKey);

  // Layer 3: session.Data fields
  const sessionData: GotdSessionData = {
    Config: EMPTY_CONFIG,
    DC: session.dcId,
    Addr: addr,
    AuthKey: b64Encode(session.authKey),
    AuthKeyID: b64Encode(authKeyID),
    Salt: 0,
  };

  // Layer 2: gotd jsonData wrapper (what gotd's Loader expects from LoadSession())
  const gotdWrapper: GotdJsonData = {
    Version: 1,
    Data: sessionData,
  };
  const middleJSON = JSON.stringify(gotdWrapper);
  const middleBytes = new TextEncoder().encode(middleJSON);

  // Layer 1: storage.Session — Data is base64(middleBytes) since Go's []byte → base64 in JSON
  const outer: GotgSessionJSON = {
    Version: 1,
    Data: b64Encode(middleBytes),
  };
  const outerJSON = JSON.stringify(outer);
  const outerBytes = new TextEncoder().encode(outerJSON);

  return b64Encode(outerBytes);
}
