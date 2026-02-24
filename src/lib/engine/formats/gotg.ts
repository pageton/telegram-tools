import { b64Decode, b64Encode } from '../base64';
import { BinaryWriter } from '../binary';
import type { SessionData } from '../types';
import { DC_PROD } from '../types';

/**
 * gotg does NOT define its own unique session string format.
 * It accepts GramJS, Pyrogram, and Telethon formats natively via:
 *   - GramjsSession(str)
 *   - PyrogramSession(str)
 *   - TelethonSession(str)
 *
 * Its "native" StringSession is: base64(JSON({ Version: int, Data: bytes }))
 * where Data is gotd's internal binary session format (opaque).
 *
 * For the converter, we produce GramJS-format strings since that's
 * gotg's primary import path via GramjsSession().
 */

/** Check if a string looks like a gotg native session (base64-encoded JSON) */
export function isGotgNative(session: string): boolean {
  try {
    const decoded = new TextDecoder().decode(b64Decode(session));
    const json = JSON.parse(decoded);
    return typeof json.Version === 'number' && json.Data !== undefined;
  } catch {
    return false;
  }
}

/** Attempt to decode a gotg native session — limited support */
export function decode(session: string): SessionData {
  try {
    const decoded = new TextDecoder().decode(b64Decode(session));
    const json = JSON.parse(decoded);
    if (typeof json.Version === 'number') {
      throw new Error(
        'gotg native sessions contain gotd internal binary data that cannot be decoded client-side. ' +
          'Please export your session in GramJS or Pyrogram format from gotg instead.'
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('gotg native')) throw e;
  }
  throw new Error('Not a valid gotg session string');
}

/**
 * Encode as gotg-compatible GramJS format.
 * gotg imports these directly via GramjsSession(str).
 */
export function encode(session: SessionData): string {
  const ip = session.ipAddress || DC_PROD[session.dcId]?.ip || '149.154.167.51';
  const port = session.port || DC_PROD[session.dcId]?.port || 443;

  const addrBytes = new TextEncoder().encode(ip);
  const writer = new BinaryWriter();
  writer.writeUint8(session.dcId);
  writer.writeInt16BE(addrBytes.length);
  writer.writeBytes(addrBytes);
  writer.writeInt16BE(port);
  writer.writeBytes(session.authKey);

  return '1' + b64Encode(writer.build());
}
